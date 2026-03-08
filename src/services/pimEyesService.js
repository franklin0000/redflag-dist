/**
 * pimEyesService.js — PimEyes Facial Recognition Search
 *
 * In production: calls go through Supabase Edge Functions — users never see
 * pimeyes.com in network requests, token stays server-side.
 *
 * In development: Vite proxies /pimeyes-api → https://pimeyes.com (vite.config.js)
 *
 * Production setup:
 *   supabase secrets set PIMEYES_TOKEN=your_key_here
 *   supabase functions deploy pimeyes-upload pimeyes-search pimeyes-results
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Dev: Vite proxy to pimeyes.com  |  Prod: Supabase Edge Functions
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`;
const DEV_BASE  = '/pimeyes-api';

// In production no client token needed (stored in Supabase secret)
const API_TOKEN = import.meta.env.VITE_PIMEYES_TOKEN || '';

/** Known adult/escort platforms for result categorization */
const ADULT_PLATFORMS = [
    { domain: 'leolist.cc',        name: 'Leolist',       category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'skokka.com',        name: 'Skokka',        category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'megapersonals.eu',  name: 'MegaPersonals', category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'adultsearch.com',   name: 'AdultSearch',   category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'listcrawler.com',   name: 'ListCrawler',   category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'eros.com',          name: 'Eros',          category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'tryst.link',        name: 'Tryst',         category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'slixa.com',         name: 'Slixa',         category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'cityvibe.com',      name: 'CityVibe',      category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'humaniplex.com',    name: 'Humaniplex',    category: 'Escort 🚩',        icon: 'warning' },
    { domain: 'onlyfans.com',      name: 'OnlyFans',      category: 'Adult Content 🔞', icon: 'lock' },
    { domain: 'fansly.com',        name: 'Fansly',        category: 'Adult Content 🔞', icon: 'lock' },
    { domain: 'manyvids.com',      name: 'ManyVids',      category: 'Adult Content 🔞', icon: 'lock' },
    { domain: 'fanvue.com',        name: 'Fanvue',        category: 'Adult Content 🔞', icon: 'lock' },
    { domain: 'pornhub.com',       name: 'Pornhub',       category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'xvideos.com',       name: 'XVideos',       category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'xhamster.com',      name: 'xHamster',      category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'redtube.com',       name: 'RedTube',       category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'xnxx.com',          name: 'XNXX',          category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'youporn.com',       name: 'YouPorn',       category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'spankbang.com',     name: 'SpankBang',     category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'eporner.com',       name: 'Eporner',       category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'beeg.com',          name: 'Beeg',          category: 'Adult Video 🔞',   icon: 'videocam' },
    { domain: 'cam4.com',          name: 'Cam4',          category: 'Live Cam 🔞',      icon: 'videocam' },
    { domain: 'chaturbate.com',    name: 'Chaturbate',    category: 'Live Cam 🔞',      icon: 'videocam' },
    { domain: 'stripchat.com',     name: 'StripChat',     category: 'Live Cam 🔞',      icon: 'videocam' },
    { domain: 'bongacams.com',     name: 'BongaCams',     category: 'Live Cam 🔞',      icon: 'videocam' },
    { domain: 'myfreecams.com',    name: 'MyFreeCams',    category: 'Live Cam 🔞',      icon: 'videocam' },
];

function matchAdultPlatform(url) {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        return ADULT_PLATFORMS.find(p => hostname === p.domain || hostname.endsWith('.' + p.domain)) || null;
    } catch {
        return null;
    }
}

function getDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

/** Build targeted Google search links for adult platforms */
export function buildTargetedSearches(name) {
    return ADULT_PLATFORMS.map(platform => ({
        score: 50,
        url: `https://www.google.com/search?q=${encodeURIComponent(
            name ? `site:${platform.domain} "${name}"` : `site:${platform.domain}`
        )}`,
        group: platform.category,
        title: `Search on ${platform.name}`,
        icon: platform.icon,
        isRisk: true,
        isTargetedSearch: true,
        base64: null,
    }));
}

/** Format raw PimEyes result items into SearchResults-compatible objects */
function formatItems(results) {
    return results.map(item => {
        // PimEyes result shape: { url, score, thumbnail, ... }
        const pageUrl = item.url || item.page_url || '';
        const platform = matchAdultPlatform(pageUrl);
        return {
            score: Math.round((item.score || item.similarity || 0) * 100),
            url: pageUrl,
            group: platform ? platform.category : 'Face Match',
            title: platform ? `${platform.name} — ${getDomain(pageUrl)}` : getDomain(pageUrl),
            icon: platform ? platform.icon : 'face',
            isRisk: !!platform,
            // PimEyes returns thumbnail images of the matched face
            base64: item.thumbnail
                ? (item.thumbnail.startsWith('data:') ? item.thumbnail : `data:image/jpeg;base64,${item.thumbnail}`)
                : (item.image_url || null),
            imgSrc: item.image_url || null,
        };
    });
}

/**
 * Upload a face image to PimEyes for recognition search.
 * @param {File} fileObject
 * @returns {Promise<{ face_id?: string, search_id?: string, error?: string }>}
 */
export async function uploadFace(fileObject) {
    try {
        if (import.meta.env.PROD) {
            // Production: send base64 JSON to Supabase Edge Function proxy
            const imageBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(fileObject);
            });
            const response = await fetch(`${EDGE_BASE}/pimeyes-upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON}`,
                },
                body: JSON.stringify({ imageBase64 }),
            });
            return await response.json();
        } else {
            // Development: send multipart directly via Vite proxy
            if (!API_TOKEN) return { error: 'PIMEYES_NO_KEY' };
            const formData = new FormData();
            formData.append('file', fileObject);
            const response = await fetch(`${DEV_BASE}/upload/file`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${API_TOKEN}` },
                body: formData,
            });
            return await response.json();
        }
    } catch (error) {
        console.error('PimEyes upload error:', error);
        return { error: error.message, code: 'UPLOAD_FAILED' };
    }
}

/**
 * Start a face search using the uploaded face ID.
 * @param {string} faceId — from uploadFace response
 * @returns {Promise<{ search_id?: string, error?: string }>}
 */
export async function startSearch(faceId) {
    try {
        const isProd = import.meta.env.PROD;
        const url = isProd ? `${EDGE_BASE}/pimeyes-search` : `${DEV_BASE}/search`;
        const headers = { 'Content-Type': 'application/json' };
        if (isProd) headers['Authorization'] = `Bearer ${SUPABASE_ANON}`;
        else if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ faces: [faceId] }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('PimEyes search error:', error);
        return { error: error.message };
    }
}

/**
 * Poll PimEyes for search results.
 * @param {string} searchId
 * @param {function} onProgress — called with 0–100 value
 * @returns {Promise<{ items?: Array, error?: string }>}
 */
export async function pollResults(searchId, onProgress) {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            const isProd = import.meta.env.PROD;
            const headers = {};
            if (isProd) headers['Authorization'] = `Bearer ${SUPABASE_ANON}`;
            else if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;
            const url = isProd
                ? `${EDGE_BASE}/pimeyes-results?searchId=${encodeURIComponent(searchId)}`
                : `${DEV_BASE}/results/${searchId}`;
            const response = await fetch(url, { headers });
            const data = await response.json();

            if (data.error) {
                return { error: data.error };
            }

            // PimEyes returns status: 'done', 'processing', etc.
            if (data.status === 'done' || data.results || data.faces) {
                const raw = data.results || data.faces || data.items || [];
                const formatted = formatItems(raw);
                const targeted = buildTargetedSearches(null);
                return { items: [...formatted, ...targeted] };
            }

            // Progress update
            if (onProgress) {
                const p = Math.min(90, attempts * (90 / maxAttempts));
                onProgress(p);
            }

            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error('PimEyes poll error:', error);
            return { error: error.message };
        }
    }

    return { error: 'Timeout — PimEyes search took too long. Try again.' };
}

/**
 * Full PimEyes search pipeline: upload → start search → poll results.
 * @param {File} fileObject
 * @param {function} onProgress
 * @returns {Promise<{ items?: Array, error?: string }>}
 */
export async function searchFace(fileObject, onProgress) {
    // In dev without a token, skip (show manual buttons only)
    if (!import.meta.env.PROD && !API_TOKEN) {
        return { error: 'PIMEYES_NO_KEY' };
    }

    // Step 1: Upload
    const uploadData = await uploadFace(fileObject);
    if (uploadData.error) return { error: uploadData.error };

    const faceId = uploadData.face_id || uploadData.id || uploadData.token;
    if (!faceId) return { error: 'PimEyes: no face ID returned from upload' };

    if (onProgress) onProgress(30);

    // Step 2: Start search
    const searchData = await startSearch(faceId);
    if (searchData.error) return { error: searchData.error };

    const searchId = searchData.search_id || searchData.id || faceId;
    if (onProgress) onProgress(40);

    // Step 3: Poll results
    return pollResults(searchId, onProgress);
}
