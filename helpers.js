import { API_KEY, DEVELOPER_ID, BASE_URL } from './config.js';

let cachedStops = {}; // Cache for tram stops
let cachedTravelTimes = {}; // Cache for travel times

// Haversine distance calculation
export function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const toRad = (angle) => angle * (Math.PI / 180);
    const deltaLat = toRad(lat2 - lat1);
    const deltaLon = toRad(lon2 - lon1);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Function to find the closest tram stop to the venue (cache the result)
export function findClosestStopToVenue(stops, venueLat, venueLon) {
    const cacheKey = `${venueLat},${venueLon}`;
    if (cachedStops[cacheKey]) {
        return cachedStops[cacheKey];
    }

    let closestStop = null;
    let shortestDistance = Infinity;

    stops.forEach((stop) => {
        const distance = haversine(venueLat, venueLon, stop.stop_latitude, stop.stop_longitude);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            closestStop = stop;
        }
    });

    cachedStops[cacheKey] = { closestStop, shortestDistance }; // Cache the closest stop for the venue
    return { closestStop, shortestDistance };
}

// Get signed URL for the API
export function getSignedUrl(requestPath) {
    const request = requestPath + (requestPath.includes('?') ? '&' : '?') + `devid=${DEVELOPER_ID}`;
    const signature = CryptoJS.HmacSHA1(request, API_KEY).toString(CryptoJS.enc.Hex);
    return `${BASE_URL}${request}&signature=${signature}`;
}

// Cache tram stops to reduce redundant calls
export function getTramStops() {
    if (Object.keys(cachedStops).length > 0) {
        // Return cached stops
        return cachedStops;
    }

    // Fetch stops only if not cached
    return fetch('/number11tram/outgoing_route_11_stops.json')
        .then(response => response.json())
        .then(tramStops => {
            cachedStops = tramStops;
            return tramStops;
        })
        .catch(error => {
            console.error("Error fetching tram stops:", error);
            return [];
        });
}

// Format time to AM/PM
export function formatToAMPM(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

// Cache the next tram to avoid multiple API calls
let nextTramCache = null;
export function getNextTram() {
    return nextTramCache;
}

export function cacheNextTram(tramData) {
    nextTramCache = tramData;
}
