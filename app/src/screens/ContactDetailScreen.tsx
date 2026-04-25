import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput } from 'react-native';
import { palette, font, space, radius } from '@/theme';
import { Button } from '@/components/Button';
import { useStore } from '@/lib/mockStore';

export function ContactDetailScreen({ route }: any) {
  const { contactId } = route.params as { contactId: string };
  const contact = useStore((s) => s.contacts.find((c) => c.id === contactId));
  const updateContact = useStore((s) => s.updateContact);

  const [edit, setEdit] = useState({
    fullName: contact?.fullName ?? '',
    role: contact?.role ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
  });

  if (!contact) return <View style={styles.container} />;

  function save() {
    updateContact(contactId, edit);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: contact.cardUri }} style={styles.cardImage} resizeMode="cover" />

      <Field label="Name" value={edit.fullName} onChange={(v) => setEdit({ ...edit, fullName: v })} />
      <Field label="Role" value={edit.role} onChange={(v) => setEdit({ ...edit, role: v })} />
      <Field
        label="Email"
        value={edit.email}
        onChange={(v) => setEdit({ ...edit, email: v })}
        keyboardType="email-address"
      />
      <Field
        label="Phone"
        value={edit.phone}
        onChange={(v) => setEdit({ ...edit, phone: v })}
        keyboardType="phone-pad"
      />

      {contact.rawOcrText && (
        <View style={styles.raw}>
          <Text style={styles.rawHeader}>Raw OCR</Text>
          <Text style={styles.rawBody}>{contact.rawOcrText}</Text>
        </View>
      )}

      <Button label="Save" onPress={save} />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        placeholderTextColor={palette.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  cardImage: { width: '100%', aspectRatio: 1.586, borderRadius: radius.lg, backgroundColor: palette.bgElevated },
  field: { gap: 4 },
  fieldLabel: { ...font.caption, color: palette.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 48,
    backgroundColor: palette.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: palette.text,
    ...font.body,
    borderWidth: 1,
    borderColor: palette.border,
  },
  raw: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  rawHeader: { ...font.caption, color: palette.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  rawBody: { ...font.caption, color: palette.text, fontFamily: 'Courier', lineHeight: 18 },
});
