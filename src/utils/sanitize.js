/**
 * 🛡️ Input Sanitization — XSS & Injection Prevention
 * 
 * Strips dangerous content from user inputs before
 * rendering or storing. Prevents XSS, script injection,
 * and data URI attacks.
 */

// Dangerous HTML tags pattern
const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_PATTERN = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
const IFRAME_PATTERN = /<iframe\b[^>]*>.*?<\/iframe>/gi;
const OBJECT_PATTERN = /<object\b[^>]*>.*?<\/object>/gi;
const EMBED_PATTERN = /<embed\b[^>]*>/gi;
const DATA_URI_PATTERN = /data:\s*[^;]+;base64/gi;
const JAVASCRIPT_URI_PATTERN = /javascript\s*:/gi;
const STYLE_EXPRESSION_PATTERN = /expression\s*\(/gi;
const VBSCRIPT_PATTERN = /vbscript\s*:/gi;

/**
 * Sanitize text input — removes XSS vectors while preserving safe content.
 * 
 * @param {string} input - Raw user input
 * @param {Object} options - Sanitization options
 * @param {number} options.maxLength - Maximum allowed length (default: 5000)
 * @param {boolean} options.allowBasicHtml - Allow <b>, <i>, <em>, <strong> (default: false)
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input, options = {}) {
    if (!input || typeof input !== 'string') return '';

    const { maxLength = 5000, allowBasicHtml = false } = options;

    let clean = input;

    // 1. Remove null bytes
    clean = clean.replace(/\0/g, '');

    // 2. Strip dangerous patterns
    clean = clean.replace(SCRIPT_PATTERN, '');
    clean = clean.replace(EVENT_HANDLER_PATTERN, '');
    clean = clean.replace(IFRAME_PATTERN, '');
    clean = clean.replace(OBJECT_PATTERN, '');
    clean = clean.replace(EMBED_PATTERN, '');
    clean = clean.replace(JAVASCRIPT_URI_PATTERN, '');
    clean = clean.replace(VBSCRIPT_PATTERN, '');
    clean = clean.replace(STYLE_EXPRESSION_PATTERN, '');
    clean = clean.replace(DATA_URI_PATTERN, '');

    // 3. Encode HTML entities (unless basic HTML allowed)
    if (!allowBasicHtml) {
        clean = escapeHtml(clean);
    } else {
        // Allow only safe tags
        clean = clean.replace(/<(?!\/?(?:b|i|em|strong|br)\b)[^>]+>/gi, '');
    }

    // 4. Enforce max length
    if (clean.length > maxLength) {
        clean = clean.substring(0, maxLength);
    }

    return clean.trim();
}

/**
 * Sanitize a chat message — preserves emojis but removes dangerous content.
 * 
 * @param {string} message - Raw chat message
 * @returns {string} Sanitized message
 */
export function sanitizeMessage(message) {
    return sanitizeInput(message, { maxLength: 2000, allowBasicHtml: false });
}

/**
 * Sanitize a URL — only allow http, https, and mailto protocols.
 * 
 * @param {string} url - Raw URL
 * @returns {string} Safe URL or empty string
 */
export function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';

    const trimmed = url.trim();

    // Block dangerous protocols
    if (JAVASCRIPT_URI_PATTERN.test(trimmed) || VBSCRIPT_PATTERN.test(trimmed) || DATA_URI_PATTERN.test(trimmed)) {
        return '';
    }

    // Only allow safe protocols
    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
            return '';
        }
        return parsed.href;
    } catch {
        return '';
    }
}

/**
 * Escape HTML entities to prevent injection.
 * 
 * @param {string} str - Raw string
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#96;'
    };
    return str.replace(/[&<>"'/`]/g, char => map[char]);
}

/**
 * Sanitize an object's string values recursively.
 * Useful for sanitizing form data or API payloads.
 * 
 * @param {Object} obj - Object with string values
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

export default { sanitizeInput, sanitizeMessage, sanitizeUrl, escapeHtml, sanitizeObject };
