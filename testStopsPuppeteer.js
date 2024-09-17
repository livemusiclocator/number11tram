const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Load the stops.html file
  await page.goto('https://lml.live/number11tram/stops.html');

  // (1) Extract all stop URLs dynamically from stops.html
  const stopUrls = await page.$$eval('a[href*="number11tram/index.html"]', links =>
    links.map(link => link.href)
  );

  console.log('Found stop URLs:', stopUrls);
  
  // (2) Iterate over the stop URLs and test each one
  for (const stopUrl of stopUrls) {
    console.log('Testing stop:', stopUrl);
    await page.goto(stopUrl);

    try {
      // (3) Wait for the gigs to load
      await page.waitForSelector('.gig', { timeout: 10000 });

      // Check if gigs are present
      const gigElements = await page.$$('.gig');
      if (gigElements.length > 0) {
        console.log(`Stop URL ${stopUrl}: SUCCESS - Found ${gigElements.length} Gigs`);
      } else {
        console.log(`Stop URL ${stopUrl}: WARNING - No Gigs Found`);
      }
    } catch (error) {
      console.log(`Stop URL ${stopUrl}: ERROR - No gigs loaded within the timeout`);
    }
  }

  await browser.close();
})();
