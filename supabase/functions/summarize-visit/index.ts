// summarize-visit
// Body: { visit_id: string }
// Returns: { summary: string }
//
// Pulls notes + voice transcripts + image captions for a visit, asks Haiku
// for a 3-bullet recap. Persists to visits.ai_summary.

import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL = 'claude-haiku-4-5-20251001';

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const { visit_id } = await req.json();
    if (!visit_id) return json({ error: 'visit_id required' }, 400);

    const supabase = getServiceClient();

    const { data: visit, error: visitErr } = await supabase
      .from('visits')
      .select('id, user_id, notes, company_id, companies(name, description)')
      .eq('id', visit_id)
      .single();

    if (visitErr || !visit) return json({ error: 'Visit not found' }, 404);
    if (visit.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    const [{ data: voice }, { data: imgs }] = await Promise.all([
      supabase.from('voice_notes').select('transcript').eq('visit_id', visit_id),
      supabase.from('images').select('caption').eq('visit_id', visit_id),
    ]);

    const company = visit.companies as { name: string; description: string } | null;
    const transcripts = (voice ?? []).map((v) => v.transcript).filter(Boolean).join('\n');
    const captions = (imgs ?? []).map((i) => i.caption).filter(Boolean).join('\n');

    const inputText = [
      company ? `Company: ${company.name}\n${company.description ?? ''}` : '',
      visit.notes ? `Notes:\n${visit.notes}` : '',
      transcripts ? `Voice notes:\n${transcripts}` : '',
      captions ? `Photo captions:\n${captions}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!inputText.trim()) {
      return json({ summary: '' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system:
          'You write concise post-visit recaps for a furniture-fair attendee. Output exactly 3 short bullet points. No preamble.',
        messages: [{ role: 'user', content: inputText }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Anthropic error', response.status, text);
      return json({ error: 'Summary failed' }, 502);
    }

    const aiResult = await response.json();
    const textBlock = aiResult.content?.find((b: { type: string }) => b.type === 'text');
    const summary = textBlock?.text ?? '';

    await supabase.from('visits').update({ ai_summary: summary }).eq('id', visit_id);

    return json({ summary });
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
