import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

export const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

export interface CompanyRow {
  external_id?: string;
  name: string;
  stand_number?: string;
  pavilion?: string;
  hall?: string;
  website?: string;
  email?: string;
  phone?: string;
  description?: string;
  logo_url?: string;
  source?: 'imported' | 'scraped';
}

export async function upsertCompanies(rows: CompanyRow[], batchSize = 100) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('companies').upsert(batch, {
      onConflict: 'external_id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.error('Upsert failed for batch starting at', i, error);
      throw error;
    }
    inserted += batch.length;
    console.log(`  upserted ${inserted}/${rows.length}`);
  }
  return inserted;
}
