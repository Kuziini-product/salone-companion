// ContactsScreen
// Friendly list of saved business cards. Each row shows the card thumbnail,
// the contact's name, role, and company. Tap → ContactDetail (edit/view).
// Pull to refresh; empty state nudges the user to the Capture tab.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList, Image, Pressable, RefreshControl, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Pencil, ChevronRight } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { getCardSignedUrl } from '../lib/scanCard';

interface Row {
  id:               string;
  full_name:        string | null;
  role:             string | null;
  email:            string | null;
  phone:            string | null;
  company_name:     string | null;
  company_id:       string | null;
  card_image_path:  string | null;
  created_at:       string;
}

export function ContactsScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const [rows, setRows]         = useState<Row[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh]= useState(false);
  const [thumbs, setThumbs]     = useState<Record<string, string>>({});
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, full_name, role, email, phone, company_name, company_id, card_image_path, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
    setRefresh(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Lazy-load signed URLs for the visible thumbnails.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const need = rows
        .filter((r) => r.card_image_path && !thumbs[r.id])
        .slice(0, 30); // batch first 30
      for (const r of need) {
        const url = await getCardSignedUrl(r.card_image_path!);
        if (cancelled) return;
        if (url) setThumbs((prev) => ({ ...prev, [r.id]: url }));
      }
    })();
    return () => { cancelled = true; };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [r.full_name, r.role, r.company_name, r.email]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const renderItem = ({ item }: { item: Row }) => {
    const thumb = thumbs[item.id];
    const initial =
      (item.full_name?.[0] ?? item.company_name?.[0] ?? '?').toUpperCase();
    const hasCompany = !!item.company_id;
    return (
      <View
        style={[
          styles.row,
          { backgroundColor: palette.bgElevated, borderColor: palette.border },
        ]}
      >
        <Pressable
          onPress={() => {
            if (hasCompany) nav.navigate('CompanyCard', { companyId: item.company_id });
            else nav.navigate('ContactDetail', { contactId: item.id });
          }}
          style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.7 }]}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: accents.contacts.soft }]}>
              <Text style={[styles.thumbInitial, { color: accents.contacts.deep }]}>{initial}</Text>
            </View>
          )}
          <View style={styles.rowText}>
            <Text style={[styles.rowName, { color: palette.text }]} numberOfLines={1}>
              {item.full_name || 'Contact fără nume'}
            </Text>
            {(item.role || item.company_name) ? (
              <Text style={[styles.rowSub, { color: palette.textDim }]} numberOfLines={1}>
                {[item.role, item.company_name].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {item.email ? (
              <Text style={[styles.rowMeta, { color: palette.textFaint }]} numberOfLines={1}>
                {item.email}
              </Text>
            ) : null}
            {hasCompany ? (
              <View style={[styles.linkBadge, { backgroundColor: accents.companies.soft }]}>
                <Text style={[styles.linkBadgeText, { color: accents.companies.deep }]}>
                  → vezi card companie
                </Text>
              </View>
            ) : null}
          </View>
          <ChevronRight size={20} color={palette.textFaint} strokeWidth={2} />
        </Pressable>

        {/* Always-available edit button (opens ContactDetail to fix fields) */}
        <Pressable
          onPress={() => nav.navigate('ContactDetail', { contactId: item.id })}
          style={({ pressed }) => [
            styles.editBtn,
            { backgroundColor: palette.bgSubtle, borderColor: palette.border },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityLabel="Editează contactul"
        >
          <Pencil size={14} color={palette.textDim} strokeWidth={2} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Cărți de vizită</Text>
        {rows.length > 0 ? (
          <Text style={[styles.count, { color: accents.contacts.base }]}>
            {rows.length}
          </Text>
        ) : null}
      </View>

      {/* Search */}
      {rows.length > 0 ? (
        <View style={[styles.searchWrap, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
          <Text style={styles.searchEmoji}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Caută după nume, firmă sau email"
            placeholderTextColor={palette.textFaint}
            autoCapitalize="none"
            style={[styles.searchInput, { color: palette.text }]}
            returnKeyType="search"
          />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: palette.textDim }}>Se încarcă…</Text>
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 56 }}>💼</Text>}
          title="Nicio carte de vizită"
          message="Mergi la fila Capture și fotografiază prima carte. O să o citim cu AI și o salvăm aici."
          action={
            <Button
              label="Mergi la Capture"
              accent="capture"
              size="lg"
              onPress={() => nav.navigate('Capture')}
            />
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefresh(true); load(); }}
              tintColor={accents.contacts.base}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <Text style={[styles.noMatches, { color: palette.textDim }]}>
              Nimic nu se potrivește cu „{search}"
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.title },
  count: { ...typography.heading },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchEmoji: { fontSize: 16 },
  searchInput: { flex: 1, ...typography.body },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.md,
  },
  editBtn: {
    width: 44,
    alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  thumb:        { width: 64, height: 40, borderRadius: radius.md, backgroundColor: '#E2E8F0' },
  thumbFallback:{ alignItems: 'center', justifyContent: 'center' },
  thumbInitial: { ...typography.heading },
  rowText:      { flex: 1, gap: 2 },
  rowName:      { ...typography.bodyBold },
  rowSub:       { ...typography.caption },
  rowMeta:      { ...typography.caption },
  linkBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  linkBadgeText: { ...typography.micro, fontWeight: '600' },

  noMatches: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
});
