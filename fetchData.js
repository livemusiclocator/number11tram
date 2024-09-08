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

  try {
    const response = await fetch(signedUrl);
    if (response.ok) {
      const data = await response.json();
      const nextDeparture = data.departures[0];

      return {
        time: new Date(nextDeparture.estimated_departure_utc || nextDeparture.scheduled_departure_utc), 
        routeNumber: nextDeparture.route.route_number, 
        destination: nextDeparture.run.destination_name,
        runId: nextDeparture.run_id // Include runId for fetching the full route if needed
      };
    } else {
      console.error("Error fetching tram time:", response.statusText);
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

    // You'll need to fetch the full route pattern here if you need arrival times for other stops
    const runId = nextTramData.runId; 
    const tramRoute = await fetchTramRoute(runId); 

    // ... (rest of your calculateVenueArrivalTimes logic, using tramRoute)
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

// Fetch tram stops (ensure caching)
export async function fetchTramStops() {
    // ... (your existing fetchTramStops code)
}
