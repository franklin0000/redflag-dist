// Supabase Edge Function — PimEyes Results Proxy
// Deploy: supabase functions deploy pimeyes-results

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('PIMEYES_TOKEN') ?? '';
    const url = new URL(req.url);
    const searchId = url.searchParams.get('searchId');

    if (!searchId) {
      return new Response(JSON.stringify({ error: 'searchId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch(`https://pimeyes.com/api/results/${searchId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
