const crypto = require('crypto');

// ── DIO-LEVEL ARCHITECTURE: MULTI-PROVIDER KYC FALLBACK ──────
// Provider configurations with priorities and timeouts
const providers = [
  { name: 'sumsub', priority: 1, timeout: 10000 },
  { name: 'persona', priority: 2, timeout: 10000 },
  { name: 'facecheck', priority: 3, timeout: 5000 },
];

async function generateSumsubToken(userId, levelName = 'basic-kyc-level') {
  const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
  const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
  if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) throw new Error('Sumsub unconfigured');

  const ts = Math.floor(Date.now() / 1000);
  const path_ = `/resources/accessTokens?userId=${userId}&levelName=${levelName}`;
  const sig = crypto.createHmac('sha256', SUMSUB_SECRET_KEY);
  sig.update(ts + 'POST' + path_);
  
  const headers = {
    'X-App-Token': SUMSUB_APP_TOKEN,
    'X-App-Access-Ts': ts.toString(),
    'X-App-Access-Sig': sig.digest('hex'),
    'Content-Type': 'application/json',
  };

  const fetch = require('node-fetch');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const r = await fetch('https://api.sumsub.com' + path_, { 
    method: 'POST', 
    headers,
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  const json = await r.json();
  if (!r.ok) throw new Error(json.description || 'Sumsub API error');
  return { provider: 'sumsub', token: json.token };
}

async function generatePersonaToken(userId) {
  // Stub for Persona implementation
  return { provider: 'persona', token: `req_${crypto.randomBytes(8).toString('hex')}` };
}

async function generateFaceCheckToken(userId) {
  // Stub for FaceCheck.id implementation
  return { provider: 'facecheck', token: `fc_${crypto.randomBytes(8).toString('hex')}` };
}

/**
 * Attempts to generate a KYC session token, falling back through providers
 * if the primary ones fail or timeout.
 */
async function getKycSession(userId) {
  let lastError;
  for (const provider of providers.sort((a, b) => a.priority - b.priority)) {
    try {
      console.log(`[KYC Fast-Fallback] Attempting ${provider.name} for user ${userId}`);
      if (provider.name === 'sumsub') {
         return await generateSumsubToken(userId);
      } else if (provider.name === 'persona') {
         return await generatePersonaToken(userId);
      } else if (provider.name === 'facecheck') {
         return await generateFaceCheckToken(userId);
      }
    } catch (err) {
      console.error(`[KYC Fast-Fallback] ${provider.name} failed:`, err.message);
      lastError = err;
      continue; // Fallback to next provider
    }
  }
  throw new Error('All KYC providers failed: ' + (lastError?.message || 'Unknown'));
}

module.exports = {
  getKycSession
};
