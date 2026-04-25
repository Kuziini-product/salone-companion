// BrandLogo
// Tries Clearbit's logo API first, falls back to Google's favicon service,
// finally to a colored letter avatar. Caller passes website + name + size.

import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { brandLogoUrl, faviconUrl } from '../lib/brandHelpers';

interface Props {
  website:    string | null | undefined;
  name:       string;
  size?:      number;
  background: string;   // for the fallback initial
  foreground: string;
  rounded?:   number;
}

export function BrandLogo({ website, name, size = 64, background, foreground, rounded }: Props) {
  const radius = rounded ?? size / 4;
  const initial = (name?.[0] ?? '?').toUpperCase();

  // Track which source we're trying.
  const [stage, setStage] = useState<'clearbit' | 'favicon' | 'fallback'>(
    website ? 'clearbit' : 'fallback',
  );

  // Reset when the website changes (e.g. switching company cards).
  useEffect(() => {
    setStage(website ? 'clearbit' : 'fallback');
  }, [website]);

  if (stage === 'fallback') {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius, backgroundColor: background },
        ]}
      >
        <Text style={[styles.initial, { color: foreground, fontSize: size * 0.42 }]}>
          {initial}
        </Text>
      </View>
    );
  }

  const uri =
    stage === 'clearbit'
      ? brandLogoUrl(website, size * 2)
      : faviconUrl(website, size * 2);

  if (!uri) {
    return null;
  }

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: radius, backgroundColor: '#FFFFFF' },
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="contain"
        onError={() => {
          if (stage === 'clearbit') setStage('favicon');
          else setStage('fallback');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial:  { fontWeight: '700' },
  frame:    { overflow: 'hidden' },
});
