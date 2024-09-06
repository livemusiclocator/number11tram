document.addEventListener("DOMContentLoaded", async () => {
    const gigList = document.getElementById("gig-list");

    // PTV API credentials (use your actual API key and developer ID here)
    const API_KEY = 'f36b2876-d136-485d-8e06-f057c79c0998';
    const DEVELOPER_ID = '3002834';
    const BASE_URL = 'https://timetableapi.ptv.vic.gov.au';

    // Sample gig API URL (always fetch gigs for today)
    const apiUrl = `https://api.lml.live/gigs/query?location=melbourne&date_from=${new Date().toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`;

    // Function to generate the signed URL for PTV API
    function getSignedUrl(requestPath) {
        const request = requestPath + (requestPath.includes('?') ? '&' : '?') + `devid=${DEVELOPER_ID}`;
        const raw = request;

        // Create HMAC-SHA1 signature
        const signature = CryptoJS.HmacSHA1(raw, API_KEY).toString(CryptoJS.enc.Hex);

        // Return full signed URL
        return `${BASE_URL}${raw}&signature=${signature}`;
    }

    // Function to calculate the Haversine distance between two points (in meters)
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Radius of Earth in meters
        const toRad = (angle) => angle * (Math.PI / 180);
        const deltaLat = toRad(lat2 - lat1);
        const deltaLon = toRad(lon2 - lon1);
        const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Function to find the closest tram stop to the venue (pre-calculate this)
    function findClosestStopToVenue(stops, venueLat, venueLon) {
        let closestStop = null;
        let shortestDistance = Infinity;

        stops.forEach((stop) => {
            const distance = haversine(venueLat, venueLon, stop.stop_latitude, stop.stop_longitude);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                closestStop = stop;
            }
        });
        return { closestStop, shortestDistance };
    }

    // Function to fetch gigs for today
    async function fetchGigs() {
        try {
            const response = await fetch(apiUrl);
            const gigs = await response.json();
            return gigs;
        } catch (error) {
            console.error("Error fetching gigs:", error);
            return [];
        }
    }

    // Function to fetch tram stops from the JSON file (as is)
    async function fetchTramStops() {
        const tramStops = await fetch('outgoing_route_11_stops.json').then(response => response.json());
        return tramStops;
    }

   // Function to fetch the next tram from the starting stop (Elizabeth St)
async function fetchNextTram(startStopId) {
    const requestPath = `/v3/departures/route_type/1/stop/${startStopId}?max_results=100`;
    const signedUrl = getSignedUrl(requestPath);
  
    try {
      const response = await fetch(signedUrl);
      if (response.ok) {
        const data = await response.json();
        const nextDepartures = data['departures'];
  
        if (!nextDepartures || nextDepartures.length === 0) {
          console.error("No departures found from the API.");
          return null;
        }
  
        // Find the next valid tram after the current time
        const currentTime = new Date();
        for (const departure of nextDepartures) {
          const estimatedDeparture = new Date(departure['estimated_departure_utc']);
          if (estimatedDeparture >= currentTime) {
            return {
              time: estimatedDeparture.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
              runId: departure['run_id']
            };
          }
        }
      } else {
        console.error(`Error fetching tram time: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error fetching tram data:", error);
    }
  
    return null;
  }
  
  // Fetch travel time between start and venue stop
  async function fetchTravelTime(runId, startStopId, venueStopId) {
    const requestPath = `/v3/pattern/run/${runId}/route_type/1`;
    const signedUrl = getSignedUrl(requestPath);
  
    try {
      const response = await fetch(signedUrl);
      if (response.ok) {
        const data = await response.json();
        const stops = data['departures'];
  
        let startTime = null;
        let venueTime = null;
  
        for (const stop of stops) {
          if (stop.stop_id === startStopId) {
            startTime = new Date(stop['scheduled_departure_utc']);
          }
          if (stop.stop_id === venueStopId) {
            venueTime = new Date(stop['scheduled_departure_utc']);
            break;
          }
        }
  
        if (startTime && venueTime) {
          const travelTime = (venueTime - startTime) / 60000; // Convert ms to minutes
          return travelTime;
        }
      }
    } catch (error) {
      console.error("Error fetching travel time:", error);
    }
  
    return null;
  }
  
  // Fetch travel time between start and venue stop
async function fetchTravelTime(runId, startStopId, venueStopId) {
    const requestPath = `/v3/pattern/run/${runId}/route_type/1`;
    const signedUrl = getSignedUrl(requestPath);
  
    try {
      const response = await fetch(signedUrl);
      if (response.ok) {
        const data = await response.json();
        const stops = data['departures'];
  
        let startTime = null;
        let venueTime = null;
  
        for (const stop of stops) {
          if (stop.stop_id === startStopId) {
            startTime = new Date(stop['scheduled_departure_utc']);
          }
          if (stop.stop_id === venueStopId) {
            venueTime = new Date(stop['scheduled_departure_utc']);
            break;
          }
        }
  
        if (startTime && venueTime) {
          const travelTime = (venueTime - startTime) / 60000; // Convert ms to minutes
          return travelTime;
        }
      }
    } catch (error) {
      console.error("Error fetching travel time:", error);
    }
  
    return null;
  }

    // Main function to render gig information with tram and walking details
    async function renderGigs(gigs, stops) {
        const startStopId = 2174; // Elizabeth St tram stop ID
        const maxDistance = 250; // Set the maximum distance to 250 meters

        for (const gig of gigs) {
            // Find the closest stop to the venue
            const { closestStop, shortestDistance } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);

            // Filter out gigs that are farther than the max distance
            if (shortestDistance > maxDistance) {
                continue; // Skip this gig if it's too far
            }

            const gigDiv = document.createElement("div");
            gigDiv.classList.add("gig");

            const title = document.createElement("div");
            title.classList.add("title");
            title.textContent = gig.name;

            const startTime = document.createElement("div");
            startTime.classList.add("details");
            const time = new Date(gig.start_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            startTime.textContent = `Starts at: ${time}`;

            const venue = document.createElement("a");
            venue.classList.add("venue");
            venue.textContent = gig.venue.name;
            venue.href = gig.venue.location_url || "#";
            venue.target = "_blank";

            const genres = gig.genre_tags.length ? `${gig.genre_tags.join(", ")}` : '';
            const genresDiv = document.createElement("div");
            genresDiv.textContent = genres;

            // Fetch the next tram from the starting stop
            const nextTram = await fetchNextTram(startStopId);

            // Calculate the travel time from the starting stop to the venue stop
            const travelTime = nextTram ? await fetchTravelTime(nextTram.runId, startStopId, closestStop.stop_id) : null;

            const nextTramDiv = document.createElement("div");
            nextTramDiv.classList.add("details");

            if (nextTram && travelTime !== null) {
                const arrivalTime = new Date();
                arrivalTime.setMinutes(arrivalTime.getMinutes() + travelTime + 5); // Add travel time and 5 mins walking

                nextTramDiv.innerHTML = `
                    <b>How to get there:</b><br>
                    Next number 11 tram from Elizabeth St (#${startStopId}) is at ${nextTram.time}.<br>
                    Get off at ${closestStop.stop_name} Stop (#${closestStop.stop_id}).<br>
                    The walking distance from tram stop to ${gig.venue.name} is ${Math.round(shortestDistance)} metres.
                    You will arrive by ${arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}.
                `;
            } else {
                nextTramDiv.textContent = "No valid tram data available.";
            }

            // Append to gigDiv
            gigDiv.appendChild(title);
            gigDiv.appendChild(genresDiv);
            gigDiv.appendChild(startTime);
            gigDiv.appendChild(venue);
            gigDiv.appendChild(nextTramDiv);

            // Add gigDiv to the gig list
            gigList.appendChild(gigDiv);
        }
    }

    // Initialize the app and fetch gigs and stops
    fetchGigs().then((gigs) => {
        fetchTramStops().then((stops) => {
            renderGigs(gigs, stops);
        });
    });
});
