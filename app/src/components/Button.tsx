// Friendly, big-tappable buttons. Variants by accent function color.

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme, accents, FunctionAccent, radius, typography } from '../theme';

interface Props {
  label:        string;
  onPress:      () => void;
  variant?:     'primary' | 'secondary' | 'ghost';
  accent?:      FunctionAccent | 'danger';
  loading?:     boolean;
  disabled?:    boolean;
  size?:        'md' | 'lg';
  icon?:        React.ReactNode;
  style?:       ViewStyle;
  fullWidth?:   boolean;
}

export function Button({
  label, onPress, variant = 'primary', accent = 'capture',
  loading, disabled, size = 'md', icon, style, fullWidth,
}: Props) {
  const { palette } = useTheme();

  const accentBase = accent === 'danger' ? palette.danger : accents[accent].base;
  const accentSoft = accent === 'danger'
    ? (palette.mode === 'dark' ? 'rgba(248, 113, 113, 0.15)' : '#FEE2E2')
    : accents[accent].soft;

  let bg: string, fg: string, borderColor: string;
  if (variant === 'primary') {
    bg = accentBase;
    fg = '#FFFFFF';
    borderColor = accentBase;
  } else if (variant === 'secondary') {
    bg = palette.mode === 'dark' ? palette.bgElevated : accentSoft;
    fg = accentBase;
    borderColor = palette.mode === 'dark' ? palette.border : accentSoft;
  } else {
    bg = 'transparent';
    fg = accentBase;
    borderColor = 'transparent';
  }

  if (disabled || loading) {
    bg = palette.mode === 'dark' ? palette.bgSubtle : palette.border;
    fg = palette.textFaint;
    borderColor = bg;
  }

  const heightStyle = size === 'lg' ? styles.lg : styles.md;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        heightStyle,
        { backgroundColor: bg, borderColor },
        fullWidth && { alignSelf: 'stretch' },
        pressed && !disabled && !loading && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
          <Text style={[styles.label, size === 'lg' && styles.labelLg, { color: fg }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { height: 48 },
  lg: { height: 56 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label:   { ...typography.bodyBold },
  labelLg: { ...typography.subheading },
});
