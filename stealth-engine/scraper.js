// Import puppeteer and stealth plugin
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const os = require('os');

puppeteer.use(StealthPlugin());

async function performStealthScan(base64Image) {
    let browser;
    // Create a temporary file path for the image
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `scan_${Date.now()}.jpg`);

    try {
        console.log("Saving image to temp file...");
        fs.writeFileSync(tempFilePath, Buffer.from(base64Image, 'base64'));

        console.log("Launching Stealth Browser...");
        // Launch browser in headless mode but stealthy
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();

        // Mask user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        console.log("Navigating to Search Engine...");
        // Use Google Lens / Images for demo purposes of the scraper
        await page.goto('https://images.google.com/', { waitUntil: 'networkidle2' });

        // Click the 'Search by image' camera icon
        const cameraSelector = 'div[role="button"][aria-label="Search by image"]';
        await page.waitForSelector(cameraSelector);
        await page.click(cameraSelector);

        // Wait for the modal animation
        await new Promise(r => setTimeout(r, 2000));

        console.log("Uploading photo...");
        const inputs = await page.$$('input[type="file"]');
        if (inputs.length === 0) {
            throw new Error("Could not find file upload input");
        }

        // Upload the file to the first hidden file input
        await inputs[0].uploadFile(tempFilePath);

        console.log("Waiting for results...");
        // Google Lens often uses AJAX and doesn't trigger full navigation, so wait 5 seconds.
        await new Promise(r => setTimeout(r, 6000));

        // Let's capture a screenshot to see what Google Lens is showing
        await page.screenshot({ path: path.join(__dirname, 'debug.png'), fullPage: true });

        console.log("Extracting results...");
        // Extract links and titles from Google Lens results side panel
        const matches = await page.evaluate(() => {
            const results = [];
            // Google Lens typically puts results in anchor tags with specific data attributes or just generic links
            const links = Array.from(document.querySelectorAll('a[href^="http"]'));

            // Filter and map to our expected format
            // In a real production scraper, these selectors must be reverse-engineered carefully and updated often.
            const uniqueUrls = new Set();

            links.forEach(a => {
                const url = a.href;
                // Exclude google internal links
                if (url.includes('google.com') || url.includes('gstatic.com') || uniqueUrls.has(url)) return;

                // Try to find a title/text context
                const text = a.innerText.trim() || a.getAttribute('title') || 'Visual Match';
                if (text.length > 5) {
                    uniqueUrls.add(url);
                    results.push({
                        score: 85, // Mock score for scraping
                        url: url,
                        group: 'Web Found',
                        title: text.substring(0, 50) + (text.length > 50 ? '...' : '')
                    });
                }
            });
            return results.slice(0, 15); // Return top 15
        });

        console.log(`Found ${matches.length} matches.`);

        // If scraping failed to find anything useful, return a fallback indicating it worked but found nothing specific
        if (matches.length === 0) {
            return [{
                score: 100,
                url: "https://example.com",
                group: "System message",
                title: "Scan completed, but no direct DOM matches parseable."
            }];
        }

        return matches;

    } catch (err) {
        console.error("Scraper Error:", err);
        throw err;
    } finally {
        if (browser) await browser.close();
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath); // Cleanup temp image
        }
    }
}

module.exports = { performStealthScan };
