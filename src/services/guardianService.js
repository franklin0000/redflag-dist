/**
 * 🛡️ Guardian Service
 *
 * Two responsibilities:
 *  1. Risk analysis — heuristic scan of chat messages for red flags
 *  2. Guardian sessions — real backend API + Socket.io real-time safety sessions
 */

// ── Risk patterns ─────────────────────────────────────────────────────────────
const RISK_PATTERNS = {
    financial: [
        /send money/i, /bank account/i, /wire transfer/i, /crypto/i, /invest/i,
        /cash app/i, /venmo/i, /paypal/i, /gift card/i, /western union/i,
        /emergency/i, /hospital/i, /stranded/i, /passport/i,
    ],
    harassment: [
        /send nudes/i, /sexy photo/i, /meet now/i, /trust me/i,
        /you owe me/i, /don't tell/i, /secret/i,
    ],
    scam_tactics: [
        /click this link/i, /whatsapp/i, /telegram/i, /investment opportunity/i,
        /military/i, /peacekeeping/i, /inheritance/i,
    ],
};

export async function analyzeMessageRisk(text) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const lowerText = text.toLowerCase();
    const flags = [];
    let riskScore = 0;
    RISK_PATTERNS.financial.forEach(p => { if (p.test(lowerText)) { flags.push('Financial Request'); riskScore += 3; } });
    RISK_PATTERNS.harassment.forEach(p => { if (p.test(lowerText)) { flags.push('High Pressure / Inappropriate'); riskScore += 2; } });
    RISK_PATTERNS.scam_tactics.forEach(p => { if (p.test(lowerText)) { flags.push('Suspicious Pattern'); riskScore += 2; } });
    let riskLevel = 'safe';
    let advice = null;
    if (riskScore >= 3) { riskLevel = 'high'; advice = 'Guardian Alert: High-risk patterns detected. Do not send money or share financial info.'; }
    else if (riskScore > 0) { riskLevel = 'medium'; advice = 'Guardian Tip: Be cautious with requests to move off-platform or share personal details.'; }
    return { riskLevel, flags: [...new Set(flags)], advice };
}

export async function logRiskAnalysis(userId, matchId, analysis) {
    if (analysis.riskLevel !== 'safe') {
        console.warn(`[Guardian] Risk detected for ${userId} in match ${matchId}:`, analysis);
    }
}

// ── API helpers ───────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
    return localStorage.getItem('rf_token');
}

async function apiRequest(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
}

// ── Session management (backed by PostgreSQL + Socket.io) ─────────────────────

export async function createGuardianSession(userId, daterName, checkInMinutes = 30, dateLocation = '') {
    return apiRequest('/api/guardian/sessions', {
        method: 'POST',
        body: JSON.stringify({ dater_name: daterName, date_location: dateLocation, check_in_minutes: checkInMinutes }),
    });
}

export async function updateGuardianLocation(sessionId, lat, lng) {
    try {
        await apiRequest(`/api/guardian/sessions/${sessionId}/location`, {
            method: 'PATCH',
            body: JSON.stringify({ lat, lng }),
        });
    } catch (err) {
        console.warn('[Guardian] Failed to update location:', err.message);
    }
}

export async function checkInSafe(sessionId) {
    return apiRequest(`/api/guardian/sessions/${sessionId}/checkin`, { method: 'POST' });
}

export async function markTense(sessionId) {
    // No dedicated endpoint — captured via SOS flow or future sentiment API
    console.info('[Guardian] markTense', sessionId);
}

export async function triggerSOS(sessionId, location = null) {
    return apiRequest(`/api/guardian/sessions/${sessionId}/sos`, {
        method: 'POST',
        body: JSON.stringify({ location }),
    });
}

export async function cancelSOS(sessionId) {
    return apiRequest(`/api/guardian/sessions/${sessionId}/sos/cancel`, { method: 'POST' });
}

export async function endGuardianSession(sessionId) {
    return apiRequest(`/api/guardian/sessions/${sessionId}/end`, { method: 'POST' });
}

export async function getSessionByToken(token) {
    return apiRequest(`/api/guardian/view/${token}`);
}

export async function getMyActiveSession() {
    return apiRequest('/api/guardian/sessions/mine');
}

/**
 * Subscribe to real-time guardian session updates via Socket.io.
 * Falls back to 10-second polling if Socket.io is unavailable.
 */
export function subscribeToSession(sessionToken, onUpdate) {
    // Try Socket.io first
    try {
        const { io } = require('socket.io-client');
        const socket = io(BASE || window.location.origin, {
            auth: { token: getToken() },
            transports: ['websocket'],
        });
        socket.emit('join_guardian', sessionToken);
        socket.on('guardian:update', onUpdate);
        socket.on('guardian:location', (loc) => onUpdate({ location: loc }));
        socket.on('guardian:sos', ({ session }) => onUpdate(session));
        socket.on('guardian:ended', () => onUpdate({ is_active: false }));
        return {
            unsubscribe: () => {
                socket.off('guardian:update');
                socket.off('guardian:location');
                socket.off('guardian:sos');
                socket.off('guardian:ended');
                socket.disconnect();
            },
        };
    } catch {
        // Fallback: poll the API every 10 seconds
        const interval = setInterval(async () => {
            try {
                const session = await getSessionByToken(sessionToken);
                onUpdate(session);
            } catch {
                // Session ended or expired
            }
        }, 10000);
        return { unsubscribe: () => clearInterval(interval) };
    }
}

export default { analyzeMessageRisk, logRiskAnalysis };
