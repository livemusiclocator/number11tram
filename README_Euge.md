Tram Line Gig Locator
Overview
This project is a web-based gig locator app built around the Melbourne Number 11 tram line. It shows upcoming gigs that are within walking distance or accessible by tram from different stops. Users can view gigs and receive directions on when to board the next tram or walk based on the tram schedule.

Features
Real-time tram data integration using the PTV API.
Stop and venue mapping along the Number 11 tram route.
Displays gigs organized by time categories such as "Underway", "Soon", and "Later on."
Smart walking and tram directions depending on the user's current location.
Filters out past stops based on tram sequence, ensuring users are directed to forward stops only.
Main Technologies
JavaScript (Frontend): Render functions, stop-sequence management, and event listeners.
PTV API: For tram schedules, route information, and real-time departures.
HTML/CSS: For basic web structure and styling.
Folder and File Structure
graphql
Copy code
├── app.js               # Main application logic (manages rendering, API calls, etc.)
├── config.js            # Configuration file with API keys and base URLs
├── fetchdata.js         # Fetch tram data, next tram, and venue arrival times
├── helpers.js           # Utility functions such as haversine, finding the closest stop
├── index.html           # Main entry point of the application
├── render.js            # Responsible for rendering gigs, directions, and tram information
├── stops.html           # Lists stops and basic stop-related info
├── outgoing_route_11_stops.json  # JSON file for tram stop mapping and sequences
└── README.md            # This file
How It Works
1. Fetching Gigs
The app pulls data from a gigs API for the current date and sorts them based on start time.

js
Copy code
export async function fetchGigs() {
    const response = await fetch(apiUrl);
    const gigs = await response.json();
    return gigs.sort((a, b) => new Date(a.start_timestamp) - new Date(b.start_timestamp));
}
2. Fetching Tram Data
The function fetchNextTram fetches real-time tram data, checks the outbound Number 11 tram schedule, and filters the next tram based on the current stop.

js
Copy code
export async function fetchNextTram(stopId) {
    const requestPath = `/v3/departures/route_type/1/stop/${stopId}?max_results=1&expand=run&expand=route`;
    const signedUrl = getSignedUrl(requestPath);
    const response = await fetch(signedUrl);
    const data = await response.json();
    // Filters for outbound Number 11 trams and checks tram schedule
}
3. Venue Arrival Calculations
The app calculates the expected arrival time for each venue based on tram data. If the venue stop matches the user's current stop, it directs them to walk.

js
Copy code
export async function calculateVenueArrivalTimes(gigs, nextTramData) {
    const tramRoute = await fetchTramRoute(nextTramData.runId);
    // Maps venues to tram stops and calculates expected arrival times
}
4. Rendering Gigs
The app organizes gigs into different time horizons: "Underway," "Soon," and "Later on." It also provides walking directions if the user is close enough to walk.

js
Copy code
function appendGigList(gigs, gigList, category, stops, nextTramData, venueArrivalTimes, venueStopMapping) {
    const currentStopId = new URLSearchParams(window.location.search).get('stopId');
    gigs.forEach((gig) => {
        // Renders gigs along with walking or tram directions
    });
}
Configuration
Ensure the config.js file includes valid API keys for accessing the PTV data.

js
Copy code
export const API_KEY = 'your-api-key';
export const DEVELOPER_ID = 'your-developer-id';
export const BASE_URL = 'https://timetableapi.ptv.vic.gov.au';
export const apiUrl = 'https://gigs.example.com';
How To Use
Clone the repository:

bash
Copy code
git clone https://github.com/your-repository/your-project.git
cd your-project
Install Dependencies (if any): Make sure all dependencies are properly installed by running npm or yarn.

API Configuration: Update the config.js file with your PTV API Key, Developer ID, and any other relevant configurations.

Run the Application: Serve the application using a simple web server or use the built-in functionality in VS Code:

bash
Copy code
live-server
Test the App: Open the app in your browser and select different tram stops to check for nearby gigs.

Known Issues
Some venues may have missing tram stop data.
In rare cases, tram sequence logic may filter out correct stops due to mismatches in the tram data.
Future Improvements
Improve stop-sequence handling to dynamically load from a centralized data source.
Optimize the rendering process for better performance on slower connections.
Add error handling for missing gig data or tram schedule discrepancies.