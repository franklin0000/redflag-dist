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
    const { start_lat, start_lng, end_lat, end_lng } = await req.json();

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Initialize Supabase client with the user's JWT to get their ID
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch the user's saved Uber token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'uber')
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Uber account not linked', details: tokenError }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Make the real request to Uber API
    const rideRequestPayload = {
      start_latitude: start_lat,
      start_longitude: start_lng,
      end_latitude: end_lat,
      end_longitude: end_lng,
      product_id: 'a1111c8c-c720-46c3-8534-2fcdd730040d' // Usually standard UberX ID
    };

    const uberResponse = await fetch('https://api.uber.com/v1.2/requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rideRequestPayload)
    });

    const uberData = await uberResponse.json();

    if (!uberResponse.ok) {
      console.error("Uber API Error:", uberData);
      return new Response(JSON.stringify({ error: "Uber API Error", details: uberData }), {
        status: uberResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Return the real response to the frontend
    return new Response(JSON.stringify(uberData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Unexpected error:", error.message);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
