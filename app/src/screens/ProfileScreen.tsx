// ProfileScreen — minimal: shows email + sign out.

import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { useAuth } from '../lib/auth';

const KUZIINI_LOGO = require('../../assets/kuziini-logo.png');

export function ProfileScreen() {
  const { palette } = useTheme();
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? '—';

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

        <View style={[styles.card, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textDim }]}>SINCRONIZARE</Text>
          <Text style={[styles.cardBody, { color: palette.text }]}>
            Datele tale (vizite, contacte, note vocale) sunt salvate în cloud.
            Pe viitor vor fi disponibile și offline.
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
            style={[
              styles.brandLogo,
              palette.mode === 'dark' && { tintColor: palette.textDim },
              palette.mode === 'light' && { tintColor: palette.textDim },
            ]}
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

  card: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.lg, gap: spacing.sm,
  },
  cardTitle: { ...typography.micro },
  cardBody:  { ...typography.body, lineHeight: 22 },

  brandFooter: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: 4,
    opacity: 0.7,
  },
  brandLogo: { width: 120, height: 36 },
  brandFooterText: { ...typography.micro, letterSpacing: 1.5 },
});
