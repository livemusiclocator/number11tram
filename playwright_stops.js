const { chromium } = require('playwright');

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

    // Extract the href attributes from the a tags inside each .stop div
    const stopUrls = await page.evaluate(() => {
        console.log("Evaluating stop elements...");
        const stopElements = document.querySelectorAll('.stop a');
        if (stopElements.length === 0) {
            console.log("No stop elements found on the page.");
        }
        return Array.from(stopElements).map(a => a.href);
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

    for (const stopUrl of stopUrls) {
        console.log(`Testing stop: ${stopUrl}`);
        summary.totalStops++;

        try {
            await page.goto(stopUrl, { waitUntil: 'domcontentloaded' });

            // Wait for gigs or check if "gigs are behind you" message appears
            const gigListSelector = '#gig-list > h2';
            const gigsBehindMessage = "they are all behind you";

            try {
                await page.waitForSelector(gigListSelector, { timeout: 5000 });  // Wait for 5 seconds max

                // Check if the page contains the message "gigs are behind you"
                const bodyText = await page.textContent('body');
                if (bodyText.includes(gigsBehindMessage)) {
                    console.log(`Stop URL: ${stopUrl}: PASS - Gigs are behind you`);
                    summary.skippedStops++;
                    continue;  // Move to the next stop
                }

                // If there is no "behind you" message, check the gigs
                const gigCount = await page.$$eval('.gig', gigs => gigs.length);
                if (gigCount > 0) {
                    const stopName = await page.textContent('.stop-name');
                    const timeHorizon = await page.$eval('#gig-list > h2', el => el.textContent);
                    console.log(`Stop Name: ${stopName}, Time Horizon: ${timeHorizon}, Stop URL: ${stopUrl}: SUCCESS - ${gigCount} Gigs Found`);
                    summary.successfulStops++;
                } else {
                    console.log(`Stop URL: ${stopUrl}: ERROR - No gigs found`);
                    summary.failedStops++;
                }
            } catch (timeoutError) {
                // Handle the timeout scenario if no gigs are found within 5 seconds
                console.log(`Stop URL ${stopUrl}: ERROR - No gigs loaded within 5 seconds.`);
                summary.failedStops++;
            }

        } catch (error) {
            console.log(`Stop URL ${stopUrl}: ERROR - ${error.message}`);
            summary.failedStops++;
        }
    }

    await browser.close();

    // Print summary
    console.log("--- Summary ---");
    console.log(`Total Stops Processed: ${summary.totalStops}`);
    console.log(`Successful Stops (with gigs): ${summary.successfulStops}`);
    console.log(`Skipped Stops (gigs behind you): ${summary.skippedStops}`);
    console.log(`Failed Stops (errors or no gigs): ${summary.failedStops}`);
}

testStops();
