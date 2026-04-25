// og-image
// Fetches a company's website and extracts og:image (or twitter:image) meta tag
// to use as a hero background. Caches the result in companies.meta.og_image
// so subsequent calls are instant.
//
// POST { website: string, company_id?: string }
// → { url: string | null }

import {
  corsHeaders, errorResponse, jsonResponse, readJson, adminClient,
} from '../_shared/utils.ts';

interface Body { website: string; company_id?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return errorResponse('Method not allowed', 405);

  const body = await readJson<Body>(req);
  if (!body?.website) return errorResponse('website is required');

  // If we already cached it, return immediately.
  if (body.company_id) {
    const admin = adminClient();
    const { data } = await admin
      .from('companies').select('meta').eq('id', body.company_id).maybeSingle();
    const cached = (data?.meta as Record<string, unknown> | null)?.og_image;
    if (typeof cached === 'string') {
      return jsonResponse({ url: cached, cached: true });
    }
  }

  // Build full URL.
  let url = body.website.trim();
  if (!url.startsWith('http')) url = `https://${url}`;
  let resolved: string | null = null;

  try {
    const r = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SaloneCompanion/1.0; +https://salone-companion.vercel.app)',
        'accept': 'text/html,*/*',
      },
      // Don't blow up on big pages.
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return jsonResponse({ url: null, error: `HTTP ${r.status}` });
    }
    const html = await r.text();
    // Cap parsing to first 200KB (everything we need is in <head>).
    const head = html.slice(0, 200_000);

    // Try og:image, then twitter:image, then favicon.
    const patterns = [
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ];
    for (const p of patterns) {
      const m = head.match(p);
      if (m?.[1]) {
        resolved = m[1].trim();
        break;
      }
    }

    // Resolve protocol-relative or path-only URLs against the site root.
    if (resolved) {
      try {
        resolved = new URL(resolved, url).toString();
      } catch {
        resolved = null;
      }
    }
  } catch (e) {
    return jsonResponse({ url: null, error: (e as Error).message });
  }

  // Cache in DB if company_id was provided.
  if (resolved && body.company_id) {
    const admin = adminClient();
    const { data: row } = await admin
      .from('companies').select('meta').eq('id', body.company_id).maybeSingle();
    const meta = (row?.meta as Record<string, unknown> | null) ?? {};
    meta.og_image = resolved;
    await admin.from('companies').update({ meta }).eq('id', body.company_id);
  }

  return jsonResponse({ url: resolved, cached: false });
});
