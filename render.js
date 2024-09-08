import { formatToAMPM, haversine, findClosestStopToVenue } from './helpers.js';

// Render gigs
export async function renderGigs(gigs, stops, gigList, venueArrivalTimes, nextTramData) {  

    if (!nextTramData || !nextTramData.time) { // Use nextTramData
        console.error("No valid tram found.");
        return;
    }

    console.log("Next tram found at:", nextTramData.time); // Use nextTramData



    const underway = [];
    const aboutToStart = [];
    const laterOn = [];

    gigs.forEach((gig) => {
        const gigStartTime = new Date(gig.start_timestamp);
        const arrivalTime = venueArrivalTimes[gig.venue.id]; 

        console.log("Gig:", gig.name, "Venue ID:", gig.venue.id); 
        console.log("Arrival Time:", arrivalTime); 

      
        console.log("Gig Start Time:", gigStartTime);
        console.log("Time Difference (minutes):", timeDiffInMinutes);
    

        if (arrivalTime) { 
            const timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;

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

    if (underway.length) appendGigList(underway, gigList, "Gigs Underway", stops); // Pass 'stops' here
    if (aboutToStart.length) appendGigList(aboutToStart, gigList, "Gigs About to Start", stops); // Pass 'stops' here
    if (laterOn.length) appendGigList(laterOn, gigList, "Gigs a Bit Later On", stops); // Pass 'stops' here
}
function appendGigList(gigs, gigList, category, stops) { // Add 'stops' here
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
        venueLink.href = gig.venue.ticketing_url || "#";
        venueLink.target = "_blank";
        venueLink.textContent = gig.venue.name;

        gigDiv.appendChild(title);
        gigDiv.appendChild(venueLink);
        gigList.appendChild(gigDiv);

        console.log("Venue Stop ID:", findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude).closestStop.stop_id);

    });
}
