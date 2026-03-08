const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function test() {
    console.log("Launching...");
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    console.log("Navigating to Yandex Images");
    await page.goto('https://yandex.com/images/', { waitUntil: 'networkidle2' });

    await new Promise(r => setTimeout(r, 2000));

    const html = await page.evaluate(() => document.body.innerHTML);
    const fs = require('fs');
    fs.writeFileSync('yandex_body.html', html);

    const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, class: i.className, name: i.name }));
    });
    console.log("Inputs found:", inputs);

    // Look for camera icon or CBIR
    const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a, div[role="button"]'))
            .filter(e => e.innerText.includes('Image') || e.className.includes('cbir') || e.className.includes('camera'))
            .map(e => ({ tag: e.tagName, class: e.className, text: e.innerText }));
    });
    console.log("Potential camera buttons:", buttons);

    await browser.close();
}

test().catch(console.error);
