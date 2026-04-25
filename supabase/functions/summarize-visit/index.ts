// summarize-visit
// Generates a short prose recap of a visit, then persists it to
// visits.ai_summary. Uses Claude Haiku 4.5 — cheap and fast.
//
// POST { visit_id: string }
//
// Returns:
//   { summary: string, persisted: boolean }
//
// Authorisation: the call uses the user's JWT, so RLS prevents reading or
// writing another user's visit.

import {
  corsHeaders, errorResponse, jsonResponse, readJson,
  userClient, anthropicTextCall, MODELS,
} from '../_shared/utils.ts';

interface Body {
  visit_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return errorResponse('Method not allowed', 405);

  const body = await readJson<Body>(req);
  if (!body?.visit_id) return errorResponse('visit_id is required');

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return errorResponse('ANTHROPIC_API_KEY missing', 500);

  const supabase = userClient(req);

  // 1. Pull the visit + its company.
  const { data: visit, error: visitErr } = await supabase
    .from('visits')
    .select('id, status, rating, notes, visited_at, company:companies(name, hall, stand)')
    .eq('id', body.visit_id)
    .maybeSingle();

  if (visitErr) return errorResponse(`DB error: ${visitErr.message}`, 500);
  if (!visit)   return errorResponse('Visit not found', 404);

  // 2. Pull voice-note transcripts and image captions for context.
  const [{ data: voice }, { data: images }, { data: contacts }] = await Promise.all([
    supabase.from('voice_notes').select('transcript').eq('visit_id', body.visit_id),
    supabase.from('images').select('caption').eq('visit_id', body.visit_id),
    supabase.from('contacts').select('full_name, role, company_name').eq('visit_id', body.visit_id),
  ]);

  const transcripts = (voice ?? [])
    .map((v) => v.transcript?.trim())
    .filter(Boolean)
    .join('\n---\n');
  const captions = (images ?? [])
    .map((i) => i.caption?.trim())
    .filter(Boolean)
    .join('\n');
  const contactList = (contacts ?? [])
    .map((c) => [c.full_name, c.role, c.company_name].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('\n');

  // 3. Build the prompt.
  const company = visit.company as unknown as { name: string; hall: string; stand: string } | null;
  const userPrompt = [
    `Company: ${company?.name ?? 'unknown'} (${company?.hall ?? '?'} / ${company?.stand ?? '?'})`,
    `Status: ${visit.status}`,
    visit.rating ? `My rating: ${visit.rating}/5` : '',
    visit.notes  ? `My notes:\n${visit.notes}` : '',
    transcripts  ? `Voice notes (transcribed):\n${transcripts}` : '',
    captions     ? `Photo captions:\n${captions}` : '',
    contactList  ? `Contacts collected:\n${contactList}` : '',
  ].filter(Boolean).join('\n\n');

  let summary: string;
  try {
    summary = await anthropicTextCall({
      apiKey,
      model: MODELS.fast,
      systemPrompt: [
        'You write concise post-visit recaps for someone walking the Salone del Mobile design fair.',
        'Tone: factual, professional, second person ("you"). 4-6 sentences max.',
        'Mention concrete details when present: products discussed, takeaways, follow-ups.',
        'Do NOT invent details that are not in the source. If the source is sparse, write a short summary anyway.',
        'Return only the summary text — no headings, no preamble.',
      ].join('\n'),
      userPrompt,
      maxTokens: 400,
    });
  } catch (e) {
    return errorResponse(`Summary call failed: ${(e as Error).message}`, 502);
  }

  summary = summary.trim();

  // 4. Persist.
  let persisted = true;
  const { error: upErr } = await supabase
    .from('visits')
    .update({ ai_summary: summary })
    .eq('id', body.visit_id);
  if (upErr) persisted = false;

  return jsonResponse({ summary, persisted });
});
