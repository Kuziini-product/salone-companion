// company-chat
// Mini-chatbot specialised in one Salone del Mobile exhibitor.
// Loads the full company catalog row and feeds it to Claude as context, then
// answers the user's question.
//
// POST { company_id: string, prompt: string, history?: {role,content}[] }
//
// Returns: { reply: string }

import {
  corsHeaders, errorResponse, jsonResponse, readJson,
  userClient, MODELS,
} from '../_shared/utils.ts';

interface Body {
  company_id: string;
  prompt:     string;
  history?:   Array<{ role: 'user' | 'assistant'; content: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return errorResponse('Method not allowed', 405);

  const body = await readJson<Body>(req);
  if (!body?.company_id) return errorResponse('company_id is required');
  if (!body?.prompt)     return errorResponse('prompt is required');

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return errorResponse('ANTHROPIC_API_KEY missing', 500);

  const supabase = userClient(req);
  const { data: c, error } = await supabase
    .from('companies')
    .select(
      'name, hall, stand, website, description, email, phone, address, city, country, ' +
      'category_en, category_it, products_en, products_it, event_code',
    )
    .eq('id', body.company_id)
    .maybeSingle();

  if (error) return errorResponse(`DB error: ${error.message}`, 500);
  if (!c)    return errorResponse('Company not found', 404);

  const systemPrompt = [
    'You are an assistant who helps a Salone del Mobile attendee learn about a single exhibitor.',
    `Exhibitor profile (from the official 2026 catalog):`,
    `  Name: ${c.name}`,
    `  Hall: ${c.hall ?? '?'}, Stand: ${c.stand ?? '?'}`,
    c.website     ? `  Website: ${c.website}`    : '',
    c.email       ? `  Email: ${c.email}`        : '',
    c.phone       ? `  Phone: ${c.phone}`        : '',
    c.address     ? `  Address: ${c.address}, ${c.city ?? ''}, ${c.country ?? ''}` : '',
    c.event_code  ? `  Event: ${c.event_code}`   : '',
    c.description ? `  Description: ${c.description}` : '',
    c.category_en ? `  Categories (EN): ${c.category_en}` : '',
    c.category_it ? `  Categories (IT): ${c.category_it}` : '',
    c.products_en ? `  Products (EN): ${c.products_en}`   : '',
    c.products_it ? `  Products (IT): ${c.products_it}`   : '',
    '',
    'Rules:',
    '- Answer in Romanian unless the user writes in another language.',
    '- Keep answers short — 2-4 sentences when possible. Use bullet points for lists.',
    '- ONLY use the profile above. If something is not in it, say "Nu am această info în catalog. Vezi pe site: <website>".',
    '- If asked about portfolio / works / products, summarize the product categories above and suggest visiting the website.',
    '- For questions about other brands or comparisons, decline politely — you only know about THIS exhibitor.',
    '- Never invent prices, model names, or contact info.',
  ].filter(Boolean).join('\n');

  const messages = [
    ...(body.history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: body.prompt },
  ];

  let reply: string;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODELS.fast,
        max_tokens: 600,
        system:     systemPrompt,
        messages,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return errorResponse(`Anthropic ${r.status}: ${t}`, 502);
    }
    const data = await r.json();
    reply = data.content?.[0]?.text?.trim() ?? '';
  } catch (e) {
    return errorResponse(`Chat call failed: ${(e as Error).message}`, 502);
  }

  return jsonResponse({ reply });
});
