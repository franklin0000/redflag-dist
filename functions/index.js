const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Stripe with your Secret Key
// Access via functions.config().stripe.secret
const stripe = require("stripe")(functions.config().stripe ? functions.config().stripe.secret : process.env.STRIPE_SECRET_KEY);

admin.initializeApp();

const crypto = require('crypto');
const fetch = require('node-fetch');

// Sumsub Configuration
// Access via functions.config().sumsub.token and functions.config().sumsub.secret
const SUMSUB_APP_TOKEN = functions.config().sumsub ? functions.config().sumsub.token : process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = functions.config().sumsub ? functions.config().sumsub.secret : process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

// Helper to sign requests
function signRequest(method, url, body, secret) {
    const ts = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', secret);
    signature.update(ts + method.toUpperCase() + url);
    if (body) {
        signature.update(JSON.stringify(body));
    }
    return {
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Ts': ts.toString(),
        'X-App-Access-Sig': signature.digest('hex'),
    };
}

// Generate an access token for the SDK
exports.createSumsubAccessToken = functions.https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        return { error: "User must be logged in." };
    }

    const userId = context.auth.uid;
    const levelName = data.levelName || 'basic-kyc-level';
    // You can customize levelName based on user type (e.g. 'driver-level', 'user-level')

    try {
        const method = 'POST';
        const url = '/resources/accessTokens?userId=' + userId + '&levelName=' + levelName;
        // In the native Sumsub API for access tokens, the body is empty or optional depending on the endpoint version.
        // For /resources/accessTokens specifically:
        // Query params: userId, levelName, ttlInSecs (optional)
        // Body: optional JSON

        const headers = signRequest(method, url, null, SUMSUB_SECRET_KEY);

        const response = await fetch(SUMSUB_BASE_URL + url, {
            method: method,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: null
        });

        const json = await response.json();

        if (response.ok) {
            return { token: json.token, userId: userId };
        } else {
            console.error("Sumsub API Error:", json);
            return { error: json.description || "Failed to generate token" };
        }

    } catch (error) {
        console.error("Sumsub Error:", error);
        return { error: error.message };
    }
});

// Create a Stripe PaymentIntent (Required for 3D Secure / SCA)
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        return { error: "User must be logged in." };
    }

    const { amount, currency = 'usd', paymentMethodId } = data;

    try {
        // 2. Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // e.g. 999 for $9.99
            currency: currency,
            payment_method: paymentMethodId,
            confirmation_method: 'manual',
            confirm: true,
            return_url: 'https://redflag.io/success', // Valid URL required for 3DS
        });

        // 3. Handle Action Required (3D Secure)
        if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_source_action') {
            return {
                clientSecret: paymentIntent.client_secret,
                requiresAction: true
            };
        }

        // 4. Success
        if (paymentIntent.status === 'succeeded') {
            return { clientSecret: paymentIntent.client_secret };
        }

        return { error: "Invalid PaymentIntent status" };

    } catch (error) {
        console.error("Stripe Error:", error);
        return { error: error.message };
    }
});
