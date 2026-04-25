// Shared helpers used by every edge function.
// Deno runtime — imports are URL-based.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * A Supabase client scoped to the calling user (uses their JWT).
 * RLS applies. Use this for any table read/write that should respect ownership.
 */
export function userClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    },
    auth: { persistSession: false },
  });
}

/**
 * A Supabase client with the service-role key. Bypasses RLS.
 * Only use for operations that the user could not do on their own
 * (e.g., creating a signed download URL after we've verified ownership).
 */
export function adminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

/** Small helper: parse a JSON body, returning a typed result or null. */
export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Signs a storage path so the AI providers can fetch it. The path is
 * `{bucket}/{user_id}/...`. We sign for 60s — long enough for the model
 * call, short enough that leaks are not catastrophic.
 */
export async function signedUrl(
  admin: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 60,
): Promise<string> {
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    throw new Error(`Failed to sign storage path ${bucket}/${path}: ${error?.message}`);
  }
  return data.signedUrl;
}

/** Anthropic Messages API call with a vision part. */
export async function anthropicVisionCall(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  imageUrl: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: opts.imageUrl } },
            { type: 'text', text: opts.userPrompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data.content ?? [])
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text: string }) => c.text)
    .join('\n');
}

/** Anthropic Messages API call with text only (for summaries). */
export async function anthropicTextCall(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.systemPrompt,
      messages: [{ role: 'user', content: opts.userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data.content ?? [])
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text: string }) => c.text)
    .join('\n');
}

/**
 * Extracts the first JSON object from a model's text output. Models sometimes
 * wrap JSON in markdown fences or add chat fluff before/after.
 */
export function extractJson<T = unknown>(text: string): T | null {
  // Strip markdown fences
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
  // Find the first '{' and matching '}'
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// Anthropic models pinned to current production-quality picks.
// (Update centrally here when the team agrees on a new default.)
export const MODELS = {
  vision: 'claude-opus-4-7',
  fast:   'claude-haiku-4-5',
} as const;
