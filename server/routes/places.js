/**
 * Places Proxy — OpenStreetMap Overpass API
 * Returns ALL nearby businesses: food, entertainment, nature, culture, services
 */
const express = require('express');
const fetch   = require('node-fetch');
const router  = express.Router();

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// ── Full OSM tag → app type mapping ──────────────────────────────────────
const OSM_TYPE_MAP = {
  // Food & Drink
  cafe: 'cafe', coffee_shop: 'cafe', tea_house: 'cafe', juice_bar: 'cafe',
  restaurant: 'restaurant', fast_food: 'restaurant', food_court: 'restaurant',
  ice_cream: 'restaurant', dessert: 'restaurant', bakery: 'restaurant',
  bar: 'bar', pub: 'bar', biergarten: 'bar', nightclub: 'bar', lounge: 'bar',
  // Entertainment
  cinema: 'cinema', theatre: 'cinema', arts_centre: 'cinema',
  escape_game: 'cinema', bowling_alley: 'cinema', casino: 'cinema',
  // Culture
  museum: 'museum', gallery: 'museum', exhibition_centre: 'museum',
  aquarium: 'museum', planetarium: 'museum', historic: 'museum',
  // Knowledge
  library: 'library', book_store: 'library',
  // Nature & Outdoors
  park: 'park', garden: 'park', nature_reserve: 'park',
  beach: 'park', viewpoint: 'park', playground: 'park',
  // Public Spaces
  marketplace: 'public', community_centre: 'public', plaza: 'public',
  town_hall: 'public', fountain: 'public', square: 'public',
  // Sport & Fitness
  sports_centre: 'public', stadium: 'public', swimming_pool: 'public',
  fitness_centre: 'public', yoga: 'public', climbing: 'public',
};

const CATEGORY_SAFETY = {
  cafe: 95, restaurant: 88, bar: 72, cinema: 90,
  museum: 93, library: 96, park: 87, public: 90,
};

const CATEGORY_FEATURES = {
  cafe:       ['Public Space', 'Wi-Fi', 'CCTV', 'Well Lit'],
  restaurant: ['Public Space', 'Staff Present', 'Reservations', 'Well Lit'],
  bar:        ['ID Check', 'Staff Present', 'CCTV', 'Social'],
  cinema:     ['Public Space', 'Security', 'Crowds', 'Entertainment'],
  museum:     ['Public Space', 'Security', 'Staff Present', 'Cultural'],
  library:    ['Public Space', 'Wi-Fi', 'Security', 'Quiet'],
  park:       ['Outdoor', 'Well Lit', 'Open Space', 'Fresh Air'],
  public:     ['Public Space', 'Well Lit', 'Open Access'],
};

const CATEGORY_VIBES = {
  cafe:       ['Coffee', 'Casual', 'Quick Meet'],
  restaurant: ['Dinner', 'Casual', 'Romantic'],
  bar:        ['Lively', 'Casual'],
  cinema:     ['First Date', 'Movies', 'Casual'],
  museum:     ['First Date', 'Quiet', 'Cultural'],
  library:    ['Study', 'Quiet', 'First Date'],
  park:       ['Outdoors', 'Casual', 'Public Space'],
  public:     ['Public Space', 'Casual'],
};

// Multiple fallback images per category for visual variety
const FALLBACK_PHOTOS = {
  cafe: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=400&q=80',
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&q=80',
    'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=400&q=80',
  ],
  bar: [
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80',
    'https://images.unsplash.com/photo-1543007631-283050bb3e8c?w=400&q=80',
    'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=400&q=80',
  ],
  cinema: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80',
    'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80',
  ],
  museum: [
    'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=400&q=80',
    'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&q=80',
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=80',
  ],
  library: [
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80',
  ],
  park: [
    'https://images.unsplash.com/photo-1496417263034-38ec4f0d6b21?w=400&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80',
    'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&q=80',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&q=80',
  ],
  public: [
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=80',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&q=80',
  ],
};

// ── Vibe → OSM filter ─────────────────────────────────────────────────────
const VIBE_TAGS = {
  'Coffee':       { amenity: 'cafe|coffee_shop|tea_house' },
  'Dinner':       { amenity: 'restaurant|fast_food|food_court' },
  'Romantic':     { amenity: 'restaurant|cafe' },
  'Lively':       { amenity: 'bar|pub|nightclub|biergarten' },
  'Quiet':        { amenity: 'cafe|library' },
  'Public Space': { leisure: 'park|garden', amenity: 'marketplace|community_centre' },
  'Study':        { amenity: 'library|cafe' },
  'Outdoors':     { leisure: 'park|garden|nature_reserve|beach' },
  'Casual':       { amenity: 'cafe|restaurant|fast_food|bar' },
  'First Date':   { amenity: 'cafe|cinema|restaurant|museum' },
  'Quick Meet':   { amenity: 'cafe|coffee_shop|fast_food' },
};

// ── App type → OSM query tags ─────────────────────────────────────────────
const TYPE_TAGS = {
  cafe:       { amenity: 'cafe|coffee_shop|tea_house|juice_bar' },
  restaurant: { amenity: 'restaurant|fast_food|food_court|ice_cream|bakery' },
  bar:        { amenity: 'bar|pub|biergarten|nightclub|lounge' },
  cinema:     { amenity: 'cinema|theatre|arts_centre|escape_game|bowling_alley' },
  museum:     { tourism: 'museum|gallery|aquarium', amenity: 'arts_centre' },
  library:    { amenity: 'library' },
  park:       { leisure: 'park|garden|nature_reserve|beach|playground' },
  public:     { amenity: 'marketplace|community_centre|fountain', leisure: 'sports_centre|stadium|fitness_centre' },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function getOsmType(tags) {
  for (const key of ['amenity', 'leisure', 'tourism', 'shop', 'sport']) {
    const val = tags[key];
    if (val) {
      const t = OSM_TYPE_MAP[val];
      if (t) return t;
    }
  }
  // Cuisine-based detection
  if (tags.cuisine) return 'restaurant';
  return null; // skip unrecognized types
}

function pseudoRating(id, name = '') {
  const seed = (String(id) + name).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return parseFloat((3.5 + (seed % 15) / 10).toFixed(1));
}

function pseudoReviews(id) {
  return 30 + (Number(String(id).slice(-3)) || 50);
}

function transformOSM(el, idx, userLat, userLng, keyword) {
  const tags = el.tags || {};
  const name = tags.name || tags['name:en'];
  if (!name) return null; // skip unnamed

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null; // skip without coords

  const type = getOsmType(tags);
  if (!type) return null; // skip unrecognized

  const rating  = pseudoRating(el.id, name);
  const reviews = pseudoReviews(el.id);
  const openNow = tags.opening_hours
    ? !tags.opening_hours.toLowerCase().includes('off')
    : true;

  const addrParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'] || tags['addr:suburb'],
  ].filter(Boolean);
  const address = addrParts.length > 0 ? addrParts.join(' ') : (tags['addr:full'] || 'See map for address');

  const photos = FALLBACK_PHOTOS[type] || FALLBACK_PHOTOS.public;
  const image  = photos[idx % photos.length];

  const vibes = [...(CATEGORY_VIBES[type] || ['Casual'])];
  const VIBE_KEYS = ['Casual','Romantic','First Date','Quick Meet','Coffee','Study','Lively','Outdoors','Quiet','Dinner','Public Space'];
  if (keyword && VIBE_KEYS.includes(keyword) && !vibes.includes(keyword)) vibes.unshift(keyword);

  const safetyBase = CATEGORY_SAFETY[type] || 85;
  const safetyScore = Math.min(99, Math.round(safetyBase + (rating - 3.5) * 4));

  return {
    id:          `osm_${el.type}_${el.id}`,
    name,
    type,
    rating,
    reviews,
    address,
    lat,
    lng,
    image,
    safetyScore,
    priceRange:  tags.fee === 'yes' ? '$' : (type === 'park' || type === 'library') ? 'Free' : tags.price_range || '$$',
    busyNow:     reviews > 150 && openNow,
    features:    CATEGORY_FEATURES[type] || ['Public Space'],
    vibe:        [...new Set(vibes)],
    openNow,
    closingTime: tags.opening_hours ? tags.opening_hours.slice(0, 30) : 'Check Details',
    distance:    distKm(userLat, userLng, lat, lng),
    website:     tags.website || tags['contact:website'] || null,
    phone:       tags.phone || tags['contact:phone'] || null,
    source:      'openstreetmap',
  };
}

// ── Build broad Overpass QL query ─────────────────────────────────────────
function buildQuery(lat, lng, radius, typeTags) {
  const around = `(around:${radius},${lat},${lng})`;
  const parts  = [];

  if (!typeTags) {
    // ALL — comprehensive sweep of every dating-relevant category
    const amenities = [
      'cafe','coffee_shop','tea_house','juice_bar',
      'restaurant','fast_food','food_court','ice_cream','bakery',
      'bar','pub','biergarten','nightclub','lounge',
      'cinema','theatre','arts_centre','escape_game','bowling_alley',
      'library','marketplace','community_centre',
    ].join('|');
    const leisures = 'park|garden|nature_reserve|beach|playground|sports_centre|fitness_centre|stadium';
    const tourisms = 'museum|gallery|aquarium|viewpoint|attraction';

    parts.push(`node["amenity"~"${amenities}"]${around};`);
    parts.push(`way["amenity"~"${amenities}"]${around};`);
    parts.push(`node["leisure"~"${leisures}"]${around};`);
    parts.push(`way["leisure"~"${leisures}"]${around};`);
    parts.push(`node["tourism"~"${tourisms}"]${around};`);
    parts.push(`way["tourism"~"${tourisms}"]${around};`);
  } else {
    for (const [key, val] of Object.entries(typeTags)) {
      parts.push(`node["${key}"~"${val}"]${around};`);
      parts.push(`way["${key}"~"${val}"]${around};`);
    }
  }

  // No limit in the query itself — limit server-side after filtering
  return `[out:json][timeout:30];(\n${parts.join('\n')}\n);out body center qt;`;
}

// ── Route ─────────────────────────────────────────────────────────────────
// GET /api/places/search?lat=&lng=&type=&keyword=&radius=&limit=
router.get('/search', async (req, res) => {
  const { lat, lng, type = 'all', keyword = '', radius = '5000', limit = '100' } = req.query;

  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required', results: [] });

  const typeTags = VIBE_TAGS[keyword] || TYPE_TAGS[type] || null;
  const query    = buildQuery(lat, lng, radius, typeTags);

  try {
    const response = await fetch(OVERPASS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Overpass error:', response.status, text.slice(0, 300));
      return res.status(502).json({ error: `Overpass ${response.status}`, results: [] });
    }

    const data = await response.json();
    const raw  = data.elements || [];

    const results = raw
      .map((el, i) => transformOSM(el, i, Number(lat), Number(lng), keyword))
      .filter(Boolean)           // remove unnamed / unrecognized
      .slice(0, Number(limit))   // cap at limit
      .sort((a, b) => b.safetyScore - a.safetyScore);

    console.log(`[places] ${type}/${keyword || 'any'} @ ${lat},${lng} → ${raw.length} raw → ${results.length} results`);
    res.json({ results });
  } catch (err) {
    console.error('Places proxy error:', err.message);
    res.status(500).json({ error: err.message, results: [] });
  }
});

module.exports = router;
