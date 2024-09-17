const { chromium } = require('playwright');
const fs = require('fs');

// Load the stops data from the JSON file (ensure the file path is correct)
const stopsData = JSON.parse(fs.readFileSync('outgoing_route_11_stops.json', 'utf8'));

// Ensure stopsData has unique stops based on stop_id
const uniqueStopsData = stopsData.reduce((acc, current) => {
    const x = acc.find(item => item.stop_id === current.stop_id);
    if (!x) {
        return acc.concat([current]);
    } else {
        return acc;
    }
}, []);

// Helper function for introducing delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getStopUrls() {
    const browser = await chromium.launch({ headless: false });  // Set headless: false for debugging
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });  // Force the viewport size

    console.log("Navigating to stops page...");
    // Load the stops.html page
    await page.goto('https://lml.live/number11tram/stops.html', { waitUntil: 'domcontentloaded' });

    // Introduce a delay to allow the page to fully load (e.g., 3 seconds)
    await page.waitForTimeout(3000); 

    // Debugging: Take a screenshot to see if the page loaded correctly
    await page.screenshot({ path: 'stops_page_debug.png' });
    console.log("Screenshot of stops page saved as 'stops_page_debug.png'.");

    // Extract the href attributes from the a tags inside each .stop div and remove duplicates
    const stopUrls = await page.evaluate(() => {
        console.log("Evaluating stop elements...");
        const stopElements = document.querySelectorAll('.stop a');
        const stopUrls = Array.from(stopElements).map(a => a.href);
        return [...new Set(stopUrls)];  // Remove duplicates by using a Set
    });

    console.log(`Found stop URLs:`, stopUrls);

    await browser.close();
    return stopUrls;
}

async function testStops() {
    const stopUrls = await getStopUrls();

    if (stopUrls.length === 0) {
        console.log('No stops found! Please verify if the stops page is correctly loading.');
        return;
    }

    const browser = await chromium.launch({ headless: false });  // Non-headless mode for visual debugging
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });  // Force the viewport size

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));  // Log browser console output

    let summary = {
        totalStops: 0,
        successfulStops: 0,
        skippedStops: 0,
        failedStops: 0
    };

    const detailedSummary = [];  // List to hold detailed pass/fail info for each stop

    // Create a Set to store processed stops and avoid duplicates
    const processedStops = new Set();

    for (const stopUrl of stopUrls) {
        if (processedStops.has(stopUrl)) {
            continue;  // Skip duplicate stop URLs
        }
        processedStops.add(stopUrl);

        console.log(`Testing stop: ${stopUrl}`);
        summary.totalStops++;

        let retries = 0;
        let maxRetries = 3;
        let success = false;

        while (retries < maxRetries && !success) {
            try {
                await page.goto(stopUrl, { waitUntil: 'domcontentloaded' });

                // Wait for gigs or check if "gigs are behind you" message appears
                const gigListSelector = '#gig-list > h2';
                const gigsBehindMessage = "they are all behind you";

                try {
                    await page.waitForSelector(gigListSelector, { timeout: 10000 });  // Wait for 10 seconds max

                    // Check if the page contains the message "gigs are behind you"
                    const bodyText = await page.textContent('body');
                    if (bodyText.includes(gigsBehindMessage)) {
                        console.log(`Stop URL: ${stopUrl}: PASS - Gigs are behind you`);
                        summary.skippedStops++;
                        detailedSummary.push({ stopUrl, result: 'Pass', reason: 'Gigs are behind' });
                        success = true;  // Mark this request as successful
                        break;  // Exit retry loop
                    }

                    // If there is no "behind you" message, check the gigs
                    const gigCount = await page.$$eval('.gig', gigs => gigs.length);
                    if (gigCount > 0) {
                        const stopName = await page.textContent('.stop-name');
                        const timeHorizon = await page.$eval('#gig-list > h2', el => el.textContent);
                        console.log(`Stop Name: ${stopName}, Time Horizon: ${timeHorizon}, Stop URL: ${stopUrl}: SUCCESS - ${gigCount} Gigs Found`);
                        summary.successfulStops++;
                        detailedSummary.push({ stopUrl, result: 'Pass', reason: 'Gigs found' });
                        success = true;  // Mark this request as successful
                        break;  // Exit retry loop
                    } else {
                        console.log(`Stop URL: ${stopUrl}: ERROR - No gigs found`);
                        summary.failedStops++;
                        detailedSummary.push({ stopUrl, result: 'Fail', reason: 'No gigs found' });
                        success = true;  // Mark as processed to avoid retrying
                        break;
                    }
                } catch (timeoutError) {
                    console.log(`Stop URL ${stopUrl}: ERROR - No gigs loaded within 10 seconds. Retrying...`);
                    retries++;
                    if (retries >= maxRetries) {
                        summary.failedStops++;
                        detailedSummary.push({ stopUrl, result: 'Fail', reason: 'Timeout' });
                        success = true;  // Mark as processed to avoid retrying
                    }
                }

            } catch (error) {
                console.log(`Stop URL ${stopUrl}: ERROR - ${error.message}. Retrying...`);
                retries++;
                if (retries >= maxRetries) {
                    summary.failedStops++;
                    detailedSummary.push({ stopUrl, result: 'Fail', reason: 'Error' });
                    success = true;  // Mark as processed to avoid retrying
                }
            }

            // Introduce a delay between requests (e.g., 2000ms = 2 seconds)
            await delay(1500);
        }
    }

    await browser.close();

    // Print overall summary
    console.log("--- Summary ---");
    console.log(`Total Stops Processed: ${summary.totalStops}`);
    console.log(`Successful Stops (with gigs): ${summary.successfulStops}`);
    console.log(`Skipped Stops (gigs behind you): ${summary.skippedStops}`);
    console.log(`Failed Stops (errors or no gigs): ${summary.failedStops}`);

    // Generate a detailed summary based on stop_sequence from the JSON data and sort it by sequence order
    console.log('--- Detailed Summary (in sequence order) ---');
    uniqueStopsData.sort((a, b) => a.stop_sequence - b.stop_sequence).forEach(stop => {
        const matchingStop = detailedSummary.find(item => item.stopUrl.includes(stop.stop_id));
        if (matchingStop) {
            console.log(`Stop: ${stop.stop_name}, Sequence: ${stop.stop_sequence}, Result: ${matchingStop.result}, Reason: ${matchingStop.reason}`);
        } else {
            console.log(`Stop: ${stop.stop_name}, Sequence: ${stop.stop_sequence}, Result: No data`);
        }
    });
}

testStops();
