// Tiny error boundary so a crashed screen doesn't take down the whole app.
// Logs to console; in production we'd hook this up to Sentry/Bugsnag.

import React from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';

interface State { error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Ceva nu a mers</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable
            onPress={() => this.setState({ error: undefined })}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Reîncearcă</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0B0F17' },
  title:   { fontSize: 22, fontWeight: '700', color: '#F1F5F9', marginBottom: 8 },
  message: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24 },
  button:  { backgroundColor: '#FF6B4A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});
