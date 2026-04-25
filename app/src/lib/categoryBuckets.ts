// Salone del Mobile category taxonomy.
// Each bucket carries a Supabase filter + a Lucide icon component.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react-native';
import {
  Sofa, ChefHat, Wrench, ShowerHead, Lightbulb, Briefcase, Crown, Sparkles,
  Bed, Armchair, Trees, Shirt, Monitor,
  Heart, Check, Camera, MessageSquare,
} from 'lucide-react-native';

export interface Bucket {
  id:    string;
  name:  string;
  Icon:  LucideIcon;
  bg:    string;          // soft tint background (fallback if photo fails)
  fg:    string;          // primary accent
  photo: string;          // hero photo URL (Unsplash CDN)
  /**
   * Apply the bucket's filter onto a SELECT companies query. May be
   * synchronous OR async (the personal buckets — Favorite, Visited, etc. —
   * need to first fetch the user's visits and then build an `in` filter).
   */
  apply: (q: any, ctx: BucketContext) => any | Promise<any>;
  /** True for buckets that depend on the current user's visits/images/notes. */
  personal?: boolean;
  order: number;
}

export interface BucketContext {
  /** Authenticated user id, or null if not signed in. */
  userId: string | null;
  /** A reference to the supabase client for sub-queries. */
  client: SupabaseClient;
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

// Helper for personal buckets: pre-fetch the user's matching company_ids,
// then narrow the main query to those.
async function applyVisitFilter(
  q: any,
  ctx: BucketContext,
  filter: (vq: any) => any,
): Promise<any> {
  if (!ctx.userId) return q.eq('id', '00000000-0000-0000-0000-000000000000'); // empty
  let vq = ctx.client.from('visits').select('company_id').eq('user_id', ctx.userId);
  vq = filter(vq);
  const { data } = await vq;
  const ids = (data ?? []).map((r: any) => r.company_id).filter(Boolean);
  if (ids.length === 0) return q.eq('id', '00000000-0000-0000-0000-000000000000');
  return q.in('id', ids);
}

async function applyImageFilter(q: any, ctx: BucketContext): Promise<any> {
  if (!ctx.userId) return q.eq('id', '00000000-0000-0000-0000-000000000000');
  // Companies that have at least one image via a visit owned by this user.
  const { data: visits } = await ctx.client.from('visits').select('id, company_id').eq('user_id', ctx.userId);
  const visitMap = new Map((visits ?? []).map((v: any) => [v.id, v.company_id]));
  const visitIds = [...visitMap.keys()];
  if (visitIds.length === 0) return q.eq('id', '00000000-0000-0000-0000-000000000000');
  const { data: imgs } = await ctx.client.from('images').select('visit_id').in('visit_id', visitIds);
  const ids = [...new Set((imgs ?? []).map((i: any) => visitMap.get(i.visit_id)).filter(Boolean))];
  if (ids.length === 0) return q.eq('id', '00000000-0000-0000-0000-000000000000');
  return q.in('id', ids);
}

export const BUCKETS: Bucket[] = [
  // ---- Personal: depend on the user's visits ------------------------------
  { id: 'me:fav', name: 'Favorite', Icon: Heart, ...C.rose, personal: true,
    photo: photo('1493663284031-b7e3aefcae8e'),  // hearts / pink composition
    order: -10, apply: (q, ctx) => applyVisitFilter(q, ctx, (vq) => vq.eq('is_favorite', true)) },
  { id: 'me:visited', name: 'Vizitate', Icon: Check, ...C.green, personal: true,
    photo: photo('1559311648-d46f5d8593a3'),     // visited / checked
    order: -9, apply: (q, ctx) => applyVisitFilter(q, ctx, (vq) => vq.in('status', ['visited', 'follow_up'])) },
  { id: 'me:photos', name: 'Cu poze', Icon: Camera, ...C.indigo, personal: true,
    photo: photo('1502920917128-1aa500764cbd'),  // camera lens
    order: -8, apply: (q, ctx) => applyImageFilter(q, ctx) },
  { id: 'me:notes', name: 'Cu note', Icon: MessageSquare, ...C.amber, personal: true,
    photo: photo('1455390582262-044cdead277a'),  // notebook
    order: -7, apply: (q, ctx) => applyVisitFilter(q, ctx, (vq) => vq.not('notes', 'is', null).neq('notes', '')) },

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

export async function countForBucket(
  supabase: SupabaseClient,
  bucket: Bucket,
  userId: string | null,
): Promise<number> {
  let q = supabase.from('companies').select('id', { count: 'exact', head: true });
  q = await bucket.apply(q, { userId, client: supabase });
  const { count } = await q;
  return count ?? 0;
}
