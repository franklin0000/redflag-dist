const fs = require('fs');

const fileBuffer = fs.readFileSync('/tmp/test_face.jpg');
const base64Image = fileBuffer.toString('base64');

async function testFetch() {
    console.log("Sending photo 1 to redflag stealth engine...");
    try {
        const res = await fetch('http://localhost:3001/api/stealth-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageSource: base64Image })
        });
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}
testFetch();
