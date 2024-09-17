import { formatToAMPM, haversine, findClosestStopToVenue } from '/number11tram/helpers.js';
import { timeConfig } from '/number11tram/config.js'; // Import timeConfig

// Render gigs based on stop sequence
export async function renderGigs(gigs, stops, gigList, venueArrivalTimes, nextTramData, venueStopMapping) {  
    if (!nextTramData || !nextTramData.time) { 
        console.error("No valid tram found.");
        return;
    }

    console.log("Next tram found at:", nextTramData.time);

    const currentTime = new Date();
    const urlParams = new URLSearchParams(window.location.search);
    const currentStopId = urlParams.get('stopId');  // Get stopId from the URL

    // Find the current stop from the JSON file and get its stop_sequence
    const currentStop = stops.find(stop => stop.stop_id == currentStopId);
    if (!currentStop) {
        console.error(`No stop found with stopId: ${currentStopId}`);
        return;
    }
    const currentStopSequence = currentStop.stop_sequence;
    console.log(`Current Stop: ${currentStop.stop_name}, Sequence: ${currentStopSequence}`);

    // Find the highest sequence number from venue stops
    const highestVenueStopSequence = gigs.reduce((maxSeq, gig) => {
        const venueStopId = venueStopMapping[gig.venue.id];
        const venueStop = stops.find(stop => stop.stop_id == venueStopId);
        return venueStop ? Math.max(maxSeq, venueStop.stop_sequence) : maxSeq;
    }, 0);
    console.log(`Highest Venue Stop Sequence: ${highestVenueStopSequence}`);

    // Check if the current stop is beyond all venue stops
    if (currentStopSequence > highestVenueStopSequence) {
        gigList.innerHTML = `
            <div style="text-align: center; margin-top: 20px;">
                <h2>If you want to catch a gig on the Number 11 tram line, they are all behind you. Cross the road and walk or tram back that way.</h2>
            </div>`;
        return;
    }

    // Function to categorize gigs and render them
    const categorizeAndRenderGigs = (category, timeLimit) => {
        const filteredGigs = gigs.filter(gig => {
            const venueStopId = venueStopMapping[gig.venue.id];
            const venueStop = stops.find(stop => stop.stop_id == venueStopId);
            const withinSequence = venueStop?.stop_sequence >= currentStopSequence;
            const withinTime = new Date(gig.start_timestamp) <= timeLimit;

            console.log(`Gig: ${gig.name}, Venue Stop Sequence: ${venueStop?.stop_sequence}, Within Sequence: ${withinSequence}`);
            return venueStop && withinSequence && withinTime;
        });

        appendGigList(filteredGigs, gigList, category, stops, nextTramData, venueArrivalTimes, venueStopMapping);
    };

    // Categorize gigs into "Underway", "Soon", and "Later"
    categorizeAndRenderGigs("Underway", currentTime);
    categorizeAndRenderGigs("Soon", new Date(currentTime.getTime() + 60 * 60 * 1000)); // within an hour
    categorizeAndRenderGigs("Later on", new Date(currentTime.getTime() + 24 * 60 * 60 * 1000));
}

// Append gigs to the page
function appendGigList(gigs, gigList, category, stops, nextTramData, venueArrivalTimes, venueStopMapping) {
    if (gigs.length === 0) return;

    const header = document.createElement("h2");
    header.textContent = category;
    header.style.borderTop = "1px solid #ddd";
    gigList.appendChild(header);

    const urlParams = new URLSearchParams(window.location.search);
    const currentStopId = urlParams.get('stopId');  // Get stopId from the URL
    const currentStopSequence = stops.find(stop => stop.stop_id == currentStopId)?.stop_sequence;

    gigs.forEach((gig) => {
        const gigDiv = document.createElement("div");
        gigDiv.classList.add("gig");

        const venueStopId = venueStopMapping[gig.venue.id];
        const venueStop = stops.find(stop => stop.stop_id == venueStopId);
        const venueStopSequence = venueStop?.stop_sequence;

        // Only render gig if it's within sequence
        if (venueStopSequence && currentStopSequence && currentStopSequence <= venueStopSequence) {
            console.log(`Rendering gig: ${gig.name}, Within Sequence`);

            const title = document.createElement("div");
            title.classList.add("title");

            const titleLink = document.createElement("a");
            titleLink.href = gig.ticketing_url || "#";
            titleLink.target = "_blank";
            titleLink.innerHTML = `<strong>${gig.name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())}</strong>`;
            title.appendChild(titleLink);

            const genreTagsDiv = document.createElement("div");
            genreTagsDiv.classList.add("genre-tags");
            if (gig.genre_tags && Array.isArray(gig.genre_tags) && gig.genre_tags.length > 0) {
                genreTagsDiv.innerHTML = `<i>${gig.genre_tags.join(', ')}</i>`;
            }

            const gigStartTime = new Date(gig.start_timestamp);
            const options = { hour: 'numeric', minute: 'numeric', hour12: true };
            const formattedStartTime = gigStartTime.toLocaleString('en-US', options).toLowerCase();

            const venueLink = document.createElement("a");
            venueLink.href = gig.venue.location_url || "#";
            venueLink.target = "_blank";
            venueLink.textContent = `${gig.venue.name}, ${formattedStartTime}`;

            gigDiv.appendChild(title);
            gigDiv.appendChild(genreTagsDiv);
            gigDiv.appendChild(venueLink);

            const directionsDiv = document.createElement("div");
            directionsDiv.textContent = "Venue Directions";
            gigDiv.appendChild(directionsDiv);

            const directionsLink = document.createElement("a");
            directionsLink.href = gig.venue.location_url || "#";
            directionsLink.target = "_blank";
            directionsLink.textContent = "Venue Directions";
            gigDiv.appendChild(directionsLink);

            gigList.appendChild(gigDiv);
        } else {
            console.log(`Skipping gig: ${gig.name}, Outside Sequence`);
        }
    });
}
