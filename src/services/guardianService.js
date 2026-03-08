/**
 * 🛡️ Guardian Service
 *
 * Two responsibilities:
 *  1. Risk analysis — heuristic scan of chat messages for red flags
 *  2. Guardian sessions — real-time Supabase-backed safety sessions
 */
import { supabase } from './supabase';

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

/**
 * Analyse a chat message for potential risks.
 * @returns {{ riskLevel: 'safe'|'medium'|'high', flags: string[], advice: string|null }}
 */
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
    if (riskScore >= 3) {
        riskLevel = 'high';
        advice = 'Guardian Alert: High-risk patterns detected. Do not send money or share financial info.';
    } else if (riskScore > 0) {
        riskLevel = 'medium';
        advice = 'Guardian Tip: Be cautious with requests to move off-platform or share personal details.';
    }

    return { riskLevel, flags: [...new Set(flags)], advice };
}

export async function logRiskAnalysis(userId, matchId, analysis) {
    if (analysis.riskLevel !== 'safe') {
        console.warn(`[Guardian] Risk detected for ${userId} in match ${matchId}:`, analysis);
    }
}

// ── Token generator ───────────────────────────────────────────────────────────
function generateToken() {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// ── Session management ────────────────────────────────────────────────────────

/**
 * Create a new guardian session.
 * @param {string} userId
 * @param {string} daterName
 * @param {number} checkInMinutes — how often the dater must check in
 * @param {string} [dateLocation] — optional venue name/address
 * @returns {Promise<object>} session row
 */
export async function createGuardianSession(userId, daterName, checkInMinutes = 30, dateLocation = '') {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours max

    const { data, error } = await supabase
        .from('guardian_sessions')
        .insert({
            dater_id: userId,
            session_token: token,
            dater_name: daterName || 'Unknown',
            date_location: dateLocation || null,
            check_in_minutes: checkInMinutes,
            expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Push latest GPS coordinates to the session.
 */
export async function updateGuardianLocation(sessionId, lat, lng) {
    const { error } = await supabase
        .from('guardian_sessions')
        .update({
            location: { lat, lng, updatedAt: new Date().toISOString() },
            last_checkin_at: new Date().toISOString(),
            sentiment: 'normal',
        })
        .eq('id', sessionId);

    if (error) console.error('[Guardian] location update failed:', error);
}

/**
 * Dater pressed "I'm Safe" — resets check-in timer.
 */
export async function checkInSafe(sessionId) {
    const { error } = await supabase
        .from('guardian_sessions')
        .update({
            last_checkin_at: new Date().toISOString(),
            sentiment: 'normal',
            is_sos: false,
        })
        .eq('id', sessionId);

    if (error) throw error;
}

/**
 * Mark session as tense (check-in overdue).
 */
export async function markTense(sessionId) {
    await supabase
        .from('guardian_sessions')
        .update({ sentiment: 'tense' })
        .eq('id', sessionId);
}

/**
 * Trigger SOS — sets is_sos = true and sentiment = 'alert'.
 */
export async function triggerSOS(sessionId) {
    const { error } = await supabase
        .from('guardian_sessions')
        .update({ is_sos: true, sentiment: 'alert' })
        .eq('id', sessionId);

    if (error) throw error;
}

/**
 * Cancel SOS (dater is safe again).
 */
export async function cancelSOS(sessionId) {
    const { error } = await supabase
        .from('guardian_sessions')
        .update({ is_sos: false, sentiment: 'normal', last_checkin_at: new Date().toISOString() })
        .eq('id', sessionId);

    if (error) throw error;
}

/**
 * End a guardian session.
 */
export async function endGuardianSession(sessionId) {
    const { error } = await supabase
        .from('guardian_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

    if (error) throw error;
}

/**
 * Fetch a session by its public token (used by the guardian dashboard, no auth needed).
 */
export async function getSessionByToken(token) {
    const { data, error } = await supabase
        .from('guardian_sessions')
        .select('*')
        .eq('session_token', token)
        .eq('is_active', true)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Subscribe to real-time updates on a session row.
 * @param {string} sessionId — UUID of the session
 * @param {(session: object) => void} onUpdate
 * @returns Supabase RealtimeChannel (call .unsubscribe() to stop)
 */
export function subscribeToSession(sessionId, onUpdate) {
    return supabase
        .channel(`guardian:${sessionId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'guardian_sessions', filter: `id=eq.${sessionId}` },
            payload => onUpdate(payload.new),
        )
        .subscribe();
}

export default { analyzeMessageRisk, logRiskAnalysis };
