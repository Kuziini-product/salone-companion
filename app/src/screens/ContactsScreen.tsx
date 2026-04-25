import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image } from 'react-native';
import { palette, font, space, radius } from '@/theme';
import { useStore } from '@/lib/mockStore';

export function ContactsScreen({ navigation }: any) {
  const contacts = useStore((s) => s.contacts);

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
          >
            <Image source={{ uri: item.cardUri }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.fullName ?? '(unnamed)'}</Text>
              <Text style={styles.role}>{item.role ?? ''}</Text>
              <Text style={styles.contact}>{item.email ?? item.phone ?? ''}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No contacts yet. Open Capture, switch to Card mode, tap shutter.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  row: {
    flexDirection: 'row',
    backgroundColor: palette.bgCard,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.md,
    alignItems: 'center',
  },
  thumb: { width: 64, height: 40, borderRadius: radius.sm, backgroundColor: palette.bgElevated },
  name: { ...font.body, color: palette.text, fontWeight: '600' },
  role: { ...font.caption, color: palette.textDim, marginTop: 2 },
  contact: { ...font.caption, color: palette.accent, marginTop: 2 },
  empty: { ...font.body, color: palette.textMuted, textAlign: 'center', marginTop: space.xxl, paddingHorizontal: space.lg },
});
