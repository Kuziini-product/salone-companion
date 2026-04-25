// CompanyPicker — bottom sheet to search the catalog and pick one company.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Search, X, Check } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { BrandLogo } from './BrandLogo';
import { countryFlagEmoji } from '../lib/brandHelpers';

interface Hit {
  id: string; name: string; hall: string | null; stand: string | null;
  city: string | null; country: string | null; website: string | null;
}

interface Props {
  visible:   boolean;
  onClose:   () => void;
  onPick:    (company: Hit) => void;
  initialQuery?: string;
  selectedIds?: string[];   // already-picked, render with checkmark
}

export function CompanyPicker({ visible, onClose, onPick, initialQuery, selectedIds = [] }: Props) {
  const { palette } = useTheme();
  const [search, setSearch] = useState('');
  const [query, setQuery]   = useState('');
  const [rows, setRows]     = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearch(initialQuery ?? '');
    setQuery(initialQuery ?? '');
  }, [visible, initialQuery]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('companies')
        .select('id, name, hall, stand, city, country, website')
        .order('name')
        .limit(40);
      if (query) {
        const term = query.toLowerCase();
        q = q.or([
          `name_normalized.ilike.%${term}%`,
          `email.ilike.%${term}%`,
          `website.ilike.%${term}%`,
        ].join(','));
      }
      const { data } = await q;
      if (cancelled) return;
      setRows((data ?? []) as Hit[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [visible, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { backgroundColor: palette.bg, borderColor: palette.border }]}
        >
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>Asociază expozant</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={palette.textDim} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={[styles.searchWrap, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <Search size={18} color={palette.textFaint} strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Caută după nume, email, website…"
              placeholderTextColor={palette.textFaint}
              autoCapitalize="none"
              style={[styles.searchInput, { color: palette.text }]}
              autoFocus
            />
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator color={accents.companies.base} /></View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
              renderItem={({ item }) => {
                const flag = countryFlagEmoji(item.country);
                const picked = selectedIds.includes(item.id);
                return (
                  <Pressable
                    onPress={() => onPick(item)}
                    style={({ pressed }) => [
                      styles.row,
                      { backgroundColor: palette.bgElevated, borderColor: palette.border },
                      pressed && { opacity: 0.7 },
                      picked && { borderColor: accents.companies.base, borderWidth: 2 },
                    ]}
                  >
                    <BrandLogo
                      website={item.website}
                      name={item.name}
                      size={40}
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
                    {picked ? <Check size={20} color={accents.companies.base} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: palette.textDim, padding: spacing.xl }}>
                  Nimic nu se potrivește.
                </Text>
              }
            />
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:    { height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  title:    { ...typography.heading },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, paddingHorizontal: spacing.md,
                height: 44, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  searchInput:{ flex: 1, ...typography.body, height: '100%' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm,
         borderRadius: radius.lg, borderWidth: 1, gap: spacing.md },
  name: { ...typography.bodyBold },
  meta: { ...typography.caption, marginTop: 2 },
});
