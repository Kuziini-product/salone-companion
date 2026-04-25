// CompaniesByCategoryScreen
// Reachable from CategoriesScreen by tapping a category card. Lists every
// company tagged with that category. Same row design as CompaniesScreen,
// plus a colored header with the category name.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { EmptyState } from '../components/EmptyState';
import { supabase } from '../lib/supabase';

type Params = { CompaniesByCategory: { tagId: string; tagName: string } };

interface Company {
  id:    string;
  name:  string;
  hall:  string | null;
  stand: string | null;
}

const flavorByName: Record<string, { emoji: string; bg: string; fg: string }> = {
  Lighting: { emoji: '💡', bg: '#FEF3C7', fg: '#92400E' },
  Sofas:    { emoji: '🛋️', bg: '#DBEAFE', fg: '#1D4ED8' },
  Tables:   { emoji: '🪑', bg: '#FEE2E2', fg: '#991B1B' },
  Premium:  { emoji: '✨', bg: '#EDE9FE', fg: '#5B21B6' },
  Italian:  { emoji: '🇮🇹', bg: '#D1FAE5', fg: '#047857' },
  Outdoor:  { emoji: '🌿', bg: '#DCFCE7', fg: '#166534' },
};
const fallback = { emoji: '🏛️', bg: accents.companies.soft, fg: accents.companies.deep };

export function CompaniesByCategoryScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const route = useRoute<RouteProp<Params, 'CompaniesByCategory'>>();
  const { tagId, tagName } = route.params;
  const [rows, setRows] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const flavor = flavorByName[tagName] ?? fallback;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Inner-join via company_tags. We use the !inner hint to enforce join.
      const { data, error } = await supabase
        .from('company_tags')
        .select('companies!inner(id, name, hall, stand)')
        .eq('tag_id', tagId);

      if (cancelled) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        setRows([]);
      } else {
        const mapped = (data ?? [])
          .map((r) => r.companies as unknown as Company)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));
        setRows(mapped);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tagId]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['bottom']}>
      {/* Hero header tinted with the category color */}
      <View style={[styles.hero, { backgroundColor: flavor.bg }]}>
        <Text style={styles.heroEmoji}>{flavor.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: flavor.fg }]}>{tagName}</Text>
          <Text style={[styles.heroSub, { color: flavor.fg, opacity: 0.75 }]}>
            {rows.length} {rows.length === 1 ? 'expozant' : 'expozanți'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={flavor.fg} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 56 }}>{flavor.emoji}</Text>}
          title="Niciun expozant"
          message={`Nu sunt expozanți etichetați cu „${tagName}" în catalog.`}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => nav.navigate('CompanyCard', { companyId: item.id })}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: palette.bgElevated, borderColor: palette.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.bullet, { backgroundColor: flavor.bg }]}>
                <Text style={[styles.bulletText, { color: flavor.fg }]}>
                  {item.name[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {(item.hall || item.stand) ? (
                  <Text style={[styles.meta, { color: palette.textDim }]}>
                    {[item.hall, item.stand].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.chev, { color: palette.textFaint }]}>›</Text>
            </Pressable>
          )}
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
  heroEmoji: { fontSize: 44 },
  heroTitle: { ...typography.title },
  heroSub:   { ...typography.caption, marginTop: 2 },

  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.md,
  },
  bullet: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  bulletText: { ...typography.heading },
  name:       { ...typography.bodyBold },
  meta:       { ...typography.caption, marginTop: 2 },
  chev:       { fontSize: 24, marginLeft: spacing.sm },
});
