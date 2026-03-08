require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fetch = require('node-fetch');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Serve React frontend (dist/) ───────────────────────────────
const DIST = path.join(__dirname, '..', 'dist');
app.use(express.static(DIST, {
    maxAge: '1y',
    immutable: true,
    // Don't cache index.html
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Sumsub config ─────────────────────────────────────────────
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

function signSumsubRequest(method, url, secret) {
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', secret);
    sig.update(ts + method.toUpperCase() + url);
    return {
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Ts': ts.toString(),
        'X-App-Access-Sig': sig.digest('hex'),
    };
}

// ── POST /api/sumsub-token ────────────────────────────────────
// Body: { userId, levelName }
app.post('/api/sumsub-token', async (req, res) => {
    const { userId, levelName = 'basic-kyc-level' } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const path = `/resources/accessTokens?userId=${userId}&levelName=${levelName}`;
        const headers = signSumsubRequest('POST', path, SUMSUB_SECRET_KEY);
        const response = await fetch(SUMSUB_BASE_URL + path, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
        });
        const json = await response.json();
        if (!response.ok) return res.status(502).json({ error: json.description || 'Sumsub error' });
        res.json({ token: json.token, userId });
    } catch (err) {
        console.error('Sumsub error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/payment-intent ──────────────────────────────────
// Body: { amount, currency, paymentMethodId }
app.post('/api/payment-intent', async (req, res) => {
    const { amount, currency = 'usd', paymentMethodId } = req.body;
    if (!amount || !paymentMethodId) {
        return res.status(400).json({ error: 'amount and paymentMethodId required' });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method: paymentMethodId,
            confirmation_method: 'manual',
            confirm: true,
            return_url: process.env.FRONTEND_URL || 'https://redflag-app.onrender.com',
        });

        if (paymentIntent.status === 'requires_action') {
            return res.json({ clientSecret: paymentIntent.client_secret, requiresAction: true });
        }
        if (paymentIntent.status === 'succeeded') {
            return res.json({ clientSecret: paymentIntent.client_secret });
        }
        res.status(400).json({ error: 'Unexpected PaymentIntent status' });
    } catch (err) {
        console.error('Stripe error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Catch-all: serve index.html for client-side routing ───────
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => console.log(`RedFlag server running on port ${PORT}`));
