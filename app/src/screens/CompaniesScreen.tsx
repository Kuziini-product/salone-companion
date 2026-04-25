import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Pressable } from 'react-native';
import { palette, font, space, radius } from '@/theme';
import { useStore } from '@/lib/mockStore';

export function CompaniesScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'visited' | 'follow_up'>('all');
  const companies = useStore((s) => s.companies);
  const visits = useStore((s) => s.visits);

  const visitMap = useMemo(() => {
    const m = new Map<string, (typeof visits)[number]>();
    for (const v of visits) m.set(v.companyId, v);
    return m;
  }, [visits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies
      .filter((c) => (q ? c.name.toLowerCase().includes(q) : true))
      .filter((c) => {
        if (filter === 'all') return true;
        return visitMap.get(c.id)?.status === filter;
      });
  }, [companies, visitMap, query, filter]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search by name…"
          placeholderTextColor={palette.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <View style={styles.filterRow}>
          {(['all', 'visited', 'follow_up'] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.chip, filter === f && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipLabel, filter === f && styles.chipLabelActive]}>
                {f === 'all' ? 'All' : f === 'visited' ? 'Visited' : 'Follow-up'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        renderItem={({ item }) => {
          const visit = visitMap.get(item.id);
          return (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('CompanyCard', { companyId: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {[item.hall, item.standNumber].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
              {visit && (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        visit.status === 'visited'
                          ? palette.success
                          : visit.status === 'follow_up'
                            ? palette.followUp
                            : palette.textMuted,
                    },
                  ]}
                />
              )}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<Text style={styles.empty}>No matches.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: { padding: space.lg, gap: space.md },
  search: {
    height: 44,
    backgroundColor: palette.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: palette.text,
    ...font.body,
    borderWidth: 1,
    borderColor: palette.border,
  },
  filterRow: { flexDirection: 'row', gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipActive: { backgroundColor: palette.text, borderColor: palette.text },
  chipLabel: { ...font.caption, color: palette.textDim, fontWeight: '600' },
  chipLabelActive: { color: palette.bg },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  name: { ...font.body, color: palette.text, fontWeight: '500' },
  meta: { ...font.caption, color: palette.textDim, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: space.lg },
  empty: { ...font.body, color: palette.textMuted, textAlign: 'center', marginTop: space.xxl },
});
