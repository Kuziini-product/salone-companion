// CaptureScreen
// Full-screen camera with a mode toggle (Stand vs Card) and a single big
// shutter button. Haptic feedback on press. After capture:
//   - Stand mode → goes to MatchResult (TODO when match-logo is wired)
//   - Card mode  → calls scanCard() and goes to ContactDetail with preview

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, accents, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { scanCard } from '../lib/scanCard';

type Mode   = 'stand' | 'card';
type Facing = 'back' | 'front';

type Nav = NativeStackNavigationProp<{
  ContactDetail: { previewUri: string; storagePath: string; parsed: unknown; isNew: true };
  MatchResult:   { previewUri: string; storagePath: string };
}>;

export function CaptureScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<Nav>();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode]     = useState<Mode>('card');   // start in card mode — top use case
  const [facing, setFacing] = useState<Facing>('back'); // back camera by default
  const [busy, setBusy]     = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const flipFacing = () => {
    Haptics.selectionAsync();
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  };

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const accent = mode === 'card' ? accents.contacts : accents.capture;

  const onShutter = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo) throw new Error('Nu am putut face poza');

      if (mode === 'card') {
        // Run the OCR pipeline; show a spinner while waiting.
        const result = await scanCard(photo.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        nav.navigate('ContactDetail', {
          previewUri:  result.publicPreview,
          storagePath: result.storagePath,
          parsed:      result.parsed,
          isNew:       true,
        });
      } else {
        // Stand mode: TODO wire match-logo. For now, simply hand off the
        // photo so the next screen can show the match candidates.
        nav.navigate('MatchResult', {
          previewUri:  photo.uri,
          storagePath: photo.uri,
        });
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Eroare', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={['top']}>
        <View style={styles.center}>
          <Text style={[styles.permTitle, { color: palette.text }]}>Acces la cameră</Text>
          <Text style={[styles.permMessage, { color: palette.textDim }]}>
            Avem nevoie de permisiune pentru a fotografia standuri și cărți de vizită.
          </Text>
          <Button
            label="Permite accesul"
            onPress={requestPermission}
            accent="capture"
            size="lg"
            style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      {/* key={facing} forces a remount on toggle: required on web because
          expo-camera does not re-request getUserMedia when facing changes. */}
      <CameraView
        key={facing}
        ref={cameraRef}
        style={styles.flex}
        facing={facing}
      />

      {/* Top: mode segmented control + flip-camera button */}
      <SafeAreaView style={styles.topOverlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topRow}>
          <View style={styles.modeSegment}>
            <ModeButton
              label="Stand"
              emoji="📸"
              active={mode === 'stand'}
              onPress={() => { setMode('stand'); Haptics.selectionAsync(); }}
              activeColor={accents.capture.base}
            />
            <ModeButton
              label="Carte vizită"
              emoji="💼"
              active={mode === 'card'}
              onPress={() => { setMode('card'); Haptics.selectionAsync(); }}
              activeColor={accents.contacts.base}
            />
          </View>

          <Pressable
            onPress={flipFacing}
            style={({ pressed }) => [
              styles.flipBtn,
              pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
            ]}
            accessibilityLabel={facing === 'back' ? 'Comută la camera frontală' : 'Comută la camera spate'}
          >
            <Text style={styles.flipEmoji}>🔄</Text>
            <Text style={styles.flipLabel}>{facing === 'back' ? 'Spate' : 'Față'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Center: framing guide */}
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={[
          styles.frame,
          mode === 'card' ? styles.frameCard : styles.frameStand,
          { borderColor: accent.base },
        ]}>
          <Text style={[styles.frameHint, { color: '#FFFFFF' }]}>
            {mode === 'card'
              ? 'Aliniază cartea de vizită în chenar'
              : 'Centrează standul sau logo-ul'}
          </Text>
        </View>
      </View>

      {/* Bottom: shutter */}
      <SafeAreaView style={styles.bottomOverlay} edges={['bottom']}>
        <Pressable
          onPress={onShutter}
          disabled={busy}
          style={({ pressed }) => [
            styles.shutter,
            { borderColor: accent.base },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <View style={[styles.shutterInner, { backgroundColor: accent.base }]}>
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : null}
          </View>
        </Pressable>
        <Text style={styles.bottomHint}>
          {busy
            ? (mode === 'card' ? 'Citesc cartea de vizită…' : 'Procesez…')
            : 'Apasă pentru a fotografia'}
        </Text>
      </SafeAreaView>
    </View>
  );
}

interface ModeButtonProps {
  label: string;
  emoji: string;
  active: boolean;
  onPress: () => void;
  activeColor: string;
}
function ModeButton({ label, emoji, active, onPress, activeColor }: ModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modeButton,
        active && { backgroundColor: activeColor },
      ]}
    >
      <Text style={styles.modeEmoji}>{emoji}</Text>
      <Text style={[
        styles.modeLabel,
        active ? { color: '#FFFFFF' } : { color: 'rgba(255,255,255,0.7)' },
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  permTitle:   { ...typography.title, marginBottom: spacing.sm },
  permMessage: { ...typography.body, textAlign: 'center', lineHeight: 22 },

  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modeSegment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    flexShrink: 1,
  },
  flipBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flipEmoji: { fontSize: 18 },
  flipLabel: { ...typography.caption, color: '#FFFFFF', fontWeight: '600' },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    gap: 6,
  },
  modeEmoji: { fontSize: 16 },
  modeLabel: { ...typography.bodyBold },

  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  frame: {
    borderWidth: 3,
    borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  frameCard:  { width: '85%', aspectRatio: 1.7 },     // standard biz card aspect
  frameStand: { width: '85%', aspectRatio: 0.9 },     // taller for stands
  frameHint:  { ...typography.caption, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },

  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: spacing.xl,
  },
  shutter: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomHint: {
    ...typography.caption,
    color: '#FFFFFF',
    marginTop: spacing.md,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
});
