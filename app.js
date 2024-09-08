import { fetchGigs, fetchTramStops, fetchNextTram, calculateVenueArrivalTimes } from './fetchData.js'; // Import fetchNextTram
import { renderGigs } from './render.js';
import { findClosestStopToVenue } from './helpers.js'; 

document.addEventListener("DOMContentLoaded", () => {
    const gigList = document.getElementById("gig-list");
    const MAX_DISTANCE_METERS = 400; 

    fetchGigs().then(gigs => {
        fetchTramStops().then(stops => {
            const nearbyGigs = gigs.filter(gig => {
                const { shortestDistance } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);
                return shortestDistance <= MAX_DISTANCE_METERS;
            });

            // Get the next tram data
            fetchNextTram().then(nextTramData => {
                calculateVenueArrivalTimes(nearbyGigs, nextTramData) // Pass nextTramData to calculateVenueArrivalTimes
                    .then(venueArrivalTimes => { 
                        renderGigs(nearbyGigs, stops, gigList, venueArrivalTimes, nextTramData); // Pass nextTramData to renderGigs
                    });
            });
        });
    });
});
