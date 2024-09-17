const puppeteer = require('puppeteer');

async function getStopUrls() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Load the stops.html page
    await page.goto('https://lml.live/number11tram/stops.html', { waitUntil: 'networkidle0' });

    // Wait for the stop divs to load
    await page.waitForSelector('.stop');

    // Extract the href attributes from the a tags inside each .stop div
    const stopUrls = await page.evaluate(() => {
        const stopElements = document.querySelectorAll('.stop a');
        const stopUrlsArray = Array.from(stopElements).map(a => a.href);
        const uniqueStopUrls = [...new Set(stopUrlsArray)];
        return uniqueStopUrls;
    });

    console.log(`Found stop URLs:`, stopUrls);

    await browser.close();
    return stopUrls;
}

async function testStops() {
    const stopUrls = await getStopUrls();

    if (stopUrls.length === 0) {
        console.log('No stops found!');
        return;
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (const stopUrl of stopUrls) {
        console.log(`Testing stop: ${stopUrl}`);

        try {
            await page.goto(stopUrl, { waitUntil: 'networkidle0' });

            // Log the current state of the page after loading
            const pageContent = await page.content();
            console.log(`Page content for ${stopUrl}:`, pageContent);

            // Wait for the gigs or time horizon to be dynamically loaded
            await page.waitForFunction(() => {
                const h2Element = document.querySelector('#gig-list > h2');
                const gigs = document.querySelectorAll('.gig');
                return h2Element || gigs.length > 0;
            }, { timeout: 8000 });

            // Extract the stop name
            const stopName = await page.evaluate(() => {
                const stopNameElement = document.querySelector('.stop-name');
                return stopNameElement ? stopNameElement.textContent.trim() : 'Stop name not found';
            });

            // Extract the time horizon if present
            const timeHorizon = await page.evaluate(() => {
                const timeHorizonElement = document.querySelector('#gig-list > h2');
                return timeHorizonElement ? timeHorizonElement.textContent.trim() : 'No time horizon found';
            });

            // Check if gigs are present
            const gigCount = await page.evaluate(() => {
                return document.querySelectorAll('.gig').length;
            });

            if (gigCount > 0) {
                console.log(`Stop Name: ${stopName}, Time Horizon: ${timeHorizon}, Stop URL: ${stopUrl}: SUCCESS - ${gigCount} Gigs Found`);
            } else {
                console.log(`Stop Name: ${stopName}, Time Horizon: ${timeHorizon}, Stop URL: ${stopUrl}: WARNING - No Gigs Found`);
            }

        } catch (error) {
            console.log(`Stop URL ${stopUrl}: ERROR - ${error.message}`);
        }
    }

    await browser.close();
}

testStops();
