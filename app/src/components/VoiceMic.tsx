// VoiceMic — web-only voice-to-text using the browser's SpeechRecognition API.
// On native we render a disabled button (or could fall back to recording +
// Whisper later — out of scope for now).

import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';

interface Props {
  onTranscript: (text: string) => void;
  color:        string;
  background:   string;
  size?:        number;
  language?:    string;     // BCP-47, e.g. 'ro-RO', 'en-US'
}

export function VoiceMic({ onTranscript, color, background, size = 40, language = 'ro-RO' }: Props) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);
  const supported = useRef<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    supported.current = !!SR;
  }, []);

  function start() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript + ' ';
      }
      if (text) onTranscript(text);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    rec.start();
    recRef.current = rec;
    setRecording(true);
  }

  function stop() {
    try { recRef.current?.stop(); } catch {}
    setRecording(false);
  }

  function toggle() {
    if (recording) stop();
    else start();
  }

  // On native or unsupported web, hide the button entirely.
  if (Platform.OS !== 'web' || !supported.current) return null;

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: recording ? '#EF4444' : background },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityLabel={recording ? 'Oprește înregistrarea' : 'Înregistrează cu vocea'}
    >
      {recording ? (
        <MicOff size={size * 0.5} color="#FFFFFF" strokeWidth={2} />
      ) : (
        <Mic size={size * 0.5} color={color} strokeWidth={2} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
