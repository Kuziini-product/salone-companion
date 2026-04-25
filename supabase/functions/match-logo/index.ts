// match-logo
// Receives a photo of a stand or logo and returns the top candidate companies
// from our catalog. Uses Claude Vision (Opus 4.7) to read brand text and visual
// cues, then fuzzy-matches against the companies table.
//
// POST { image_url: string, hall?: string, top_k?: number }
//   image_url: storage path inside `company-images/` (e.g. "<uid>/abc.jpg")
//              OR a fully-qualified URL we can pass to the model.
//   hall:       optional, narrows search to one hall.
//   top_k:      optional, defaults to 3. Hard-capped at 5.
//
// Returns:
//   { matches: [
//       { company_id, name, hall, stand, confidence (0..1), reason }
//     ] }

import {
  corsHeaders, errorResponse, jsonResponse, readJson,
  userClient, adminClient, signedUrl,
  anthropicVisionCall, extractJson, MODELS,
} from '../_shared/utils.ts';

interface Body {
  image_url: string;
  hall?: string;
  top_k?: number;
}

interface ModelGuess {
  brand_text?: string;       // text the model read on the stand/logo
  brand_keywords?: string[]; // additional words/style cues
  guess_names?: string[];    // model's best guesses for the brand name
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return errorResponse('Method not allowed', 405);

  const body = await readJson<Body>(req);
  if (!body?.image_url) return errorResponse('image_url is required');

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return errorResponse('ANTHROPIC_API_KEY missing', 500);

  // Resolve to a fetchable URL: storage paths get signed; full URLs pass through.
  let visionUrl = body.image_url;
  if (!visionUrl.startsWith('http')) {
    try {
      const admin = adminClient();
      visionUrl = await signedUrl(admin, 'company-images', visionUrl, 60);
    } catch (e) {
      return errorResponse(`Could not sign image: ${(e as Error).message}`, 400);
    }
  }

  const topK = Math.min(Math.max(body.top_k ?? 3, 1), 5);

  // 1. Ask Claude Vision what's on the stand.
  let guess: ModelGuess;
  try {
    const raw = await anthropicVisionCall({
      apiKey,
      model: MODELS.vision,
      systemPrompt: [
        'You are a brand-recognition assistant for the Salone del Mobile design fair in Milan.',
        'You will be given a photo of an exhibitor stand or a logo.',
        'Read any visible brand text and infer the most likely Italian/European furniture or lighting brand.',
        'Return ONLY a JSON object with this shape:',
        '{ "brand_text": string, "brand_keywords": string[], "guess_names": string[] }',
        'guess_names should contain 1-3 plausible brand names ordered by confidence.',
        'Do not invent details; if unreadable, return empty arrays.',
      ].join('\n'),
      userPrompt: 'Identify the brand on this stand. Return JSON only.',
      imageUrl: visionUrl,
      maxTokens: 400,
    });
    const parsed = extractJson<ModelGuess>(raw);
    if (!parsed) return errorResponse('Model returned non-JSON', 502);
    guess = parsed;
  } catch (e) {
    return errorResponse(`Vision call failed: ${(e as Error).message}`, 502);
  }

  // 2. Build a search query and fuzzy-match against the catalog.
  const supabase = userClient(req);
  const candidates = [
    ...(guess.guess_names ?? []),
    guess.brand_text ?? '',
  ].map((s) => s.trim()).filter(Boolean);

  if (candidates.length === 0) {
    return jsonResponse({ matches: [], guess });
  }

  // For each candidate, get fuzzy hits via trigram similarity. We aggregate
  // the best score per company across candidates.
  const scoreByCompany = new Map<string, { score: number; row: Record<string, unknown> }>();

  for (const name of candidates) {
    let query = supabase
      .from('companies')
      .select('id, name, hall, stand, logo_url')
      .ilike('name', `%${name}%`)
      .limit(8);
    if (body.hall) query = query.eq('hall', body.hall);
    const { data, error } = await query;
    if (error) continue;
    if (!data) continue;
    for (const row of data) {
      const score = similarity(name.toLowerCase(), (row.name as string).toLowerCase());
      const prev = scoreByCompany.get(row.id as string);
      if (!prev || prev.score < score) {
        scoreByCompany.set(row.id as string, { score, row });
      }
    }
  }

  // 3. Rank and return the top_k.
  const matches = [...scoreByCompany.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ score, row }) => ({
      company_id: row.id,
      name:       row.name,
      hall:       row.hall,
      stand:      row.stand,
      logo_url:   row.logo_url,
      confidence: Math.round(score * 100) / 100,
      reason:     guess.brand_text ? `Read "${guess.brand_text}" on stand` : 'Visual match',
    }));

  return jsonResponse({ matches, guess });
});

// Lightweight Sørensen-Dice similarity over bigrams. Cheap, dependency-free,
// and good enough for short brand names.
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const ga = bigrams(a);
  const gb = bigrams(b);
  let intersection = 0;
  for (const [g, c] of ga) {
    const cb = gb.get(g);
    if (cb) intersection += Math.min(c, cb);
  }
  const totalA = [...ga.values()].reduce((s, n) => s + n, 0);
  const totalB = [...gb.values()].reduce((s, n) => s + n, 0);
  return (2 * intersection) / (totalA + totalB);
}
