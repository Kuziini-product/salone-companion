// Salone del Mobile category taxonomy.
// Each bucket carries a Supabase filter + a Lucide icon component.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react-native';
import type { ImageSourcePropType } from 'react-native';
import {
  Sofa, ChefHat, Wrench, ShowerHead, Lightbulb, Briefcase, Crown, Sparkles,
  Bed, Armchair, Trees, Shirt, Monitor,
  Heart, Check, Camera, MessageSquare,
} from 'lucide-react-native';

// Local user-curated photos. Falls back to Unsplash for buckets without one.
const LOCAL = {
  birou:        require('../../assets/categories/birou.jpg'),
  bucatarie:    require('../../assets/categories/bucatarie.jpg'),
  dormitor:     require('../../assets/categories/dormitor.jpg'),
  living:       require('../../assets/categories/living.jpg'),
  tapiterie:    require('../../assets/categories/tapiterie.jpg'),
  textile:      require('../../assets/categories/textile.jpg'),
  baie:         require('../../assets/categories/baie.jpg'),
  iluminat:     require('../../assets/categories/iluminat.jpg'),
  livingDining: require('../../assets/categories/living-dining.jpg'),
  outdoor:      require('../../assets/categories/outdoor.jpg'),
  pieseUnice:   require('../../assets/categories/piese-unice.jpg'),
};

export interface Bucket {
  id:    string;
  name:  string;
  Icon:  LucideIcon;
  bg:    string;          // soft tint background (fallback if photo fails)
  fg:    string;          // primary accent
  photo: ImageSourcePropType;  // local require() OR remote { uri } object
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

// Remote (Unsplash) fallback for buckets that don't have a local photo yet.
const photo = (id: string): ImageSourcePropType => ({
  uri: `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80&auto=format`,
});

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
    photo: LOCAL.living,
    order: 1, apply: (q) => q.eq('event_code', 'SMI') },
  { id: 'event:EUC', name: 'Bucătărie',            Icon: ChefHat,    ...C.red,
    photo: LOCAL.bucatarie,
    order: 2, apply: (q) => q.eq('event_code', 'EUC') },
  { id: 'event:FTK', name: 'Tehnologie bucătărie', Icon: Wrench,     ...C.orange,
    photo: LOCAL.bucatarie,
    order: 3, apply: (q) => q.eq('event_code', 'FTK') },
  { id: 'event:ARB', name: 'Baie',                 Icon: ShowerHead, ...C.teal,
    photo: LOCAL.baie,
    order: 4, apply: (q) => q.eq('event_code', 'ARB') },
  { id: 'event:EIM', name: 'Iluminat',             Icon: Lightbulb,  ...C.amber,
    photo: LOCAL.iluminat,
    order: 5, apply: (q) => q.eq('event_code', 'EIM') },
  { id: 'event:CDA', name: 'Workplace & contract', Icon: Briefcase,  ...C.indigo,
    photo: LOCAL.birou,
    order: 6, apply: (q) => q.eq('event_code', 'CDA') },
  { id: 'event:RAR', name: 'Piese unice',          Icon: Crown,      ...C.pink,
    photo: LOCAL.pieseUnice,
    order: 7, apply: (q) => q.eq('event_code', 'RAR') },
  { id: 'event:S_P', name: 'Tineri designeri',     Icon: Sparkles,   ...C.purple,
    photo: photo('1572021335469-31706a17aaef'),  // no local photo provided
    order: 8, apply: (q) => q.eq('event_code', 'S_P') },

  // ---- SMI sub-buckets ----------------------------------------------------
  { id: 'kw:living',      name: 'Living & Dining',   Icon: Sofa,     ...C.blue,
    photo: LOCAL.livingDining,
    order: 20, apply: (q) => q.or('category_en.ilike.%living rooms%,category_en.ilike.%dining rooms%') },
  { id: 'kw:bedroom',     name: 'Dormitor',          Icon: Bed,      ...C.purple,
    photo: LOCAL.dormitor,
    order: 21, apply: (q) => q.ilike('category_en', '%bedrooms%') },
  { id: 'kw:upholstered', name: 'Tapițerie & sofa',  Icon: Armchair, ...C.rose,
    photo: LOCAL.tapiterie,
    order: 22, apply: (q) => q.ilike('category_en', '%upholstered furniture%') },
  { id: 'kw:outdoor',     name: 'Outdoor',           Icon: Trees,    ...C.green,
    photo: LOCAL.outdoor,
    order: 23, apply: (q) => q.ilike('category_en', '%outdoor%') },
  { id: 'kw:textile',     name: 'Textile & accesorii', Icon: Shirt,  ...C.pink,
    photo: LOCAL.textile,
    order: 24, apply: (q) => q.or('category_en.ilike.%textile%,category_en.ilike.%fabric%,category_en.ilike.%accessory%,category_en.ilike.%accessories%') },
  { id: 'kw:office',      name: 'Birou',             Icon: Monitor,  ...C.indigo,
    photo: LOCAL.birou,
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
