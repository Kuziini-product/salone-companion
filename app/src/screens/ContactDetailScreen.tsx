// ContactDetailScreen
// View / edit a saved business card. Highlights:
//   - "Vezi expozant" button when linked
//   - Inline picker to (re)assign or add brands
//   - Toggle "Este agent" → can attach multiple brands

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowRight, Plus, X, UserCog } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { CompanyPicker } from '../components/CompanyPicker';
import { ParsedCard, saveContact, getCardSignedUrl, matchCompanyByName } from '../lib/scanCard';
import { supabase } from '../lib/supabase';

type Params = {
  ContactDetail: {
    contactId?:  string;
    previewUri?: string;
    storagePath?:string;
    parsed?:     ParsedCard;
    isNew?:      boolean;
  };
};

interface LinkedCompany {
  id: string; name: string; hall: string | null; stand: string | null;
}

export function ContactDetailScreen() {
  const { palette } = useTheme();
  const nav   = useNavigation<{ navigate: (s: string, p?: object) => void; goBack: () => void }>();
  const route = useRoute<RouteProp<Params, 'ContactDetail'>>();
  const params = route.params ?? {};

  const [loading, setLoading] = useState(!params.isNew && !!params.contactId);
  const [saving, setSaving]   = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(params.previewUri ?? null);
  const [storagePath, setStoragePath] = useState<string | null>(params.storagePath ?? null);
  const [contactId, setContactId]     = useState<string | null>(params.contactId ?? null);

  // Editable fields
  const [fullName, setFullName]       = useState(params.parsed?.full_name ?? '');
  const [role, setRole]               = useState(params.parsed?.role ?? '');
  const [email, setEmail]             = useState(params.parsed?.email ?? '');
  const [phone, setPhone]             = useState(params.parsed?.phone ?? '');
  const [companyName, setCompanyName] = useState(params.parsed?.company_name ?? '');
  const [website, setWebsite]         = useState(params.parsed?.website ?? '');
  const [address, setAddress]         = useState(params.parsed?.address ?? '');

  // Companies linked to this contact (primary + extras for agents).
  const [primaryId, setPrimaryId]   = useState<string | null>(null);
  const [linked, setLinked]         = useState<LinkedCompany[]>([]);
  const [isAgent, setIsAgent]       = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'primary' | 'extra'>('primary');

  // Suggested match for new scans (for the confirmation chip).
  const [suggested, setSuggested]     = useState<LinkedCompany | null>(null);
  const [suggestPending, setPending]  = useState(false);

  // ----- Load existing or auto-suggest match for new -----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!params.isNew && params.contactId) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*, contact_companies(company_id, is_primary, companies(id, name, hall, stand))')
          .eq('id', params.contactId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          Alert.alert('Eroare', 'Nu am putut încărca contactul');
          nav.goBack();
          return;
        }
        setFullName(data.full_name ?? '');
        setRole(data.role ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
        setCompanyName(data.company_name ?? '');
        setWebsite(data.website ?? '');
        setAddress(data.address ?? '');
        setStoragePath(data.card_image_path ?? null);
        setIsAgent(!!data.is_agent);
        setPrimaryId(data.company_id ?? null);
        const cc = (data.contact_companies as any[] | null) ?? [];
        setLinked(cc.map((r) => r.companies as LinkedCompany).filter(Boolean));
        if (data.card_image_path) {
          const url = await getCardSignedUrl(data.card_image_path);
          if (!cancelled) setImageUrl(url);
        }
        setLoading(false);
      } else if (params.isNew && params.parsed?.company_name) {
        // Pre-suggest a match so user can confirm before save.
        setPending(true);
        const id = await matchCompanyByName(params.parsed.company_name);
        if (cancelled) return;
        if (id) {
          const { data: co } = await supabase
            .from('companies').select('id, name, hall, stand').eq('id', id).maybeSingle();
          setSuggested(co as LinkedCompany | null);
          setPrimaryId(id);
        }
        setPending(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.contactId, params.isNew]);

  function refreshLinkedFromPrimary() {
    if (!primaryId) return;
    supabase.from('companies').select('id, name, hall, stand').eq('id', primaryId).maybeSingle()
      .then(({ data }) => { if (data) setLinked([data as LinkedCompany]); });
  }

  const onPickCompany = useCallback(async (co: LinkedCompany) => {
    setPickerOpen(false);
    if (pickerMode === 'primary') {
      setPrimaryId(co.id);
      setSuggested(co);
      setCompanyName(co.name);
      // If agent and we have a contactId, also save the link.
      if (contactId && isAgent) {
        await supabase.from('contact_companies').upsert(
          { contact_id: contactId, company_id: co.id, is_primary: true },
          { onConflict: 'contact_id,company_id' },
        );
      }
      setLinked((prev) => prev.find((c) => c.id === co.id) ? prev : [co, ...prev]);
    } else {
      // extra brand for agent
      if (linked.find((c) => c.id === co.id)) return;
      setLinked((prev) => [...prev, co]);
      if (contactId && isAgent) {
        await supabase.from('contact_companies').upsert(
          { contact_id: contactId, company_id: co.id, is_primary: false },
          { onConflict: 'contact_id,company_id' },
        );
      }
    }
  }, [pickerMode, contactId, isAgent, linked]);

  async function removeBrand(id: string) {
    setLinked((prev) => prev.filter((c) => c.id !== id));
    if (contactId) {
      await supabase.from('contact_companies').delete()
        .eq('contact_id', contactId).eq('company_id', id);
      if (id === primaryId) {
        setPrimaryId(null);
        await supabase.from('contacts').update({ company_id: null }).eq('id', contactId);
      }
    }
  }

  async function toggleAgent(next: boolean) {
    setIsAgent(next);
    if (contactId) {
      await supabase.from('contacts').update({ is_agent: next }).eq('id', contactId);
    }
  }

  const onSave = async () => {
    if (!storagePath) {
      Alert.alert('Eroare', 'Lipsește poza cărții de vizită');
      return;
    }
    setSaving(true);
    try {
      const parsed: ParsedCard = {
        full_name: fullName || undefined, role: role || undefined,
        email: email || undefined, phone: phone || undefined,
        company_name: companyName || undefined,
        website: website || undefined, address: address || undefined,
      };
      let id = contactId;
      if (id) {
        const { error } = await supabase.from('contacts').update({
          ...parsed, company_id: primaryId, is_agent: isAgent,
        }).eq('id', id);
        if (error) throw new Error(error.message);
      } else {
        const result = await saveContact({ parsed, storagePath, companyId: primaryId ?? undefined });
        id = result.id;
        setContactId(id);
        if (isAgent) {
          await supabase.from('contacts').update({ is_agent: true }).eq('id', id);
        }
      }

      // Sync contact_companies for agents.
      if (isAgent && id) {
        const rows = linked.map((c) => ({
          contact_id: id, company_id: c.id, is_primary: c.id === primaryId,
        }));
        if (rows.length > 0) {
          await supabase.from('contact_companies').upsert(rows, { onConflict: 'contact_id,company_id' });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      nav.goBack();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Eroare la salvare', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={accents.contacts.base} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Photo preview */}
          {imageUrl ? (
            <View style={[styles.photoWrap, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
              <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
            </View>
          ) : null}

          {/* Suggested match — prompt user to confirm before save */}
          {params.isNew && suggested ? (
            <View style={[styles.matchBox, { backgroundColor: accents.companies.soft, borderColor: accents.companies.base }]}>
              <Text style={[styles.matchKicker, { color: accents.companies.deep }]}>POTRIVIRE GĂSITĂ</Text>
              <Text style={[styles.matchName, { color: accents.companies.deep }]} numberOfLines={1}>
                {suggested.name}
              </Text>
              {(suggested.hall || suggested.stand) ? (
                <Text style={[styles.matchMeta, { color: accents.companies.deep }]}>
                  Hall {[suggested.hall, suggested.stand].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              <Pressable
                onPress={() => { setPickerMode('primary'); setPickerOpen(true); }}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.matchAction, { color: accents.companies.deep }]}>
                  Schimbă →
                </Text>
              </Pressable>
            </View>
          ) : null}

          {params.isNew && !suggested && !suggestPending ? (
            <Button
              label="Asociază manual cu un expozant"
              icon={<Plus size={16} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => { setPickerMode('primary'); setPickerOpen(true); }}
              accent="companies"
              variant="primary"
              fullWidth
              style={{ marginBottom: spacing.md }}
            />
          ) : null}

          {/* "Vezi expozant" — when contact is linked, jump to brand card */}
          {!params.isNew && primaryId ? (
            <Button
              label="Vezi expozant"
              icon={<ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => nav.navigate('CompanyCard', { companyId: primaryId })}
              accent="companies"
              variant="primary"
              fullWidth
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          {!params.isNew && !primaryId ? (
            <Button
              label="Asociază cu un expozant"
              icon={<Plus size={16} color={accents.companies.deep} strokeWidth={2} />}
              onPress={() => { setPickerMode('primary'); setPickerOpen(true); }}
              accent="companies"
              variant="secondary"
              fullWidth
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          {/* Agent toggle */}
          <View style={[styles.agentRow, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <UserCog size={20} color={accents.profile.deep} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.agentTitle, { color: palette.text }]}>Este agent</Text>
              <Text style={[styles.agentSub, { color: palette.textDim }]}>
                Reprezintă mai multe brand-uri
              </Text>
            </View>
            <Switch
              value={isAgent} onValueChange={toggleAgent}
              trackColor={{ true: accents.profile.base, false: palette.border }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Brand chips when agent */}
          {isAgent ? (
            <View style={[styles.brandsBox, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
              <Text style={[styles.section, { color: accents.profile.base }]}>BRANDURI ({linked.length})</Text>
              <View style={styles.chipsWrap}>
                {linked.map((c) => (
                  <View key={c.id} style={[styles.chip, { backgroundColor: accents.companies.soft }]}>
                    <Pressable onPress={() => nav.navigate('CompanyCard', { companyId: c.id })}>
                      <Text style={[styles.chipText, { color: accents.companies.deep }]}>
                        {c.name}{c.id === primaryId ? ' ★' : ''}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => removeBrand(c.id)} style={styles.chipRemove}>
                      <X size={12} color={accents.companies.deep} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={() => { setPickerMode('extra'); setPickerOpen(true); }}
                  style={[styles.chip, { backgroundColor: palette.bgSubtle, flexDirection: 'row', gap: 4 }]}
                >
                  <Plus size={12} color={palette.textDim} strokeWidth={2} />
                  <Text style={[styles.chipText, { color: palette.textDim }]}>Adaugă brand</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Editable fields */}
          <Text style={[styles.section, { color: accents.contacts.base }]}>PERSOANĂ</Text>
          <Field label="Nume" value={fullName} onChange={setFullName} placeholder="Nume Prenume" autoCapitalize="words" />
          <Field label="Funcție" value={role} onChange={setRole} placeholder="ex: Sales Manager" autoCapitalize="words" />

          <Text style={[styles.section, { color: accents.contacts.base, marginTop: spacing.lg }]}>CONTACT</Text>
          <Field label="Email" value={email} onChange={setEmail} placeholder="email@firma.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Telefon" value={phone} onChange={setPhone} placeholder="+39 ..." keyboardType="phone-pad" />
          <Field label="Website" value={website} onChange={setWebsite} placeholder="firma.com" keyboardType="url" autoCapitalize="none" />

          <Text style={[styles.section, { color: accents.contacts.base, marginTop: spacing.lg }]}>FIRMĂ</Text>
          <Field label="Nume firmă" value={companyName} onChange={setCompanyName} placeholder="ex: Cassina" autoCapitalize="words" />
          <Field label="Adresă" value={address} onChange={setAddress} placeholder="Stradă, oraș, țară" multiline />
        </ScrollView>

        <View style={[styles.saveBar, { backgroundColor: palette.bg, borderTopColor: palette.border }]}>
          <Button
            label={contactId ? 'Salvează modificările' : 'Salvează contactul'}
            onPress={onSave} loading={saving}
            accent="contacts" size="lg" fullWidth
          />
        </View>

        <CompanyPicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={onPickCompany}
          initialQuery={companyName}
          selectedIds={linked.map((c) => c.id)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },

  photoWrap: {
    borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden',
    marginBottom: spacing.md, aspectRatio: 1.7,
  },
  photo: { width: '100%', height: '100%' },

  matchBox: {
    borderRadius: radius.lg, borderWidth: 1.5,
    padding: spacing.md, gap: 4, marginBottom: spacing.md,
  },
  matchKicker: { ...typography.micro },
  matchName:   { ...typography.heading },
  matchMeta:   { ...typography.caption, opacity: 0.85 },
  matchAction: { ...typography.caption, fontWeight: '700', marginTop: spacing.xs },

  agentRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1,
    gap: spacing.md,
  },
  agentTitle: { ...typography.bodyBold },
  agentSub:   { ...typography.caption, marginTop: 2 },

  brandsBox: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, gap: spacing.sm, marginTop: spacing.sm,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.pill, gap: 6,
  },
  chipText:   { ...typography.caption, fontWeight: '600' },
  chipRemove: { padding: 2 },

  section: { ...typography.micro, marginLeft: 4, marginTop: spacing.sm, marginBottom: 4 },

  saveBar: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
