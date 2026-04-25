// Design tokens for the Salone Companion app.
//
// We expose a single useTheme() hook that returns the active palette plus the
// per-function accent colors. The palette switches between light and dark
// based on the system color scheme. The function accents stay vivid in both
// modes so users can scan a screen and instantly know "I'm in Capture" vs
// "I'm in Contacts".

import { useColorScheme } from 'react-native';

// ----- Per-function accents (constant across light/dark) ---------------------
// These are the spine of the visual identity. Pick the same color in both
// modes; only background/text neutrals flip.
export const accents = {
  capture:  { base: '#FF6B4A', soft: '#FFE5DD', deep: '#C9421F' }, // warm coral
  companies:{ base: '#3B82F6', soft: '#DBEAFE', deep: '#1D4ED8' }, // blue
  contacts: { base: '#10B981', soft: '#D1FAE5', deep: '#047857' }, // green
  profile:  { base: '#8B5CF6', soft: '#EDE9FE', deep: '#5B21B6' }, // purple
} as const;

export type FunctionAccent = keyof typeof accents;

// Status pill colors for visit_status.
export const statusColors = {
  planned:   { bg: '#E5E7EB', fg: '#374151' },
  visited:   { bg: '#D1FAE5', fg: '#047857' },
  follow_up: { bg: '#FEF3C7', fg: '#92400E' },
  skipped:   { bg: '#FEE2E2', fg: '#991B1B' },
} as const;

// ----- Light / dark neutrals -------------------------------------------------
const lightPalette = {
  mode:         'light' as const,
  bg:           '#FFFFFF',
  bgElevated:   '#F8FAFC',
  bgSubtle:     '#F1F5F9',
  text:         '#0F172A',
  textDim:      '#64748B',
  textFaint:    '#94A3B8',
  border:       '#E2E8F0',
  divider:      '#F1F5F9',
  shadow:       'rgba(15, 23, 42, 0.08)',
  // Default accent is the contacts green — most "neutral" feeling.
  accent:       accents.contacts.base,
  accentText:   '#FFFFFF',
  danger:       '#EF4444',
  warning:      '#F59E0B',
  success:      '#10B981',
  overlay:      'rgba(15, 23, 42, 0.4)',
};

const darkPalette = {
  mode:         'dark' as const,
  bg:           '#0B0F17',
  bgElevated:   '#151B26',
  bgSubtle:     '#1E2632',
  text:         '#F1F5F9',
  textDim:      '#94A3B8',
  textFaint:    '#64748B',
  border:       '#2A3441',
  divider:      '#1E2632',
  shadow:       'rgba(0, 0, 0, 0.5)',
  accent:       accents.contacts.base,
  accentText:   '#FFFFFF',
  danger:       '#F87171',
  warning:      '#FBBF24',
  success:      '#34D399',
  overlay:      'rgba(0, 0, 0, 0.6)',
};

export type Palette = typeof lightPalette;

// ----- Spacing / radius / typography (mode-independent) ----------------------
export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const radius = {
  sm: 6, md: 10, lg: 14, xl: 20, pill: 999,
} as const;

export const typography = {
  display:   { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  title:     { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading:   { fontSize: 20, fontWeight: '600' as const },
  subheading:{ fontSize: 17, fontWeight: '600' as const },
  body:      { fontSize: 16, fontWeight: '400' as const },
  bodyBold:  { fontSize: 16, fontWeight: '600' as const },
  caption:   { fontSize: 13, fontWeight: '400' as const },
  micro:     { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5 },
} as const;

// ----- Hook ------------------------------------------------------------------
export function useTheme(): { palette: Palette; accents: typeof accents } {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? darkPalette : lightPalette;
  return { palette, accents };
}

// Static export for places that can't use hooks (NavigationContainer theme).
// We pick light by default; the actual runtime theme comes from useTheme().
export const palette = lightPalette;
