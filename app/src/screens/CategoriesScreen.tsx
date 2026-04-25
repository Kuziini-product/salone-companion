// CategoriesScreen
// New tab. Shows the furniture/lighting categories as big colored cards.
// Tap → CompaniesByCategory screen with the filtered list.
//
// Categories come from the `tags` table. We also show a count of companies
// in each category so the user gets a sense of what's behind the card.

import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';

interface Category {
  id:    string;
  name:  string;
  color: string | null;
  count: number;
}

// Visual flavor per known category. Falls back to neutral if unknown.
// Each entry: { emoji, gradient bg, gradient fg }
const flavor: Record<string, { emoji: string; bg: string; fg: string }> = {
  Lighting: { emoji: '💡', bg: '#FEF3C7', fg: '#92400E' },
  Sofas:    { emoji: '🛋️', bg: '#DBEAFE', fg: '#1D4ED8' },
  Tables:   { emoji: '🪑', bg: '#FEE2E2', fg: '#991B1B' },
  Premium:  { emoji: '✨', bg: '#EDE9FE', fg: '#5B21B6' },
  Italian:  { emoji: '🇮🇹', bg: '#D1FAE5', fg: '#047857' },
  Outdoor:  { emoji: '🌿', bg: '#DCFCE7', fg: '#166534' },
};
const fallback = { emoji: '🏛️', bg: accents.companies.soft, fg: accents.companies.deep };

export function CategoriesScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Pull tags + their company counts via a single query.
    // We use a foreign-table count so RLS still applies (catalog is public-read).
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, color, company_tags(count)')
      .order('name');

    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setCats([]);
    } else {
      const mapped: Category[] = (data ?? []).map((t) => ({
        id:    t.id,
        name:  t.name,
        color: t.color,
        count: (t.company_tags?.[0]?.count as number | undefined) ?? 0,
      }));
      setCats(mapped);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Category }) => {
    const f = flavor[item.name] ?? fallback;
    return (
      <Pressable
        onPress={() => nav.navigate('CompaniesByCategory', {
          tagId:   item.id,
          tagName: item.name,
        })}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: f.bg, borderColor: f.fg + '20' },
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.cardEmoji}>{f.emoji}</Text>
        <Text style={[styles.cardName, { color: f.fg }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.cardCount, { color: f.fg, opacity: 0.75 }]}>
          {item.count} {item.count === 1 ? 'expozant' : 'expozanți'}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Categorii</Text>
        <Text style={[styles.subtitle, { color: palette.textDim }]}>
          Filtrează expozanții după tipul de mobilier
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={accents.companies.base} />
        </View>
      ) : (
        <FlatList
          data={cats}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.textDim }]}>
              Nicio categorie încă. Aplică seed.sql sau adaugă tag-uri în Supabase.
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 4,
  },
  title:    { ...typography.title },
  subtitle: { ...typography.body },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  columnWrap:  { gap: spacing.md },

  card: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  cardEmoji: { fontSize: 40 },
  cardName:  { ...typography.heading, marginTop: spacing.sm },
  cardCount: { ...typography.caption, marginTop: 2 },

  empty: { ...typography.body, textAlign: 'center', padding: spacing.xl },
});
