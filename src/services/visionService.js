/**
 * visionService.js — Google Cloud Vision API + Targeted Adult Platform Checks
 * Feature: WEB_DETECTION — finds where an image/face appears across the internet.
 *
 * Setup: Add VITE_GOOGLE_VISION_API_KEY to .env
 *   (Enable "Cloud Vision API" in Google Cloud Console — 1000 free calls/month)
 */

const VISION_API_KEY = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

/**
 * Known adult/escort platforms to flag in results and target in searches.
 * Each entry: { domain, name, searchUrl, category }
 */
const ADULT_PLATFORMS = [
    // Escort / personals
    { domain: 'leolist.cc',        name: 'Leolist',       category: 'Escort 🚩', icon: 'warning' },
    { domain: 'skokka.com',        name: 'Skokka',        category: 'Escort 🚩', icon: 'warning' },
    { domain: 'megapersonals.eu',  name: 'MegaPersonals', category: 'Escort 🚩', icon: 'warning' },
    { domain: 'adultsearch.com',   name: 'AdultSearch',   category: 'Escort 🚩', icon: 'warning' },
    { domain: 'listcrawler.com',   name: 'ListCrawler',   category: 'Escort 🚩', icon: 'warning' },
    { domain: 'eros.com',          name: 'Eros',          category: 'Escort 🚩', icon: 'warning' },
    { domain: 'tryst.link',        name: 'Tryst',         category: 'Escort 🚩', icon: 'warning' },
    { domain: 'humaniplex.com',    name: 'Humaniplex',    category: 'Escort 🚩', icon: 'warning' },
    { domain: 'slixa.com',         name: 'Slixa',         category: 'Escort 🚩', icon: 'warning' },
    { domain: 'cityvibe.com',      name: 'CityVibe',      category: 'Escort 🚩', icon: 'warning' },
    // Adult content
    { domain: 'onlyfans.com',      name: 'OnlyFans',      category: 'Adult Content 🔞', icon: 'lock' },
    { domain: 'fansly.com',        name: 'Fansly',        category: 'Adult Content 🔞', icon: 'lock' },
    { domain: 'manyvids.com',      name: 'ManyVids',      category: 'Adult Content 🔞', icon: 'lock' },
    { domain: 'fanvue.com',        name: 'Fanvue',        category: 'Adult Content 🔞', icon: 'lock' },
    { domain: 'patreon.com',       name: 'Patreon',       category: 'Adult Content 🔞', icon: 'lock' },
    // Adult video sites
    { domain: 'pornhub.com',       name: 'Pornhub',       category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'xvideos.com',       name: 'XVideos',       category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'xhamster.com',      name: 'xHamster',      category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'redtube.com',       name: 'RedTube',       category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'xnxx.com',          name: 'XNXX',          category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'youporn.com',       name: 'YouPorn',       category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'spankbang.com',     name: 'SpankBang',     category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'eporner.com',       name: 'Eporner',       category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'beeg.com',          name: 'Beeg',          category: 'Adult Video 🔞', icon: 'videocam' },
    { domain: 'cam4.com',          name: 'Cam4',          category: 'Live Cam 🔞', icon: 'videocam' },
    { domain: 'chaturbate.com',    name: 'Chaturbate',    category: 'Live Cam 🔞', icon: 'videocam' },
    { domain: 'stripchat.com',     name: 'StripChat',     category: 'Live Cam 🔞', icon: 'videocam' },
    { domain: 'bongacams.com',     name: 'BongaCams',     category: 'Live Cam 🔞', icon: 'videocam' },
    { domain: 'myfreecams.com',    name: 'MyFreeCams',    category: 'Live Cam 🔞', icon: 'videocam' },
];

/**
 * Check if a URL belongs to an adult platform.
 * Returns the platform entry if matched, null otherwise.
 */
function matchAdultPlatform(url) {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        return ADULT_PLATFORMS.find(p => hostname === p.domain || hostname.endsWith('.' + p.domain)) || null;
    } catch {
        return null;
    }
}

/**
 * Build targeted Google search links for adult platforms.
 * Used as "Check on Platform" action items in results.
 * @param {string|null} name — best guess name from Vision API (if available)
 */
function buildTargetedSearches(name) {
    const searches = [];

    for (const platform of ADULT_PLATFORMS) {
        const query = name
            ? `site:${platform.domain} "${name}"`
            : `site:${platform.domain}`;

        searches.push({
            score: 50,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            group: platform.category,
            title: `Search on ${platform.name}`,
            icon: platform.icon,
            isRisk: true,
            isTargetedSearch: true,
        });
    }

    return searches;
}

export const visionService = {
    /**
     * Search the web for an image using Google Cloud Vision WEB_DETECTION.
     * @param {string} imageSource — base64 string (with or without data: prefix)
     * @returns {Promise<Array>} — formatted result list for SearchResults page
     */
    analyzeImage: async (imageSource) => {
        if (!VISION_API_KEY) {
            console.warn('VITE_GOOGLE_VISION_API_KEY not set — cannot call Vision API');
            return [];
        }

        try {
            // Strip the data: prefix if present
            const content = imageSource.includes(',')
                ? imageSource.split(',')[1]
                : imageSource;

            const requestBody = {
                requests: [
                    {
                        image: { content },
                        features: [
                            { type: 'WEB_DETECTION', maxResults: 100 },
                            { type: 'FACE_DETECTION', maxResults: 10 },
                            { type: 'SAFE_SEARCH_DETECTION' },
                        ],
                    },
                ],
            };

            const response = await fetch(VISION_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || `Vision API error ${response.status}`);
            }

            const data = await response.json();
            const annotation = data.responses?.[0];
            if (!annotation) return [];

            return formatResults(annotation);

        } catch (error) {
            console.error('Vision API error:', error.message || error);
            // Even on failure, return the targeted platform searches
            // so the user can still manually check each site.
            return buildTargetedSearches(null);
        }
    },
};

/**
 * Format raw Google Vision API response into SearchResults-compatible objects.
 * Each item: { score, url, group, title, icon?, isRisk?, isTargetedSearch? }
 */
function formatResults(data) {
    const results = [];
    const web = data.webDetection || {};

    // Extract best guess name for use in targeted searches
    const bestGuessName = web.bestGuessLabels?.[0]?.label || null;

    // 1. Best Guess Identity (who Google thinks this is)
    if (web.bestGuessLabels?.length) {
        web.bestGuessLabels.forEach(label => {
            results.push({
                score: 100,
                url: `https://www.google.com/search?q=${encodeURIComponent(label.label)}`,
                group: 'Identity Match',
                title: label.label,
                icon: 'person_search',
            });
        });
    }

    // 2. Pages where this exact image appears — flag adult platforms automatically
    if (web.pagesWithMatchingImages?.length) {
        web.pagesWithMatchingImages.forEach(page => {
            const platform = matchAdultPlatform(page.url);
            results.push({
                score: 100,
                url: page.url,
                group: platform ? platform.category : 'Direct Match',
                title: page.pageTitle || page.url,
                icon: platform ? platform.icon : 'link',
                isRisk: !!platform,
                // Favicon to show the website icon
                faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(page.url).hostname)}&sz=64`,
            });
        });
    }

    // 3. Full matching image files — the URL IS the image, use it directly as thumbnail
    if (web.fullMatchingImages?.length) {
        web.fullMatchingImages.forEach(img => {
            const platform = matchAdultPlatform(img.url);
            results.push({
                score: 95,
                url: img.url,
                group: platform ? platform.category : 'Image Source',
                title: img.url,
                icon: platform ? platform.icon : 'image',
                isRisk: !!platform,
                imgSrc: img.url,   // direct image URL — use as <img src>
            });
        });
    }

    // 4. Partial matches (cropped/edited versions)
    if (web.partialMatchingImages?.length) {
        web.partialMatchingImages.forEach(img => {
            const platform = matchAdultPlatform(img.url);
            results.push({
                score: 85,
                url: img.url,
                group: platform ? platform.category : 'Partial Match',
                title: img.url,
                icon: platform ? platform.icon : 'image_search',
                isRisk: !!platform,
                imgSrc: img.url,   // direct image URL
            });
        });
    }

    // 5. Visually similar images
    if (web.visuallySimilarImages?.length) {
        web.visuallySimilarImages.forEach(img => {
            const platform = matchAdultPlatform(img.url);
            results.push({
                score: 70,
                url: img.url,
                group: platform ? platform.category : 'Visual Match',
                title: img.url,
                icon: platform ? platform.icon : 'face',
                isRisk: !!platform,
                imgSrc: img.url,   // direct image URL
            });
        });
    }

    // 6. Web entities (names, knowledge graph)
    if (web.webEntities?.length) {
        web.webEntities.forEach(entity => {
            if (!entity.description) return;
            results.push({
                score: Math.round((entity.score || 0) * 100),
                url: `https://www.google.com/search?q=${encodeURIComponent(entity.description)}`,
                group: 'Web Entity',
                title: entity.description,
                icon: 'manage_search',
            });
        });
    }

    // 7. Face detection summary
    if (data.faceAnnotations?.length) {
        results.push({
            score: 100,
            url: '#',
            group: 'Face Analysis',
            title: `${data.faceAnnotations.length} face(s) detected in photo`,
            icon: 'face_retouching_natural',
        });
    }

    // 8. Safe search content flags
    if (data.safeSearchAnnotation) {
        const safe = data.safeSearchAnnotation;
        const checks = [
            { name: 'Adult Content', val: safe.adult },
            { name: 'Violence', val: safe.violence },
            { name: 'Racy Content', val: safe.racy },
        ];
        checks.forEach(c => {
            if (c.val === 'LIKELY' || c.val === 'VERY_LIKELY') {
                results.push({
                    score: 100,
                    url: '#',
                    group: 'Risk Check 🚩',
                    title: `${c.name} detected in this image`,
                    icon: 'warning',
                    isRisk: true,
                });
            }
        });
    }

    // Deduplicate
    const seen = new Set();
    const unique = results.filter(r => {
        const key = r.url + r.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // 9. Targeted platform searches — appended at end so real hits come first
    const targeted = buildTargetedSearches(bestGuessName);

    return [...unique, ...targeted].slice(0, 150);
}
