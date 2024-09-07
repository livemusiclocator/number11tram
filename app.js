document.addEventListener("DOMContentLoaded", () => {
    const gigList = document.getElementById("gig-list");
  
    const API_KEY = 'f36b2876-d136-485d-8e06-f057c79c0998';
    const DEVELOPER_ID = '3002834';
    const BASE_URL = 'https://timetableapi.ptv.vic.gov.au';
    const startStopId = 2174; // Elizabeth St tram stop ID
  
    // Always fetch gigs for today
    const apiUrl = `https://api.lml.live/gigs/query?location=melbourne&date_from=${new Date().toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`;
  
    // Function to generate the signed URL for PTV API
    function getSignedUrl(requestPath) {
      const request = requestPath + (requestPath.includes('?') ? '&' : '?') + `devid=${DEVELOPER_ID}`;
      const signature = CryptoJS.HmacSHA1(request, API_KEY).toString(CryptoJS.enc.Hex);
      return `${BASE_URL}${request}&signature=${signature}`;
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
  
    // Fetch gigs for today
    async function fetchGigs() {
      try {
        const response = await fetch(apiUrl);
        const gigs = await response.json();
        console.log("Gig data fetched:", gigs);  // Log the entire gig data
        return gigs;
      } catch (error) {
        console.error("Error fetching gigs:", error);
        return [];
      }
    }
  
    // Fetch tram stops
    async function fetchTramStops() {
      const tramStops = await fetch('/outgoing_route_11_stops.json').then(response => response.json());
      return tramStops;
    }
  
    // Fetch next tram from the starting stop
    async function fetchNextTram() {
      const requestPath = `/v3/departures/route_type/1/stop/${startStopId}?max_results=100`;
      const signedUrl = getSignedUrl(requestPath);
  
      try {
        const response = await fetch(signedUrl);
        if (response.ok) {
          const data = await response.json();
          const nextDepartures = data['departures'];
  
          const currentTime = new Date();
          for (const departure of nextDepartures) {
            const estimatedDeparture = new Date(departure['estimated_departure_utc']);
            if (estimatedDeparture >= currentTime) {
              console.log("Next tram found: " + estimatedDeparture.toLocaleTimeString());
              return {
                time: estimatedDeparture,
                runId: departure['run_id'],
              };
            }
          }
        } else {
          console.error("Error fetching tram time:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching tram data:", error);
      }
  
      return null;
    }
  
    // Function to fetch travel time between the starting stop and the venue stop
async function fetchTravelTime(runId, startStopId, venueStopId) {
    const requestPath = `/v3/pattern/run/${runId}/route_type/1`;
    const signedUrl = getSignedUrl(requestPath);

    try {
        const response = await fetch(signedUrl);
        if (response.ok) {
            const data = await response.json();
            console.log("Travel time API response:", data);  // Log the entire response here
            const stops = data['departures'];

            let startTime = null;
            let venueTime = null;

            stops.forEach((stop) => {
                console.log(`Checking stop: ${stop.stop_id}`);
                if (stop.stop_id === startStopId) {
                    startTime = new Date(stop['scheduled_departure_utc']);
                    console.log("Start time found:", startTime);
                }
                if (stop.stop_id === venueStopId) {
                    venueTime = new Date(stop['scheduled_departure_utc']);
                    console.log("Venue time found:", venueTime);
                }
            });

            if (startTime && venueTime) {
                const travelTime = (venueTime - startTime) / 60000; // Convert ms to minutes
                console.log(`Travel time calculated: ${travelTime} minutes`);
                return travelTime;
            } else {
                console.error(`No valid start or venue time found for run: ${runId}`);
                return null;
            }
        } else {
            console.error(`Error fetching travel time: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error fetching travel time:", error);
    }

    return null;
}

    // Utility function to format a date into AM/PM format
function formatToAMPM(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    let strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}
 
 // Utility function to round to nearest 5 minutes
function roundToNearest5Minutes(date) {
    const minutes = date.getMinutes();
    const remainder = minutes % 5;
    if (remainder >= 3) {
        date.setMinutes(minutes + (5 - remainder));
    } else {
        date.setMinutes(minutes - remainder);
    }
    return date;
}

// Utility function to round distances to the nearest 20 meters
function roundToNearest20Meters(distance) {
    return Math.round(distance / 20) * 20;
}


// Function to format the time difference more naturally
function formatTimeDifference(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60); // Round to nearest minute

    let formattedTime = "";
    if (hours > 0) {
        formattedTime += `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (remainingMinutes > 0) {
        if (hours > 0) {
            formattedTime += " and ";
        }
        formattedTime += `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    }
    return formattedTime;
}

// Render gigs with tram and walking details
async function renderGigs(gigs, stops) {
    const nextTram = await fetchNextTram(); // Fetch next tram once

    if (!nextTram || !nextTram.time) {
        console.error("No valid tram found.");
        return;
    }

    console.log("Next tram found: " + formatToAMPM(nextTram.time)); // Ensure the tram is found and logged

    for (const gig of gigs) {
        console.log(`Processing gig: ${gig.name}`);

        // Check if all necessary gig data exists before processing
        if (!gig.venue || !gig.venue.latitude || !gig.venue.longitude || !gig.venue.name) {
            console.error(`Missing data for gig ${gig.name}`);
            continue;
        }

        const { closestStop, shortestDistance } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);
        console.log(`Closest stop to venue: ${closestStop.stop_name}, Distance: ${shortestDistance}m`);

        // Skip gigs that are too far from any tram stop
        if (shortestDistance > 250) {
            console.log(`Skipping gig ${gig.name} because it's too far from tram stop.`);
            continue;
        }

        const travelTime = await fetchTravelTime(nextTram.runId, 2174, closestStop.stop_id); // Get travel time for each gig

        if (travelTime === null) {
            console.error(`No valid travel time found for gig ${gig.name}`);
            continue; // Skip this gig if no travel time is found
        }

        console.log(`Travel time for gig ${gig.name}: ${travelTime} minutes`);

        // Create the gig div
        const gigDiv = document.createElement("div");
        gigDiv.classList.add("gig");

        // Create the gig title (gig name)
        const title = document.createElement("div");
        title.classList.add("title");
        title.textContent = gig.name;

        // Create the venue link (hyperlinked to ticketing URL)
        const venueLink = document.createElement("a");
        venueLink.href = gig.venue.ticketing_url || "#";  // Default to "#" if no URL
        venueLink.target = "_blank";
        venueLink.textContent = gig.venue.name;

        // Format gig start time
        const gigStartTime = new Date(gig.start_timestamp);
        const formattedGigStartTime = formatToAMPM(gigStartTime);

        // Calculate arrival time
        const arrivalTime = new Date(nextTram.time);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + travelTime + 5); // Add 5 minutes walking time
        const roundedArrivalTime = roundToNearest5Minutes(arrivalTime);  // Round to nearest 5 mins

        // Calculate time differences
        const timeDiffInMinutes = (roundedArrivalTime - gigStartTime) / 60000;

        // Create the next tram and walking details
        const nextTramDiv = document.createElement("div");

        if (travelTime !== null && nextTram.time) {
            let arrivalMessage = '';
            if (timeDiffInMinutes < 0) {
                const beforeGigTime = Math.abs(timeDiffInMinutes);
                const formattedTimeDiff = formatTimeDifference(beforeGigTime);
                arrivalMessage = `You will arrive around ${formatToAMPM(roundedArrivalTime)}, around ${formattedTimeDiff} before the gig probably starts.`;
            } else if (timeDiffInMinutes <= 45) {
                arrivalMessage = `Gig: ${gig.name} at ${gig.venue.name} has just started at ${formattedGigStartTime}. You will probably arrive during the first set.`;
            } else if (timeDiffInMinutes <= 90) {
                arrivalMessage = `Gig: ${gig.name} at ${gig.venue.name} started at ${formattedGigStartTime}. You will probably arrive during the second set.`;
            } else if (timeDiffInMinutes <= 160) {
                arrivalMessage = `Gig: ${gig.name} at ${gig.venue.name} started at ${formattedGigStartTime}. If you are lucky you might catch a set.`;
            } else {
                arrivalMessage = `Gig: ${gig.name} at ${gig.venue.name} started at ${formattedGigStartTime}. If you are lucky you might see some music before it finishes.`;
            }

            nextTramDiv.innerHTML = `
                Genres: ${gig.genre_tags.join(', ')}<br>
                <strong>Starts at: ${formattedGigStartTime}</strong><br>
                Next tram from Elizabeth St at ${formatToAMPM(nextTram.time)}.<br>
                Get off at ${closestStop.stop_name}.<br>
                The walking distance from tram stop to ${gig.venue.name} is ${roundToNearest20Meters(shortestDistance)} meters.<br>
                ${arrivalMessage}<br>
                <a href="${gig.venue.location_url || '#'}" target="_blank">Here is a navigation link to the venue</a>
            `;
        } else {
            console.error(`No valid tram or travel data for gig ${gig.name}`);
            nextTramDiv.textContent = "No valid tram data available.";
        }

        // Append all elements to gigDiv
        gigDiv.appendChild(title);
        gigDiv.appendChild(venueLink);
        gigDiv.appendChild(nextTramDiv);

        // Append the gigDiv to the gigList container
        gigList.appendChild(gigDiv);
    }
}


  // Initialize app
  fetchGigs().then(gigs => {
    fetchTramStops().then(stops => {
      renderGigs(gigs, stops);
    });
  });
});
