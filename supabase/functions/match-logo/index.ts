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
  // Product fallback when no brand is visible:
  product_kind?: string;     // e.g. "sofa", "pendant lamp", "kitchen island"
  product_keywords?: string[]; // words to search in catalog products/categories
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
        'You are a recognition assistant for the Salone del Mobile design fair in Milan.',
        'You will be given a photo of an exhibitor stand, a logo, or a product (chair, sofa, lamp, kitchen, etc.).',
        'STEP 1: Look for any visible brand text or logo. If you find one, return it.',
        'STEP 2: If there is no readable brand, identify the product type and key descriptive words.',
        'Return ONLY a JSON object with this shape:',
        '{',
        '  "brand_text": string,         // text you read on the stand / logo (or empty)',
        '  "brand_keywords": string[],   // style cues that hint at a brand',
        '  "guess_names": string[],      // 0-3 plausible brand names',
        '  "product_kind": string,       // generic product type if no brand visible (e.g. "leather sofa", "pendant lamp")',
        '  "product_keywords": string[]  // 2-6 single English words for the product (e.g. "sofa","leather","modular")',
        '}',
        'Do not invent brand names. If you are not sure, leave guess_names empty and fill product_kind / product_keywords.',
      ].join('\n'),
      userPrompt: 'Identify the brand if visible, otherwise describe the product. Return JSON only.',
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

  // ---- Product fallback ---------------------------------------------------
  // If no brand candidates, search the catalog by the product keywords.
  if (candidates.length === 0) {
    // Tokenize each entry — vision sometimes returns "leather, modular sofa"
    // as one string. Split on punctuation, drop short noise.
    const raw = [
      ...(guess.product_keywords ?? []),
      guess.product_kind ?? '',
    ];
    const keywords = [...new Set(
      raw.flatMap((s) => s.toLowerCase().split(/[,;|/]+/))
        .map((s) => s.replace(/[^a-z0-9 ]/g, '').trim())
        .filter((s) => s.length >= 3 && s.length <= 40)
    )];

    if (keywords.length === 0) return jsonResponse({ matches: [], guess, kind: 'product' });

    // OR ilike across products_en/it + category_en/it for each keyword.
    const orParts: string[] = [];
    for (const kw of keywords) {
      const safe = kw.replace(/[(),]/g, ' ').trim();
      if (!safe) continue;
      orParts.push(`products_en.ilike.%${safe}%`);
      orParts.push(`products_it.ilike.%${safe}%`);
      orParts.push(`category_en.ilike.%${safe}%`);
      orParts.push(`category_it.ilike.%${safe}%`);
    }
    let pq = supabase
      .from('companies')
      .select('id, name, hall, stand, logo_url, products_en, category_en')
      .or(orParts.join(','))
      .limit(60);
    if (body.hall) pq = pq.eq('hall', body.hall);
    const { data, error } = await pq;
    if (error || !data) return jsonResponse({ matches: [], guess, kind: 'product' });

    // Score by how many keywords each company's products+category contain.
    const scored = data
      .map((row) => {
        const haystack = `${row.products_en ?? ''} ${row.category_en ?? ''}`.toLowerCase();
        let hits = 0;
        for (const kw of keywords) if (haystack.includes(kw)) hits++;
        return {
          company_id: row.id,
          name:       row.name,
          hall:       row.hall,
          stand:      row.stand,
          logo_url:   row.logo_url,
          confidence: Math.min(0.85, 0.4 + hits * 0.1),
          reason:     `Vinde: ${(guess.product_kind || keywords.slice(0, 3).join(', ')).trim()}`,
          hits,
        };
      })
      .sort((a, b) => b.hits - a.hits)
      .slice(0, topK)
      .map(({ hits, ...rest }) => rest);   // strip hits from response

    return jsonResponse({ matches: scored, guess, kind: 'product' });
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
