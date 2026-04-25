// parse-business-card
// Reads a business-card photo and returns structured contact fields. Uses
// Claude Vision (Opus 4.7) for OCR + extraction in a single pass.
//
// POST { image_url: string }
//   image_url: storage path inside `business-cards/` (e.g. "<uid>/abc.jpg")
//              OR a fully-qualified URL.
//
// Returns:
//   { full_name, role, email, phone, company_name, website, address, confidence (0..1) }

import {
  corsHeaders, errorResponse, jsonResponse, readJson,
  adminClient, signedUrl, anthropicVisionCall, extractJson, MODELS,
} from '../_shared/utils.ts';

interface Body {
  image_url: string;
}

interface CardFields {
  full_name?:    string;
  role?:         string;
  email?:        string;
  phone?:        string;
  company_name?: string;
  website?:      string;
  address?:      string;
  confidence?:   number; // 0..1
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return errorResponse('Method not allowed', 405);

  const body = await readJson<Body>(req);
  if (!body?.image_url) return errorResponse('image_url is required');

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return errorResponse('ANTHROPIC_API_KEY missing', 500);

  let visionUrl = body.image_url;
  if (!visionUrl.startsWith('http')) {
    try {
      const admin = adminClient();
      visionUrl = await signedUrl(admin, 'business-cards', visionUrl, 60);
    } catch (e) {
      return errorResponse(`Could not sign image: ${(e as Error).message}`, 400);
    }
  }

  let fields: CardFields;
  try {
    const raw = await anthropicVisionCall({
      apiKey,
      model: MODELS.vision,
      systemPrompt: [
        'You extract contact information from photographs of business cards.',
        'Return ONLY a JSON object with these optional string fields:',
        '  full_name, role, email, phone, company_name, website, address',
        'Plus a "confidence" number from 0 to 1 reflecting how legible the card was overall.',
        'Rules:',
        ' - Use the text exactly as printed; do not translate or normalise.',
        ' - For phone, keep the international prefix if present (e.g. "+39 02 1234567").',
        ' - For email and website, lower-case them.',
        ' - If a field is missing or unreadable, omit it (do not return null).',
        ' - The card may be Italian, English, or another language; read it as-is.',
      ].join('\n'),
      userPrompt: 'Extract the contact fields from this business card. Return JSON only.',
      imageUrl: visionUrl,
      maxTokens: 600,
    });
    const parsed = extractJson<CardFields>(raw);
    if (!parsed) return errorResponse('Model returned non-JSON', 502);
    fields = parsed;
  } catch (e) {
    return errorResponse(`Vision call failed: ${(e as Error).message}`, 502);
  }

  // Light post-processing so the client gets clean data.
  if (fields.email)   fields.email   = fields.email.trim().toLowerCase();
  if (fields.website) fields.website = fields.website.trim().toLowerCase();
  if (fields.phone)   fields.phone   = fields.phone.replace(/\s+/g, ' ').trim();

  return jsonResponse(fields);
});
