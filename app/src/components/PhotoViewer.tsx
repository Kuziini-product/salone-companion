// PhotoViewer — fullscreen modal for one photo with download + share.
// On mobile + desktop browsers it uses native share when available; otherwise
// falls back to a WhatsApp web/api URL.

import React from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { Download, Share2, X } from 'lucide-react-native';
import { useTheme, accents, spacing, typography } from '../theme';

interface Props {
  visible: boolean;
  url:     string | null;
  onClose: () => void;
}

export function PhotoViewer({ visible, url, onClose }: Props) {
  const { palette } = useTheme();
  const [busy, setBusy] = React.useState<'download' | 'share' | null>(null);

  async function fetchBlob(): Promise<Blob | null> {
    if (!url) return null;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.blob();
    } catch (e) {
      Alert.alert('Eroare', 'Nu am putut descărca poza: ' + (e as Error).message);
      return null;
    }
  }

  async function onDownload() {
    if (!url || busy) return;
    setBusy('download');
    try {
      const blob = await fetchBlob();
      if (!blob) return;
      const filename = `salone-${Date.now()}.jpg`;
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(u);
      }
    } finally {
      setBusy(null);
    }
  }

  async function onShare() {
    if (!url || busy) return;
    setBusy('share');
    try {
      const blob = await fetchBlob();
      if (!blob) return;
      const file = new File([blob], `salone-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      // navigator.share with files — works on most mobile browsers (iOS Safari,
      // Android Chrome) and on macOS Safari.
      const nav = (typeof navigator !== 'undefined' ? navigator : null) as any;
      if (nav?.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Salone del Mobile' });
      } else if (nav?.share) {
        await nav.share({ url, title: 'Salone del Mobile' });
      } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Fallback: open WhatsApp Web with the image URL.
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        Alert.alert('Eroare la share', e?.message ?? String(e));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {url ? (
          <Image source={{ uri: url }} style={styles.img} resizeMode="contain" />
        ) : null}

        {/* Close X */}
        <Pressable onPress={onClose} style={[styles.actBtn, styles.closeBtn]}>
          <X size={22} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        {/* Bottom action row */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={onDownload}
            disabled={!url || busy !== null}
            style={({ pressed }) => [
              styles.actBtn,
              { backgroundColor: accents.companies.base },
              pressed && { opacity: 0.7 },
              (!url || busy === 'download') && { opacity: 0.5 },
            ]}
          >
            {busy === 'download'
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Download size={20} color="#FFFFFF" strokeWidth={2} />}
            <Text style={styles.actText}>Descarcă</Text>
          </Pressable>

          <Pressable
            onPress={onShare}
            disabled={!url || busy !== null}
            style={({ pressed }) => [
              styles.actBtn,
              { backgroundColor: accents.contacts.base },
              pressed && { opacity: 0.7 },
              (!url || busy === 'share') && { opacity: 0.5 },
            ]}
          >
            {busy === 'share'
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Share2 size={20} color="#FFFFFF" strokeWidth={2} />}
            <Text style={styles.actText}>Trimite</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center', alignItems: 'center' },
  img:      { width: '94%', height: '78%' },

  closeBtn: { position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(255,255,255,0.15)' },

  actionRow: {
    position: 'absolute', bottom: 36, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'center', gap: spacing.md,
  },
  actBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderRadius: 999,
    minWidth: 140, justifyContent: 'center',
  },
  actText: { color: '#FFFFFF', ...typography.bodyBold },
});
