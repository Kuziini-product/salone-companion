import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { palette, font, space, radius, shadow } from '@/theme';
import { Button } from '@/components/Button';
import { StatusPill } from '@/components/StatusPill';
import { useStore, type VisitStatus } from '@/lib/mockStore';

type Tab = 'info' | 'photos' | 'notes';

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80',
];

export function CompanyCardScreen({ route }: any) {
  const { companyId } = route.params as { companyId: string };
  const [tab, setTab] = useState<Tab>('info');

  const company = useStore((s) => s.getCompany(companyId));
  const visit = useStore((s) => s.getVisitForCompany(companyId));
  const images = useStore((s) => (visit ? s.getImagesForVisit(visit.id) : []));
  const setStatus = useStore((s) => s.setStatus);
  const setNotes = useStore((s) => s.setNotes);
  const setAiSummary = useStore((s) => s.setAiSummary);
  const addImage = useStore((s) => s.addImage);
  const upsertVisit = useStore((s) => s.upsertVisit);

  const [draftNotes, setDraftNotes] = useState(visit?.notes ?? '');
  const [summarizing, setSummarizing] = useState(false);

  if (!company) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.body}>Company not found.</Text>
      </View>
    );
  }

  const status: VisitStatus = visit?.status ?? 'not_visited';

  function ensureVisit() {
    if (!visit) upsertVisit(companyId, { status: 'not_visited' });
  }

  function applyStatus(s: VisitStatus) {
    setStatus(companyId, s);
  }

  function saveNotes() {
    ensureVisit();
    setNotes(companyId, draftNotes);
  }

  function addRandomPhoto() {
    ensureVisit();
    const v = useStore.getState().getVisitForCompany(companyId);
    if (!v) return;
    const random = SAMPLE_PHOTOS[Math.floor(Math.random() * SAMPLE_PHOTOS.length)];
    addImage(v.id, random);
  }

  async function generateSummary() {
    setSummarizing(true);
    setTimeout(() => {
      setAiSummary(
        companyId,
        `• Strong showing of ${company.name} — refined materials and Italian craftsmanship.\n• ${
          draftNotes.trim() ? 'Personal notes captured.' : 'No personal notes yet.'
        }\n• Recommended follow-up: request catalog and lead times.`
      );
      setSummarizing(false);
    }, 800);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.name}>{company.name}</Text>
        <Text style={styles.meta}>
          {[company.hall, company.standNumber, company.pavilion].filter(Boolean).join(' · ')}
        </Text>
        <StatusPill status={status} />
        <View style={styles.statusRow}>
          <Button
            label="Visited"
            variant={status === 'visited' ? 'primary' : 'secondary'}
            onPress={() => applyStatus('visited')}
            style={{ flex: 1 }}
          />
          <Button
            label="Follow-up"
            variant={status === 'follow_up' ? 'primary' : 'secondary'}
            onPress={() => applyStatus('follow_up')}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={styles.tabBar}>
        {(['info', 'photos', 'notes'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'info' && (
        <View style={styles.section}>
          {company.description && <Text style={styles.body}>{company.description}</Text>}
          {company.website && (
            <InfoRow label="Website" value={company.website} onPress={() => Linking.openURL(company.website!)} />
          )}
          {company.email && (
            <InfoRow label="Email" value={company.email} onPress={() => Linking.openURL(`mailto:${company.email}`)} />
          )}
          {company.phone && (
            <InfoRow label="Phone" value={company.phone} onPress={() => Linking.openURL(`tel:${company.phone}`)} />
          )}
        </View>
      )}

      {tab === 'photos' && (
        <View style={styles.section}>
          <Button label={Platform.OS === 'web' ? 'Add demo photo' : 'Add photo'} onPress={addRandomPhoto} />
          <View style={styles.grid}>
            {images.map((img) => (
              <Image key={img.id} source={{ uri: img.uri }} style={styles.thumb} />
            ))}
          </View>
        </View>
      )}

      {tab === 'notes' && (
        <View style={styles.section}>
          <TextInput
            style={styles.notes}
            value={draftNotes}
            onChangeText={setDraftNotes}
            onBlur={saveNotes}
            multiline
            placeholder="What stood out at this stand…"
            placeholderTextColor={palette.textMuted}
          />
          <Button
            label={summarizing ? 'Summarizing…' : 'Generate AI summary'}
            variant="secondary"
            onPress={generateSummary}
            loading={summarizing}
          />
          {visit?.aiSummary && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryHeader}>AI summary</Text>
              <Text style={styles.body}>{visit.aiSummary}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.infoRow} onPress={onPress}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.lg },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.sm,
    ...shadow.card,
  },
  name: { ...font.display, color: palette.text },
  meta: { ...font.caption, color: palette.textDim },
  statusRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: palette.bgElevated,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: palette.bgCard },
  tabLabel: { ...font.caption, color: palette.textDim, fontWeight: '700', letterSpacing: 0.5 },
  tabLabelActive: { color: palette.text },
  section: { gap: space.md },
  body: { ...font.body, color: palette.text, lineHeight: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.sm },
  infoLabel: { ...font.body, color: palette.textDim },
  infoValue: { ...font.body, color: palette.accent, flex: 1, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  thumb: { width: '32%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: palette.bgElevated },
  notes: {
    minHeight: 160,
    backgroundColor: palette.bgElevated,
    borderRadius: radius.lg,
    padding: space.md,
    color: palette.text,
    ...font.body,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryCard: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.xs,
  },
  summaryHeader: { ...font.caption, color: palette.accent, fontWeight: '700', letterSpacing: 0.5 },
});
