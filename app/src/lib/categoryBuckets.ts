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
  bg:    string;          // soft tint background (fallback if photo fails)
  fg:    string;          // primary accent
  photo: string;          // hero photo URL (Unsplash CDN)
  apply: (q: any) => any;
  order: number;
}

// Pre-curated Unsplash photo IDs. The format is the direct CDN URL with
// a width/height crop hint so they download fast.
const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80&auto=format`;

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
  { id: 'event:SMI', name: 'Mobilier general',     Icon: Sofa,       ...C.blue,
    photo: photo('1567538096630-e0c55bd6374c'),  // modern living room
    order: 1, apply: (q) => q.eq('event_code', 'SMI') },
  { id: 'event:EUC', name: 'Bucătărie',            Icon: ChefHat,    ...C.red,
    photo: photo('1556909114-f6e7ad7d3136'),     // luxury kitchen
    order: 2, apply: (q) => q.eq('event_code', 'EUC') },
  { id: 'event:FTK', name: 'Tehnologie bucătărie', Icon: Wrench,     ...C.orange,
    photo: photo('1556909195-4b8ab0bea6dc'),     // built-in oven
    order: 3, apply: (q) => q.eq('event_code', 'FTK') },
  { id: 'event:ARB', name: 'Baie',                 Icon: ShowerHead, ...C.teal,
    photo: photo('1552321554-5fefe8c9ef14'),     // designer bathroom
    order: 4, apply: (q) => q.eq('event_code', 'ARB') },
  { id: 'event:EIM', name: 'Iluminat',             Icon: Lightbulb,  ...C.amber,
    photo: photo('1513506003901-1e6a229e2d15'),  // pendant lamps
    order: 5, apply: (q) => q.eq('event_code', 'EIM') },
  { id: 'event:CDA', name: 'Workplace & contract', Icon: Briefcase,  ...C.indigo,
    photo: photo('1497366216548-37526070297c'),  // office workspace
    order: 6, apply: (q) => q.eq('event_code', 'CDA') },
  { id: 'event:RAR', name: 'Piese unice',          Icon: Crown,      ...C.pink,
    photo: photo('1505691938895-1758d7feb511'),  // gallery interior
    order: 7, apply: (q) => q.eq('event_code', 'RAR') },
  { id: 'event:S_P', name: 'Tineri designeri',     Icon: Sparkles,   ...C.purple,
    photo: photo('1572021335469-31706a17aaef'),  // designer sketch / workshop
    order: 8, apply: (q) => q.eq('event_code', 'S_P') },

  // ---- SMI sub-buckets ----------------------------------------------------
  { id: 'kw:living',      name: 'Living & Dining',   Icon: Sofa,     ...C.blue,
    photo: photo('1555041469-a586c61ea9bc'),     // sofa in living
    order: 20, apply: (q) => q.or('category_en.ilike.%living rooms%,category_en.ilike.%dining rooms%') },
  { id: 'kw:bedroom',     name: 'Dormitor',          Icon: Bed,      ...C.purple,
    photo: photo('1505693416388-ac5ce068fe85'),  // modern bedroom
    order: 21, apply: (q) => q.ilike('category_en', '%bedrooms%') },
  { id: 'kw:upholstered', name: 'Tapițerie & sofa',  Icon: Armchair, ...C.rose,
    photo: photo('1567016432779-094069958ea5'),  // armchair detail
    order: 22, apply: (q) => q.ilike('category_en', '%upholstered furniture%') },
  { id: 'kw:outdoor',     name: 'Outdoor',           Icon: Trees,    ...C.green,
    photo: photo('1604147495798-57beb5d6af73'),  // outdoor patio
    order: 23, apply: (q) => q.ilike('category_en', '%outdoor%') },
  { id: 'kw:textile',     name: 'Textile & accesorii', Icon: Shirt,  ...C.pink,
    photo: photo('1528833882626-c4e84def8f72'),  // textile texture
    order: 24, apply: (q) => q.or('category_en.ilike.%textile%,category_en.ilike.%fabric%,category_en.ilike.%accessory%,category_en.ilike.%accessories%') },
  { id: 'kw:office',      name: 'Birou',             Icon: Monitor,  ...C.indigo,
    photo: photo('1486406146926-c627a92ad1ab'),  // home office
    order: 25, apply: (q) => q.or('category_en.ilike.%office%,category_en.ilike.%contract%') },
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
