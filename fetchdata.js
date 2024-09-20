import { formatToAMPM, haversine, findClosestStopToVenue } from '/number11tram/helpers.js';
import { timeConfig } from '/number11tram/config.js'; // Import timeConfig

// Main render function to display gigs and provide directions based on current tram location
export async function renderGigs(gigs, stops, gigList, venueArrivalTimes, nextTramData, venueStopMapping) {  
    const currentTime = new Date();
    const urlParams = new URLSearchParams(window.location.search);
    const currentStopId = urlParams.get('stopId');  // Get stopId from the URL
    const routeId = urlParams.get('route_id');  // Get route_id from the URL
    const directionId = urlParams.get('direction_id');  // Get direction_id from the URL

    // Check if routeId and directionId are defined
    if (!routeId || !directionId) {
        console.error("Route ID or Direction ID is missing from URL parameters.");
        return;
    }

    // Find the current stop from the JSON file and get its stop_sequence
    const currentStop = stops.find(stop => stop.stop_id == currentStopId);
    if (!currentStop) {
        console.error(`No stop found with stopId: ${currentStopId}`);
        return;
    }

    const currentStopSequence = currentStop.stop_sequence;
    let directionText = directionId == 4 ? "Outbound" : "Inbound";
    console.log(`${directionText} Stop: ${currentStop.stop_name}, Sequence: ${currentStopSequence}`);

    // Update Stop name with direction info
    document.getElementById('stop-name-placeholder').textContent = `${directionText} Stop: ${currentStop.stop_name}`;

    // Find the highest sequence number from venue stops
    const highestVenueStopSequence = gigs.reduce((maxSeq, gig) => {
        const venueStopId = venueStopMapping[gig.venue.id];
        if (!venueStopId) return maxSeq; // Check if venueStopId exists
        const venueStop = stops.find(stop => stop.stop_id == venueStopId);
        return venueStop ? Math.max(maxSeq, venueStop.stop_sequence) : maxSeq;
    }, 0);
    console.log(`Highest Venue Stop Sequence: ${highestVenueStopSequence}`);

    // Redirect to stoptoofar.html if the current stop is beyond the highest venue stop sequence
    if (currentStopSequence > highestVenueStopSequence) {
        console.log(`Current stop is beyond all venue stops. Redirecting to stoptoofar.`);
        const stopId = currentStop.stop_id;  // Use stop_id for URL
        window.location.href = `stoptoofar.html?stopId=${stopId}&route_id=${routeId}&direction_id=${directionId}`;
        return;  // Ensure that we exit early and do not continue further
    }

    // Proceed with the rest of the logic for rendering gigs
    if (!nextTramData || !nextTramData.time) {
        console.error("No valid tram found.");
        return;
    }

    console.log("Next tram found at:", nextTramData.time);

    // Filter gigs based on time horizon and stop sequence
    const validGigs = gigs.filter(gig => {
        const venueStopId = venueStopMapping[gig.venue.id];
        if (!venueStopId) return false; // Check if venueStopId exists
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

// Append gigs to the page with time categories and walking/tram directions
function appendGigList(gigs, gigList, category, stops, nextTramData, venueArrivalTimes, venueStopMapping) {
    if (gigs.length === 0) return;

    const header = document.createElement("h2");
    header.textContent = category;
    header.style.borderTop = "1px solid #ddd";
    gigList.appendChild(header);

    const urlParams = new URLSearchParams(window.location.search);
    const currentStopId = urlParams.get('stopId');  // Get stopId from the URL
    const currentStop = stops.find(stop => stop.stop_id == currentStopId); // Get the current stop object

    gigs.forEach((gig) => {
        const gigDiv = document.createElement("div");
        gigDiv.classList.add("gig");

        const title = document.createElement("div");
        title.classList.add("title");

        // Gig title linked to ticketing URL
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

        // Format the gig start time without leading zeroes
        const gigStartTime = new Date(gig.start_timestamp);
        const options = { hour: 'numeric', minute: 'numeric', hour12: true };
        const formattedStartTime = gigStartTime.toLocaleString('en-US', options).toLowerCase(); // No leading zeroes

        // Venue link to location URL with start time
        const venueLink = document.createElement("a");
        venueLink.href = gig.venue.location_url || "#";
        venueLink.target = "_blank";
        venueLink.textContent = `${gig.venue.name}, ${formattedStartTime}`;

        const venueStopId = venueStopMapping[gig.venue.id];  // Use the passed venueStopMapping
        console.log(`Venue Stop ID for Venue ${gig.venue.id}: ${venueStopId}, Current Stop ID: ${currentStopId}`); // Log venue stop ID and current stop ID together

        let directionsText;

        if (venueStopId && venueStopId == currentStopId) {
            // Walking directions if venue stop matches the current stop
            directionsText = `You can walk from here in less than 5 minutes. Click on "Venue Directions". Enjoy Live Music!`;
        } else {
            const arrivalTime = venueArrivalTimes[gig.venue.id];
            if (!arrivalTime) {
                directionsText = `No tram data available.`;
            } else {
                arrivalTime.setMinutes(arrivalTime.getMinutes() + 5);  // Account for walking time from tram stop to venue

                let timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;
                const roundedArrivalTime = new Date(Math.ceil(arrivalTime.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));

                // Calculate number of stops ahead
                const venueStop = stops.find(stop => stop.stop_id == venueStopId);
                const stopsAhead = venueStop ? venueStop.stop_sequence - currentStop.stop_sequence : 0;

                // Add stops ahead info to directions text
                let stopsAheadText = stopsAhead > 0 ? `This gig is ${stopsAhead} tram stop${stopsAhead > 1 ? 's' : ''} ahead on this line.` : '';

                if (timeDiffInMinutes > 0) {
                    const hoursLate = Math.floor(timeDiffInMinutes / 60);
                    const minutesLate = Math.round(timeDiffInMinutes % 60);
                    directionsText = `${stopsAheadText} You'll arrive ${hoursLate > 0 ? `${hoursLate} hour${hoursLate > 1 ? 's' : ''} and ` : ''}${minutesLate} minute${minutesLate > 1 ? 's' : ''} after the gig starts.`;
                } else if (timeDiffInMinutes < 0) {
                    const hoursEarly = Math.floor(-timeDiffInMinutes / 60);
                    const minutesEarly = Math.round(-timeDiffInMinutes % 60);
                    directionsText = `${stopsAheadText} If you get on the next tram, you'll arrive ${hoursEarly > 0 ? `${hoursEarly} hour${hoursEarly > 1 ? 's' : ''} and ` : ''}${minutesEarly} minute${minutesEarly > 1 ? 's' : ''} early.`;
                } else {
                    directionsText = `${stopsAheadText} You'll arrive just in time!`;
                }
            }
        }

        // Add elements to the gigDiv in the correct order
        gigDiv.appendChild(title);
        gigDiv.appendChild(genreTagsDiv);
        gigDiv.appendChild(venueLink);

        const directionsDiv = document.createElement("div");
        directionsDiv.textContent = directionsText;
        gigDiv.appendChild(directionsDiv);

        // Add directions link as the last element
        const directionsLink = document.createElement("a");
        directionsLink.href = gig.venue.location_url || "#";
        directionsLink.target = "_blank";
        directionsLink.textContent = "Venue Directions"; 
        gigDiv.appendChild(directionsLink);

        gigList.appendChild(gigDiv);
    });
}

// Ensure that the script only runs when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
