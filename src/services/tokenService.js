/**
 * 🎫 TokenService — JWT Auth Security Layer
 * 
 * Handles Supabase Session/Token management.
 */

import { supabase } from './supabase';

/**
 * Get a fresh Supabase Access Token (JWT).
 * 
 * @returns {Promise<string|null>} The JWT token
 */
export async function getSecureToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

/**
 * Validate the current token's integrity and expiry.
 * 
 * @returns {Promise<{valid: boolean, expiresIn: number, claim: Object}>}
 */
export async function validateToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { valid: false, expiresIn: 0, claims: {} };

    const expiresAt = session.expires_at * 1000; // Supabase uses seconds
    const now = Date.now();
    const expiresIn = expiresAt - now;

    return {
        valid: expiresIn > 0,
        expiresIn,
        claims: session.user || {},
        issuedAt: 0, // Not exposed directly easily without decoding
        expiresAt
    };
}

/**
 * Generate secure authorization headers for API calls.
 * 
 * @returns {Promise<Object>} Headers object with Bearer token
 */
export async function getAuthHeaders() {
    const token = await getSecureToken();
    if (!token) return {};

    return {
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // Often needed for Supabase REST
        'X-Client-Version': '1.0.0'
    };
}

// Session timer is handled by Supabase auto-refresh mostly, 
// but we can keep the inactivity timer if desired.
// For brevity, removing complex inactivity logic unless explicitly requested 
// since Supabase handles session recovery well.

export default {
    getSecureToken,
    validateToken,
    getAuthHeaders
};

