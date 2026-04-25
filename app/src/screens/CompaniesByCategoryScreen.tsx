// CompaniesByCategoryScreen
// Reachable from CategoriesScreen by tapping a bucket. Lists every exhibitor
// matching that bucket's filter (event_code or category keyword), with the
// same row design as CompaniesScreen — search, infinite scroll, logo, flag.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { EmptyState } from '../components/EmptyState';
import { BrandLogo } from '../components/BrandLogo';
import { supabase } from '../lib/supabase';
import { countryFlagEmoji } from '../lib/brandHelpers';
import { bucketById } from '../lib/categoryBuckets';

type Params = { CompaniesByCategory: { bucketId: string; tagName: string } };

interface Company {
  id: string; name: string; hall: string | null; stand: string | null;
  city: string | null; country: string | null; website: string | null;
}

const PAGE_SIZE = 50;

export function CompaniesByCategoryScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const route = useRoute<RouteProp<Params, 'CompaniesByCategory'>>();
  const { bucketId, tagName } = route.params;
  const bucket = bucketById(bucketId);

  const [rows, setRows]       = useState<Company[]>([]);
  const [total, setTotal]     = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore]       = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch]   = useState('');
  const [query, setQuery]     = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildQuery = useCallback((from: number, to: number) => {
    if (!bucket) return null;
    let q = supabase
      .from('companies')
      .select('id, name, hall, stand, city, country, website', { count: 'exact' })
      .order('name')
      .range(from, to);
    q = bucket.apply(q);
    if (query) {
      q = q.ilike('name_normalized', `%${query.toLowerCase()}%`);
    }
    return q;
  }, [bucket, query]);

  const load = useCallback(async () => {
    if (!buildQuery) return;
    setLoading(true);
    const q = buildQuery(0, PAGE_SIZE - 1);
    if (!q) return;
    const { data, count } = await q;
    setRows(data ?? []);
    setTotal(count ?? null);
    setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    setLoading(false);
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(async () => {
    if (more || !hasMore) return;
    setMore(true);
    const from = rows.length;
    const q = buildQuery(from, from + PAGE_SIZE - 1);
    if (q) {
      const { data } = await q;
      setRows((prev) => [...prev, ...(data ?? [])]);
      setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    }
    setMore(false);
  }, [more, hasMore, rows.length, buildQuery]);

  if (!bucket) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <EmptyState
          icon={<Text style={{ fontSize: 56 }}>❓</Text>}
          title="Categorie necunoscută"
          message={`Nu pot deschide „${tagName}".`}
        />
      </SafeAreaView>
    );
  }

  const Icon = bucket.Icon;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['bottom']}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: bucket.bg }]}>
        <View style={[styles.heroIcon, { backgroundColor: '#FFFFFF' }]}>
          <Icon size={28} color={bucket.fg} strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: bucket.fg }]} numberOfLines={1}>{bucket.name}</Text>
          {total !== null ? (
            <Text style={[styles.heroSub, { color: bucket.fg }]}>
              {total} {total === 1 ? 'expozant' : 'expozanți'}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
        <Search size={18} color={palette.textFaint} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Caută în ${bucket.name.toLowerCase()}…`}
          placeholderTextColor={palette.textFaint}
          style={[styles.searchInput, { color: palette.text }]}
          returnKeyType="search"
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={bucket.fg} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Icon size={56} color={bucket.fg} strokeWidth={1.5} />}
          title={query ? 'Nimic nu se potrivește' : 'Niciun expozant'}
          message={query ? `Nu am găsit nimic cu „${query}".` : 'Categoria pare goală.'}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            more ? (
              <Text style={[styles.footer, { color: palette.textDim }]}>Se încarcă…</Text>
            ) : !hasMore ? (
              <Text style={[styles.footer, { color: palette.textFaint }]}>Asta-i tot.</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const flag = countryFlagEmoji(item.country);
            return (
              <Pressable
                onPress={() => nav.navigate('CompanyCard', { companyId: item.id })}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: palette.bgElevated, borderColor: palette.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <BrandLogo
                  website={item.website}
                  name={item.name}
                  size={44}
                  background={bucket.bg}
                  foreground={bucket.fg}
                  rounded={radius.md}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                    {flag ? `${flag}  ` : ''}{item.name}
                  </Text>
                  <Text style={[styles.meta, { color: palette.textDim }]} numberOfLines={1}>
                    {[
                      [item.hall, item.stand].filter(Boolean).join(' '),
                      [item.city, item.country].filter(Boolean).join(', '),
                    ].filter(Boolean).join('  ·  ') || '—'}
                  </Text>
                </View>
                <Text style={[styles.chev, { color: palette.textFaint }]}>›</Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...typography.title },
  heroSub:   { ...typography.caption, marginTop: 2, opacity: 0.8 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body, height: '100%' },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.md,
  },
  name: { ...typography.bodyBold },
  meta: { ...typography.caption, marginTop: 2 },
  chev: { fontSize: 24, marginLeft: spacing.sm },
  footer: { textAlign: 'center', paddingVertical: spacing.lg, ...typography.caption },
});
