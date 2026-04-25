// CompaniesScreen — full-catalog browser with extended search.
// Search hits name + category + products (server-side ilike OR).
// Two image-search buttons (camera + gallery) trigger searchByImage.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Search, Camera, Image as ImageIcon } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { EmptyState } from '../components/EmptyState';
import { BrandLogo } from '../components/BrandLogo';
import { supabase } from '../lib/supabase';
import { countryFlagEmoji } from '../lib/brandHelpers';
import { pickImageWeb } from '../lib/pickImage';
import { searchByImage } from '../lib/imageSearch';

interface Company {
  id: string; name: string; hall: string | null; stand: string | null;
  city: string | null; country: string | null; website: string | null;
}

const PAGE_SIZE = 50;

export function CompaniesScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const [rows, setRows]         = useState<Company[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setMore]  = useState(false);
  const [hasMore, setHasMore]   = useState(true);
  const [total, setTotal]       = useState<number | null>(null);
  const [search, setSearch]     = useState('');
  const [query, setQuery]       = useState('');

  // Debounce input → query.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Build a query factory so load + loadMore stay consistent. Search hits
  // name + category_en + products_en (Supabase OR with ilike).
  const buildQuery = useCallback((from: number, to: number) => {
    let q = supabase
      .from('companies')
      .select('id, name, hall, stand, city, country, website', { count: 'exact' })
      .order('name')
      .range(from, to);
    if (query) {
      const escaped = query.toLowerCase().replace(/,/g, ' ');
      q = q.or([
        `name_normalized.ilike.%${escaped}%`,
        `category_en.ilike.%${escaped}%`,
        `products_en.ilike.%${escaped}%`,
        `city.ilike.%${escaped}%`,
      ].join(','));
    }
    return q;
  }, [query]);

  // Initial load (and re-load when query changes).
  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await buildQuery(0, PAGE_SIZE - 1);
    setRows(data ?? []);
    setTotal(count ?? null);
    setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    setLoading(false);
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setMore(true);
    const from = rows.length;
    const to = from + PAGE_SIZE - 1;
    const { data } = await buildQuery(from, to);
    setRows((prev) => [...prev, ...(data ?? [])]);
    setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    setMore(false);
  }, [loadingMore, hasMore, rows.length, buildQuery]);

  // Image-based search: pick from camera or gallery, send to match-logo.
  const [imageBusy, setImageBusy] = useState(false);
  async function imageSearch(source: 'camera' | 'gallery') {
    if (imageBusy) return;
    const uri = await pickImageWeb(source);
    if (!uri) return;
    setImageBusy(true);
    try {
      const result = await searchByImage(uri);
      nav.navigate('MatchResult', {
        previewUri:  result.previewUri,
        storagePath: result.storagePath,
        matches:     result.matches,
      });
    } catch (e) {
      Alert.alert('Recunoaștere eșuată', (e as Error).message);
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: palette.textFaint }]}>SALONE 2026</Text>
          <Text style={[styles.title, { color: palette.text }]}>Expozanți</Text>
        </View>
        {total !== null ? (
          <View style={[styles.countBadge, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <Text style={[styles.countBadgeText, { color: accents.companies.base }]}>{total}</Text>
          </View>
        ) : null}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={[styles.searchWrap, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
          <Search size={18} color={palette.textFaint} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Caută nume, produs, categorie…"
            placeholderTextColor={palette.textFaint}
            autoCapitalize="none"
            style={[styles.searchInput, { color: palette.text }]}
            returnKeyType="search"
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: palette.bgElevated, borderColor: palette.border },
            pressed && !imageBusy && { opacity: 0.7 },
            imageBusy && { opacity: 0.4 },
          ]}
          disabled={imageBusy}
          onPress={() => imageSearch('gallery')}
          accessibilityLabel="Caută din galerie"
        >
          {imageBusy ? <ActivityIndicator size="small" color={accents.companies.base} /> :
            <ImageIcon size={20} color={accents.companies.base} strokeWidth={2} />}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: palette.bgElevated, borderColor: palette.border },
            pressed && !imageBusy && { opacity: 0.7 },
            imageBusy && { opacity: 0.4 },
          ]}
          disabled={imageBusy}
          onPress={() => imageSearch('camera')}
          accessibilityLabel="Fotografiază"
        >
          {imageBusy ? <ActivityIndicator size="small" color={accents.capture.base} /> :
            <Camera size={20} color={accents.capture.base} strokeWidth={2} />}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><Text style={{ color: palette.textDim }}>Se încarcă…</Text></View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 56 }}>🔍</Text>}
          title={query ? 'Nimic nu se potrivește' : 'Nu sunt expozanți încă'}
          message={
            query
              ? `Nu am găsit nimic cu „${query}". Încearcă alt cuvânt.`
              : 'Rulează importer-ul ca să încarci catalogul Salone.'
          }
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
            loadingMore ? (
              <Text style={[styles.footer, { color: palette.textDim }]}>Se încarcă…</Text>
            ) : !hasMore && rows.length > 0 ? (
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
                  background={accents.companies.soft}
                  foreground={accents.companies.deep}
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
  header: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md,
    gap: spacing.md,
  },
  kicker:    { ...typography.micro, marginBottom: 4 },
  title:     { ...typography.display, letterSpacing: -0.5 },
  countBadge: {
    minWidth: 48, height: 48, paddingHorizontal: spacing.md,
    borderRadius: radius.pill, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { ...typography.bodyBold },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, gap: spacing.md,
  },
  bullet: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  bulletText: { ...typography.heading },
  name: { ...typography.bodyBold },
  meta: { ...typography.caption },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body, height: '100%' },
  iconBtn: {
    width: 48, height: 48,
    borderRadius: radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  footer: { textAlign: 'center', paddingVertical: spacing.lg, ...typography.caption },
});
