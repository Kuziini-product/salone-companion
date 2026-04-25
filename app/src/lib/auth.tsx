// AuthContext — single source of truth for the current user session.
//
// Wraps the app once at the top so any screen can call useAuth() to read the
// session, sign in via magic link, or sign out.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

interface AuthContextValue {
  session:     Session | null;
  loading:     boolean;
  signInEmail: (email: string) => Promise<{ error?: string }>;
  signOut:     () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initial session check.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    // Listen for sign in / sign out / token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInEmail = async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) return { error: 'Adresa de email pare invalidă' };

    // The deep link the magic-link email will redirect back to.
    const redirectTo = Linking.createURL('/auth/callback');

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signInEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
