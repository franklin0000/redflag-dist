import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Uber webhooks send a POST request with event data
        const payload = await req.json();

        const eventType = payload.event_type;
        const resourceHref = payload.resource_href; // URL to fetch the updated trip details
        const meta = payload.meta;

        if (!eventType || !resourceHref) {
            return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), { status: 400, headers: corsHeaders });
        }

        // Initialize Supabase admin client to update the database
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. We need to extract the Uber request ID from the resource_href or meta
        // In a real scenario, we would use the resourceHref and a valid server token to GET the latest trip details.
        // For this example, we'll assume the meta contains the request_id.
        const requestId = meta?.resource_id;

        if (!requestId) {
            return new Response(JSON.stringify({ error: 'No resource_id in meta' }), { status: 400, headers: corsHeaders });
        }

        // Find the session in our database that matches this Uber request_id
        // Note: Our saferide_sessions table needs to store the uber_request_id in meta_data
        const { data: sessionData, error: sessionFetchError } = await supabaseAdmin
            .from('saferide_sessions')
            .select('*')
            .contains('meta_data', { uber_request_id: requestId })
            .single();

        if (sessionFetchError || !sessionData) {
            console.warn("Received webhook for unknown request_id:", requestId);
            return new Response(JSON.stringify({ message: "Request ID not found in database, ignoring." }), { status: 200, headers: corsHeaders });
        }

        // 2. Fetch the latest trip details from Uber using our Server Token
        const serverToken = Deno.env.get('UBER_SERVER_TOKEN');

        if (!serverToken) {
            console.error("Missing UBER_SERVER_TOKEN");
            return new Response(JSON.stringify({ error: "Missing Server Token" }), { status: 500, headers: corsHeaders });
        }

        const tripResponse = await fetch(resourceHref, {
            headers: {
                'Authorization': `Token ${serverToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!tripResponse.ok) {
            console.error("Failed to fetch trip details from Uber:", await tripResponse.text());
            return new Response(JSON.stringify({ error: "Failed to fetch trip details" }), { status: 500, headers: corsHeaders });
        }

        const tripDetails = await tripResponse.json();

        // 3. Update our database with the new status
        let appStatus = sessionData.status;

        if (tripDetails.status === 'processing') {
            appStatus = 'processing';
        } else if (tripDetails.status === 'accepted') {
            appStatus = 'en_route';
        } else if (tripDetails.status === 'arriving') {
            appStatus = 'en_route';
        } else if (tripDetails.status === 'in_progress') {
            appStatus = 'en_route';
        } else if (tripDetails.status === 'completed') {
            appStatus = 'arrived';
        } else if (tripDetails.status === 'driver_canceled' || tripDetails.status === 'rider_canceled') {
            appStatus = 'canceled';
        }

        const updatePayload: any = {
            status: appStatus,
            updated_at: new Date().toISOString()
        };

        if (tripDetails.location) {
            updatePayload.car_lat = tripDetails.location.latitude;
            updatePayload.car_lng = tripDetails.location.longitude;
        }

        if (tripDetails.eta != null) {
            updatePayload.eta_minutes = tripDetails.eta;
        }

        if (tripDetails.driver) {
            updatePayload.driver_name = tripDetails.driver.name;
        }

        if (tripDetails.vehicle) {
            updatePayload.car_model = `${tripDetails.vehicle.make} ${tripDetails.vehicle.model}`;
            updatePayload.license_plate = tripDetails.vehicle.license_plate;
        }

        const { error: updateError } = await supabaseAdmin
            .from('saferide_sessions')
            .update(updatePayload)
            .eq('id', sessionData.id);

        if (updateError) {
            console.error("Failed to update session:", updateError);
            return new Response(JSON.stringify({ error: "Database update failed" }), { status: 500, headers: corsHeaders });
        }

        // Acknowledge the webhook
        return new Response(JSON.stringify({ message: "Webhook processed successfully" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Unexpected error process webhook:", error.message);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
