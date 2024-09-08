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

        // Declare timeDiffInMinutes here
        let timeDiffInMinutes;

        if (arrivalTime) { 
            timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;
            console.log("Time Difference (minutes):", timeDiffInMinutes); 

            if (timeDiffInMinutes <= 0) {
                underway.push(gig);
            } else if (timeDiffInMinutes <= 30) {
                aboutToStart.push(gig);
            } else {
                laterOn.push(gig);
            }
        } else {
            console.warn(`No arrival time found for gig: ${gig.name} at venue: ${gig.venue.name}`);
        }
    });

    if (underway.length) appendGigList(underway, gigList, "Gigs Underway", stops); 
    if (aboutToStart.length) appendGigList(aboutToStart, gigList, "Gigs About to Start", stops); 
    if (laterOn.length) appendGigList(laterOn, gigList, "Gigs a Bit Later On", stops); 
}

// appendGigList remains unchanged
function appendGigList(gigs, gigList, category, stops) { 
    // ... (your existing appendGigList code)
}
