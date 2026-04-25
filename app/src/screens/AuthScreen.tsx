// AuthScreen — magic-link sign-in.
// First screen any unauthenticated user sees. Friendly and bright.

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

const KUZIINI_LOGO = require('../../assets/kuziini-logo.png');

export function AuthScreen() {
  const { palette } = useTheme();
  const { signInEmail } = useAuth();
  const [email, setEmail]       = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSending(true);
    const { error } = await signInEmail(email);
    setSending(false);
    if (error) setError(error);
    else setSent(true);
  };

  // While we're on the "sent" screen, poll the session every 2s. The moment
  // the user confirms in the other tab/device, supabase-js writes to
  // localStorage and AuthProvider's onAuthStateChange takes over — but if
  // the storage event doesn't fire (some webviews), this poll forces a
  // refresh so the screen advances anyway.
  useEffect(() => {
    if (!sent) return;
    const id = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) clearInterval(id);
    }, 2000);
    return () => clearInterval(id);
  }, [sent]);

  const onCheckNow = async () => {
    setChecking(true);
    const { data } = await supabase.auth.getSession();
    setChecking(false);
    if (!data.session) {
      Alert.alert(
        'Încă nu',
        'Nu am găsit nicio sesiune. Asigură-te că ai apăsat link-ul din email și apoi încearcă din nou.',
      );
    }
    // If session exists, AuthProvider will re-render automatically.
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
            <Image
              source={KUZIINI_LOGO}
              style={[
                styles.brandLogo,
                // Logo is solid black; tint to white in dark mode for contrast.
                palette.mode === 'dark' && { tintColor: palette.text },
              ]}
              resizeMode="contain"
              accessibilityLabel="Kuziini Furniture & More"
            />
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
                Ți-am trimis un link pe {email}. Apasă pe link, apoi revino aici —
                pagina se va actualiza automat când confirmi.
              </Text>

              <Button
                label="Am confirmat, intră"
                onPress={onCheckNow}
                loading={checking}
                accent="contacts"
                size="lg"
                fullWidth
                style={{ marginTop: spacing.lg }}
              />

              <Button
                label="Trimite alt link"
                onPress={() => { setSent(false); setEmail(''); }}
                variant="ghost"
                accent="contacts"
                style={{ marginTop: spacing.sm }}
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
  brandLogo: {
    width: 240,
    height: 72,
    marginBottom: spacing.xl,
  },
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
