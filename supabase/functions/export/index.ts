// export
// GET ?format=csv|json
// Returns: CSV/JSON of the user's visits + linked companies + contacts.

import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const userId = await getUserId(req);
  if (!userId) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'csv';

  const supabase = getServiceClient();

  const { data: visits } = await supabase
    .from('visits')
    .select(
      'id, status, notes, ai_summary, visited_at, companies(name, stand_number, hall, pavilion, website, email, phone)'
    )
    .eq('user_id', userId);

  const { data: contacts } = await supabase
    .from('contacts')
    .select('full_name, role, email, phone, company_id, companies(name)')
    .eq('user_id', userId);

  if (format === 'json') {
    return new Response(JSON.stringify({ visits, contacts }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // CSV
  const visitsCsv = toCsv(
    ['Company', 'Stand', 'Hall', 'Status', 'Visited At', 'Notes', 'Summary', 'Website', 'Email', 'Phone'],
    (visits ?? []).map((v) => {
      const c = v.companies as Record<string, string> | null;
      return [
        c?.name ?? '',
        c?.stand_number ?? '',
        c?.hall ?? '',
        v.status,
        v.visited_at ?? '',
        v.notes ?? '',
        v.ai_summary ?? '',
        c?.website ?? '',
        c?.email ?? '',
        c?.phone ?? '',
      ];
    })
  );

  const contactsCsv = toCsv(
    ['Name', 'Role', 'Email', 'Phone', 'Company'],
    (contacts ?? []).map((c) => {
      const co = c.companies as { name: string } | null;
      return [c.full_name ?? '', c.role ?? '', c.email ?? '', c.phone ?? '', co?.name ?? ''];
    })
  );

  const body = `# VISITS\n${visitsCsv}\n\n# CONTACTS\n${contactsCsv}\n`;

  return new Response(body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="salone-export.csv"',
    },
  });
});

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}
