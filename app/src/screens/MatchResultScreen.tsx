// MatchResultScreen — placeholder. Will call match-logo edge function in
// the next iteration when we wire the Stand mode.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';

type Params = { MatchResult: { previewUri: string; storagePath: string } };

export function MatchResultScreen() {
  const { palette } = useTheme();
  const nav = useNavigation();
  const route = useRoute<RouteProp<Params, 'MatchResult'>>();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['bottom']}>
      <View style={styles.content}>
        <Image source={{ uri: route.params.previewUri }} style={styles.image} resizeMode="cover" />
        <View style={[styles.banner, { backgroundColor: accents.capture.soft, borderColor: accents.capture.base }]}>
          <Text style={[styles.bannerText, { color: accents.capture.deep }]}>
            Recunoașterea logo-ului va fi disponibilă în următoarea versiune.
          </Text>
        </View>
        <Button label="Înapoi" accent="capture" onPress={() => nav.goBack()} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  image:   { width: '100%', aspectRatio: 1, borderRadius: radius.lg },
  banner:  {
    borderWidth: 1, borderRadius: radius.md,
    padding: spacing.lg,
  },
  bannerText: { ...typography.body, textAlign: 'center' },
});
