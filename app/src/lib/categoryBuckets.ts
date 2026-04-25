// Salone del Mobile category taxonomy.
// Each bucket carries a Supabase filter + a Lucide icon component.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react-native';
import {
  Sofa, ChefHat, Wrench, ShowerHead, Lightbulb, Briefcase, Crown, Sparkles,
  Bed, Armchair, Trees, Shirt, Monitor,
} from 'lucide-react-native';

export interface Bucket {
  id:    string;
  name:  string;
  Icon:  LucideIcon;
  bg:    string;          // soft tint background
  fg:    string;          // primary accent (icon, text)
  apply: (q: any) => any;
  order: number;
}

const C = {
  amber:  { bg: '#FEF3C7', fg: '#B45309' },
  blue:   { bg: '#DBEAFE', fg: '#1D4ED8' },
  red:    { bg: '#FEE2E2', fg: '#B91C1C' },
  purple: { bg: '#EDE9FE', fg: '#6D28D9' },
  green:  { bg: '#D1FAE5', fg: '#047857' },
  teal:   { bg: '#CCFBF1', fg: '#0F766E' },
  pink:   { bg: '#FCE7F3', fg: '#BE185D' },
  orange: { bg: '#FFEDD5', fg: '#C2410C' },
  indigo: { bg: '#E0E7FF', fg: '#4338CA' },
  rose:   { bg: '#FFE4E6', fg: '#9F1239' },
};

export const BUCKETS: Bucket[] = [
  // ---- Top-level (1:1 with event_code) ------------------------------------
  { id: 'event:SMI', name: 'Mobilier general',     Icon: Sofa,        ...C.blue,   order: 1, apply: (q) => q.eq('event_code', 'SMI') },
  { id: 'event:EUC', name: 'Bucătărie',            Icon: ChefHat,     ...C.red,    order: 2, apply: (q) => q.eq('event_code', 'EUC') },
  { id: 'event:FTK', name: 'Tehnologie bucătărie', Icon: Wrench,      ...C.orange, order: 3, apply: (q) => q.eq('event_code', 'FTK') },
  { id: 'event:ARB', name: 'Baie',                 Icon: ShowerHead,  ...C.teal,   order: 4, apply: (q) => q.eq('event_code', 'ARB') },
  { id: 'event:EIM', name: 'Iluminat',             Icon: Lightbulb,   ...C.amber,  order: 5, apply: (q) => q.eq('event_code', 'EIM') },
  { id: 'event:CDA', name: 'Workplace & contract', Icon: Briefcase,   ...C.indigo, order: 6, apply: (q) => q.eq('event_code', 'CDA') },
  { id: 'event:RAR', name: 'Piese unice',          Icon: Crown,       ...C.pink,   order: 7, apply: (q) => q.eq('event_code', 'RAR') },
  { id: 'event:S_P', name: 'Tineri designeri',     Icon: Sparkles,    ...C.purple, order: 8, apply: (q) => q.eq('event_code', 'S_P') },

  // ---- SMI sub-buckets ----------------------------------------------------
  { id: 'kw:living',      name: 'Living & Dining',   Icon: Sofa,     ...C.blue,   order: 20,
    apply: (q) => q.or('category_en.ilike.%living rooms%,category_en.ilike.%dining rooms%') },
  { id: 'kw:bedroom',     name: 'Dormitor',          Icon: Bed,      ...C.purple, order: 21,
    apply: (q) => q.ilike('category_en', '%bedrooms%') },
  { id: 'kw:upholstered', name: 'Tapițerie & sofa',  Icon: Armchair, ...C.rose,   order: 22,
    apply: (q) => q.ilike('category_en', '%upholstered furniture%') },
  { id: 'kw:outdoor',     name: 'Outdoor',           Icon: Trees,    ...C.green,  order: 23,
    apply: (q) => q.ilike('category_en', '%outdoor%') },
  { id: 'kw:textile',     name: 'Textile & accesorii', Icon: Shirt,  ...C.pink,   order: 24,
    apply: (q) => q.or('category_en.ilike.%textile%,category_en.ilike.%fabric%,category_en.ilike.%accessory%,category_en.ilike.%accessories%') },
  { id: 'kw:office',      name: 'Birou',             Icon: Monitor,  ...C.indigo, order: 25,
    apply: (q) => q.or('category_en.ilike.%office%,category_en.ilike.%contract%') },
];

export function bucketById(id: string): Bucket | null {
  return BUCKETS.find((b) => b.id === id) ?? null;
}

export async function countForBucket(supabase: SupabaseClient, bucket: Bucket): Promise<number> {
  let q = supabase.from('companies').select('id', { count: 'exact', head: true });
  q = bucket.apply(q);
  const { count } = await q;
  return count ?? 0;
}
