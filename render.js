import { fetchTravelTime, fetchNextTram } from './fetchdata.js';
import { formatToAMPM, haversine } from './helpers.js';

// Render gigs
export async function renderGigs(gigs, stops, gigList) {
    const nextTram = await fetchNextTram();

    if (!nextTram || !nextTram.time) {
        console.error("No valid tram found.");
        return;
    }

    const underway = [];
    const aboutToStart = [];
    const laterOn = [];

    gigs.forEach((gig) => {
        const gigStartTime = new Date(gig.start_timestamp);
        const { closestStop, shortestDistance } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);

        fetchTravelTime(nextTram.runId, closestStop.stop_id).then(travelTime => {
            if (!travelTime) return;

            const arrivalTime = new Date(nextTram.time);
            arrivalTime.setMinutes(arrivalTime.getMinutes() + travelTime);

            const timeDiffInMinutes = (arrivalTime - gigStartTime) / 60000;

            if (timeDiffInMinutes <= 0) underway.push(gig);
            else if (timeDiffInMinutes <= 30) aboutToStart.push(gig);
            else laterOn.push(gig);

            appendGigList(underway, stops, gigList, "Gigs Underway");
            appendGigList(aboutToStart, stops, gigList, "Gigs about to Start");
            appendGigList(laterOn, stops, gigList, "Gigs a Bit Later On");
        }).catch(error => {
            console.error("Error calculating travel time for gig:", gig.name, error);
        });
    });
}

// Append gigs to the page
function appendGigList(gigs, stops, gigList, category) {
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
        venueLink.href = gig.venue.ticketing_url || "#";
        venueLink.target = "_blank";
        venueLink.textContent = gig.venue.name;

        gigDiv.appendChild(title);
        gigDiv.appendChild(venueLink);
        gigList.appendChild(gigDiv);
    });
}
