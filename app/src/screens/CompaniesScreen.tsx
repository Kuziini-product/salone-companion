// CompaniesScreen — placeholder until the catalog flow is wired.
// Already shows real data from the seeded `companies` table.

import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { EmptyState } from '../components/EmptyState';
import { supabase } from '../lib/supabase';

interface Company {
  id: string; name: string; hall: string | null; stand: string | null;
}

export function CompaniesScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const [rows, setRows] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name, hall, stand')
      .order('name')
      .limit(200);
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Expozanți</Text>
        {rows.length > 0 ? (
          <Text style={[styles.count, { color: accents.companies.base }]}>{rows.length}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}><Text style={{ color: palette.textDim }}>Se încarcă…</Text></View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 56 }}>🏛️</Text>}
          title="Nu sunt expozanți încă"
          message="Rulează importer-ul ca să încarci catalogul Salone, sau aplică seed.sql pentru date demo."
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
              <View style={[styles.bullet, { backgroundColor: accents.companies.soft }]}>
                <Text style={[styles.bulletText, { color: accents.companies.deep }]}>
                  {item.name[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
                {(item.hall || item.stand) ? (
                  <Text style={[styles.meta, { color: palette.textDim }]}>
                    {[item.hall, item.stand].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
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
  header: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { ...typography.title },
  count: { ...typography.heading },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.sm, gap: spacing.md,
  },
  bullet: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  bulletText: { ...typography.heading },
  name: { ...typography.bodyBold },
  meta: { ...typography.caption },
});
