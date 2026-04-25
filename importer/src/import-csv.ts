// Import exhibitors from a CSV file.
// Expected columns (case-insensitive, extras ignored):
//   name, stand_number, pavilion, hall, website, email, phone, description, external_id
//
// Run: npm run import:csv  (with CSV_PATH set in .env)

import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { upsertCompanies, type CompanyRow } from './supabase.js';
import 'dotenv/config';

const CSV_PATH = process.env.CSV_PATH ?? './data/exhibitors.csv';

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, '_');
}

function row(record: Record<string, string>): CompanyRow | null {
  const get = (k: string) => {
    const found = Object.entries(record).find(([key]) => normalizeKey(key) === k);
    const v = found?.[1]?.trim();
    return v && v.length > 0 ? v : undefined;
  };

  const name = get('name') ?? get('company') ?? get('exhibitor');
  if (!name) return null;

  return {
    external_id: get('external_id') ?? slug(name),
    name,
    stand_number: get('stand_number') ?? get('stand'),
    pavilion: get('pavilion'),
    hall: get('hall'),
    website: get('website') ?? get('url'),
    email: get('email'),
    phone: get('phone'),
    description: get('description'),
    source: 'imported',
  };
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log(`Reading ${CSV_PATH}`);
  const text = readFileSync(CSV_PATH, 'utf-8');
  const records: Record<string, string>[] = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const rows: CompanyRow[] = [];
  for (const r of records) {
    const c = row(r);
    if (c) rows.push(c);
  }

  console.log(`Parsed ${rows.length} valid rows of ${records.length} CSV records`);
  if (rows.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  const n = await upsertCompanies(rows);
  console.log(`Done — upserted ${n} companies`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
