// MatchResultScreen — shows ranked exhibitor candidates returned by the
// match-logo edge function. User taps one to open the Company Card.

import React from 'react';
import {
  Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { BrandLogo } from '../components/BrandLogo';
import type { LogoMatch } from '../lib/imageSearch';

type Params = {
  MatchResult: {
    previewUri:  string;
    storagePath: string;
    matches?:    LogoMatch[];
    kind?:       'brand' | 'product';
    guess?: {
      brand_text?:       string;
      guess_names?:      string[];
      product_kind?:     string;
      product_keywords?: string[];
    };
  };
};

export function MatchResultScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void; goBack: () => void }>();
  const route = useRoute<RouteProp<Params, 'MatchResult'>>();
  const { previewUri, matches = [], kind, guess } = route.params;

  // What did the AI think it saw?
  const aiSawParts: string[] = [];
  if (guess?.brand_text)     aiSawParts.push(`brand "${guess.brand_text}"`);
  if (guess?.guess_names?.length) aiSawParts.push(`posibil ${guess.guess_names.slice(0, 2).join(' / ')}`);
  if (guess?.product_kind)   aiSawParts.push(`produs: ${guess.product_kind}`);
  else if (guess?.product_keywords?.length) aiSawParts.push(`produs: ${guess.product_keywords.slice(0, 4).join(', ')}`);
  const aiSaw = aiSawParts.join(' · ');

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />

        {aiSaw ? (
          <View style={[styles.aiSawBox, { backgroundColor: accents.profile.soft, borderColor: accents.profile.base }]}>
            <Text style={[styles.aiSawKicker, { color: accents.profile.deep }]}>
              {kind === 'product' ? 'AI a identificat un PRODUS' : 'AI A VĂZUT'}
            </Text>
            <Text style={[styles.aiSawText, { color: accents.profile.deep }]}>{aiSaw}</Text>
          </View>
        ) : null}

        {matches.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: palette.bgElevated, borderColor: palette.border }]}>
            <Search size={36} color={palette.textDim} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              Niciun rezultat
            </Text>
            <Text style={[styles.emptyMessage, { color: palette.textDim }]}>
              Nu am identificat un brand din catalogul Salone. Încearcă o poză
              mai aproape de logo, sau caută manual din lista Toți.
            </Text>
            <Button
              label="Caută manual"
              accent="companies"
              onPress={() => nav.navigate('Main', { screen: 'Companies' })}
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          <>
            <Text style={[styles.kicker, { color: palette.textFaint }]}>
              {matches.length === 1 ? 'POTRIVIRE' : 'POTRIVIRI'}
            </Text>
            <Text style={[styles.title, { color: palette.text }]}>
              Rezultate
            </Text>
            {matches.map((m) => {
              const conf = Math.round(m.confidence * 100);
              return (
                <Pressable
                  key={m.company_id}
                  onPress={() => nav.navigate('CompanyCard', { companyId: m.company_id })}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: palette.bgElevated, borderColor: palette.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <BrandLogo
                    website={null}
                    name={m.name}
                    size={48}
                    background={accents.companies.soft}
                    foreground={accents.companies.deep}
                    rounded={radius.md}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                      {m.name}
                    </Text>
                    {(m.hall || m.stand) ? (
                      <Text style={[styles.meta, { color: palette.textDim }]} numberOfLines={1}>
                        Hall {[m.hall, m.stand].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {m.reason ? (
                      <Text style={[styles.reason, { color: palette.textFaint }]} numberOfLines={2}>
                        {m.reason}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.confPill, { backgroundColor: accents.capture.soft }]}>
                    <Text style={[styles.confText, { color: accents.capture.deep }]}>
                      {conf}%
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  preview: {
    width: '100%', aspectRatio: 1.4, borderRadius: radius.xl,
    backgroundColor: '#000',
  },

  aiSawBox: {
    borderRadius: radius.lg, borderWidth: 1.5,
    padding: spacing.md, gap: 4,
  },
  aiSawKicker: { ...typography.micro },
  aiSawText:   { ...typography.body, fontWeight: '600' },

  kicker: { ...typography.micro, marginTop: spacing.md },
  title:  { ...typography.title, marginBottom: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  name:   { ...typography.bodyBold },
  meta:   { ...typography.caption, marginTop: 2 },
  reason: { ...typography.caption, marginTop: 4, fontStyle: 'italic' },
  confPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  confText: { ...typography.caption, fontWeight: '700' },

  empty: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle:   { ...typography.heading },
  emptyMessage: { ...typography.body, textAlign: 'center', lineHeight: 22 },
});
