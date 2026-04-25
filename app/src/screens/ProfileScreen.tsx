import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, font, space, radius } from '@/theme';
import { Button } from '@/components/Button';
import { useStore } from '@/lib/mockStore';

export function ProfileScreen() {
  const visits = useStore((s) => s.visits);
  const contacts = useStore((s) => s.contacts);
  const images = useStore((s) => s.images);

  const visited = visits.filter((v) => v.status === 'visited').length;
  const followUp = visits.filter((v) => v.status === 'follow_up').length;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Demo mode</Text>
        <Text style={styles.value}>Salone Companion</Text>
        <Text style={styles.dim}>
          Local data only. Connect Supabase + Anthropic for full functionality.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>This session</Text>
        <Stat label="Visited" value={visited} />
        <Stat label="Follow-up" value={followUp} />
        <Stat label="Photos" value={images.length} />
        <Stat label="Contacts" value={contacts.length} />
      </View>

      <View style={styles.section}>
        <Button label="Export CSV (demo)" variant="secondary" onPress={() => {}} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, padding: space.lg, gap: space.lg },
  section: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
  },
  label: { ...font.caption, color: palette.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { ...font.title, color: palette.text },
  dim: { ...font.caption, color: palette.textMuted, marginTop: space.xs },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs },
  statLabel: { ...font.body, color: palette.textDim },
  statValue: { ...font.body, color: palette.text, fontWeight: '700' },
});
