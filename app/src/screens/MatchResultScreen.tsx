import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { palette, font, space, radius, shadow } from '@/theme';
import { Button } from '@/components/Button';
import { useStore } from '@/lib/mockStore';

interface Match {
  company_id: string;
  name: string;
  confidence: number;
  reason: string;
}

export function MatchResultScreen({ route, navigation }: any) {
  const { imageUri, matches } = route.params as { imageUri: string; matches: Match[] };
  const setStatus = useStore((s) => s.setStatus);

  function confirm(companyId: string) {
    setStatus(companyId, 'visited');
    navigation.replace('CompanyCard', { companyId });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />

      <Text style={styles.header}>Top matches</Text>

      {matches.length === 0 ? (
        <Text style={styles.empty}>
          No confident matches found. You can pick from the list.
        </Text>
      ) : (
        matches.map((m) => (
          <Pressable key={m.company_id} style={styles.matchCard} onPress={() => confirm(m.company_id)}>
            <View style={styles.matchHeader}>
              <Text style={styles.matchName}>{m.name}</Text>
              <Text style={styles.matchConfidence}>{Math.round(m.confidence * 100)}%</Text>
            </View>
            <Text style={styles.matchReason}>{m.reason}</Text>
          </Pressable>
        ))
      )}

      <Button
        label="None of these — pick from list"
        variant="secondary"
        onPress={() => navigation.navigate('Main', { screen: 'Companies' })}
        style={{ marginTop: space.lg }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: palette.bgElevated },
  header: { ...font.title, color: palette.text, marginTop: space.md },
  empty: { ...font.body, color: palette.textDim, marginVertical: space.lg },
  matchCard: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
    ...shadow.card,
  },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchName: { ...font.title, color: palette.text },
  matchConfidence: { ...font.caption, color: palette.accent, fontWeight: '600' },
  matchReason: { ...font.caption, color: palette.textDim, lineHeight: 18 },
});
