import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Uber API configuration (to be set in Supabase Secrets)
// const UBER_CLIENT_ID = Deno.env.get('UBER_CLIENT_ID');
// const UBER_CLIENT_SECRET = Deno.env.get('UBER_CLIENT_SECRET');
// const REDIRECT_URI = Deno.env.get('UBER_REDIRECT_URI');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // We will pass the user ID in the state

    if (!code) {
      return new Response(JSON.stringify({ error: "No code provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const clientId = Deno.env.get('UBER_CLIENT_ID');
    const clientSecret = Deno.env.get('UBER_CLIENT_SECRET');
    const redirectUri = Deno.env.get('UBER_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("Missing Uber configuration in environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://auth.uber.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Uber token error:", tokenData);
      return new Response(JSON.stringify({ error: "Failed to exchange token", details: tokenData }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Save the token to the database (User ID is passed via state)
    const userId = state;

    if (userId) {
      // Initialize Supabase admin client
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      // Insert or update the active token for the user
      const { error: dbError } = await supabaseAdmin
        .from('user_oauth_tokens')
        .upsert({
          user_id: userId,
          provider: 'uber',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          scope: tokenData.scope,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider'
        });

      if (dbError) {
        console.error("Database error saving token:", dbError);
        // We don't fail the request here, but log it
      }
    } else {
      console.warn("No user ID (state) provided in the OAuth callback. Token was not saved to DB.");
    }

    // 3. Redirect the user back to the app
    // Determine the frontend URL (could be local or production)
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';

    // We redirect them back to a generic Uber Connected success page or back to the app
    return Response.redirect(`${frontendUrl}?uber_connected=true`, 302);

  } catch (error) {
    console.error("Unexpected error:", error.message);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
