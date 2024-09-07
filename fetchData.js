import { getSignedUrl } from './helpers.js';
import { startStopId, apiUrl } from './config.js';


// Fetch the next tram (only once)
export async function fetchNextTram() {
    const requestPath = `/v3/departures/route_type/1/stop/${startStopId}?max_results=1`; // Fetch the next tram only
    const signedUrl = getSignedUrl(requestPath);

    try {
        const response = await fetch(signedUrl);
        if (response.ok) {
            const data = await response.json();
            const nextDeparture = data['departures'][0]; // Use only the first upcoming tram
            const estimatedDeparture = new Date(nextDeparture['estimated_departure_utc']);
            return {
                time: estimatedDeparture,
                runId: nextDeparture['run_id'], // Fetch the run ID for travel calculations
            };
        } else {
            console.error("Error fetching tram time:", response.statusText);
        }
    } catch (error) {
        console.error("Error fetching tram data:", error);
    }
    return null;
}

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

// Fetch tram stops
export async function fetchTramStops() {
    try {
        const response = await fetch('/outgoing_route_11_stops.json');
        const tramStops = await response.json();
        return tramStops;
    } catch (error) {
        console.error("Error fetching tram stops:", error);
        return [];
    }
}

// Fetch travel time using tram run ID
export async function fetchTravelTime(runId, venueStopId) {
    const requestPath = `/v3/pattern/run/${runId}/route_type/1`;
    const signedUrl = getSignedUrl(requestPath);

    try {
        const response = await fetch(signedUrl);
        if (response.ok) {
            const data = await response.json();
            const stops = data['departures'];

            let startTime = null;
            let venueTime = null;

            stops.forEach((stop) => {
                if (stop.stop_id === startStopId) {
                    startTime = new Date(stop['scheduled_departure_utc']);
                }
                if (stop.stop_id === venueStopId) {
                    venueTime = new Date(stop['scheduled_departure_utc']);
                }
            });

            if (startTime && venueTime) {
                const travelTime = (venueTime - startTime) / 60000; // Convert ms to minutes
                return travelTime;
            } else {
                console.error(`No valid start or venue time found for run: ${runId}`);
                return null;
            }
        } else {
            console.error(`Error fetching travel time: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error fetching travel time:", error);
    }
    return null;
}
