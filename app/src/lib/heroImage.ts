// Resolves the best hero image for a company:
//   1. og:image of their website (cached in companies.meta.og_image after first call)
//   2. mShots screenshot fallback
//   3. null

import { supabase, functionUrl } from './supabase';
import { landingScreenshotUrl } from './brandHelpers';

const memCache = new Map<string, string | null>();

export async function fetchHeroImage(
  companyId: string,
  website: string | null | undefined,
): Promise<string | null> {
  if (!website) return null;
  const key = companyId;
  if (memCache.has(key)) return memCache.get(key) ?? null;

  // Try og:image via edge function. The function caches in companies.meta.
  try {
    const r = await fetch(functionUrl('og-image'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website, company_id: companyId }),
    });
    if (r.ok) {
      const j = await r.json();
      if (j.url) {
        memCache.set(key, j.url);
        return j.url;
      }
    }
  } catch {
    // ignore — we'll fall back to mShots
  }

  // Fallback to landing-page screenshot.
  const fallback = landingScreenshotUrl(website, 1200, 800);
  memCache.set(key, fallback);
  return fallback;
}
