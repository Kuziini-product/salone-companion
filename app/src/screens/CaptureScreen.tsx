import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { palette, font, radius, space } from '@/theme';
import { Button } from '@/components/Button';
import { useStore } from '@/lib/mockStore';

type Mode = 'stand' | 'card';

export function CaptureScreen({ navigation }: any) {
  const [mode, setMode] = useState<Mode>('stand');
  const companies = useStore((s) => s.companies);
  const addContact = useStore((s) => s.addContact);

  function simulateStandShot() {
    // Demo: pretend we matched 3 companies with the vision API.
    const sample = companies.slice(0, 3).map((c, i) => ({
      company_id: c.id,
      name: c.name,
      confidence: 0.92 - i * 0.18,
      reason:
        i === 0
          ? 'Logo and signage on the stand match the brand identity.'
          : i === 1
            ? 'Color palette and typography are similar.'
            : 'Geographic proximity within the same hall.',
    }));
    navigation.navigate('MatchResult', {
      imageUri:
        'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1600&q=80',
      matches: sample,
    });
  }

  function simulateCardShot() {
    const fake = addContact({
      cardUri: 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&q=80',
      fullName: 'Marco Rossi',
      role: 'Sales Director',
      email: 'm.rossi@cassina.com',
      phone: '+39 333 1234567',
      rawOcrText: 'CASSINA\nMarco Rossi\nSales Director\nm.rossi@cassina.com\n+39 333 1234567',
      companyId: 'cassina',
    });
    navigation.navigate('ContactDetail', { contactId: fake.id });
  }

  return (
    <View style={styles.container}>
      <View style={styles.viewfinder}>
        <Text style={styles.demoBadge}>DEMO</Text>
        <Text style={styles.viewfinderHint}>
          {mode === 'stand'
            ? 'Point at a stand. Tap shutter to identify the brand.'
            : 'Frame a business card inside the rectangle.'}
        </Text>
        {mode === 'card' && <View style={styles.cardOverlay} pointerEvents="none" />}
      </View>

      <View style={styles.modeBar}>
        <ModeButton label="Stand" active={mode === 'stand'} onPress={() => setMode('stand')} />
        <ModeButton label="Card" active={mode === 'card'} onPress={() => setMode('card')} />
      </View>

      <View style={styles.shutterRow}>
        <Pressable
          style={styles.shutter}
          onPress={mode === 'stand' ? simulateStandShot : simulateCardShot}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <Text style={styles.helper}>
          {Platform.OS === 'web'
            ? 'Browser demo · using sample image instead of camera'
            : 'Tap to capture'}
        </Text>
      </View>
    </View>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeBtn, active && styles.modeBtnActive]}>
      <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, justifyContent: 'space-between' },
  viewfinder: {
    flex: 1,
    margin: space.lg,
    borderRadius: radius.xl,
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    overflow: 'hidden',
  },
  demoBadge: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    backgroundColor: palette.accent,
    color: palette.text,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    ...font.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  viewfinderHint: { ...font.body, color: palette.textDim, textAlign: 'center', maxWidth: 320 },
  cardOverlay: {
    position: 'absolute',
    top: '30%',
    left: '8%',
    right: '8%',
    aspectRatio: 1.586,
    borderWidth: 2,
    borderColor: palette.text,
    borderRadius: radius.md,
  },
  modeBar: {
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: palette.bgElevated,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modeBtn: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill },
  modeBtnActive: { backgroundColor: palette.text },
  modeLabel: { ...font.button, color: palette.text },
  modeLabelActive: { color: palette.bg },
  shutterRow: { alignItems: 'center', paddingBottom: space.xl, gap: space.sm },
  shutter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: palette.text,
    padding: 4,
  },
  shutterInner: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: palette.text,
    borderWidth: 4,
    borderColor: palette.bg,
  },
  helper: { ...font.caption, color: palette.textMuted },
});
