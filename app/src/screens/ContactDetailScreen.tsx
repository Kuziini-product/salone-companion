// ContactDetailScreen
// Two modes:
//   1. isNew=true: preview after a fresh scan. Shows the local photo + editable
//      fields parsed by the OCR. User reviews/edits → big Save button.
//   2. isNew=false (or undefined): viewing an existing saved contact. Pulls
//      the row + signed image URL from Supabase. Edit & re-save.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { ParsedCard, saveContact, getCardSignedUrl } from '../lib/scanCard';
import { supabase } from '../lib/supabase';

type Params = {
  ContactDetail: {
    contactId?:  string;          // when viewing an existing contact
    previewUri?: string;          // local file:// for fresh scans
    storagePath?:string;          // remote path (always set on save)
    parsed?:     ParsedCard;
    isNew?:      boolean;
  };
};

export function ContactDetailScreen() {
  const { palette } = useTheme();
  const nav   = useNavigation();
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

  // ----- Existing-contact load --------------------------------------------
  useEffect(() => {
    if (params.isNew || !params.contactId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
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
      if (data.card_image_path) {
        const url = await getCardSignedUrl(data.card_image_path);
        if (!cancelled) setImageUrl(url);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [params.contactId, params.isNew]);

  // ----- Save --------------------------------------------------------------
  const onSave = async () => {
    if (!storagePath) {
      Alert.alert('Eroare', 'Lipsește poza cărții de vizită');
      return;
    }
    setSaving(true);
    try {
      const parsed: ParsedCard = {
        full_name:    fullName    || undefined,
        role:         role        || undefined,
        email:        email       || undefined,
        phone:        phone       || undefined,
        company_name: companyName || undefined,
        website:      website     || undefined,
        address:      address     || undefined,
      };
      if (contactId) {
        // Update existing
        const { error } = await supabase
          .from('contacts')
          .update(parsed)
          .eq('id', contactId);
        if (error) throw new Error(error.message);
      } else {
        // Insert new
        const { id } = await saveContact({ parsed, storagePath });
        setContactId(id);
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

  const confidence = params.parsed?.confidence;
  const confidenceLabel =
    confidence === undefined ? null
    : confidence > 0.85 ? { text: 'Calitate bună', color: accents.contacts.base }
    : confidence > 0.5  ? { text: 'Verifică câmpurile', color: '#F59E0B' }
    :                     { text: 'Calitate slabă — verifică tot', color: palette.danger };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo preview */}
          {imageUrl ? (
            <View style={[styles.photoWrap, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
              <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
            </View>
          ) : null}

          {confidenceLabel ? (
            <View style={[styles.banner, { backgroundColor: palette.bgElevated, borderColor: confidenceLabel.color }]}>
              <View style={[styles.bannerDot, { backgroundColor: confidenceLabel.color }]} />
              <Text style={[styles.bannerText, { color: palette.text }]}>
                {confidenceLabel.text}
              </Text>
            </View>
          ) : null}

          {/* Section header */}
          <Text style={[styles.section, { color: accents.contacts.base }]}>PERSOANĂ</Text>

          <Field label="Nume" value={fullName} onChange={setFullName} placeholder="Nume Prenume" autoCapitalize="words" />
          <Field label="Funcție" value={role} onChange={setRole} placeholder="ex: Sales Manager" autoCapitalize="words" />

          <Text style={[styles.section, { color: accents.contacts.base, marginTop: spacing.lg }]}>CONTACT</Text>

          <Field label="Email" value={email} onChange={setEmail} placeholder="email@firma.com"
                 keyboardType="email-address" autoCapitalize="none" />
          <Field label="Telefon" value={phone} onChange={setPhone} placeholder="+39 ..."
                 keyboardType="phone-pad" />
          <Field label="Website" value={website} onChange={setWebsite} placeholder="firma.com"
                 keyboardType="url" autoCapitalize="none" />

          <Text style={[styles.section, { color: accents.contacts.base, marginTop: spacing.lg }]}>FIRMĂ</Text>

          <Field label="Nume firmă" value={companyName} onChange={setCompanyName} placeholder="ex: Cassina" autoCapitalize="words" />
          <Field label="Adresă" value={address} onChange={setAddress} placeholder="Stradă, oraș, țară"
                 multiline />
        </ScrollView>

        {/* Save bar pinned to bottom */}
        <View style={[styles.saveBar, { backgroundColor: palette.bg, borderTopColor: palette.border }]}>
          <Button
            label={contactId ? 'Salvează modificările' : 'Salvează contactul'}
            onPress={onSave}
            loading={saving}
            accent="contacts"
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },

  photoWrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
    aspectRatio: 1.7,
  },
  photo: { width: '100%', height: '100%' },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  bannerDot:  { width: 8, height: 8, borderRadius: 4 },
  bannerText: { ...typography.caption },

  section: { ...typography.micro, marginLeft: 4, marginTop: spacing.sm, marginBottom: 4 },

  saveBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
