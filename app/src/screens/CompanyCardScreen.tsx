// CompanyCardScreen — premium detail with big logo header, favorite toggle,
// quick-actions panel (add photo / quick comment), photos grid, notes with
// voice mic, contact, and About at the very bottom.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ImageBackground, Linking, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Heart, Phone, Mail, MapPin, Globe, Camera, MessageSquarePlus,
  Sparkles, Save, MessageCircle,
} from 'lucide-react-native';
import { useTheme, accents, statusColors, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { BrandLogo } from '../components/BrandLogo';
import { VoiceMic } from '../components/VoiceMic';
import { CompanyChatModal } from '../components/CompanyChatModal';
import { supabase, functionUrl } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { countryFlagEmoji, brandLogoUrl, faviconUrl } from '../lib/brandHelpers';
import { fetchHeroImage } from '../lib/heroImage';
import { pickImageWeb } from '../lib/pickImage';

type Params = { CompanyCard: { companyId: string } };
type VisitStatus = 'planned' | 'visited' | 'follow_up' | 'skipped';

interface Company {
  id:          string;
  name:        string;
  hall:        string | null;
  stand:       string | null;
  description: string | null;
  website:     string | null;
  email:       string | null;
  email_alt:   string | null;
  phone:       string | null;
  fax:         string | null;
  address:     string | null;
  postal_code: string | null;
  city:        string | null;
  province:    string | null;
  country:     string | null;
  category_en: string | null;
  products_en: string | null;
}

interface Visit {
  id:          string;
  status:      VisitStatus;
  notes:       string | null;
  ai_summary:  string | null;
  is_favorite: boolean;
}

interface ImageRow { id: string; storage_path: string; caption: string | null; created_at: string }

const statusOrder: VisitStatus[] = ['planned', 'visited', 'follow_up', 'skipped'];
const statusLabel: Record<VisitStatus, string> = {
  planned: 'Planificat', visited: 'Vizitat', follow_up: 'Follow-up', skipped: 'Sărit',
};

export function CompanyCardScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const route = useRoute<RouteProp<Params, 'CompanyCard'>>();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { companyId } = route.params;

  const [company, setCompany] = useState<Company | null>(null);
  const [visit, setVisit]     = useState<Visit | null>(null);
  const [images, setImages]   = useState<ImageRow[]>([]);
  const [thumbs, setThumbs]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [notes, setNotes]     = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingFav, setSavingFav] = useState(false);
  const [busyImg, setBusyImg] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [heroBg, setHeroBg] = useState<string | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);

  const load = useCallback(async () => {
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase.from('companies').select(
        'id, name, hall, stand, description, website, email, email_alt, phone, fax, address, postal_code, city, province, country, category_en, products_en'
      ).eq('id', companyId).maybeSingle(),
      supabase.from('visits').select('id, status, notes, ai_summary, is_favorite')
        .eq('company_id', companyId).maybeSingle(),
    ]);
    setCompany(c ?? null);
    setVisit(v as Visit | null);
    setNotes((v as Visit | null)?.notes ?? '');

    if (v) {
      const { data: imgs } = await supabase
        .from('images').select('id, storage_path, caption, created_at')
        .eq('visit_id', (v as Visit).id).order('created_at', { ascending: false });
      setImages((imgs ?? []) as ImageRow[]);

      const next: Record<string, string> = {};
      for (const im of imgs ?? []) {
        const { data: signed } = await supabase.storage.from('company-images')
          .createSignedUrl(im.storage_path, 3600);
        if (signed?.signedUrl) next[im.id] = signed.signedUrl;
      }
      setThumbs(next);
    }
    setLoading(false);
  }, [companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Resolve hero background — prefer og:image, fall back to mShots screenshot.
  useEffect(() => {
    let cancelled = false;
    if (!company?.website) return;
    fetchHeroImage(companyId, company.website).then((url) => {
      if (!cancelled) setHeroBg(url);
    });
    return () => { cancelled = true; };
  }, [companyId, company?.website]);

  // Ensure a visit row exists, returning its id.
  async function ensureVisit(): Promise<string> {
    if (visit) return visit.id;
    if (!userId) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('visits').insert({
      user_id: userId, company_id: companyId, status: 'planned',
    }).select('id, status, notes, ai_summary, is_favorite').single();
    if (error) throw new Error(error.message);
    setVisit(data as Visit);
    return (data as Visit).id;
  }

  async function cycleStatus() {
    if (savingStatus) return;
    Haptics.selectionAsync();
    const cur = visit?.status ?? 'planned';
    const next = statusOrder[(statusOrder.indexOf(cur) + 1) % statusOrder.length];
    setSavingStatus(true);
    try {
      const id = await ensureVisit();
      await supabase.from('visits').update({
        status: next,
        visited_at: next === 'visited' ? new Date().toISOString() : null,
      }).eq('id', id);
      setVisit((v) => v ? { ...v, status: next } : v);
    } finally { setSavingStatus(false); }
  }

  async function toggleFavorite() {
    if (savingFav) return;
    Haptics.selectionAsync();
    setSavingFav(true);
    try {
      const id = await ensureVisit();
      const next = !visit?.is_favorite;
      await supabase.from('visits').update({ is_favorite: next }).eq('id', id);
      setVisit((v) => v ? { ...v, is_favorite: next } : v);
    } finally { setSavingFav(false); }
  }

  async function saveNotes() {
    if (savingNotes) return;
    setSavingNotes(true);
    try {
      const id = await ensureVisit();
      await supabase.from('visits').update({ notes }).eq('id', id);
      setVisit((v) => v ? { ...v, notes } : v);
    } finally { setSavingNotes(false); }
  }

  async function uploadImage(source: 'camera' | 'gallery') {
    if (busyImg) return;
    const uri = await pickImageWeb(source);
    if (!uri) return;
    setBusyImg(true);
    try {
      if (!userId) throw new Error('Not authenticated');
      const visitId = await ensureVisit();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const random = Math.random().toString(36).slice(2, 8);
      const path = `${userId}/visit-${visitId}/${stamp}-${random}.jpg`;
      const r = await fetch(uri);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const { error: upErr } = await supabase.storage.from('company-images').upload(path, bytes, {
        contentType: 'image/jpeg',
      });
      if (upErr) throw new Error(upErr.message);
      const { data: img, error: insErr } = await supabase.from('images').insert({
        user_id: userId, visit_id: visitId, storage_path: path,
      }).select('id, storage_path, caption, created_at').single();
      if (insErr) throw new Error(insErr.message);
      const { data: signed } = await supabase.storage.from('company-images').createSignedUrl(path, 3600);
      setImages((prev) => [img as ImageRow, ...prev]);
      if (signed?.signedUrl) setThumbs((prev) => ({ ...prev, [(img as ImageRow).id]: signed.signedUrl }));
    } catch (e) {
      Alert.alert('Eroare la upload', (e as Error).message);
    } finally {
      setBusyImg(false);
    }
  }

  function appendQuickComment() {
    Alert.prompt
      ? Alert.prompt('Notă rapidă', 'Adaugă o linie scurtă la note', async (text: string | undefined) => {
          if (!text) return;
          const newNotes = [notes, text].filter(Boolean).join('\n');
          setNotes(newNotes);
          const id = await ensureVisit();
          await supabase.from('visits').update({ notes: newNotes }).eq('id', id);
          setVisit((v) => v ? { ...v, notes: newNotes } : v);
        })
      // Fallback for web (Alert.prompt is iOS-only)
      : (() => {
          const text = typeof window !== 'undefined' ? window.prompt('Notă rapidă') : null;
          if (!text) return;
          const newNotes = [notes, text].filter(Boolean).join('\n');
          setNotes(newNotes);
          ensureVisit().then((id) => {
            supabase.from('visits').update({ notes: newNotes }).eq('id', id);
            setVisit((v) => v ? { ...v, notes: newNotes } : v);
          });
        })();
  }

  async function generateSummary() {
    if (summarizing || !visit) return;
    setSummarizing(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) throw new Error('Sesiunea a expirat');
      const res = await fetch(functionUrl('summarize-visit'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_id: visit.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const { summary } = await res.json();
      setVisit((v) => v ? { ...v, ai_summary: summary } : v);
    } catch (e) {
      Alert.alert('AI summary eșuat', (e as Error).message);
    } finally { setSummarizing(false); }
  }

  function openWebsite() {
    if (!company?.website) return;
    const url = company.website.startsWith('http') ? company.website : `https://${company.website}`;
    Linking.openURL(url).catch(() => {});
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <View style={styles.center}><ActivityIndicator color={accents.companies.base} size="large" /></View>
      </SafeAreaView>
    );
  }
  if (!company) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <View style={styles.center}><Text style={{ color: palette.textDim }}>Expozant negăsit</Text></View>
      </SafeAreaView>
    );
  }

  const status = visit?.status ?? 'planned';
  const sc = statusColors[status];
  const flag = countryFlagEmoji(company.country);
  const isFav = !!visit?.is_favorite;
  const fullAddress = [company.address, company.postal_code, company.city, company.province]
    .filter(Boolean).join(', ');

  // Logo URL priority: Clearbit → favicon → letter fallback (handled by onError).
  const logoCandidate =
    !logoBroken
      ? (brandLogoUrl(company.website, 256) ?? faviconUrl(company.website, 128))
      : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* HERO: og:image (or screenshot fallback) fills the box.
            Logo floats top-left as a small badge, name+meta sit on a soft
            gradient at the bottom. No white plate covering the photo. */}
        <ImageBackground
          source={heroBg ? { uri: heroBg } : undefined}
          style={[styles.hero, { backgroundColor: '#0F172A', borderColor: palette.border }]}
          imageStyle={{ borderRadius: radius.xl }}
        >
          {/* Favorite top-right */}
          <Pressable
            onPress={toggleFavorite}
            style={[styles.favBtn, { backgroundColor: isFav ? '#EF4444' : 'rgba(255,255,255,0.92)' }]}
            accessibilityLabel={isFav ? 'Scoate din favorite' : 'Adaugă la favorite'}
          >
            {savingFav
              ? <ActivityIndicator color={isFav ? '#FFFFFF' : '#EF4444'} size="small" />
              : <Heart size={22} color={isFav ? '#FFFFFF' : '#EF4444'} fill={isFav ? '#FFFFFF' : 'transparent'} strokeWidth={2} />}
          </Pressable>

        </ImageBackground>

        {/* Name + flag centered under hero */}
        <View style={styles.nameUnderHero}>
          <Text style={[styles.nameLarge, { color: palette.text }]} numberOfLines={2}>
            {company.name}
          </Text>
          {flag ? <Text style={styles.flagLarge}>{flag}</Text> : null}
        </View>

        {/* Hall + stand line below the name */}
        {(company.hall || company.stand) ? (
          <View style={styles.metaUnderHero}>
            <MapPin size={14} color={palette.textDim} strokeWidth={2} />
            <Text style={[styles.meta, { color: palette.textDim }]}>
              Hall {[company.hall, company.stand].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}

        {/* Status + Quick Actions row */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={cycleStatus} disabled={savingStatus}
            style={({ pressed }) => [styles.statusPill, { backgroundColor: sc.bg }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.statusText, { color: sc.fg }]}>{statusLabel[status]}</Text>
          </Pressable>

          <Pressable
            onPress={() => uploadImage('camera')}
            disabled={busyImg}
            style={({ pressed }) => [styles.qaBtn, { backgroundColor: accents.capture.soft }, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Fă o poză"
          >
            {busyImg ? <ActivityIndicator size="small" color={accents.capture.deep} /> :
              <Camera size={20} color={accents.capture.deep} strokeWidth={2} />}
          </Pressable>

          <Pressable
            onPress={() => uploadImage('gallery')}
            disabled={busyImg}
            style={({ pressed }) => [styles.qaBtn, { backgroundColor: accents.companies.soft }, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Adaugă din galerie"
          >
            <Camera size={20} color={accents.companies.deep} strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={appendQuickComment}
            style={({ pressed }) => [styles.qaBtn, { backgroundColor: accents.profile.soft }, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Notă rapidă"
          >
            <MessageSquarePlus size={20} color={accents.profile.deep} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Photo gallery */}
        {images.length > 0 ? (
          <View style={[styles.section, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <Text style={[styles.sectionLabel, { color: palette.textDim }]}>POZE ({images.length})</Text>
            <View style={styles.grid}>
              {images.map((img) => (
                <View key={img.id} style={styles.thumbWrap}>
                  {thumbs[img.id]
                    ? <Image source={{ uri: thumbs[img.id] }} style={styles.thumb} />
                    : <View style={[styles.thumb, { backgroundColor: palette.bgSubtle }]} />}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Notes with mic */}
        <View style={[styles.section, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textDim }]}>NOTE</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <VoiceMic
                onTranscript={(t) => setNotes((prev) => prev ? `${prev} ${t}`.trim() : t.trim())}
                color={accents.profile.deep}
                background={accents.profile.soft}
                size={36}
              />
              {notes !== (visit?.notes ?? '') && (
                <Pressable
                  onPress={saveNotes}
                  disabled={savingNotes}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    { backgroundColor: accents.contacts.base },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {savingNotes
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Save size={16} color="#FFFFFF" strokeWidth={2} />}
                </Pressable>
              )}
            </View>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Scrie sau apasă pe microfon și vorbește…"
            placeholderTextColor={palette.textFaint}
            style={[styles.notesInput, { color: palette.text, borderColor: palette.border }]}
          />
          {visit?.ai_summary ? (
            <View style={[styles.summaryBox, { borderColor: accents.profile.base }]}>
              <Text style={[styles.summaryLabel, { color: accents.profile.deep }]}>REZUMAT AI</Text>
              <Text style={[styles.summaryText, { color: palette.text }]}>{visit.ai_summary}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs }}>
            <Pressable
              onPress={generateSummary}
              disabled={summarizing || !visit}
              style={({ pressed }) => [styles.aiBtn, pressed && { opacity: 0.7 }]}
            >
              {summarizing
                ? <ActivityIndicator size="small" color={accents.profile.deep} />
                : <Sparkles size={16} color={accents.profile.deep} strokeWidth={2} />}
              <Text style={[styles.aiBtnText, { color: accents.profile.deep }]}>
                {summarizing ? 'AI scrie rezumat…' : 'Rezumat AI'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setChatOpen(true)}
              style={({ pressed }) => [styles.aiBtn, pressed && { opacity: 0.7 }]}
            >
              <MessageCircle size={16} color={accents.companies.deep} strokeWidth={2} />
              <Text style={[styles.aiBtnText, { color: accents.companies.deep }]}>
                Chat cu AI despre brand
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Contact info */}
        {(company.phone || company.email || fullAddress) ? (
          <View style={[styles.section, { backgroundColor: palette.bgElevated, borderColor: palette.border, padding: 0 }]}>
            <Text style={[styles.sectionLabel, { color: palette.textDim, padding: spacing.lg, paddingBottom: spacing.sm }]}>CONTACT</Text>
            {company.phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${company.phone!.replace(/\s+/g, '')}`).catch(() => {})}
                style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.6 }]}>
                <Phone size={20} color={accents.contacts.base} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactKind, { color: palette.textDim }]}>Telefon</Text>
                  <Text style={[styles.contactValue, { color: palette.text }]}>{company.phone}</Text>
                </View>
              </Pressable>
            ) : null}
            {company.email ? (
              <Pressable onPress={() => Linking.openURL(`mailto:${company.email}`).catch(() => {})}
                style={({ pressed }) => [styles.contactRow,
                  { borderTopColor: palette.divider, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { opacity: 0.6 }]}>
                <Mail size={20} color={accents.companies.base} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactKind, { color: palette.textDim }]}>Email</Text>
                  <Text style={[styles.contactValue, { color: palette.text }]} numberOfLines={1}>{company.email}</Text>
                </View>
              </Pressable>
            ) : null}
            {fullAddress ? (
              <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`).catch(() => {})}
                style={({ pressed }) => [styles.contactRow,
                  { borderTopColor: palette.divider, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { opacity: 0.6 }]}>
                <MapPin size={20} color={accents.profile.base} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactKind, { color: palette.textDim }]}>Adresă {flag}</Text>
                  <Text style={[styles.contactValue, { color: palette.text }]} numberOfLines={3}>{fullAddress}</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Website */}
        {company.website ? (
          <Button
            label="Deschide website"
            icon={<Globe size={16} color="#FFFFFF" strokeWidth={2} />}
            onPress={openWebsite}
            accent="companies"
            variant="primary"
            fullWidth
          />
        ) : null}

        {/* About — moved to BOTTOM per user request */}
        {company.description ? (
          <View style={[styles.section, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <Text style={[styles.sectionLabel, { color: palette.textDim }]}>DESPRE</Text>
            <Text style={[styles.sectionBody, { color: palette.text }]}>{company.description}</Text>
          </View>
        ) : null}
      </ScrollView>

      <CompanyChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        companyId={companyId}
        companyName={company.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  // Hero — clean photo, logo badge top-left, favorite top-right. No overlay.
  hero: {
    width: '100%',
    height: 260,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Floating logo that overlaps the bottom edge of the hero photo.
  logoUnderHeroWrap: {
    alignItems: 'center',
    marginTop: -42,            // pull up so the badge straddles the photo edge
    marginBottom: spacing.xs,
  },
  logoUnderHero: {
    width: 84, height: 84, borderRadius: radius.xl,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.sm,
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  logoUnderHeroImg:     { width: '100%', height: '100%' },
  logoUnderHeroInitial: { fontSize: 36, fontWeight: '800', color: '#0F172A', letterSpacing: -1 },
  // Name + flag block centered under the hero photo.
  nameUnderHero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  nameLarge: {
    fontSize: 26, fontWeight: '700', letterSpacing: -0.4,
    textAlign: 'center',
    flexShrink: 1,
  },
  flagLarge: { fontSize: 26 },
  metaUnderHero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 4,
  },
  favBtn: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  nameBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  flag:      { fontSize: 28 },
  name:      { ...typography.title, flexShrink: 1 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta:      { ...typography.body },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  statusPill: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.pill,
    flex: 1, alignItems: 'center',
  },
  statusText: { ...typography.bodyBold },
  qaBtn: {
    width: 44, height: 44, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },

  section: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.lg, gap: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel:  { ...typography.micro },
  sectionBody:   { ...typography.body, lineHeight: 22 },

  notesInput: {
    minHeight: 100, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, ...typography.body, textAlignVertical: 'top',
  },
  saveBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  summaryBox: {
    borderLeftWidth: 3, paddingLeft: spacing.md, paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryLabel: { ...typography.micro, marginBottom: 4 },
  summaryText:  { ...typography.body, lineHeight: 22 },

  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  aiBtnText: { ...typography.caption, fontWeight: '600' },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  thumbWrap:{ width: '31%' },
  thumb:    { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: '#000' },

  contactRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  contactKind:  { ...typography.micro },
  contactValue: { ...typography.body, marginTop: 2 },
});
