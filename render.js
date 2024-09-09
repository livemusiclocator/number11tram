import { formatToAMPM, haversine, findClosestStopToVenue } from './helpers.js';
import { timeConfig } from './config.js'; // Import timeConfig

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

            // Apply business logic: exclude gigs beyond 130 minutes late
            if (timeDiffInMinutes > 130) {
                console.log(`Excluding gig ${gig.name} because it's more than 130 minutes late.`);
                return; // Skip to the next gig
            }

            // Use actual or test time based on config
            const currentTime = timeConfig.useTestTime ? new Date(timeConfig.testTime) : new Date();

            // Calculate time difference based on currentTime
            timeDiffInMinutes = (arrivalTime - currentTime) / 60000;

            // Corrected categorization logic
            if (arrivalTime > currentTime && gigStartTime < currentTime) { // Underway: tram arrives after gig has started
                underway.push(gig);
            } else if (arrivalTime <= currentTime && arrivalTime >= currentTime - 30 * 60 * 1000) { // About to Start: tram arrives within 30 minutes before the CURRENT TIME
                aboutToStart.push(gig);
            } else { // Later On: more than 30 minutes before start
                laterOn.push(gig);
            }
        } else {
           console.warn(`No arrival time found for gig: ${gig.name} at venue: ${gig.venue.name}`);
        }
    });

    if (underway.length) appendGigList(underway, gigList, "These gigs will probably be underway when you get there", stops, nextTramData, venueArrivalTimes); 
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

        // Gig title linked to ticketing URL
        const titleLink = document.createElement("a");
        titleLink.href = gig.ticketing_url || "#";
        titleLink.target = "_blank";
        titleLink.innerHTML = `<strong>${gig.name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())}</strong>`;
        title.appendChild(titleLink);

        // Genre tags (handle missing genres and italicize)
        const genreTagsDiv = document.createElement("div");
        genreTagsDiv.classList.add("genre-tags");
        if (gig.genre_tags && Array.isArray(gig.genre_tags) && gig.genre_tags.length > 0) {
            genreTagsDiv.innerHTML = `<i>${gig.genre_tags.join(', ')}</i>`; // Italicize genre tags
        } // Otherwise, leave genreTagsDiv empty

        // Venue link to location URL
        const venueLink = document.createElement("a");
        venueLink.href = gig.venue.location_url || "#";
        venueLink.target = "_blank";
        venueLink.textContent = gig.venue.name;

        // Calculate and display arrival time and time difference
        const arrivalTime = venueArrivalTimes[gig.venue.id];
        const gigStartTime = new Date(gig.start_timestamp);

        // Add 5 minutes walking time
        arrivalTime.setMinutes(arrivalTime.getMinutes() + 5);

        let timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;

        // Round arrivalTime AFTER calculating time difference
        const roundedArrivalTime = new Date(Math.ceil(arrivalTime.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));

        const arrivalTimeDiv = document.createElement("div");
        arrivalTimeDiv.textContent = `Next Tram from this stop will get you to the venue around: ${formatToAMPM(roundedArrivalTime)}`;

        const timeDiffDiv = document.createElement("div");
        if (timeDiffInMinutes > 0) {
            const hoursLate = Math.floor(timeDiffInMinutes / 60);
            const minutesLate = Math.round(timeDiffInMinutes % 60);
            timeDiffDiv.textContent = `You'll arrive ${hoursLate > 0 ? `${hoursLate} hour${hoursLate > 1 ? 's' : ''} and ` : ''}${minutesLate} minute${minutesLate > 1 ? 's' : ''} after the gig starts.`;
        } else if (timeDiffInMinutes < 0) {
            const hoursEarly = Math.floor(-timeDiffInMinutes / 60);
            const minutesEarly = Math.round(-timeDiffInMinutes % 60);
            // Rephrase "early" message for "later on" category
            if (category === "Gigs a Bit Later On") {
                timeDiffDiv.textContent = `If you get on the next tram, you'll arrive ${hoursEarly > 0 ? `${hoursEarly} hour${hoursEarly > 1 ? 's' : ''} and ` : ''}${minutesEarly} minute${minutesEarly > 1 ? 's' : ''} early.`;
            } else {
                timeDiffDiv.textContent = `You'll arrive ${hoursEarly > 0 ? `${hoursEarly} hour${hoursEarly > 1 ? 's' : ''} and ` : ''}${minutesEarly} minute${minutesEarly > 1 ? 's' : ''} early.`;
            }
        } else {
            timeDiffDiv.textContent = `You'll arrive just in time!`;
        }

        // Start time info under venue name
        const startTimeDiv = document.createElement("div");
        startTimeDiv.textContent = `${formatToAMPM(gigStartTime).replace(' ', '').toUpperCase()}`; // Shortened phrasing

        // Add elements to the gigDiv in the correct order
        gigDiv.appendChild(title);
        gigDiv.appendChild(genreTagsDiv); // Add genre tags
        gigDiv.appendChild(venueLink); // Venue name is now a link
        gigDiv.appendChild(startTimeDiv); // Start time under venue
        gigDiv.appendChild(arrivalTimeDiv);
        gigDiv.appendChild(timeDiffDiv);

        // Add directions link as the LAST element
        const directionsLink = document.createElement("a");
        directionsLink.href = gig.venue.location_url || "#";
        directionsLink.target = "_blank";
        directionsLink.textContent = "Venue Directions"; // Changed text
        gigDiv.appendChild(directionsLink);

        gigList.appendChild(gigDiv);
    });
}