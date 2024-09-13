import { getSignedUrl } from './helpers.js';
import { API_KEY, DEVELOPER_ID, BASE_URL, apiUrl, timeConfig } from './config.js';
import { findClosestStopToVenue } from './helpers.js';

let nextTramCache = null;
let venueStopMapping = {};

// Fetch gigs for today
export async function fetchGigs() {
    try {
        const response = await fetch(apiUrl);
        const gigs = await response.json();
        return gigs.sort((a, b) => new Date(a.start_timestamp) - new Date(b.start_timestamp)); // Sort by start time
    } catch (error) {
        console.error("Error fetching gigs:", error);
        return [];
    }
}

// Fetch the next predicted tram arrival
export async function fetchNextTram(stopId) {
    const requestPath = `/v3/departures/route_type/1/stop/${stopId}?max_results=1&expand=run&expand=route`;
    const signedUrl = getSignedUrl(requestPath);
    console.log("Signed URL:", signedUrl);
  
    try {
        const response = await fetch(signedUrl);
        if (response.ok) {
            const data = await response.json();
            console.log("API Response (Departures):", data);

            let outbound11Departures = data.departures.filter(
                (departure) => departure.route_id === 3343 && departure.direction_id === 4
            );

            if (outbound11Departures.length === 0) {
                console.error("No outbound number 11 tram departures found in departures:", data.departures);
                return null;
            }

            if (timeConfig.useTestTime) {
                const testTime = new Date(timeConfig.testTime);
                outbound11Departures = outbound11Departures.filter(
                    (departure) => new Date(departure.scheduled_departure_utc) >= testTime
                );

                if (outbound11Departures.length === 0) {
                    console.error("No outbound number 11 tram departures found after test time:", testTime);
                    return null;
                }
            }

            outbound11Departures.sort((a, b) => new Date(a.scheduled_departure_utc) - new Date(b.scheduled_departure_utc));
            const nextDeparture = outbound11Departures[0];
            const run = data.runs[nextDeparture.run_id];

            if (!run) {
                console.error("Run object not found for run_id:", nextDeparture.run_id);
                return null;
            }

            return {
                time: new Date(nextDeparture.estimated_departure_utc || nextDeparture.scheduled_departure_utc),
                routeNumber: 3343,
                destination: run.destination_name,
                runId: nextDeparture.run_id,
            };
        } else {
            console.error("Error fetching tram time:", response.status, response.statusText);
        }
    } catch (error) {
        console.error("Error fetching tram data:", error);
    }
    return null;
}


// Calculate travel time for all venues based on the next tram's route
export async function calculateVenueArrivalTimes(gigs, nextTramData) {
    if (!nextTramData) {
        console.error("No valid tram found.");
        return {};
    }

    const runId = nextTramData.runId;
    const tramRoute = await fetchTramRoute(runId);
    console.log("Tram Route Data for Run ID", runId, ":", tramRoute);

    const venueArrivalTimes = {};
    const stops = await fetchTramStops(); 

    for (const gig of gigs) {
        const venueId = gig.venue.id;

        if (!venueStopMapping[venueId]) {
            const { closestStop } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);
            venueStopMapping[venueId] = closestStop.stop_id;
        }

        const venueStopId = venueStopMapping[venueId];
        let venueStopData = tramRoute.departures.find(stop => String(stop.stop_id) === String(venueStopId));

        if (!venueStopData) {
            console.warn(`Venue stop ${venueStopId} not found in tram route for run ID: ${runId}. Finding next closest stop...`);
            const closestStopIndex = stops.findIndex(stop => String(stop.stop_id) === String(venueStopId));

            if (closestStopIndex !== -1) {
                const nextStop = stops[closestStopIndex + 1];
                const previousStop = stops[closestStopIndex - 1];
                const nextStopData = tramRoute.departures.find(stop => String(stop.stop_id) === String(nextStop?.stop_id));
                const previousStopData = tramRoute.departures.find(stop => String(stop.stop_id) === String(previousStop?.stop_id));
                venueStopData = nextStopData || previousStopData;

                if (venueStopData) {
                    console.log(`Using next closest stop: ${venueStopData.stop_id}`);
                } else {
                    console.warn(`Could not find next closest stop in tram route data.`);
                }
            } else {
                console.warn(`Closest stop ${venueStopId} not found in local stops data.`);
            }
        }

        if (venueStopData) {
            let arrivalTime = new Date(venueStopData.scheduled_departure_utc);
            venueArrivalTimes[venueId] = arrivalTime;
        }
    }

    return venueArrivalTimes;
}

// Fetch the full route pattern for a given tram run ID
async function fetchTramRoute(runId) {
    const requestPath = `/v3/pattern/run/${runId}/route_type/1`;
    const signedUrl = getSignedUrl(requestPath);

    try {
        const response = await fetch(signedUrl);
        if (response.ok) {
            const data = await response.json();
            console.log("API Response (tramRoute):", data);
            return data;
        } 
    } catch (error) { 
        console.error("Error fetching tram route:", error);
    }
    return null;
}

export async function fetchTramStops() {
    try {
        const response = await fetch('/outgoing_route_11_stops.json');
        if (!response.ok) {
            throw new Error(`Error fetching tram stops: ${response.status} ${response.statusText}`);
        }
        const tramStops = await response.json();
        return tramStops;
    } catch (error) {
        console.error("Error fetching tram stops:", error);
        return []; // Return an empty array to avoid further errors
    }
}
