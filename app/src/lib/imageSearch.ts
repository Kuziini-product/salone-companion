// Image-based brand search.
// Used by the camera/gallery buttons in CompaniesScreen and by the
// Capture screen when user is in "stand" mode.
//
// Pipeline:
//   1. Resize/compress local image (≤1600 px JPEG)
//   2. Upload to company-images/<uid>/scan-tmp/<ts>.jpg (private bucket)
//   3. Sign a 60s URL
//   4. POST to match-logo edge function → returns ranked candidate companies
//   5. Caller picks one → navigates to CompanyCard

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { supabase, functionUrl } from './supabase';

export interface LogoMatch {
  company_id: string;
  name:       string;
  hall:       string | null;
  stand:      string | null;
  logo_url:   string | null;
  confidence: number;
  reason:     string;
}

export interface MatchResult {
  matches:    LogoMatch[];
  previewUri: string;          // local URI for in-app preview
  storagePath:string;          // remote path inside company-images bucket
}

export async function searchByImage(localUri: string): Promise<MatchResult> {
  // 1. Auth + path.
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Nu ești autentificat');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).slice(2, 8);
  const storagePath = `${user.id}/scan-tmp/${stamp}-${random}.jpg`;

  // 2. Get raw bytes — different paths per platform.
  let bytes: Uint8Array;
  let previewUri = localUri;

  if (Platform.OS === 'web') {
    // localUri is a blob: URL from <input type=file>. Fetch it directly.
    const r = await fetch(localUri);
    bytes = new Uint8Array(await r.arrayBuffer());
  } else {
    const compressed = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1600 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    );
    previewUri = compressed.uri;
    const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    bytes = decodeBase64(base64);
  }

  const { error: upErr } = await supabase.storage
    .from('company-images')
    .upload(storagePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (upErr) throw new Error(`Upload eșuat: ${upErr.message}`);

  // 3. Call edge function.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sesiunea a expirat');

  const res = await fetch(functionUrl('match-logo'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ image_url: storagePath, top_k: 5 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recunoaștere eșuată (${res.status}): ${text}`);
  }
  const json = await res.json();

  return {
    matches:     (json.matches ?? []) as LogoMatch[],
    previewUri,
    storagePath,
  };
}

function decodeBase64(b64: string): Uint8Array {
  const binary = globalThis.atob ? globalThis.atob(b64) : '';
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
