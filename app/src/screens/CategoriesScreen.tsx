// CategoriesScreen — premium tile grid backed by event_code + keyword buckets.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, ImageBackground, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
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
          renderItem={({ item }) => {
            const count = counts[item.id] ?? 0;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: palette.bgElevated,
                    borderColor: palette.border,
                    shadowColor: palette.shadow,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => open(item)}
              >
                {/* Top: real photo with subtle overlay */}
                <ImageBackground
                  source={{ uri: item.photo }}
                  style={styles.photo}
                  imageStyle={styles.photoImage}
                >
                  <View style={[styles.photoOverlay, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
                  <View style={[styles.photoBadge, { backgroundColor: item.fg }]}>
                    <Text style={styles.photoBadgeText}>{count}</Text>
                  </View>
                </ImageBackground>

                {/* Bottom: title block */}
                <View style={styles.cardBottom}>
                  <Text style={[styles.cardName, { color: palette.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.cardSub, { color: palette.textDim }]}>
                    {count === 1 ? 'expozant' : 'expozanți'}
                  </Text>
                </View>
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
    minHeight: 200,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 4,
  },
  photo: {
    height: 130,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  photoImage: { resizeMode: 'cover' },
  photoOverlay: { ...StyleSheet.absoluteFillObject },
  photoBadge: {
    margin: spacing.sm,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill,
    minWidth: 32, alignItems: 'center',
  },
  photoBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  cardBottom: {
    padding: spacing.md,
    gap: 2,
  },
  cardName: { ...typography.subheading, lineHeight: 20 },
  cardSub:  { ...typography.caption },

  footer: {
    textAlign: 'center',
    paddingTop: spacing.xl,
    ...typography.caption,
  },
});
