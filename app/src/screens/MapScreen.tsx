// MapScreen — interactive Leaflet map with one pin per geocoded exhibitor.
// Web-only for now (react-leaflet + Leaflet rely on the DOM). On native we
// render a placeholder.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, accents, spacing, typography } from '../theme';
import { supabase } from '../lib/supabase';

interface Pin {
  id:    string;
  name:  string;
  hall:  string | null;
  stand: string | null;
  city:  string | null;
  lat:   number;
  lng:   number;
}

type Params = { Map: { focusCompanyId?: string } };

// --- Web-only map module loaded via dynamic require so the bundler doesn't
// trip on `window` at module-eval time when running on native.
let MapImpl:
  | React.ComponentType<{ pins: Pin[]; focusId?: string; onPick: (id: string) => void }>
  | null = null;
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapImpl = require('./_LeafletMap').LeafletMap;
}

export function MapScreen() {
  const { palette } = useTheme();
  const nav = useNavigation<{ navigate: (s: string, p?: object) => void }>();
  const route = useRoute<RouteProp<Params, 'Map'>>();
  const focusId = route.params?.focusCompanyId;
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Page through to bypass the 1000-row REST cap.
      const all: Pin[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, hall, stand, city, lat, lng')
          .not('lat', 'is', null)
          .order('id')
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        for (const r of data) {
          all.push({
            id: r.id, name: r.name, hall: r.hall, stand: r.stand,
            city: r.city, lat: Number(r.lat), lng: Number(r.lng),
          });
        }
        if (data.length < PAGE) break;
      }
      if (cancelled) return;
      setPins(all);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={accents.profile.base} size="large" />
          <Text style={[styles.loadingText, { color: palette.textDim }]}>Se încarcă harta…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS !== 'web' || !MapImpl) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]}>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: palette.textDim }]}>
            Harta e disponibilă doar în browser deocamdată.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <MapImpl
        pins={pins}
        focusId={focusId}
        onPick={(id) => nav.navigate('CompanyCard', { companyId: id })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.body },
});
