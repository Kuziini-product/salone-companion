// export
// Returns the calling user's visits + linked notes/contacts as a downloadable
// CSV or JSON file. RLS automatically scopes the data to this user.
//
// GET /export?format=csv|json (default: csv)
//
// Response:
//   200 with file body. Sets Content-Disposition for browser download.

import {
  corsHeaders, errorResponse, userClient,
} from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET')    return errorResponse('Method not allowed', 405);

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') ?? 'csv').toLowerCase();
  if (!['csv', 'json'].includes(format)) {
    return errorResponse('format must be csv or json');
  }

  const supabase = userClient(req);

  // Pull everything for this user. We denormalise on the fly so the export is
  // useful in a spreadsheet without further joining.
  const { data: visits, error } = await supabase
    .from('visits')
    .select(`
      id,
      status,
      rating,
      notes,
      ai_summary,
      visited_at,
      created_at,
      company:companies(name, hall, stand, website),
      contacts(full_name, role, email, phone, company_name),
      voice_notes(transcript)
    `)
    .order('visited_at', { ascending: false, nullsFirst: false });

  if (error) return errorResponse(`DB error: ${error.message}`, 500);

  const rows = (visits ?? []).map((v) => {
    const company = v.company as unknown as
      { name?: string; hall?: string; stand?: string; website?: string } | null;
    const contactList = (v.contacts as Array<{
      full_name?: string; role?: string; email?: string; phone?: string; company_name?: string;
    }> | undefined ?? [])
      .map((c) => [c.full_name, c.role, c.email, c.phone, c.company_name].filter(Boolean).join(' | '))
      .join(' ; ');
    const voiceList = (v.voice_notes as Array<{ transcript?: string }> | undefined ?? [])
      .map((vn) => vn.transcript?.trim()).filter(Boolean).join(' ; ');

    return {
      visit_id:    v.id,
      company:     company?.name ?? '',
      hall:        company?.hall ?? '',
      stand:       company?.stand ?? '',
      website:     company?.website ?? '',
      status:      v.status,
      rating:      v.rating ?? '',
      visited_at:  v.visited_at ?? '',
      notes:       v.notes ?? '',
      ai_summary:  v.ai_summary ?? '',
      contacts:    contactList,
      voice_notes: voiceList,
    };
  });

  const today = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="salone-visits-${today}.json"`,
      },
    });
  }

  // CSV
  const headers = [
    'visit_id','company','hall','stand','website','status','rating',
    'visited_at','notes','ai_summary','contacts','voice_notes',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvCell((r as Record<string, unknown>)[h])).join(',')),
  ];
  const csv = lines.join('\n');

  return new Response(csv, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="salone-visits-${today}.csv"`,
    },
  });
});

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Always quote and double internal quotes — safe for any string.
  return `"${s.replace(/"/g, '""')}"`;
}
