// Supabase Edge Function — Yandex Vision API Proxy
// Accepts base64 image, calls Yandex Vision server-side (no CORS issues),
// returns face gender detection result.
// Set secret: supabase secrets set YANDEX_VISION_KEY=your_api_key

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

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
    let body: { image?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { image } = body;
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'image field (base64) is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Strip data URI prefix if present
    const base64 = image.includes(',') ? image.split(',')[1] : image;

    // ── 2. Get API key ────────────────────────────────────────────────────────
    const apiKey = Deno.env.get('YANDEX_VISION_KEY');
    if (!apiKey) {
      console.error('[yandex-vision] YANDEX_VISION_KEY secret not configured');
      return new Response(JSON.stringify({ error: 'Vision service not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Call Yandex Vision API ─────────────────────────────────────────────
    const folderId = Deno.env.get('YANDEX_FOLDER_ID') || 'b1g5d3bsuqm0ivg26kvg';

    const visionResponse = await fetch(
      'https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${apiKey}`,
        },
        body: JSON.stringify({
          folderId,
          analyzeSpecs: [
            {
              content: base64,
              features: [
                { type: 'FACE_DETECTION' },
                {
                  type: 'TEXT_DETECTION',
                  textDetectionConfig: { languageCodes: ['es', 'en'] },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errText = await visionResponse.text();
      console.error(`[yandex-vision] API error ${visionResponse.status}:`, errText);
      return new Response(JSON.stringify({ error: 'Vision API error', details: errText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await visionResponse.json();

    // ── 4. Extract gender from face detection ─────────────────────────────────
    let gender: string | null = null;
    let faceCount = 0;
    let extractedText = '';

    for (const result of data.results ?? []) {
      for (const annotation of result.results ?? []) {
        // Face detection
        if (annotation.faceDetection) {
          const faces = annotation.faceDetection.faces ?? [];
          faceCount = faces.length;
          const genderVal = faces[0]?.attributes?.gender?.value;
          if (genderVal === 'MALE') gender = 'male';
          else if (genderVal === 'FEMALE') gender = 'female';
        }
        // Text detection (OCR — useful for ID document reading)
        if (annotation.textDetection) {
          extractedText = annotation.textDetection.pages
            ?.flatMap((p: { blocks: { lines: { words: { text: string }[] }[] }[] }) =>
              p.blocks?.flatMap(b => b.lines?.flatMap(l => l.words?.map(w => w.text) ?? []) ?? []) ?? []
            )
            .join(' ') ?? '';
        }
      }
    }

    console.log(`[yandex-vision] Detected ${faceCount} face(s), gender=${gender}`);

    return new Response(
      JSON.stringify({ gender, faceCount, extractedText }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[yandex-vision] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
