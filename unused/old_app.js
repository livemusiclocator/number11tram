import { fetchGigs, fetchNextTram, calculateVenueArrivalTimes } from '/number11tram/fetchdata.js';
import { renderGigs } from '/number11tram/render.js'; 
import { findClosestStopToVenue } from '/number11tram/helpers.js'; 

document.addEventListener("DOMContentLoaded", () => {
    const gigList = document.getElementById("gig-list");
    const stopNamePlaceholder = document.getElementById("stop-name-placeholder");
    const MAX_DISTANCE_METERS = 400; 

    // Get stop ID from the URL query parameters (for QR code functionality)
    const urlParams = new URLSearchParams(window.location.search);
    const stopId = urlParams.get('stopId');

    if (!stopId) {
        console.error("No stopId found in the URL");
        return;
    }

    // Fetch gigs, tram stops, and next tram data concurrently
    Promise.all([fetchGigs(), fetchTramStops(), fetchNextTram(stopId)]) // Pass stopId to fetchNextTram
        .then(([gigs, stops, nextTramData]) => {
            // Find the specific stop that matches the stopId from the URL
            const currentStop = stops.find(stop => stop.stop_id === parseInt(stopId, 10));

            if (!currentStop) {
                console.error(`No tram stop found with stopId ${stopId}`);
                return;
            }
  
            console.log(`Current Stop: ${currentStop.stop_name}`);

            // Replace the placeholder text with the actual stop name
            stopNamePlaceholder.innerText = `Stop: ${currentStop.stop_name}`;

            // Filter nearby gigs to those within MAX_DISTANCE_METERS
            const nearbyGigs = gigs.filter(gig => {
                const { shortestDistance } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);
                return shortestDistance <= MAX_DISTANCE_METERS;
            });

            // Calculate arrival times for the gigs based on the next tram data
            calculateVenueArrivalTimes(nearbyGigs, nextTramData)
                .then(venueArrivalTimes => {
                    // Pass the venueStopMapping to the renderGigs function
                    renderGigs(nearbyGigs, stops, gigList, venueArrivalTimes, nextTramData, venueStopMapping);
                })
                .catch(error => {
                    console.error("Error calculating venue arrival times:", error);
                });
        })
        .catch(error => {
            console.error("Error fetching data:", error);
        });
});
