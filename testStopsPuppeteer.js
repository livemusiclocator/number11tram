const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const stops = [
        // List of stop URLs
        'https://lml.live/number11tram/index.html?stopId=2890',
        'https://lml.live/number11tram/index.html?stopId=2551',
        // Add more stop URLs here
    ];

    for (const stopUrl of stops) {
        console.log(`Testing stop: ${stopUrl}`);
        
        // Go to the stop page
        await page.goto(stopUrl, { waitUntil: 'networkidle2' });

        // (4) Wait for the gigs to load
        await page.waitForSelector('.gig'); // This waits for gigs to be rendered

        // Check if gigs are present
        const gigElements = await page.$$('.gig'); // Find all elements with class 'gig'

        if (gigElements.length > 0) {
            console.log(`Stop URL ${stopUrl}: SUCCESS - ${gigElements.length} Gigs Found`);
        } else {
            console.log(`Stop URL ${stopUrl}: WARNING - No Gigs Found`);
        }
    }

    await browser.close();
})();
