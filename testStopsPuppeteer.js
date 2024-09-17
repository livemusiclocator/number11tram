const puppeteer = require('puppeteer');

const stopsPageUrl = 'https://lml.live/number11tram/stops.html';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Fetch the stops.html page
  await page.goto(stopsPageUrl, { waitUntil: 'networkidle2' });

  // Extract all stop URLs and remove duplicates
  const stops = await page.$$eval('a[href*="stopId"]', links => {
    const hrefs = links.map(link => link.href);
    return [...new Set(hrefs)]; // Remove duplicate URLs by converting to Set and back to Array
  });

  console.log(`Found ${stops.length} unique stops. Testing each one...`);

  for (const stopUrl of stops) {
    try {
      await page.goto(stopUrl, { waitUntil: 'networkidle2' });
      console.log(`Stop URL ${stopUrl}: SUCCESS`);
    } catch (error) {
      console.log(`Stop URL ${stopUrl}: ERROR - ${error.message}`);
    }
  }

  await browser.close();
})();
