const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { performStealthScan } = require('./scraper');

const app = express();
const port = 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Use memory storage for parsed images
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/stealth-scan', async (req, res) => {
    try {
        const { imageSource } = req.body;

        if (!imageSource) {
            return res.status(400).json({ error: 'Missing imageSource in request body.' });
        }

        console.log("Receiving scan request via Stealth Engine...");

        // Ensure format is clean base64
        const rawBase64 = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;

        // Pass to puppeteer scraper
        const results = await performStealthScan(rawBase64);

        res.json({ results });
    } catch (error) {
        console.error("Stealth Engine Error:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`🕵️ RedFlag Stealth Engine running on http://localhost:${port}`);
});
