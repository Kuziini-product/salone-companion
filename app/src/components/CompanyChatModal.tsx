// CompanyChatModal — bottom sheet chat scoped to one exhibitor.

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Send, X, Sparkles } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { supabase, functionUrl } from '../lib/supabase';

interface Message { role: 'user' | 'assistant'; content: string }

interface Props {
  visible:     boolean;
  onClose:     () => void;
  companyId:   string;
  companyName: string;
}

const QUICK_PROMPTS = [
  'Spune-mi pe scurt despre acest brand',
  'Care e portofoliul lor principal?',
  'Ce produse trebuie să caut la stand?',
  'Originea și anul fondării',
  'Cu ce alte mărci se aseamănă?',
];

export function CompanyChatModal({ visible, onClose, companyId, companyName }: Props) {
  const { palette } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [busy, setBusy]         = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Reset on open.
  useEffect(() => {
    if (visible) {
      setMessages([]);
      setInput('');
    }
  }, [visible, companyId]);

  async function send(promptText: string) {
    const text = promptText.trim();
    if (!text || busy) return;
    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesiunea a expirat');
      const r = await fetch(functionUrl('company-chat'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          prompt: text,
          history: messages,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
      const { reply } = await r.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Eroare: ${(e as Error).message}` },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { backgroundColor: palette.bg, borderColor: palette.border }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <View style={[styles.iconBubble, { backgroundColor: accents.profile.soft }]}>
              <Sparkles size={20} color={accents.profile.deep} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: palette.textFaint }]}>CHAT AI</Text>
              <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>{companyName}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Închide">
              <X size={22} color={palette.textDim} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.messages}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: palette.textDim }]}>
                  Întreabă orice despre acest brand. AI răspunde din catalogul oficial Salone.
                </Text>
                <Text style={[styles.emptyKicker, { color: palette.textFaint }]}>SUGESTII</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {QUICK_PROMPTS.map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => send(p)}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: accents.profile.soft },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: accents.profile.deep }]}>{p}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[
                styles.bubble,
                item.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: accents.profile.base }
                  : { alignSelf: 'flex-start', backgroundColor: palette.bgElevated, borderColor: palette.border, borderWidth: 1 },
              ]}>
                <Text style={[
                  styles.bubbleText,
                  { color: item.role === 'user' ? '#FFFFFF' : palette.text },
                ]}>
                  {item.content}
                </Text>
              </View>
            )}
          />

          {/* Input */}
          <View style={[styles.inputRow, { borderTopColor: palette.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Întreabă ceva…"
              placeholderTextColor={palette.textFaint}
              style={[styles.input, { color: palette.text, backgroundColor: palette.bgElevated, borderColor: palette.border }]}
              multiline
              onSubmitEditing={() => send(input)}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={busy || !input.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: accents.profile.base },
                (busy || !input.trim()) && { opacity: 0.4 },
                pressed && !busy && { opacity: 0.7 },
              ]}
            >
              {busy
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Send size={20} color="#FFFFFF" strokeWidth={2} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBubble: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  kicker:  { ...typography.micro },
  title:   { ...typography.heading },
  closeBtn:{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  messages: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  empty:    { gap: spacing.md, paddingTop: spacing.lg },
  emptyText:{ ...typography.body, textAlign: 'center', lineHeight: 22 },
  emptyKicker: { ...typography.micro, marginTop: spacing.lg, textAlign: 'center' },
  chipRow:  { gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  chip:     { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.pill },
  chipText: { ...typography.caption, fontWeight: '600' },

  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: 18,
    marginVertical: 4,
  },
  bubbleText: { ...typography.body, lineHeight: 22 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: spacing.md, gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10,
    borderRadius: radius.lg, borderWidth: 1,
    ...typography.body,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
});
