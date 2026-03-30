/* ─── Design System: AquaPrana ─── */

export const COLORS = {
  primary: '#1E7AB8',
  primaryDark: '#155a8a',
  primaryLight: '#e8f4fd',
  green: '#27ae60',
  amber: '#f39c12',
  red: '#e74c3c',
  grayBg: '#f7f8fa',
  border: '#e2e8f0',
  text: '#1a202c',
  muted: '#718096',
  white: '#ffffff',
  black: '#000000',
} as const;

export const FONTS = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
