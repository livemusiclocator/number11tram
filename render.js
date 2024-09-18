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

    // Check if the current stop is a venue stop
    const isVenueStop = Object.values(venueStopMapping).includes(currentStopId);
    if (isVenueStop) {
        console.log(`The current stop (${currentStop.stop_name}) is a venue stop.`);
    } else {
        console.log(`The current stop (${currentStop.stop_name}) is NOT a venue stop.`);
    }

    // Find the highest sequence number from venue stops
    const highestVenueStopSequence = gigs.reduce((maxSeq, gig) => {
        const venueStopId = venueStopMapping[gig.venue.id];
        const venueStop = stops.find(stop => stop.stop_id == venueStopId);
        return venueStop ? Math.max(maxSeq, venueStop.stop_sequence) : maxSeq;
    }, 0);
    console.log(`Highest Venue Stop Sequence: ${highestVenueStopSequence}`);

    // Check if the current stop is beyond all venue stops
    if (currentStopSequence > highestVenueStopSequence) {
        const stopId = currentStop.stop_id;  // Use stop_id for URL
        window.location.href = `stoptoofar.html?stopId=${stopId}`;
        return;
    }

    // Filter gigs based on time horizon and stop sequence
    const validGigs = gigs.filter(gig => {
        const venueStopId = venueStopMapping[gig.venue.id];
        const venueStop = stops.find(stop => stop.stop_id == venueStopId);

        // Check if the venue stop is within the current stop sequence
        if (!venueStop || venueStop.stop_sequence < currentStopSequence) {
            console.log(`Skipping gig: ${gig.name}, Outside Sequence`);
            return false;
        }

        console.log(`Gig: ${gig.name}, Venue Stop Sequence: ${venueStop.stop_sequence}, Within Sequence: true`);
        return true;
    });

    // If no valid gigs are found
    if (validGigs.length === 0) {
        gigList.innerHTML = `
            <div style="text-align: center; margin-top: 20px;">
                <h2>No gigs available at this stop currently.</h2>
            </div>`;
        return;
    }

    // Categorize and render gigs
    const underway = validGigs.filter(gig => new Date(gig.start_timestamp) <= currentTime);
    const soon = validGigs.filter(gig => new Date(gig.start_timestamp) > currentTime && new Date(gig.start_timestamp) <= new Date(currentTime.getTime() + 60 * 60 * 1000)); // within an hour
    const later = validGigs.filter(gig => new Date(gig.start_timestamp) > new Date(currentTime.getTime() + 60 * 60 * 1000));

    appendGigList(underway, gigList, "Underway", stops, nextTramData, venueArrivalTimes, venueStopMapping);
    appendGigList(soon, gigList, "Soon", stops, nextTramData, venueArrivalTimes, venueStopMapping);
    appendGigList(later, gigList, "Later on", stops, nextTramData, venueArrivalTimes, venueStopMapping);
}


// Append gigs to the page
function appendGigList(gigs, gigList, category, stops, nextTramData, venueArrivalTimes, venueStopMapping) {
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
    });
}
