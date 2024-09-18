const { chromium } = require('playwright');
const fs = require('fs');

// Helper function to log to both console and file
function logToFileAndConsole(message) {
    console.log(message);
    fs.appendFileSync('tramtests.log', message + '\n', (err) => {
        if (err) throw err;
    });
}

// Function to take a screenshot on failure
async function takeFailureScreenshot(page, stopUrl) {
    const stopId = stopUrl.split('stopId=')[1];
    const screenshotPath = `./screenshots/failure_stop_${stopId}.png`;
    await page.screenshot({ path: screenshotPath });
    logToFileAndConsole(`Screenshot saved for failed stop: ${stopUrl} at ${screenshotPath}`);
}

// Function to get unique stop URLs from the provided page
async function getStopUrls() {
    const browser = await chromium.launch({ headless: false });  // Set headless: false for debugging
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });  // Force the viewport size

    logToFileAndConsole("Navigating to stops page...");
    // Load the stops.html page
    await page.goto('http://lml.live/number11tram/stops.html', { waitUntil: 'domcontentloaded' });

    // Introduce a delay to allow the page to fully load
    await page.waitForTimeout(3000); 

    // Debugging: Take a screenshot to see if the page loaded correctly
    await page.screenshot({ path: './screenshots/stops_page_debug.png' });
    logToFileAndConsole("Screenshot of stops page saved as 'stops_page_debug.png'.");

    // Extract the href attributes from the a tags inside each .stop div and remove duplicates
    const stopUrls = await page.evaluate(() => {
        const stopElements = document.querySelectorAll('.stop a');
        const stopUrls = Array.from(stopElements).map(a => a.href);
        return [...new Set(stopUrls)];  // Remove duplicates by using a Set
    });

    logToFileAndConsole(`Found stop URLs: ${stopUrls}`);

    await browser.close();
    return stopUrls;
}

// Main function to test the stops
async function testStops() {
    const stopUrls = await getStopUrls();

    if (stopUrls.length === 0) {
        logToFileAndConsole('No stops found! Please verify if the stops page is correctly loading.');
        return;
    }

    const browser = await chromium.launch({ headless: false });  // Non-headless mode for visual debugging
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });  // Force the viewport size

    page.on('console', msg => logToFileAndConsole('PAGE LOG: ' + msg.text()));  // Log browser console output

    let summary = {
        totalStops: 0,
        successfulStops: 0,
        failedStops: 0
    };

    const detailedSummary = [];  // List to hold detailed pass/fail info for each stop

    // Iterate through each unique stop URL
    for (const stopUrl of stopUrls) {
        logToFileAndConsole(`Testing stop: ${stopUrl}`);
        summary.totalStops++;

        try {
            await page.goto(stopUrl, { waitUntil: 'domcontentloaded' });

            // Introduce a delay to allow the page to fully load (e.g., 3 seconds)
            await page.waitForTimeout(3000); 

            // Check if the page redirects to stops.html (this is considered a pass)
            const currentUrl = page.url();
            if (currentUrl.includes('stops.html')) {
                logToFileAndConsole(`Stop URL: ${stopUrl}: PASS - Redirected to stops.html`);
                summary.successfulStops++;
                detailedSummary.push({ stopUrl, result: 'Pass', reason: 'Redirected to stops.html' });
                continue;  // Move to the next stop
            }

            // If not redirected, wait for gigs or check if the gigs failed to load (increase timeout to 5 seconds)
            const gigListSelector = '.gig';
            const hasGigs = await page.$$eval(gigListSelector, gigs => gigs.length > 0);

            if (hasGigs) {
                const gigCount = await page.$$eval(gigListSelector, gigs => gigs.length);
                logToFileAndConsole(`Stop URL: ${stopUrl}: SUCCESS - ${gigCount} Gigs Found`);
                summary.successfulStops++;
                detailedSummary.push({ stopUrl, result: 'Pass', reason: `${gigCount} Gigs found` });
            } else {
                logToFileAndConsole(`Stop URL: ${stopUrl}: ERROR - No gigs found and not redirected.`);
                summary.failedStops++;
                detailedSummary.push({ stopUrl, result: 'Fail', reason: 'No gigs found and not redirected' });
                await takeFailureScreenshot(page, stopUrl);  // Capture screenshot on failure
            }

        } catch (error) {
            logToFileAndConsole(`Stop URL ${stopUrl}: ERROR - ${error.message}. Marking as failed.`);
            summary.failedStops++;
            detailedSummary.push({ stopUrl, result: 'Fail', reason: 'Error' });
            await takeFailureScreenshot(page, stopUrl);  // Capture screenshot on failure
        }

        // Wait a bit before moving to the next stop to reduce any rate limits (optional)
        await page.waitForTimeout(2000);  // Add a small delay between each stop check (2 seconds)
    }

    await browser.close();

    // Log overall summary
    logToFileAndConsole("--- Summary ---");
    logToFileAndConsole(`Total Stops Processed: ${summary.totalStops}`);
    logToFileAndConsole(`Successful Stops: ${summary.successfulStops}`);
    logToFileAndConsole(`Failed Stops: ${summary.failedStops}`);

    // Log detailed summary
    logToFileAndConsole('--- Detailed Summary ---');
    detailedSummary.forEach(result => {
        logToFileAndConsole(`Stop URL: ${result.stopUrl}, Result: ${result.result}, Reason: ${result.reason}`);
    });
}

testStops();
