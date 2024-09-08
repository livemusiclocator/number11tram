import { fetchGigs, fetchTramStops, fetchNextTram, calculateVenueArrivalTimes } from './fetchData.js';
import { renderGigs } from './render.js';
import { findClosestStopToVenue } from './helpers.js'; 

document.addEventListener("DOMContentLoaded", () => {
    const gigList = document.getElementById("gig-list");
    const MAX_DISTANCE_METERS = 400; 

    // Fetch gigs, tram stops, and next tram data concurrently
    Promise.all([fetchGigs(), fetchTramStops(), fetchNextTram()])
        .then(([gigs, stops, nextTramData]) => { // Destructure the results
            // Now you have all the data you need

            const nearbyGigs = gigs.filter(gig => {
                const { shortestDistance } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);
                return shortestDistance <= MAX_DISTANCE_METERS;
            });

            calculateVenueArrivalTimes(nearbyGigs, nextTramData)
                .then(venueArrivalTimes => { 
                    renderGigs(nearbyGigs, stops, gigList, venueArrivalTimes, nextTramData); 
                });
        })
        .catch(error => {
            console.error("Error fetching data:", error);
        });
});
