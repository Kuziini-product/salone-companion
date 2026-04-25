import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, radius, font, space } from '@/theme';
import type { VisitStatus } from '@/lib/mockStore';

const labels: Record<VisitStatus, string> = {
  not_visited: 'Not visited',
  visited: 'Visited',
  follow_up: 'Follow-up',
};

const colors: Record<VisitStatus, string> = {
  not_visited: palette.textMuted,
  visited: palette.success,
  follow_up: palette.followUp,
};

export function StatusPill({ status }: { status: VisitStatus }) {
  return (
    <View style={[styles.pill, { borderColor: colors[status] }]}>
      <View style={[styles.dot, { backgroundColor: colors[status] }]} />
      <Text style={[styles.text, { color: colors[status] }]}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { ...font.caption, fontWeight: '600' },
});
