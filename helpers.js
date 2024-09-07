import { API_KEY, DEVELOPER_ID, BASE_URL } from './config.js';

// Get signed URL
export function getSignedUrl(requestPath) {
    const request = requestPath + (requestPath.includes('?') ? '&' : '?') + `devid=${DEVELOPER_ID}`;
    const signature = CryptoJS.HmacSHA1(request, API_KEY).toString(CryptoJS.enc.Hex);
    return `${BASE_URL}${request}&signature=${signature}`;
}

// Haversine distance calculation
export function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
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
