// scanCard
// Single end-to-end pipeline used by CaptureScreen when the user takes a
// photo of a business card. Steps:
//   1. Resize/compress the image (cards rarely need > 1600px)
//   2. Upload to the `business-cards` bucket at {user_id}/{filename}
//   3. Call the parse-business-card edge function with the storage path
//   4. Return both the parsed fields and the storage path so the next screen
//      can show the original photo + editable fields without re-uploading.

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase, functionUrl } from './supabase';

export interface ParsedCard {
  full_name?:    string;
  role?:         string;
  email?:        string;
  phone?:        string;
  company_name?: string;
  website?:      string;
  address?:      string;
  confidence?:   number;
}

export interface ScanCardResult {
  parsed:       ParsedCard;
  storagePath:  string;          // e.g. "<uid>/2026-04-25T17-15-32-abcd.jpg"
  publicPreview:string;           // local URI for instant on-device display
}

/**
 * Photograph a card → upload → OCR. Throws on hard errors so the caller can
 * show a single error toast.
 */
export async function scanCard(localUri: string): Promise<ScanCardResult> {
  // ---- 1. Resize/compress -------------------------------------------------
  // Cards are small. 1600px on the longest side is plenty for OCR and keeps
  // the upload under a few hundred KB even on bad fairground Wi-Fi.
  const compressed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1600 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );

  // ---- 2. Upload ----------------------------------------------------------
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Nu ești autentificat');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).slice(2, 8);
  const storagePath = `${user.id}/${stamp}-${random}.jpg`;

  // RN can't upload from a `file://` URI directly with the JS client. Read
  // as base64, decode, and upload as a binary blob.
  const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = decodeBase64(base64);

  const { error: upErr } = await supabase.storage
    .from('business-cards')
    .upload(storagePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (upErr) throw new Error(`Upload eșuat: ${upErr.message}`);

  // ---- 3. OCR via edge function -------------------------------------------
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sesiunea a expirat');

  const res = await fetch(functionUrl('parse-business-card'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ image_url: storagePath }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCR eșuat (${res.status}): ${text}`);
  }
  const parsed = (await res.json()) as ParsedCard;

  return {
    parsed,
    storagePath,
    publicPreview: compressed.uri,
  };
}

/** Persist the contact row using the user JWT (RLS enforces user_id). */
export async function saveContact(args: {
  parsed:        ParsedCard;
  storagePath:   string;
  visitId?:      string;
  companyId?:    string;
}): Promise<{ id: string }> {
  const { parsed, storagePath, visitId, companyId } = args;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Nu ești autentificat');

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id:          user.id,
      visit_id:         visitId ?? null,
      company_id:       companyId ?? null,
      full_name:        parsed.full_name ?? null,
      role:             parsed.role ?? null,
      email:            parsed.email ?? null,
      phone:            parsed.phone ?? null,
      company_name:     parsed.company_name ?? null,
      website:          parsed.website ?? null,
      address:          parsed.address ?? null,
      card_image_path:  storagePath,
      parsed:           parsed as Record<string, unknown>,
      confidence:       parsed.confidence ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Salvare eșuată: ${error.message}`);
  return { id: data.id };
}

/** Get a 60s signed URL for a card image (used by ContactsScreen list/detail). */
export async function getCardSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase
    .storage
    .from('business-cards')
    .createSignedUrl(path, 3600);   // 1h is fine for thumbnail caching
  if (error) return null;
  return data.signedUrl;
}

// ---- base64 decode (avoids needing a polyfill) -----------------------------
function decodeBase64(b64: string): Uint8Array {
  const binary = globalThis.atob ? globalThis.atob(b64) : atobShim(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function atobShim(s: string): string {
  // Minimal atob fallback for older RN runtimes.
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = s.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 === 1) throw new Error('Invalid base64');
  for (let bc = 0, bs = 0, buffer, i = 0;
       (buffer = str.charAt(i++));
       ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer),
                   bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
