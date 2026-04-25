// AuthScreen — magic-link sign-in.
// First screen any unauthenticated user sees. Friendly and bright.

import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { useAuth } from '../lib/auth';

export function AuthScreen() {
  const { palette } = useTheme();
  const { signInEmail } = useAuth();
  const [email, setEmail]     = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSending(true);
    const { error } = await signInEmail(email);
    setSending(false);
    if (error) setError(error);
    else setSent(true);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: accents.capture.soft }]}>
              <Text style={styles.heroEmoji}>🪑</Text>
            </View>
            <Text style={[styles.title, { color: palette.text }]}>Salone Companion</Text>
            <Text style={[styles.subtitle, { color: palette.textDim }]}>
              Capturează expozanți, cărți de vizită și note vocale în timp ce te plimbi prin Rho.
            </Text>
          </View>

          {/* Form */}
          {!sent ? (
            <View style={styles.form}>
              <Text style={[styles.label, { color: palette.textDim }]}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@example.com"
                placeholderTextColor={palette.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.bgElevated,
                    color: palette.text,
                    borderColor: error ? palette.danger : palette.border,
                  },
                ]}
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
              {error ? (
                <Text style={[styles.error, { color: palette.danger }]}>{error}</Text>
              ) : null}

              <Button
                label="Trimite link de autentificare"
                onPress={onSubmit}
                loading={sending}
                disabled={!email.trim()}
                accent="capture"
                size="lg"
                fullWidth
                style={{ marginTop: spacing.md }}
              />

              <Text style={[styles.hint, { color: palette.textFaint }]}>
                Îți trimitem un link pe email. Apeși pe el și ești autentificat.
                Fără parolă.
              </Text>
            </View>
          ) : (
            <View style={[styles.sentBox, { backgroundColor: accents.contacts.soft, borderColor: accents.contacts.base }]}>
              <Text style={styles.sentEmoji}>✉️</Text>
              <Text style={[styles.sentTitle, { color: accents.contacts.deep }]}>
                Verifică emailul
              </Text>
              <Text style={[styles.sentMessage, { color: accents.contacts.deep }]}>
                Ți-am trimis un link pe {email}. Apasă pe el ca să intri în aplicație.
              </Text>
              <Button
                label="Trimite alt link"
                onPress={() => { setSent(false); setEmail(''); }}
                variant="ghost"
                accent="contacts"
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  hero:   { alignItems: 'center', marginBottom: spacing.xxxl },
  heroIcon: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroEmoji: { fontSize: 40 },
  title:    { ...typography.display, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body, textAlign: 'center', lineHeight: 22, maxWidth: 320 },

  form: { gap: spacing.sm },
  label: { ...typography.micro, marginBottom: 6, marginLeft: 4 },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    ...typography.body,
  },
  error: { ...typography.caption, marginLeft: 4 },
  hint:  { ...typography.caption, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },

  sentBox: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  sentEmoji:   { fontSize: 48, marginBottom: spacing.md },
  sentTitle:   { ...typography.heading, marginBottom: spacing.sm },
  sentMessage: { ...typography.body, textAlign: 'center', lineHeight: 22 },
});
