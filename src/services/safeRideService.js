import { supabase } from './supabase';

/**
 * 🚕 SafeRide Service (Simulated Uber API)
 */
export const safeRideService = {

    // --- UBER OAUTH FLOW ---

    /**
     * Check if user is connected to Uber by looking for a token in the database
     * Note: In a real app we'd have a user_oauth_tokens table, but for MVP we might simulate this check
     */
    isUberConnected: async () => {
        // Return true just to skip OAuth during testing if needed, or implement actual DB check
        // For now, we will assume they need to connect if we don't find a token

        // If we don't have an Uber Client ID configured, we are in Demo/Local mode 
        // so we should simulate being connected to allow testing the UI.
        if (!import.meta.env.VITE_UBER_CLIENT_ID) {
            return true;
        }

        const { data, error } = await supabase
            .from('user_oauth_tokens')
            .select('*')
            .eq('provider', 'uber')
            .maybeSingle();

        return data !== null && !error;
    },

    /**
     * Get the Uber Authorization URL
     */
    getUberAuthUrl: (userId) => {
        // The URL needs to match the one configured in the Uber Developer Dashboard
        const clientId = import.meta.env.VITE_UBER_CLIENT_ID;
        // In local dev, use the Edge Function running locally
        // In prod, use the full Supabase URL
        const redirectUri = `https://rzczjsghbwrdtphgplpt.supabase.co/functions/v1/uber-auth-callback`;

        // Add the userId to the state so we can link the token back to them
        return `https://auth.uber.com/oauth/v2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=request&state=${userId}`;
    },

    /**
     * Create a new SafeRide Request (Initiates OAuth if needed)
     */
    requestRide: async (sender_id, receiver_id, match_id, dest_name, dest_address, dest_lat, dest_lng) => {
        // Validation helper for UUID
        const isValidUUID = (uuid) => {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
        };

        // If in demo mode using mock IDs, use a dummy UUID to prevent Supabase 400 errors
        const safeSenderId = isValidUUID(sender_id) ? sender_id : '00000000-0000-0000-0000-000000000001';
        const safeReceiverId = isValidUUID(receiver_id) ? receiver_id : '00000000-0000-0000-0000-000000000002';

        // 1. Create the session in the database first
        const { data, error } = await supabase.from('saferide_sessions').insert([{
            sender_id: safeSenderId,
            receiver_id: safeReceiverId,
            match_id,
            dest_name,
            dest_address,
            dest_lat,
            dest_lng,
            status: 'requested'
        }]).select().single();

        if (error) throw error;
        return data.id; // Return the session ID
    },

    /**
     * Receiver Accepts the Ride and provides Pickup Location
     */
    acceptRide: async (session_id, pickup_address, pickup_lat, pickup_lng) => {

        // 1. Update the session with the pickup location
        const { data: sessionData, error: updateError } = await supabase.from('saferide_sessions').update({
            pickup_address,
            pickup_lat,
            pickup_lng,
            status: 'processing', // Wait for actual Uber API confirmation
            updated_at: new Date().toISOString()
        }).eq('id', session_id).select().single();

        if (updateError) throw updateError;

        // 2. Call our Edge Function to hit the Uber API
        try {
            // Retrieve session from supabase first to get dest_lat/lng
            const { data: sessionInfo } = await supabase.from('saferide_sessions').select('*').eq('id', session_id).single();

            if (!sessionInfo) throw new Error("Session not found");

            // --- DEMO MODE BYPASS ---
            const isDemo = !import.meta.env.VITE_UBER_CLIENT_ID ||
                sessionInfo.sender_id === '00000000-0000-0000-0000-000000000001' ||
                sessionInfo.receiver_id === '00000000-0000-0000-0000-000000000002';

            if (isDemo) {
                console.log("SafeRide DEMO MODE: Bypassing Uber API");
                const initialCarLat = pickup_lat - 0.005;
                const initialCarLng = pickup_lng - 0.005;

                const { error: finalUpdateError } = await supabase.from('saferide_sessions').update({
                    status: 'en_route',
                    eta_minutes: 3,
                    car_lat: initialCarLat,
                    car_lng: initialCarLng,
                    driver_name: 'Juan Perez',
                    car_model: 'Toyota Prius (Demo)',
                    license_plate: 'DEMO-123'
                }).eq('id', session_id);

                if (finalUpdateError) throw finalUpdateError;

                // Start a background simulated drive
                safeRideService._simulateDrive(session_id, initialCarLat, initialCarLng, pickup_lat, pickup_lng);
                return sessionData;
            }
            // --- END DEMO MODE BYPASS ---

            const { data: uberResponse, error: functionError } = await supabase.functions.invoke('uber-request-ride', {
                body: {
                    start_lat: pickup_lat,
                    start_lng: pickup_lng,
                    end_lat: sessionInfo.dest_lat,
                    end_lng: sessionInfo.dest_lng,
                    session_id: sessionInfo.id
                },
            });

            if (functionError) {
                console.error("Uber API Error:", functionError);
                throw new Error("Failed to request Uber.");
            }

            // 3. Update the session with the request_id from Uber
            // Real Uber API usually doesn't have driver/car immediately (status = processing)
            // The Webhook will update driver details later.
            if (uberResponse && uberResponse.request_id) {
                const { error: finalUpdateError } = await supabase.from('saferide_sessions').update({
                    status: uberResponse.status === 'processing' ? 'processing' : uberResponse.status,
                    eta_minutes: uberResponse.eta || null,
                    meta_data: { uber_request_id: uberResponse.request_id } // Store Uber's reference ID
                }).eq('id', session_id);

                if (finalUpdateError) throw finalUpdateError;
            }

        } catch (error) {
            console.error(error);
            // Revert status if it failed
            await supabase.from('saferide_sessions').update({
                status: 'requested',
            }).eq('id', session_id);
            throw error;
        }

        return sessionData;
    },

    /**
     * Subscribe to a specific SafeRide session for real-time UI updates
     */
    subscribeToRide: (session_id, callback) => {
        const channel = supabase
            .channel(`saferide:${session_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'saferide_sessions',
                    filter: `id=eq.${session_id}`
                },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    },

    /**
     * Get a specific session
     */
    getRide: async (session_id) => {
        const { data, error } = await supabase
            .from('saferide_sessions')
            .select('*')
            .eq('id', session_id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update car location (Simulated driving tick - normally handled by Uber Webhooks)
     */
    updateCarLocation: async (session_id, newLat, newLng, newEta) => {
        const { error } = await supabase.from('saferide_sessions').update({
            car_lat: newLat,
            car_lng: newLng,
            eta_minutes: newEta > 0 ? newEta : 0,
            status: newEta <= 0 ? 'arrived' : 'en_route',
            updated_at: new Date().toISOString()
        }).eq('id', session_id);

        if (error) throw error;
    },

    /**
     * Simulate driving for Demo mode
     */
    _simulateDrive: (session_id, startLat, startLng, endLat, endLng) => {
        let currentLat = startLat;
        let currentLng = startLng;
        let eta = 3;

        const steps = 10;
        const latStep = (endLat - startLat) / steps;
        const lngStep = (endLng - startLng) / steps;

        let stepCount = 0;

        const interval = setInterval(async () => {
            stepCount++;
            currentLat += latStep;
            currentLng += lngStep;

            if (stepCount % 3 === 0) eta--;

            if (stepCount >= steps) {
                clearInterval(interval);
                await safeRideService.updateCarLocation(session_id, endLat, endLng, 0);
            } else {
                await safeRideService.updateCarLocation(session_id, currentLat, currentLng, Math.max(1, eta));
            }
        }, 3000); // Update every 3 seconds for demo speed
    }
};
