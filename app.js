import { fetchGigs, fetchTramStops, fetchNextTram, fetchTravelTime } from './fetchdata.js';
import { renderGigs } from './render.js';

document.addEventListener("DOMContentLoaded", () => {
    const gigList = document.getElementById("gig-list");

    // Fetch gigs and stops and render them
    fetchGigs().then(gigs => {
        fetchTramStops().then(stops => {
            renderGigs(gigs, stops, gigList); // Make sure renderGigs waits for nextTram correctly
        });
    });
});
