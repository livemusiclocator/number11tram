import { fetchGigs, fetchTramStops, fetchNextTram, calculateVenueArrivalTimes } from './fetchdata.js';
import { renderGigs } from './render.js'; 
import { findClosestStopToVenue } from './helpers.js'; 

document.addEventListener("DOMContentLoaded", () => {
    const gigList = document.getElementById("gig-list");
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

            // Add stop name above the logo (before the header)
            const stopNameElement = document.createElement('h2');
            stopNameElement.classList.add('stop-name');
            stopNameElement.textContent = `Stop: ${currentStop.stop_name}`;
            
            const container = document.querySelector('.container');
            container.insertBefore(stopNameElement, container.firstChild);  // Insert stop name above the logo

            // Filter nearby gigs to those within MAX_DISTANCE_METERS
            const nearbyGigs = gigs.filter(gig => {
                const { shortestDistance } = findClosestStopToVenue(stops, gig.venue.latitude, gig.venue.longitude);
                return shortestDistance <= MAX_DISTANCE_METERS;
            });

            // Calculate arrival times for the gigs based on the next tram data
            calculateVenueArrivalTimes(nearbyGigs, nextTramData)
                .then(venueArrivalTimes => {
                    // Render the gigs to the UI
                    renderGigs(nearbyGigs, stops, gigList, venueArrivalTimes, nextTramData);
                })
                .catch(error => {
                    console.error("Error calculating venue arrival times:", error);
                });
        })
        .catch(error => {
            console.error("Error fetching data:", error);
        });
});
