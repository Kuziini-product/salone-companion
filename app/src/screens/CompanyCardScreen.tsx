// CompanyCardScreen
// Rich detail view for a single exhibitor.
//
// Sections (top to bottom):
//   Hero        — colored letter avatar + name + hall/stand
//   Visit pill  — tap to cycle status (planned → visited → follow_up → skipped)
//   Tags        — colored chips, tap to open the category list
//   About       — description text
//   Actions     — open website
//   Contacts    — business cards already linked to this company

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, accents, statusColors, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { BrandLogo } from '../components/BrandLogo';
import { supabase } from '../lib/supabase';
import { countryFlagEmoji } from '../lib/brandHelpers';

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

interface Tag { id: string; name: string }
interface ContactRow { id: string; full_name: string | null; role: string | null }

const flavorByName: Record<string, { bg: string; fg: string }> = {
  Lighting: { bg: '#FEF3C7', fg: '#92400E' },
  Sofas:    { bg: '#DBEAFE', fg: '#1D4ED8' },
  Tables:   { bg: '#FEE2E2', fg: '#991B1B' },
  Premium:  { bg: '#EDE9FE', fg: '#5B21B6' },
  Italian:  { bg: '#D1FAE5', fg: '#047857' },
  Outdoor:  { bg: '#DCFCE7', fg: '#166534' },
};
const tagFallback = { bg: accents.companies.soft, fg: accents.companies.deep };

const statusOrder: VisitStatus[] = ['planned', 'visited', 'follow_up', 'skipped'];
const statusLabel: Record<VisitStatus, string> = {
  planned:   'Planificat',
  visited:   'Vizitat',
  follow_up: 'Follow-up',
  skipped:   'Sărit',
};

export function CompanyCardScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const route = useRoute<RouteProp<Params, 'CompanyCard'>>();
  const { companyId } = route.params;

  const [company, setCompany]   = useState<Company | null>(null);
  const [tags, setTags]         = useState<Tag[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [visitId, setVisitId]   = useState<string | null>(null);
  const [status, setStatus]     = useState<VisitStatus>('planned');
  const [loading, setLoading]   = useState(true);
  const [savingStatus, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: c }, { data: t }, { data: ct }, { data: v }] = await Promise.all([
      supabase
        .from('companies')
        .select(
          'id, name, hall, stand, description, website, email, email_alt, phone, fax, address, postal_code, city, province, country, category_en, products_en',
        )
        .eq('id', companyId)
        .maybeSingle(),
      supabase
        .from('company_tags')
        .select('tags!inner(id, name)')
        .eq('company_id', companyId),
      supabase
        .from('contacts')
        .select('id, full_name, role')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('visits')
        .select('id, status')
        .eq('company_id', companyId)
        .maybeSingle(),
    ]);

    setCompany(c ?? null);
    setTags(((t ?? []).map((r) => r.tags as unknown as Tag).filter(Boolean)));
    setContacts(ct ?? []);
    if (v) {
      setVisitId(v.id);
      setStatus(v.status as VisitStatus);
    }
    setLoading(false);
  }, [companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Cycle through statuses on tap. First tap creates the visit row.
  const cycleStatus = async () => {
    if (savingStatus) return;
    Haptics.selectionAsync();
    const previous = status;
    const next = statusOrder[(statusOrder.indexOf(status) + 1) % statusOrder.length];
    setStatus(next);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');
      if (visitId) {
        const { error } = await supabase
          .from('visits')
          .update({
            status: next,
            visited_at: next === 'visited' ? new Date().toISOString() : null,
          })
          .eq('id', visitId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase
          .from('visits')
          .insert({
            user_id: user.id,
            company_id: companyId,
            status: next,
            visited_at: next === 'visited' ? new Date().toISOString() : null,
          })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        setVisitId(data.id);
      }
    } catch (e) {
      Alert.alert('Eroare', (e as Error).message);
      setStatus(previous);
    } finally {
      setSaving(false);
    }
  };

  const openWebsite = () => {
    if (!company?.website) return;
    const url = company.website.startsWith('http') ? company.website : `https://${company.website}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Eroare', `Nu pot deschide ${url}`)
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={accents.companies.base} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!company) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <View style={styles.center}>
          <Text style={{ color: palette.textDim }}>Expozant negăsit</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sc = statusColors[status];
  const flag = countryFlagEmoji(company.country);
  const fullAddress = [company.address, company.postal_code, company.city, company.province]
    .filter(Boolean)
    .join(', ');

  function openMaps() {
    if (!fullAddress) return;
    const q = encodeURIComponent(fullAddress);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero — brand logo on a soft background */}
        <View style={[styles.hero, { backgroundColor: accents.companies.soft }]}>
          <BrandLogo
            website={company.website}
            name={company.name}
            size={96}
            background={accents.companies.soft}
            foreground={accents.companies.deep}
            rounded={20}
          />
        </View>

        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: palette.text }]} numberOfLines={2}>
            {company.name}
          </Text>
          {flag ? <Text style={styles.flag}>{flag}</Text> : null}
        </View>
        {(company.hall || company.stand) ? (
          <Text style={[styles.meta, { color: palette.textDim }]}>
            📍 Hall {[company.hall, company.stand].filter(Boolean).join(' · ')}
          </Text>
        ) : null}

        {/* Visit status pill — tap to cycle */}
        <Pressable
          onPress={cycleStatus}
          disabled={savingStatus}
          style={({ pressed }) => [
            styles.statusPill,
            { backgroundColor: sc.bg },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.statusText, { color: sc.fg }]}>
            {statusLabel[status]}
          </Text>
          <Text style={[styles.statusHint, { color: sc.fg, opacity: 0.6 }]}>
            apasă pentru a schimba
          </Text>
        </Pressable>

        {/* Tags */}
        {tags.length > 0 ? (
          <View style={styles.tagsWrap}>
            {tags.map((tag) => {
              const f = flavorByName[tag.name] ?? tagFallback;
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => nav.navigate('CompaniesByCategory', { tagId: tag.id, tagName: tag.name })}
                  style={({ pressed }) => [
                    styles.tag,
                    { backgroundColor: f.bg },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.tagText, { color: f.fg }]}>{tag.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Description */}
        {company.description ? (
          <View style={[styles.section, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <Text style={[styles.sectionLabel, { color: palette.textDim }]}>DESPRE</Text>
            <Text style={[styles.sectionBody, { color: palette.text }]}>
              {company.description}
            </Text>
          </View>
        ) : null}

        {/* Contact info — phone, email, address (each tappable) */}
        {(company.phone || company.email || fullAddress) ? (
          <View style={[styles.section, { backgroundColor: palette.bgElevated, borderColor: palette.border, padding: 0 }]}>
            <Text style={[styles.sectionLabel, { color: palette.textDim, padding: spacing.lg, paddingBottom: spacing.sm }]}>
              CONTACT
            </Text>
            {company.phone ? (
              <Pressable
                onPress={() => Linking.openURL(`tel:${company.phone!.replace(/\s+/g, '')}`).catch(() => {})}
                style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.contactEmoji}>📞</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactKind, { color: palette.textDim }]}>Telefon</Text>
                  <Text style={[styles.contactValue, { color: palette.text }]}>{company.phone}</Text>
                </View>
                <Text style={[styles.chev, { color: palette.textFaint }]}>›</Text>
              </Pressable>
            ) : null}
            {company.email ? (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${company.email}`).catch(() => {})}
                style={({ pressed }) => [
                  styles.contactRow,
                  { borderTopColor: palette.divider, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.contactEmoji}>✉️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactKind, { color: palette.textDim }]}>Email</Text>
                  <Text style={[styles.contactValue, { color: palette.text }]} numberOfLines={1}>{company.email}</Text>
                </View>
                <Text style={[styles.chev, { color: palette.textFaint }]}>›</Text>
              </Pressable>
            ) : null}
            {fullAddress ? (
              <Pressable
                onPress={openMaps}
                style={({ pressed }) => [
                  styles.contactRow,
                  { borderTopColor: palette.divider, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.contactEmoji}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactKind, { color: palette.textDim }]}>
                    Adresă {flag ? ` ${flag}` : ''}
                  </Text>
                  <Text style={[styles.contactValue, { color: palette.text }]} numberOfLines={3}>{fullAddress}</Text>
                </View>
                <Text style={[styles.chev, { color: palette.textFaint }]}>›</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Actions */}
        {company.website ? (
          <View style={styles.actions}>
            <Button
              label="Deschide website"
              icon={<Text style={{ fontSize: 16 }}>🌐</Text>}
              onPress={openWebsite}
              accent="companies"
              variant="secondary"
              fullWidth
            />
          </View>
        ) : null}

        {/* Contacts at this exhibitor */}
        {contacts.length > 0 ? (
          <View style={[styles.contactsCard, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <Text style={[styles.sectionLabel, { color: palette.textDim, padding: spacing.lg, paddingBottom: spacing.sm }]}>
              CĂRȚI DE VIZITĂ ({contacts.length})
            </Text>
            {contacts.map((c, i) => (
              <Pressable
                key={c.id}
                onPress={() => nav.navigate('ContactDetail', { contactId: c.id })}
                style={({ pressed }) => [
                  styles.contactRow,
                  i > 0 && { borderTopColor: palette.divider, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.contactAvatar, { backgroundColor: accents.contacts.soft }]}>
                  <Text style={[styles.contactInitial, { color: accents.contacts.deep }]}>
                    {(c.full_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactName, { color: palette.text }]} numberOfLines={1}>
                    {c.full_name || 'Contact fără nume'}
                  </Text>
                  {c.role ? (
                    <Text style={[styles.contactRole, { color: palette.textDim }]} numberOfLines={1}>
                      {c.role}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.chev, { color: palette.textFaint }]}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: spacing.lg, gap: spacing.md, alignItems: 'center', paddingBottom: spacing.xxl },

  hero: {
    width: 116, height: 116, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.md, marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  heroInitial: { fontSize: 44, fontWeight: '700' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  flag:    { fontSize: 28 },
  name:    { ...typography.title, textAlign: 'center', flexShrink: 1 },
  meta:    { ...typography.body },

  contactEmoji: { fontSize: 22 },
  contactKind:  { ...typography.micro },
  contactValue: { ...typography.body, marginTop: 2 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusText: { ...typography.bodyBold },
  statusHint: { ...typography.caption },

  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  tagText: { ...typography.caption, fontWeight: '600' },

  section: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionLabel: { ...typography.micro },
  sectionBody:  { ...typography.body, lineHeight: 22 },

  actions: { alignSelf: 'stretch', marginTop: spacing.sm, gap: spacing.sm },

  contactsCard: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  contactAvatar: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  contactInitial: { ...typography.bodyBold },
  contactName:    { ...typography.bodyBold },
  contactRole:    { ...typography.caption, marginTop: 2 },
  chev:           { fontSize: 24, marginLeft: spacing.sm },
});
