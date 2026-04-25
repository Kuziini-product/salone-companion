// match-logo
// Body: { image_url: string, hall?: string, top_k?: number }
// Returns: { matches: Array<{ company_id, name, confidence, reason }> }
//
// Strategy: narrow the catalog by hall when known (smaller candidate set),
// then ask Claude Vision to pick the best matches. Always returns top-K so
// the user can disambiguate.

import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL = 'claude-opus-4-7';

interface Match {
  company_id: string;
  name: string;
  confidence: number;
  reason: string;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { image_url, hall, top_k = 3 } = await req.json();
    if (!image_url) {
      return json({ error: 'image_url required' }, 400);
    }

    const supabase = getServiceClient();

    // Narrow candidate set
    let query = supabase
      .from('companies')
      .select('id, name, stand_number, hall, pavilion, description');
    if (hall) query = query.eq('hall', hall);
    const { data: candidates, error } = await query.limit(200);
    if (error) throw error;

    if (!candidates || candidates.length === 0) {
      return json({ matches: [] });
    }

    // Fetch the image as base64 for Claude
    const imgRes = await fetch(image_url);
    const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
    const imgB64 = btoa(String.fromCharCode(...imgBuf));
    const mediaType = imgRes.headers.get('content-type') ?? 'image/jpeg';

    const candidateList = candidates
      .map((c, i) => `${i + 1}. ${c.name} — ${c.hall ?? ''} ${c.stand_number ?? ''}`)
      .join('\n');

    const prompt = `You are looking at a photo of an exhibition stand at Salone del Mobile.
Identify the brand/company shown. Pick the top ${top_k} most likely matches from this candidate list:

${candidateList}

Respond with ONLY a JSON array, no prose:
[{"index": <1-based index>, "confidence": <0..1>, "reason": "<short justification>"}]
If none match, return [].`;

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
      return json({ error: 'Vision API failed' }, 502);
    }

    const aiResult = await response.json();
    const textBlock = aiResult.content?.find((b: { type: string }) => b.type === 'text');
    const raw = textBlock?.text ?? '[]';
    const parsed = parseJsonArray(raw);

    const matches: Match[] = parsed
      .map((m) => {
        const c = candidates[m.index - 1];
        return c
          ? { company_id: c.id, name: c.name, confidence: m.confidence, reason: m.reason }
          : null;
      })
      .filter((m): m is Match => m !== null);

    return json({ matches });
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

function parseJsonArray(s: string): Array<{ index: number; confidence: number; reason: string }> {
  const match = s.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}
