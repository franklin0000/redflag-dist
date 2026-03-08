const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function test() {
    console.log("Launching...");
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    await page.goto('https://images.google.com/', { waitUntil: 'networkidle2' });

    const cameraSelector = 'div[role="button"][aria-label="Search by image"]';
    await page.waitForSelector(cameraSelector);
    await page.click(cameraSelector);

    await new Promise(r => setTimeout(r, 2000)); // wait for modal

    const html = await page.evaluate(() => document.body.innerHTML);
    const fs = require('fs');
    fs.writeFileSync('google_modal.html', html);

    console.log("HTML length:", html.length);

    // check for input type file
    const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(i => i.type);
    });
    console.log("Input types found:", inputs);

    await browser.close();
}

test().catch(console.error);
