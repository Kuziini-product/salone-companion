// Apple-inspired premium dark/light theme tokens.

export const palette = {
  bg: '#0B0B0F',
  bgElevated: '#16161D',
  bgCard: '#1C1C24',
  border: '#2A2A33',
  text: '#F5F5F7',
  textDim: '#9A9AA5',
  textMuted: '#6E6E78',
  accent: '#0A84FF',
  accentDim: '#0A84FF40',
  success: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
  followUp: '#FFD60A',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const font = {
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 17, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  button: { fontSize: 17, fontWeight: '600' as const },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
};
