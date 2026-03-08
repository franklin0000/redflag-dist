// Supabase Edge Function — Secure Scan Proxy
// Receives base64 image from client, validates it, forwards securely to external scanner.
// Token stored server-side via: supabase secrets set PIMEYES_TOKEN=your_key

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

function detectMimeType(base64: string): string | null {
  const header = base64.substring(0, 30);
  if (header.includes('image/jpeg')) return 'image/jpeg';
  if (header.includes('image/png'))  return 'image/png';
  if (header.includes('image/webp')) return 'image/webp';
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 1. Parse request ──────────────────────────────────────────────────────
    let body: { imageBase64?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64 } = body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'imageBase64 field is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Validate format ────────────────────────────────────────────────────
    const mimeType = detectMimeType(imageBase64);
    if (!mimeType || !ALLOWED_FORMATS.includes(mimeType)) {
      console.warn(`[scan-proxy] Rejected format: ${mimeType}`);
      return new Response(JSON.stringify({
        error: `Unsupported image format. Allowed: JPEG, PNG, WebP`,
      }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Validate size ──────────────────────────────────────────────────────
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const estimatedBytes = Math.ceil(base64Data.length * 0.75);
    if (estimatedBytes > MAX_SIZE_BYTES) {
      console.warn(`[scan-proxy] Rejected oversized image: ~${Math.round(estimatedBytes / 1024)}KB`);
      return new Response(JSON.stringify({
        error: `Image too large (max 5 MB). Current: ~${Math.round(estimatedBytes / 1024 / 1024 * 10) / 10} MB`,
      }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Get server-side credentials (never exposed to client) ─────────────
    const token = Deno.env.get('PIMEYES_TOKEN');
    if (!token) {
      console.error('[scan-proxy] PIMEYES_TOKEN secret not configured');
      return new Response(JSON.stringify({ error: 'Scan service not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 5. Convert base64 → binary for multipart upload ──────────────────────
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const ext = mimeType.split('/')[1];
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mimeType }), `face.${ext}`);

    // ── 6. Secure POST to external scanner ───────────────────────────────────
    console.log(`[scan-proxy] Forwarding ~${Math.round(estimatedBytes / 1024)}KB ${mimeType} to scanner`);

    const upstream = await fetch('https://pimeyes.com/api/upload/file', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });

    // ── 7. Return result to client ────────────────────────────────────────────
    const data = await upstream.json();

    if (!upstream.ok) {
      console.error(`[scan-proxy] Scanner responded ${upstream.status}:`, JSON.stringify(data));
    } else {
      console.log(`[scan-proxy] Scanner OK, response keys: ${Object.keys(data).join(', ')}`);
    }

    return new Response(JSON.stringify(data), {
      status: upstream.ok ? 200 : upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[scan-proxy] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
