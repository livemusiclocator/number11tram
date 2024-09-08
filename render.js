import { formatToAMPM, haversine, findClosestStopToVenue } from './helpers.js';

// Render gigs
export async function renderGigs(gigs, stops, gigList, venueArrivalTimes, nextTramData) {  

    if (!nextTramData || !nextTramData.time) { 
        console.error("No valid tram found.");
        return;
    }

    console.log("Next tram found at:", nextTramData.time); 

    const underway = [];
    const aboutToStart = [];
    const laterOn = [];

    gigs.forEach((gig) => {
        const gigStartTime = new Date(gig.start_timestamp);
        const arrivalTime = venueArrivalTimes[gig.venue.id]; 

        console.log("Gig:", gig.name, "Venue ID:", gig.venue.id); 
        console.log("Arrival Time:", arrivalTime); 
        console.log("Gig Start Time:", gigStartTime); 

        let timeDiffInMinutes;

        if (arrivalTime) { 
            timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;
            console.log("Time Difference (minutes):", timeDiffInMinutes); 

            // Corrected categorization logic
            if (timeDiffInMinutes > 0) { // Arrival time must be AFTER gig start time for "underway"
                underway.push(gig);
            } else if (timeDiffInMinutes <= 30 && timeDiffInMinutes >= 0) { // Arrival time within 30 minutes BEFORE gig start time
                aboutToStart.push(gig);
            } else {
                laterOn.push(gig);
            }
        } else {
           console.warn(`No arrival time found for gig: ${gig.name} at venue: ${gig.venue.name}`);
        }
    });

    if (underway.length) appendGigList(underway, gigList, "Gigs Underway", stops, nextTramData, venueArrivalTimes); 
    if (aboutToStart.length) appendGigList(aboutToStart, gigList, "Gigs About to Start", stops, nextTramData, venueArrivalTimes); 
    if (laterOn.length) appendGigList(laterOn, gigList, "Gigs a Bit Later On", stops, nextTramData, venueArrivalTimes); 
}

// Append gigs to the page
function appendGigList(gigs, gigList, category, stops, nextTramData, venueArrivalTimes) { 
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

        // Genre tags (handle missing genres)
        const genreTagsDiv = document.createElement("div");
        genreTagsDiv.classList.add("genre-tags");
        if (gig.genres && Array.isArray(gig.genres) && gig.genres.length > 0) {
            genreTagsDiv.textContent = gig.genres.join(', '); 
        } // Otherwise, leave genreTagsDiv empty

        // Venue link to ticketing URL
        const venueLink = document.createElement("a");
        venueLink.href = gig.venue.ticketing_url || "#";
        venueLink.target = "_blank";
        venueLink.textContent = gig.venue.name;

        // Calculate and display arrival time and time difference
        const arrivalTime = venueArrivalTimes[gig.venue.id];
        const roundedArrivalTime = new Date(Math.ceil(arrivalTime.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000)); // Round to next 5 minutes
        const gigStartTime = new Date(gig.start_timestamp);
        let timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;

        const arrivalTimeDiv = document.createElement("div");
        arrivalTimeDiv.textContent = `Next Tram Arrival: ${formatToAMPM(roundedArrivalTime)}`;

        const timeDiffDiv = document.createElement("div");
        if (timeDiffInMinutes > 0) {
            const hoursLate = Math.floor(timeDiffInMinutes / 60);
            const minutesLate = Math.round(timeDiffInMinutes % 60);
            timeDiffDiv.textContent = `You'll arrive ${hoursLate > 0 ? `${hoursLate} hour${hoursLate > 1 ? 's' : ''} and ` : ''}${minutesLate} minute${minutesLate > 1 ? 's' : ''} late.`;
        } else if (timeDiffInMinutes < 0) {
            const hoursEarly = Math.floor(-timeDiffInMinutes / 60);
            const minutesEarly = Math.round(-timeDiffInMinutes % 60);
            timeDiffDiv.textContent = `You'll arrive ${hoursEarly > 0 ? `${hoursEarly} hour${hoursEarly > 1 ? 's' : ''} and ` : ''}${minutesEarly} minute${minutesEarly > 1 ? 's' : ''} early.`;
        } else {
            timeDiffDiv.textContent = `You'll arrive just in time!`;
        }

        // Add elements to the gigDiv
        gigDiv.appendChild(title);
        gigDiv.appendChild(genreTagsDiv); // Add genre tags
        gigDiv.appendChild(venueLink);
        gigDiv.appendChild(arrivalTimeDiv);
        gigDiv.appendChild(timeDiffDiv);
        gigList.appendChild(gigDiv);
    });
}