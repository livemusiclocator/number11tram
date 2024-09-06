document.addEventListener("DOMContentLoaded", () => {
    const gigList = document.getElementById("gig-list");
  
    // PTV API credentials
    const API_KEY = 'f36b2876-d136-485d-8e06-f057c79c0998'; // Your actual API key
    const DEVELOPER_ID = '3002834'; // Your actual developer ID
    const BASE_URL = 'https://timetableapi.ptv.vic.gov.au';
  
    // Function to generate today's date in the required format (YYYY-MM-DD)
    function getTodayDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Dynamically generate the gig API URL for today
    const apiUrl = `https://api.lml.live/gigs/query?location=melbourne&date_from=${getTodayDate()}&date_to=${getTodayDate()}`;
  
    // Function to generate the signed URL for PTV API using CryptoJS
    function getSignedUrl(requestPath) {
      const devId = DEVELOPER_ID;
      const key = API_KEY;
  
      const request = requestPath + (requestPath.includes('?') ? '&' : '?') + `devid=${devId}`;
      const raw = request;
  
      // Use CryptoJS to generate HMAC-SHA1 signature
      const signature = CryptoJS.HmacSHA1(raw, key).toString(CryptoJS.enc.Hex);
  
      return `${BASE_URL}${raw}&signature=${signature}`;
    }
  
    // Function to fetch the next tram using PTV API
    async function fetchNextTram(stop_id) {
      const requestPath = `/v3/departures/route_type/1/stop/${stop_id}?max_results=100`;
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
  
          const currentTime = new Date();
          for (const departure of nextDepartures) {
            const estimatedDeparture = departure['estimated_departure_utc'];
            if (!estimatedDeparture) {
              continue; // Skip trams with missing departure times
            }
  
            const nextDepartureTime = new Date(estimatedDeparture);
            if (nextDepartureTime >= currentTime) {
              return {
                time: nextDepartureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                stopId: departure['stop_id'],
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
  
      return null; // Return null if no valid tram is found
    }
  
    // Function to fetch gigs
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
  
    // Function to render gigs
    async function renderGigs(gigs) {
      // Sort gigs by start time
      gigs.sort((a, b) => new Date(a.start_timestamp) - new Date(b.start_timestamp));
  
      for (const gig of gigs) {
        const gigDiv = document.createElement("div");
        gigDiv.classList.add("gig");
  
        // Build the gig info
        const title = document.createElement("div");
        title.classList.add("title");
        title.textContent = gig.name;
  
        const startTime = document.createElement("div");
        startTime.classList.add("details");
        const time = new Date(gig.start_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        startTime.textContent = `Starts at: ${time}`;
  
        // Create clickable venue link to Google Maps
        const venue = document.createElement("a");
        venue.classList.add("venue");
        venue.textContent = gig.venue.name;
        venue.href = gig.venue.location_url || "#"; // Default to "#" if no URL
        venue.target = "_blank"; // Open link in a new tab
  
        // Display genres directly under the gig name
        const genres = gig.genre_tags.length ? `${gig.genre_tags.join(", ")}` : '';
        const genresDiv = document.createElement("div");
        genresDiv.textContent = genres;
  
        // Get the next tram data
        const stop_id = 2174; // Replace this with actual stop ID based on gig or user's location
        const nextTram = await fetchNextTram(stop_id);
        const nextTramDiv = document.createElement("div");
        nextTramDiv.classList.add("details");
  
        if (nextTram) {
          nextTramDiv.innerHTML = `<b>How to get there:</b><br>Next number 11 tram from Exhibition St/Collins St #7 is at ${nextTram.time}.`;
        } else {
          nextTramDiv.textContent = "No valid trams found at this time.";
        }
  
        // Tram and walking info
        const stopInfo = `Get off the number 11 tram at the closest stop (hardcode or calculate this for now)`;
        const walkingDistance = `The walking distance from tram stop to ${gig.venue.name} is 185 metres. Follow the google maps directions.`;
  
        const additionalInfo = document.createElement("div");
        additionalInfo.classList.add("details");
        additionalInfo.textContent = `${stopInfo}\n${walkingDistance}`;
  
        // Append to the gig div
        gigDiv.appendChild(title);
        gigDiv.appendChild(genresDiv); // Add genres under title
        gigDiv.appendChild(startTime);
        gigDiv.appendChild(venue);
        gigDiv.appendChild(nextTramDiv); // Add next tram info
        gigDiv.appendChild(additionalInfo);
  
        // Add gig to the list
        gigList.appendChild(gigDiv);
      }
    }
  
    // Initialize the app
    fetchGigs().then(renderGigs);
});
