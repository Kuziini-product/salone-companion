import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { palette, font, space } from '@/theme';

interface State {
  err: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('App error:', err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something broke</Text>
          <Text style={styles.message}>{this.state.err.message}</Text>
          <Text style={styles.stack}>{this.state.err.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { padding: space.lg, gap: space.md },
  title: { ...font.title, color: palette.danger },
  message: { ...font.body, color: palette.text },
  stack: { ...font.caption, color: palette.textDim, fontFamily: 'Courier' },
});
