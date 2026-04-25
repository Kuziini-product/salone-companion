// ProfileScreen — minimal: shows email + sign out.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { useAuth } from '../lib/auth';

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
});
