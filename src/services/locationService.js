/**
 * Location Service — GPS tracking, shareable links, and emergency number detection
 * Uses the browser Geolocation API (no external dependencies)
 */

/**
 * Get current position as a one-time fix
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 */
export function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
            }),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

/**
 * Watch position continuously. Returns a cleanup function to stop tracking.
 * @param {(coords: {lat: number, lng: number, accuracy: number}) => void} onUpdate
 * @param {(error: GeolocationPositionError) => void} onError
 * @returns {() => void} stop function
 */
export function watchLocation(onUpdate, onError) {
    if (!navigator.geolocation) {
        onError?.(new Error('Geolocation is not supported'));
        return () => { };
    }
    const watchId = navigator.geolocation.watchPosition(
        (position) => onUpdate({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
        }),
        (err) => onError?.(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
}

/**
 * Generate a Google Maps link from coordinates
 */
export function getGoogleMapsLink(lat, lng) {
    return `https://maps.google.com/maps?q=${lat},${lng}`;
}

/**
 * Detect the user's country from GPS coordinates using free Nominatim reverse geocoding
 * @returns {Promise<string>} ISO country code (e.g. "US", "MX", "GB")
 */
async function detectCountry(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
            { headers: { 'User-Agent': 'RedFlagApp/1.0' } }
        );
        const data = await res.json();
        return data?.address?.country_code?.toUpperCase() || 'US';
    } catch {
        return 'US'; // Default to US if geocoding fails
    }
}

/**
 * Emergency numbers by country/region
 */
const EMERGENCY_NUMBERS = {
    US: { number: '911', label: '911 (US)' },
    CA: { number: '911', label: '911 (Canada)' },
    MX: { number: '911', label: '911 (Mexico)' },
    BR: { number: '190', label: '190 (Brazil)' },
    GB: { number: '999', label: '999 (UK)' },
    AU: { number: '000', label: '000 (Australia)' },
    NZ: { number: '111', label: '111 (New Zealand)' },
    JP: { number: '110', label: '110 (Japan)' },
    KR: { number: '112', label: '112 (South Korea)' },
    IN: { number: '112', label: '112 (India)' },
    CN: { number: '110', label: '110 (China)' },
    // EU countries use 112
    DEFAULT: { number: '112', label: '112 (International)' },
};

// EU member states that use 112
const EU_COUNTRIES = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

/**
 * Get the emergency number for the user's current location
 * @param {number|null} lat
 * @param {number|null} lng
 * @returns {Promise<{number: string, label: string}>}
 */
export async function getEmergencyNumber(lat, lng) {
    if (lat == null || lng == null) {
        return EMERGENCY_NUMBERS.US; // Default fallback
    }
    const country = await detectCountry(lat, lng);
    if (EMERGENCY_NUMBERS[country]) {
        return EMERGENCY_NUMBERS[country];
    }
    if (EU_COUNTRIES.includes(country)) {
        return EMERGENCY_NUMBERS.DEFAULT; // 112 for EU
    }
    return EMERGENCY_NUMBERS.DEFAULT;
}

/**
 * Build a shareable SOS message with location
 */
export function buildSOSMessage(contactName, lat, lng) {
    const mapsLink = lat && lng ? getGoogleMapsLink(lat, lng) : 'Location unavailable';
    return `🚨 EMERGENCY from RedFlag App!\n${contactName || 'Someone'} needs help NOW.\n📍 Location: ${mapsLink}\nPlease call them immediately or contact emergency services.`;
}

/**
 * Check if the browser supports geolocation
 */
export function isGeolocationSupported() {
    return 'geolocation' in navigator;
}
