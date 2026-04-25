// ProfileScreen — email, scan card (camera + gallery), export, sign out.

import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Camera, ImagePlus, LogOut } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { useAuth } from '../lib/auth';
import { pickImageWeb } from '../lib/pickImage';
import { scanCard } from '../lib/scanCard';

const KUZIINI_LOGO = require('../../assets/kuziini-logo.png');

export function ProfileScreen() {
  const { palette } = useTheme();
  const { session, signOut } = useAuth();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const email = session?.user.email ?? '—';
  const [busy, setBusy] = useState<'camera' | 'gallery' | null>(null);

  async function scan(source: 'camera' | 'gallery') {
    if (busy) return;
    const uri = await pickImageWeb(source);
    if (!uri) return;
    setBusy(source);
    try {
      const result = await scanCard(uri);
      nav.navigate('ContactDetail', {
        previewUri:  result.publicPreview,
        storagePath: result.storagePath,
        parsed:      result.parsed,
        isNew:       true,
      });
    } catch (e) {
      Alert.alert('Scan eșuat', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: accents.profile.soft }]}>
            <Text style={[styles.avatarText, { color: accents.profile.deep }]}>
              {email[0].toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
            {email}
          </Text>
        </View>

        {/* Scan card — two big buttons (camera + gallery) like the search row */}
        <Text style={[styles.label, { color: palette.textDim }]}>SCANEAZĂ CARTE VIZITĂ</Text>
        <View style={styles.scanRow}>
          <Pressable
            style={({ pressed }) => [
              styles.scanBtn,
              { backgroundColor: accents.capture.base },
              pressed && !busy && { opacity: 0.85 },
              busy && { opacity: 0.5 },
            ]}
            disabled={!!busy}
            onPress={() => scan('camera')}
          >
            {busy === 'camera' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Camera size={22} color="#FFFFFF" strokeWidth={2} />
            )}
            <Text style={styles.scanBtnText}>Cu camera</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.scanBtn,
              { backgroundColor: accents.companies.base },
              pressed && !busy && { opacity: 0.85 },
              busy && { opacity: 0.5 },
            ]}
            disabled={!!busy}
            onPress={() => scan('gallery')}
          >
            {busy === 'gallery' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ImagePlus size={22} color="#FFFFFF" strokeWidth={2} />
            )}
            <Text style={styles.scanBtnText}>Din galerie</Text>
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: palette.textFaint }]}>
          AI extrage automat numele, funcția, email, telefon și încearcă să găsească compania în catalog.
        </Text>

        <View style={[styles.card, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textDim }]}>SINCRONIZARE</Text>
          <Text style={[styles.cardBody, { color: palette.text }]}>
            Datele tale (vizite, contacte, note vocale) sunt salvate în cloud.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textDim }]}>EXPORT</Text>
          <Text style={[styles.cardBody, { color: palette.text }]}>
            Toate vizitele se pot descărca ca CSV sau JSON din endpoint-ul /export.
          </Text>
        </View>

        <Button
          label="Deconectare"
          icon={<LogOut size={16} color={accents.companies.deep} strokeWidth={2} />}
          accent="danger"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={signOut}
          style={{ marginTop: spacing.lg }}
        />

        <View style={styles.brandFooter}>
          <Image
            source={KUZIINI_LOGO}
            style={[styles.brandLogo, { tintColor: palette.textDim }]}
            resizeMode="contain"
            accessibilityLabel="Powered by Kuziini"
          />
          <Text style={[styles.brandFooterText, { color: palette.textFaint }]}>
            powered by Kuziini
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  header:  { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  avatar:  {
    width: 80, height: 80, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700' },
  name:       { ...typography.heading },
  label:      { ...typography.micro, marginTop: spacing.md },

  scanRow:  { flexDirection: 'row', gap: spacing.sm },
  scanBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: radius.lg, gap: spacing.sm,
  },
  scanBtnText: { color: '#FFFFFF', ...typography.bodyBold },
  hint:        { ...typography.caption, lineHeight: 18 },

  card: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.lg, gap: spacing.sm,
  },
  cardTitle: { ...typography.micro },
  cardBody:  { ...typography.body, lineHeight: 22 },

  brandFooter: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: 4, opacity: 0.7,
  },
  brandLogo:       { width: 120, height: 36 },
  brandFooterText: { ...typography.micro, letterSpacing: 1.5 },
});
