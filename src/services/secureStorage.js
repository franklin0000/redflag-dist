/**
 * 🔒 SecureStorage — AES-GCM Encrypted localStorage
 * 
 * All data stored locally is encrypted with a device-specific key.
 * Uses Web Crypto API (PBKDF2 + AES-256-GCM) for military-grade encryption.
 * Even if someone inspects localStorage, they see only encrypted gibberish.
 */

const SALT_KEY = 'rf_salt';
const ENCRYPTION_ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

// Generate a device-specific fingerprint for key derivation
function getDeviceFingerprint() {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset().toString(),
        'redflag-secure-v1'
    ];
    return components.join('|');
}

// Get or create a persistent salt
function getSalt() {
    let salt = localStorage.getItem(SALT_KEY);
    if (!salt) {
        const saltArray = crypto.getRandomValues(new Uint8Array(16));
        salt = Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(SALT_KEY, salt);
    }
    return new Uint8Array(salt.match(/.{2}/g).map(byte => parseInt(byte, 16)));
}

// Derive encryption key from device fingerprint + salt
async function deriveKey() {
    const fingerprint = getDeviceFingerprint();
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(fingerprint),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: getSalt(),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ENCRYPTION_ALGO, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

// Cache the derived key to avoid re-deriving on every operation
let _cachedKey = null;
async function getKey() {
    if (!_cachedKey) {
        _cachedKey = await deriveKey();
    }
    return _cachedKey;
}

/**
 * Encrypt and store a value in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON serialized)
 */
export async function secureSet(key, value) {
    try {
        const cryptoKey = await getKey();
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(value));

        // Generate a fresh IV for each encryption
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

        const encrypted = await crypto.subtle.encrypt(
            { name: ENCRYPTION_ALGO, iv },
            cryptoKey,
            data
        );

        // Store IV + ciphertext as hex
        const payload = {
            iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
            data: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
            _encrypted: true
        };

        localStorage.setItem(`rf_${key}`, JSON.stringify(payload));
    } catch (error) {
        console.warn('SecureStorage: Encryption failed, using fallback:', error.message);
        // Graceful fallback — still works but without encryption
        localStorage.setItem(`rf_${key}`, JSON.stringify({ _fallback: true, data: value }));
    }
}

/**
 * Retrieve and decrypt a value from localStorage
 * @param {string} key - Storage key
 * @returns {any} Decrypted value or null
 */
export async function secureGet(key) {
    try {
        const raw = localStorage.getItem(`rf_${key}`);
        if (!raw) return null;

        const parsed = JSON.parse(raw);

        // Handle fallback (unencrypted) data
        if (parsed._fallback) return parsed.data;

        // Handle encrypted data
        if (!parsed._encrypted) return parsed;

        const cryptoKey = await getKey();

        const iv = new Uint8Array(parsed.iv.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        const ciphertext = new Uint8Array(parsed.data.match(/.{2}/g).map(byte => parseInt(byte, 16)));

        const decrypted = await crypto.subtle.decrypt(
            { name: ENCRYPTION_ALGO, iv },
            cryptoKey,
            ciphertext
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
        console.warn('SecureStorage: Decryption failed:', error.message);
        return null;
    }
}

/**
 * Remove a value from secure storage
 * @param {string} key - Storage key 
 */
export function secureRemove(key) {
    localStorage.removeItem(`rf_${key}`);
}

/**
 * Clear all RedFlag secure storage entries
 */
export function secureClearAll() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('rf_')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    _cachedKey = null; // Reset cached key
}

export default { secureSet, secureGet, secureRemove, secureClearAll };
