// Supabase client used throughout the app.
//
// Uses Expo SecureStore to persist the auth session — survives app restarts
// without keeping the JWT in plain AsyncStorage.

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnon) {
  // Better to fail fast than to chase NPE's later.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
    'Copy app/.env.example to app/.env and fill them in.',
  );
}

// SecureStore is iOS/Android only. On web we fall back to localStorage via
// the default storage that supabase-js uses.
const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : (ExpoSecureStoreAdapter as never),
    autoRefreshToken: true,
    persistSession: true,
    // Web reads access_token from URL hash after magic-link redirect.
    // Native uses deep links handled by expo-linking instead.
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

/** URL of the deployed edge function namespace. */
export function functionUrl(name: string): string {
  // Convention: https://<project>.supabase.co/functions/v1/<name>
  return `${supabaseUrl}/functions/v1/${name}`;
}
