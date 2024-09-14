import { formatToAMPM, haversine, findClosestStopToVenue } from '/number11tram/helpers.js';
import { timeConfig } from '/number11tram/config.js'; // Import timeConfig

// Render gigs
export async function renderGigs(gigs, stops, gigList, venueArrivalTimes, nextTramData, venueStopMapping) {  
    if (!nextTramData || !nextTramData.time) { 
        console.error("No valid tram found.");
        return;
    }

    console.log("Next tram found at:", nextTramData.time); 

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

        const venueLink = document.createElement("a");
        venueLink.href = gig.venue.location_url || "#";
        venueLink.target = "_blank";
        venueLink.textContent = gig.venue.name;

        const venueStopId = venueStopMapping[gig.venue.id];  // Use the passed venueStopMapping
        const urlParams = new URLSearchParams(window.location.search);
        const currentStopId = urlParams.get('stopId');

        console.log("Venue Stop ID for Venue", gig.venue.id, ":", venueStopId);
        console.log("Current Stop ID from URL:", currentStopId);

        let directionsText;

        if (venueStopId && venueStopId == currentStopId) {
            directionsText = `You can walk from here in 5 minutes or so. Click on "Venue Directions". Enjoy Live Music!`;
        } else {
            const arrivalTime = venueArrivalTimes[gig.venue.id];
            const gigStartTime = new Date(gig.start_timestamp);

            arrivalTime.setMinutes(arrivalTime.getMinutes() + 5);

            let timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;
            const roundedArrivalTime = new Date(Math.ceil(arrivalTime.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));

            if (timeDiffInMinutes > 0) {
                const hoursLate = Math.floor(timeDiffInMinutes / 60);
                const minutesLate = Math.round(timeDiffInMinutes % 60);
                directionsText = `You'll arrive ${hoursLate > 0 ? `${hoursLate} hour${hoursLate > 1 ? 's' : ''} and ` : ''}${minutesLate} minute${minutesLate > 1 ? 's' : ''} after the gig starts.`;
            } else if (timeDiffInMinutes < 0) {
                const hoursEarly = Math.floor(-timeDiffInMinutes / 60);
                const minutesEarly = Math.round(-timeDiffInMinutes % 60);
                directionsText = `If you get on the next tram, you'll arrive ${hoursEarly > 0 ? `${hoursEarly} hour${hoursEarly > 1 ? 's' : ''} and ` : ''}${minutesEarly} minute${minutesEarly > 1 ? 's' : ''} early.`;
            } else {
                directionsText = `You'll arrive just in time!`;
            }
        }

        gigDiv.appendChild(title);
        gigDiv.appendChild(genreTagsDiv);
        gigDiv.appendChild(venueLink);

        const directionsDiv = document.createElement("div");
        directionsDiv.textContent = directionsText;
        gigDiv.appendChild(directionsDiv);

        const directionsLink = document.createElement("a");
        directionsLink.href = gig.venue.location_url || "#";
        directionsLink.target = "_blank";
        directionsLink.textContent = "Venue Directions"; 
        gigDiv.appendChild(directionsLink);

        gigList.appendChild(gigDiv);
    });
}


// Append gigs to the page
function appendGigList(gigs, gigList, category, stops, nextTramData, venueArrivalTimes) {
    if (gigs.length === 0) return;

    const header = document.createElement("h2");
    header.textContent = category;
    header.style.borderTop = "1px solid #ddd";
    gigList.appendChild(header);

    const urlParams = new URLSearchParams(window.location.search);
    const currentStopId = urlParams.get('stopId');  // Get stopId from the URL

    console.log("Current Stop ID from URL:", currentStopId); // Debugging output

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

        // Venue link to location URL
        const venueLink = document.createElement("a");
        venueLink.href = gig.venue.location_url || "#";
        venueLink.target = "_blank";
        venueLink.textContent = gig.venue.name;

        // Determine venue stop ID (assuming the mapping is correct)
        const venueStopId = venueStopMapping[gig.venue.id];  // Venue's tram stop ID
        console.log("Venue Stop ID:", venueStopId, "Current Stop ID:", currentStopId);  // Debugging output

        let directionsText;

        if (venueStopId && venueStopId == currentStopId) {
            // If the user is at the venue stop
            directionsText = `You can walk from here in 5 minutes or so. Click on "Venue Directions". Enjoy Live Music!`;
        } else {
            // Regular tram directions logic
            const arrivalTime = venueArrivalTimes[gig.venue.id];
            const gigStartTime = new Date(gig.start_timestamp);

            arrivalTime.setMinutes(arrivalTime.getMinutes() + 5); // Add 5 minutes walking time

            let timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;
            const roundedArrivalTime = new Date(Math.ceil(arrivalTime.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));

            if (timeDiffInMinutes > 0) {
                const hoursLate = Math.floor(timeDiffInMinutes / 60);
                const minutesLate = Math.round(timeDiffInMinutes % 60);
                directionsText = `You'll arrive ${hoursLate > 0 ? `${hoursLate} hour${hoursLate > 1 ? 's' : ''} and ` : ''}${minutesLate} minute${minutesLate > 1 ? 's' : ''} after the gig starts.`;
            } else if (timeDiffInMinutes < 0) {
                const hoursEarly = Math.floor(-timeDiffInMinutes / 60);
                const minutesEarly = Math.round(-timeDiffInMinutes % 60);
                directionsText = `If you get on the next tram, you'll arrive ${hoursEarly > 0 ? `${hoursEarly} hour${hoursEarly > 1 ? 's' : ''} and ` : ''}${minutesEarly} minute${minutesEarly > 1 ? 's' : ''} early.`;
            } else {
                directionsText = `You'll arrive just in time!`;
            }
        }

        // Add elements to the gigDiv in the correct order
        gigDiv.appendChild(title);
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
