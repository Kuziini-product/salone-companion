// transcribe-voice
// Body: { audio_url: string, voice_note_id?: string }
// Returns: { transcript: string }
//
// Calls OpenAI Whisper. If voice_note_id is provided, persists the transcript.

import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const { audio_url, voice_note_id } = await req.json();
    if (!audio_url) return json({ error: 'audio_url required' }, 400);

    const audioRes = await fetch(audio_url);
    const audioBlob = await audioRes.blob();

    const form = new FormData();
    form.append('file', audioBlob, 'audio.m4a');
    form.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Whisper error', response.status, text);
      return json({ error: 'Transcription failed' }, 502);
    }

    const { text: transcript } = await response.json();

    if (voice_note_id) {
      const supabase = getServiceClient();
      await supabase.from('voice_notes').update({ transcript }).eq('id', voice_note_id);
    }

    return json({ transcript });
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
