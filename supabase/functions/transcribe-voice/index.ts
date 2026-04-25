// transcribe-voice
// Sends an audio recording to OpenAI Whisper and (optionally) persists the
// transcript on the matching voice_notes row.
//
// POST { audio_url: string, voice_note_id?: string }
//   audio_url:     storage path inside `voice-notes/` OR a fully-qualified URL.
//   voice_note_id: if provided, the transcript is written back to this row.
//
// Returns:
//   { transcript: string, persisted: boolean }

import {
  corsHeaders, errorResponse, jsonResponse, readJson,
  userClient, adminClient, signedUrl,
} from '../_shared/utils.ts';

interface Body {
  audio_url: string;
  voice_note_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return errorResponse('Method not allowed', 405);

  const body = await readJson<Body>(req);
  if (!body?.audio_url) return errorResponse('audio_url is required');

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) return errorResponse('OPENAI_API_KEY missing', 500);

  // Resolve to a fetchable URL.
  let fetchUrl = body.audio_url;
  if (!fetchUrl.startsWith('http')) {
    try {
      const admin = adminClient();
      // Whisper download can take a few seconds — sign for 5 minutes.
      fetchUrl = await signedUrl(admin, 'voice-notes', fetchUrl, 300);
    } catch (e) {
      return errorResponse(`Could not sign audio: ${(e as Error).message}`, 400);
    }
  }

  // 1. Download the audio bytes.
  let audioBytes: Uint8Array;
  let contentType = 'audio/m4a';
  try {
    const r = await fetch(fetchUrl);
    if (!r.ok) throw new Error(`Storage GET ${r.status}`);
    contentType = r.headers.get('Content-Type') ?? contentType;
    audioBytes = new Uint8Array(await r.arrayBuffer());
  } catch (e) {
    return errorResponse(`Audio download failed: ${(e as Error).message}`, 502);
  }

  // 2. Send to Whisper.
  // We pick a filename matching the content-type so OpenAI knows the format.
  const filename = pickFilename(contentType);
  const form = new FormData();
  form.append('file', new Blob([audioBytes], { type: contentType }), filename);
  form.append('model', 'whisper-1');
  // Italian or English are both common at Salone; let Whisper auto-detect.
  form.append('response_format', 'json');

  let transcript: string;
  try {
    const wr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: form,
    });
    if (!wr.ok) {
      const errText = await wr.text();
      throw new Error(`Whisper ${wr.status}: ${errText}`);
    }
    const data = await wr.json();
    transcript = (data.text ?? '').trim();
  } catch (e) {
    return errorResponse(`Whisper failed: ${(e as Error).message}`, 502);
  }

  // 3. Persist if requested. Uses the user's JWT so RLS enforces ownership.
  let persisted = false;
  if (body.voice_note_id) {
    const supabase = userClient(req);
    const { error } = await supabase
      .from('voice_notes')
      .update({ transcript })
      .eq('id', body.voice_note_id);
    persisted = !error;
  }

  return jsonResponse({ transcript, persisted });
});

function pickFilename(contentType: string): string {
  if (contentType.includes('m4a') || contentType.includes('mp4')) return 'audio.m4a';
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'audio.mp3';
  if (contentType.includes('wav'))  return 'audio.wav';
  if (contentType.includes('webm')) return 'audio.webm';
  if (contentType.includes('ogg'))  return 'audio.ogg';
  return 'audio.m4a';
}
