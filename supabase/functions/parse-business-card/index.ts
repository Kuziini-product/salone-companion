// parse-business-card
// Body: { image_url: string }
// Returns: { full_name, role, email, phone, company_name, raw_ocr_text, confidence }
//
// Uses Claude Vision to OCR + extract structured fields in one shot.
// Cheaper and more reliable than Vision API + regex for noisy cards.

import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { getUserId } from '../_shared/supabase.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL = 'claude-haiku-4-5-20251001';

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const { image_url } = await req.json();
    if (!image_url) return json({ error: 'image_url required' }, 400);

    const imgRes = await fetch(image_url);
    const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
    const imgB64 = btoa(String.fromCharCode(...imgBuf));
    const mediaType = imgRes.headers.get('content-type') ?? 'image/jpeg';

    const prompt = `Extract structured contact info from this business card.
Respond with ONLY JSON, no prose:
{
  "full_name": "<person name or null>",
  "role": "<job title or null>",
  "email": "<email or null>",
  "phone": "<phone in E.164 if possible, or null>",
  "company_name": "<company name or null>",
  "raw_ocr_text": "<all text on the card, line-broken>",
  "confidence": <0..1 — overall extraction confidence>
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imgB64 } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Anthropic error', response.status, text);
      return json({ error: 'OCR failed' }, 502);
    }

    const aiResult = await response.json();
    const textBlock = aiResult.content?.find((b: { type: string }) => b.type === 'text');
    const raw = textBlock?.text ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};

    return json(parsed);
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
