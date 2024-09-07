document.addEventListener("DOMContentLoaded", () => {
    const gigList = document.getElementById("gig-list");

    const API_KEY = 'f36b2876-d136-485d-8e06-f057c79c0998';
    const DEVELOPER_ID = '3002834';
    const BASE_URL = 'https://timetableapi.ptv.vic.gov.au';
    const startStopId = 2174; // Elizabeth St tram stop ID

    // Cache for venue stop information
    let cachedStops = {};

    // API URL to fetch gigs for today
    const apiUrl = `https://api.lml.live/gigs/query?location=melbourne&date_from=${new Date().toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`;

    // Function to generate the signed URL for PTV API
    function getSignedUrl(requestPath) {
        const request = requestPath + (requestPath.includes('?') ? '&' : '?') + `devid=${DEVELOPER_ID}`;
        const signature = CryptoJS.HmacSHA1(request, API_KEY).toString(CryptoJS.enc.Hex);
        return `${BASE_URL}${request}&signature=${signature}`;
    }

    // Haversine distance calculation function (for tram stop to venue distance)
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Radius of Earth in meters
        const toRad = (angle) => angle * (Math.PI / 180);
        const deltaLat = toRad(lat2 - lat1);
        const deltaLon = toRad(lon2 - lon1);
        const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Function to find the closest tram stop to the venue (cache the result)
    function findClosestStopToVenue(stops, venueLat, venueLon) {
        const cacheKey = `${venueLat},${venueLon}`;
        if (cachedStops[cacheKey]) {
            return cachedStops[cacheKey];
        }

        let closestStop = null;
        let shortestDistance = Infinity;

        stops.forEach((stop) => {
            const distance = haversine(venueLat, venueLon, stop.stop_latitude, stop.stop_longitude);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                closestStop = stop;
            }
        });

        cachedStops[cacheKey] = { closestStop, shortestDistance }; // Cache the closest stop for the venue
        return { closestStop, shortestDistance };
    }

    // Function to fetch gigs for today
    async function fetchGigs() {
        try {
            const response = await fetch(apiUrl);
            const gigs = await response.json();
            return gigs.sort((a, b) => new Date(a.start_timestamp) - new Date(b.start_timestamp)); // Sort by start time
        } catch (error) {
            console.error("Error fetching gigs:", error);
            return [];
        }
    }

    // Function to fetch tram stops (cached if possible)
    async function fetchTramStops() {
        try {
            const response = await fetch('/outgoing_route_11_stops.json');
            const tramStops = await response.json();
            return tramStops;
        } catch (error) {
            console.error("Error fetching tram stops:", error);
            return [];
        }
    }

    // Function to fetch the next tram (only once)
    async function fetchNextTram() {
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

    // Fetch travel time using the tram run ID
    async function fetchTravelTime(runId, venueStopId) {
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

    // Utility function to format time to AM/PM
    function formatToAMPM(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // The hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }

    // Render gigs
    async function renderGigs(gigs, stops) {
        const nextTram = await fetchNextTram(); // Fetch the next tram (only once)

        if (!nextTram || !nextTram.time) {
            console.error("No valid tram found.");
            return;
        }

        console.log("Next tram found at: " + nextTram.time);

        // Sort gigs by time horizons
        const underway = [];
        const aboutToStart = [];
        const laterOn = [];

        gigs.forEach((gig) => {
            const gigStartTime = new Date(gig.start_timestamp);
            const { closestStop, shortestDistance } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);

            // Fetch travel time
            fetchTravelTime(nextTram.runId, closestStop.stop_id).then(travelTime => {
                if (!travelTime) return; // Skip if no valid travel time

                const arrivalTime = new Date(nextTram.time);
                arrivalTime.setMinutes(arrivalTime.getMinutes() + travelTime);

                const timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;

                if (timeDiffInMinutes <= 0) underway.push(gig);
                else if (timeDiffInMinutes <= 30) aboutToStart.push(gig);
                else laterOn.push(gig);

                // Now render the sorted gigs after they are categorized
                appendGigList(underway, stops, "Gigs Underway");
                appendGigList(aboutToStart, stops, "Gigs about to Start");
                appendGigList(laterOn, stops, "Gigs a Bit Later On");
            }).catch(error => {
                console.error("Error calculating travel time for gig:", gig.name, error);
            });
        });
    }

    // Append gigs to the page under each category
    function appendGigList(gigs, stops, category) {
        if (gigs.length === 0) return;

        const header = document.createElement("h2");
        header.textContent = category;
        header.style.borderTop = "1px solid #ddd";
        gigList.appendChild(header);

        gigs.forEach((gig) => {
            const gigDiv = document.createElement("div");
            gigDiv.classList.add("gig");

            const title = document.createElement("div");
            title.classList.add("title");
            title.textContent = gig.name;

            const venueLink = document.createElement("a");
            venueLink.href = gig.venue.ticketing_url || "#"; // Default to "#" if no URL
            venueLink.target = "_blank";
            venueLink.textContent = gig.venue.name;

            gigDiv.appendChild(title);
            gigDiv.appendChild(venueLink);
            gigList.appendChild(gig)
                gigDiv.appendChild(title);
                gigDiv.appendChild(venueLink);
                gigList.appendChild(gigDiv);
            });
        }
    
        // Fetch gigs and stops and render them
        fetchGigs().then(gigs => {
            fetchTramStops().then(stops => {
                renderGigs(gigs, stops); // Make sure renderGigs waits for nextTram correctly
            });
        });
    });
    