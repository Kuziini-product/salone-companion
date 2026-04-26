// CountryPicker — bottom-sheet list of all countries that exist in the
// catalog, sorted by exhibitor count.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { countryName, countryFlagEmoji } from '../lib/brandHelpers';

interface CountryRow { country: string; n: number }

interface Props {
  visible:  boolean;
  onClose:  () => void;
  onPick:   (iso3: string | null) => void;
  selected: string | null;
}

export function CountryPicker({ visible, onClose, onPick, selected }: Props) {
  const { palette } = useTheme();
  const [rows, setRows] = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Fetch the country column for everything that has one, then count locally
      // (Supabase JS doesn't surface group-by directly without an RPC).
      const { data } = await supabase
        .from('companies').select('country').not('country', 'is', null).limit(2000);
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const r of data ?? []) {
        const c = (r as any).country as string;
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      const sorted = [...counts.entries()]
        .map(([country, n]) => ({ country, n }))
        .sort((a, b) => b.n - a.n);
      setRows(sorted);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: palette.bg, borderColor: palette.border }]}>
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>Alege țara</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={palette.textDim} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Clear selection at the top */}
          {selected ? (
            <Pressable
              onPress={() => { onPick(null); onClose(); }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: palette.bgElevated, borderColor: palette.border, marginHorizontal: spacing.md },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ ...typography.body, color: palette.danger }}>
                ✕ Șterge filtrul de țară
              </Text>
            </Pressable>
          ) : null}

          {loading ? (
            <View style={styles.center}><ActivityIndicator color={accents.companies.base} /></View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(r) => r.country}
              contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}
              renderItem={({ item }) => {
                const flag = countryFlagEmoji(item.country);
                const name = countryName(item.country);
                const isSel = item.country === selected;
                return (
                  <Pressable
                    onPress={() => { onPick(item.country); onClose(); }}
                    style={({ pressed }) => [
                      styles.row,
                      { backgroundColor: palette.bgElevated, borderColor: palette.border },
                      pressed && { opacity: 0.7 },
                      isSel && { borderColor: accents.companies.base, borderWidth: 2 },
                    ]}
                  >
                    <Text style={styles.flag}>{flag || '🏳️'}</Text>
                    <Text style={[styles.name, { color: palette.text }]}>{name}</Text>
                    <Text style={[styles.count, { color: palette.textDim }]}>{item.n}</Text>
                    {isSel ? <Check size={18} color={accents.companies.base} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: { flexDirection: 'row', alignItems: 'center',
         padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md },
  flag:  { fontSize: 22 },
  name:  { ...typography.body, flex: 1 },
  count: { ...typography.caption, fontWeight: '600' },
});
