import { getToken } from './api';

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchAPI(endpoint, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

export const twilioApi = {
    sendSMS: (to, message) => 
        fetchAPI('/api/twilio/sms', {
            method: 'POST',
            body: JSON.stringify({ to, message }),
        }),

    sendSOS: (contacts, location, userName) => 
        fetchAPI('/api/twilio/sos', {
            method: 'POST',
            body: JSON.stringify({ contacts, location, userName }),
        }),

    makeCall: (to, message) => 
        fetchAPI('/api/twilio/call', {
            method: 'POST',
            body: JSON.stringify({ to, message }),
        }),

    makeEmergencyCall: (location, userName) => 
        fetchAPI('/api/twilio/call/emergency', {
            method: 'POST',
            body: JSON.stringify({ location, userName }),
        }),
};
