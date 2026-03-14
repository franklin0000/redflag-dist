
const BASE = import.meta.env.VITE_API_URL || '';
const getToken = () => localStorage.getItem('rf_token');
async function apiRequest(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    if (!res.ok) return null;
    return res.json().catch(() => null);
}

/**
 * Emoji Service - TikTok Style 🎵✨
 * High-quality, animated SVGs with premium aesthetics.
 */

// Keyframes for internal SVG animations
const STYLES = `
    <style>
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.9; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes blink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes vibe { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes glitch { 0% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, 2px); } 80% { transform: translate(2px, -2px); } 100% { transform: translate(0); } }
        @keyframes tear { 0% { transform: translateY(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(20px); opacity: 0; } }
        .anim-float { animation: float 3s ease-in-out infinite; }
        .anim-pulse { animation: pulse 2s ease-in-out infinite; }
        .anim-spin { transform-origin: center; animation: spin 4s linear infinite; }
        .anim-blink { transform-origin: center; animation: blink 4s infinite; }
        .anim-vibe { transform-origin: center; animation: vibe 0.5s ease-in-out infinite; }
        .anim-glitch { animation: glitch 0.3s infinite; }
        .anim-tear { animation: tear 1.5s infinite; }
    </style>
`;

const SHAPES = {
    squircle: (color) => `${STYLES}<rect x="5" y="5" width="90" height="90" rx="30" fill="${color}" stroke="black" stroke-width="3" filter="drop-shadow(3px 3px 0px rgba(0,0,0,0.2))" />`,
    circle: (color) => `${STYLES}<circle cx="50" cy="50" r="45" fill="${color}" stroke="black" stroke-width="3" filter="drop-shadow(3px 3px 0px rgba(0,0,0,0.2))" />`,
    cloud: (color) => `${STYLES}<path d="M25,60 a20,20 0 0,1 0,-40 a20,20 0 0,1 0,-40 a20,20 0 0,1 50,0 a20,20 0 0,1 0,40 a20,20 0 0,1 0,40 z" transform="translate(0, 10) scale(1.1)" fill="${color}" stroke="black" stroke-width="3" />`,
    fire: (color) => `${STYLES}<path class="anim-pulse" d="M50 5 C50 5 20 40 20 65 C20 85 35 95 50 95 C65 95 80 85 80 65 C80 40 50 5 50 5 Z M50 25 C50 25 35 50 35 65 C35 75 42 80 50 80 C58 80 65 75 65 65 C65 50 50 25 50 25 Z" fill="${color === '#fbbf24' ? '#f59e0b' : color}" stroke="black" stroke-width="3" />`, // Default to orangeish if yellow
    ghost: (color) => `${STYLES}<path class="anim-float" d="M20 90 L20 40 C20 20 30 10 50 10 C70 10 80 20 80 40 L80 90 L70 80 L60 90 L50 80 L40 90 L30 80 L20 90 Z" fill="${color === '#fbbf24' ? '#f3f4f6' : color}" stroke="black" stroke-width="3" />`
};

const EYES = {
    normal: `<g class="anim-blink" fill="black"><ellipse cx="35" cy="45" rx="6" ry="8" /><ellipse cx="65" cy="45" rx="6" ry="8" /></g>`,
    anime: `<g class="anim-blink"><defs><radialGradient id="sparkle"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="#3b82f6"/></radialGradient></defs><circle cx="35" cy="45" r="12" fill="black"/><circle cx="30" cy="40" r="5" fill="white"/><circle cx="38" cy="48" r="3" fill="#60a5fa"/><circle cx="65" cy="45" r="12" fill="black"/><circle cx="60" cy="40" r="5" fill="white"/><circle cx="68" cy="48" r="3" fill="#60a5fa"/></g>`,
    money: `<g class="anim-pulse"><text x="25" y="55" font-family="Arial" font-weight="bold" font-size="24" fill="#15803d">$</text><text x="60" y="55" font-family="Arial" font-weight="bold" font-size="24" fill="#15803d">$</text></g>`,
    cry: `<g><ellipse cx="35" cy="45" rx="6" ry="8" fill="black"/><ellipse cx="65" cy="45" rx="6" ry="8" fill="black"/><path class="anim-tear" d="M35 55 Q35 65 30 75" stroke="#60a5fa" stroke-width="3" fill="none"/><path class="anim-tear" d="M65 55 Q65 65 70 75" stroke="#60a5fa" stroke-width="3" fill="none" style="animation-delay: 0.5s"/></g>`,
    sus: `<g><path d="M25 45 Q35 40 45 45" stroke="black" stroke-width="3" fill="none"/><circle cx="35" cy="48" r="4" fill="black"/><path d="M55 45 Q65 40 75 45" stroke="black" stroke-width="3" fill="none"/><circle cx="65" cy="48" r="4" fill="black"/></g>`,
    hearts: `<g class="anim-pulse" fill="#ef4444"><path d="M35 50 C25 40 20 35 25 30 A5 5 0 0 1 35 30 A5 5 0 0 1 45 30 C50 35 45 40 35 50 Z" /><path d="M65 50 C55 40 50 35 55 30 A5 5 0 0 1 65 30 A5 5 0 0 1 75 30 C80 35 75 40 65 50 Z" /></g>`
};

const MOUTHS = {
    smile: `<path d="M30 65 Q50 80 70 65" stroke="black" stroke-width="4" fill="none" stroke-linecap="round" />`,
    pout: `<circle cx="50" cy="70" r="8" fill="black" />`,
    vampire: `<path d="M35 65 Q50 80 65 65 Z" fill="black"/><path d="M38 65 L40 75 L42 65 Z" fill="white"/><path d="M58 65 L60 75 L62 65 Z" fill="white"/>`,
    drool: `<path d="M30 65 Q50 60 70 65" stroke="black" stroke-width="3" fill="none"/><path class="anim-tear" d="M68 65 L68 85 A2 2 0 0 0 72 85 L72 65" fill="#60a5fa" style="animation-delay: 1s"/>`,
    cat: `<path d="M40 65 Q50 60 60 65" stroke="black" stroke-width="3" fill="none"/><path d="M40 65 Q45 70 50 65 Q55 70 60 65" stroke="black" stroke-width="3" fill="none"/>`
};

const ACCESSORIES = {
    none: ``,
    headphones: `<g><path d="M20 50 C20 20 80 20 80 50" stroke="#374151" stroke-width="5" fill="none"/><rect x="10" y="45" width="15" height="25" rx="5" fill="#ef4444"/><rect x="75" y="45" width="15" height="25" rx="5" fill="#ef4444"/></g>`,
    horns: `<g fill="#ef4444"><path d="M25 25 Q20 10 10 5 Q15 20 25 25 Z" /><path d="M75 25 Q80 10 90 5 Q85 20 75 25 Z" /></g>`,
    halo: `<ellipse class="anim-float" cx="50" cy="15" rx="30" ry="5" stroke="#facc15" stroke-width="4" fill="none" />`,
    crown: `<g transform="translate(30, 5)"><path d="M0 25 L10 5 L20 25 L30 0 L40 25 L50 5 L60 25 L60 30 L0 30 Z" fill="#facc15" stroke="black" stroke-width="2"/></g>`,
    tiktok: `<g class="anim-glitch" transform="translate(70, 0) scale(0.6)"><path d="M20 5 a 10 10 0 0 0 -5 -1 v 30 a 10 10 0 1 1 -10 -10 h 5 v -10 a 20 20 0 0 1 20 20 z" fill="black" filter="drop-shadow(-2px -2px 0px #25F4EE) drop-shadow(2px 2px 0px #FE2C55)"/></g>`
};

export const emojiService = {
    // Assets for Editor
    assets: {
        shapes: Object.keys(SHAPES),
        eyes: Object.keys(EYES),
        mouths: Object.keys(MOUTHS),
        accessories: Object.keys(ACCESSORIES)
    },

    /**
     * Generate SVG string from config
     * @param {object} config { shape, color, eyes, mouth, accessory }
     * @param {boolean} animate - Whether to include animation classes (default true)
     */
    generateSVG: (config) => {
        const { shape = 'circle', color = '#fbbf24', eyes = 'normal', mouth = 'smile', accessory = 'none' } = config;

        const shapeSVG = SHAPES[shape] ? SHAPES[shape](color) : SHAPES.circle(color);
        const eyesSVG = EYES[eyes] || EYES.normal;
        const mouthSVG = MOUTHS[mouth] || MOUTHS.smile;
        const accessorySVG = ACCESSORIES[accessory] || '';

        // Internal CSS style injection for animations
        // If animate is false, we could strip classes, but simplest is just keep them,
        // as they rely on the <style> block being present.

        let layers = [shapeSVG, eyesSVG, mouthSVG, accessorySVG];

        // Layering Logic adjustments
        if (accessory === 'sunglasses') {
            // sunglasses cover eyes
            layers = [shapeSVG, eyesSVG, mouthSVG, accessorySVG];
        }

        return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            ${layers.join('')}
        </svg>`;
    },

    /**
     * Save Custom Emoji
     */
    saveEmoji: async (userId, name, config) => {
        const svgContent = emojiService.generateSVG(config);
        const data = await apiRequest('/api/emojis', {
            method: 'POST',
            body: JSON.stringify({ name, layers: config, svg_content: svgContent }),
        });
        if (!data) throw new Error('Failed to save emoji');
        return data;
    },

    /**
     * Get User Emojis
     */
    getUserEmojis: async (userId) => {
        try {
            const data = await apiRequest('/api/emojis');
            return data || [];
        } catch (e) {
            console.error("Fetch emojis error:", e);
            return [];
        }
    },

    // --- External Library (OpenMoji) Integration ---

    _libraryCache: null,

    /**
     * Fetch the OpenMoji catalog (Cached)
     */
    _fetchLibrary: async () => {
        if (emojiService._libraryCache) return emojiService._libraryCache;

        try {
            // Fetching a lightweight subset or full JSON from CDN
            // Using a raw gitcdn or jsdelivr for the data.json
            console.log("Fetching Emoji Library...");
            const response = await fetch('https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/data/openmoji.json');
            if (!response.ok) throw new Error("Failed to fetch library");
            const data = await response.json();

            // Filter/Map to useful structure
            emojiService._libraryCache = data.map(item => ({
                hex: item.hexcode,
                name: item.annotation,
                group: item.group,
                url: `https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/${item.hexcode}.svg`
            }));

            return emojiService._libraryCache;
        } catch (e) {
            console.error("Library load failed:", e);
            return [];
        }
    },

    /**
     * Get Trending Emojis (Random selection or curated)
     */
    getTrendingEmojis: async (limit = 20) => {
        const library = await emojiService._fetchLibrary();
        // Shuffle or pick first N
        if (!library.length) return [];
        return library.slice(0, limit);
    },

    /**
     * Search External Emojis
     */
    searchExternalEmojis: async (query) => {
        const library = await emojiService._fetchLibrary();
        if (!query) return library.slice(0, 50);

        const lowerQ = query.toLowerCase();
        return library.filter(e => e.name.toLowerCase().includes(lowerQ) || e.group.toLowerCase().includes(lowerQ)).slice(0, 50);
    }
};
