// Inline-labelled text field used on the contact preview/edit form.
// Designed so a row tapped from a list opens a fully editable view —
// no separate "edit mode" toggle, just always editable.

import React from 'react';
import { StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { useTheme, radius, typography } from '../theme';

interface Props {
  label:        string;
  value:        string | undefined;
  onChange:     (v: string) => void;
  placeholder?: string;
  multiline?:   boolean;
  keyboardType?:'default' | 'email-address' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  icon?:        React.ReactNode;
  style?:       ViewStyle;
}

export function Field({
  label, value, onChange, placeholder, multiline,
  keyboardType, autoCapitalize, icon, style,
}: Props) {
  const { palette } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: palette.bgElevated, borderColor: palette.border }, style]}>
      <View style={styles.labelRow}>
        {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
        <Text style={[styles.label, { color: palette.textDim }]}>{label.toUpperCase()}</Text>
      </View>
      <TextInput
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={palette.textFaint}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: palette.text },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  labelRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label:     { ...typography.micro },
  input:     { ...typography.body, padding: 0, minHeight: 24 },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
});
