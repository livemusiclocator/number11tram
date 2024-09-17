export const DEVELOPER_ID = '3002834';
export const API_KEY = 'f36b2876-d136-485d-8e06-f057c79c0998';
export const BASE_URL = 'https://timetableapi.ptv.vic.gov.au';
export const apiUrl = `https://api.lml.live/gigs/query?location=melbourne&date_from=${new Date().toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`;

console.log('API URL in config.js:', apiUrl);  // Add this log


// Time configuration
export const timeConfig = {
    useTestTime: false, // Set to true to use test time, false for actual time
    testTime: new Date().setHours(12, 58, 0, 0) // Set a test time (e.g., 9 PM)
};
