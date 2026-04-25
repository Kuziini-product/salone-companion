// Friendly empty state — used on Contacts/Companies before the user has any data.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, spacing, typography } from '../theme';

interface Props {
  icon?:    React.ReactNode;
  title:    string;
  message?: string;
  action?:  React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: Props) {
  const { palette } = useTheme();
  return (
    <View style={styles.wrap}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: palette.textDim }]}>{message}</Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  icon:    { marginBottom: spacing.sm },
  title:   { ...typography.heading, textAlign: 'center' },
  message: { ...typography.body, textAlign: 'center', maxWidth: 320, lineHeight: 22 },
  action:  { marginTop: spacing.md },
});
