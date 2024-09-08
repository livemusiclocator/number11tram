import { getSignedUrl } from './helpers.js';
import { API_KEY, DEVELOPER_ID, BASE_URL, startStopId, apiUrl } from './config.js';
import { getTramStops, findClosestStopToVenue } from './helpers.js'; 

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

// Fetch the next predicted tram arrival (simplified)
export async function fetchNextTram() {
    const requestPath = `/v3/departures/route_type/1/stop/${startStopId}?max_results=1&expand=run&expand=route`;
    const signedUrl = getSignedUrl(requestPath);
    console.log("Signed URL:", signedUrl);
  
    try {
      const response = await fetch(signedUrl);
      if (response.ok) {
        const data = await response.json();
        console.log("API Response (Departures):", data);
  
        // Filter for ALL outbound number 11 tram departures
        const outbound11Departures = data.departures.filter(
          (departure) => departure.route_id === 3343 && departure.direction_id === 4
        );
  
        if (outbound11Departures.length === 0) {
          console.error("No outbound number 11 tram departures found in departures:", data.departures);
          return null;
        }
  
        // Sort the filtered departures by scheduled departure time
        outbound11Departures.sort((a, b) => new Date(a.scheduled_departure_utc) - new Date(b.scheduled_departure_utc));
  
        // Select the first (earliest) departure
        const nextDeparture = outbound11Departures[0];
  
        // Access the 'run' object from the 'runs' property using the 'run_id'
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

    const venueArrivalTimes = {};

    for (const gig of gigs) {
        const venueId = gig.venue.id; 

        // Check if we already have the closest stop for this venue
        if (!venueStopMapping[venueId]) {
            const stops = await fetchTramStops();
            const { closestStop } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);
            venueStopMapping[venueId] = closestStop.stop_id;
        }

        const venueStopId = venueStopMapping[venueId];

        // Find the venue stop in the tram route
        const venueStopData = tramRoute.find(stop => String(stop.stop_id) === String(venueStopId)); // Ensure consistent data types

        if (venueStopData) {
            const arrivalTime = new Date(venueStopData.scheduled_departure_utc);
            venueArrivalTimes[venueId] = arrivalTime;
        } else {
            console.warn(`Venue stop ${venueStopId} not found in tram route.`);
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
            console.log("API Response (tramRoute):", data); // Log the entire API response
            return data.departures; // Array of stops with scheduled times
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
