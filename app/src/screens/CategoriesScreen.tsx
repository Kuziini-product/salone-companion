// CategoriesScreen — premium tile grid backed by event_code + keyword buckets.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Search, MapPin } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { BUCKETS, countForBucket, type Bucket } from '../lib/categoryBuckets';

export function CategoriesScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(BUCKETS.map((b) => countForBucket(supabase, b, userId)));
      if (cancelled) return;
      const next: Record<string, number> = {};
      BUCKETS.forEach((b, i) => { next[b.id] = results[i]; });
      setCounts(next);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BUCKETS
      .filter((b) => (q ? b.name.toLowerCase().includes(q) : true))
      .filter((b) => (counts[b.id] ?? 0) > 0)
      .sort((a, b) => a.order - b.order);
  }, [search, counts]);

  function open(b: Bucket) {
    nav.navigate('CompaniesByCategory', {
      bucketId: b.id,
      tagName:  b.name,
    });
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['top']}>
      {/* Hero header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: palette.textFaint }]}>EXPLOREAZĂ</Text>
          <Text style={[styles.title, { color: palette.text }]}>Categorii</Text>
        </View>
        {!loading ? (
          <View style={[styles.countBadge, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <Text style={[styles.countBadgeText, { color: accents.profile.base }]}>{filtered.length}</Text>
          </View>
        ) : null}
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
        <Search size={18} color={palette.textFaint} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Caută o categorie…"
          placeholderTextColor={palette.textFaint}
          style={[styles.searchInput, { color: palette.text }]}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={accents.profile.base} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <Pressable
              style={({ pressed }) => [
                styles.mapBtn,
                { backgroundColor: accents.profile.base },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => nav.navigate('Map')}
            >
              <MapPin size={22} color="#FFFFFF" strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.mapBtnTitle}>Hartă expozanți</Text>
                <Text style={styles.mapBtnSub}>Vezi toți pe Google Maps</Text>
              </View>
            </Pressable>
          }
          renderItem={({ item }) => {
            const count = counts[item.id] ?? 0;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: palette.bgElevated,
                    borderColor: palette.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => open(item)}
              >
                <Text style={[styles.cardName, { color: palette.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.cardCount, { color: palette.textDim }]}>
                  {count} {count === 1 ? 'expozant' : 'expozanți'}
                </Text>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <Text style={[styles.footer, { color: palette.textFaint }]}>
              Un expozant poate apărea în mai multe categorii.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  kicker: { ...typography.micro, marginBottom: 4 },
  title:  { ...typography.display, letterSpacing: -0.5 },
  countBadge: {
    minWidth: 44, height: 44, paddingHorizontal: spacing.sm,
    borderRadius: radius.pill, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { ...typography.bodyBold },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body, height: '100%' },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },

  card: {
    flex: 1,
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardName: {
    ...typography.subheading,
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardCount: { ...typography.caption, textAlign: 'center' },

  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.xl,
    marginBottom: spacing.lg,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mapBtnTitle: { color: '#FFFFFF', ...typography.bodyBold },
  mapBtnSub:   { color: 'rgba(255,255,255,0.85)', ...typography.caption, marginTop: 2 },

  footer: {
    textAlign: 'center',
    paddingTop: spacing.xl,
    ...typography.caption,
  },
});
