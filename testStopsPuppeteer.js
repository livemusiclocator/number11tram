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
        const stopElements = document.querySelectorAll('.stop a');  // Target the anchor tags inside div.stop
        const stopUrlsArray = Array.from(stopElements).map(a => a.href);  // Get the href attributes
        return stopUrlsArray;
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

            // (4) Wait for the gigs to load
            await page.waitForSelector('.gig', { timeout: 30000 }); // This waits for gigs to be rendered

            // Check if gigs are present
            const gigElements = await page.$$('.gig'); // Find all elements with class 'gig'
            const gigCount = gigElements.length;

            if (gigCount > 0) {
                console.log(`Stop URL ${stopUrl}: SUCCESS - ${gigCount} Gigs Found`);
            } else {
                console.log(`Stop URL ${stopUrl}: WARNING - No Gigs Found`);
            }
        } catch (error) {
            console.log(`Stop URL ${stopUrl}: ERROR - ${error.message}`);
        }
    }

    await browser.close();
}

testStops();
