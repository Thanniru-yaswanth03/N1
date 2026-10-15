/**
 * N1 Design System Tokens
 * Strictly adhering to the dark-first specification in PRODUCT_SPEC.md
 */

export const THEME_COLORS = {
  dark: {
    bg: '#09090F',
    surface: '#111118',
    surfaceRaised: '#1A1A26',
    surfaceOverlay: '#20202E',
    border: '#2A2A3C',
    borderSubtle: '#1E1E2C',
    textPrimary: '#F0F0F8',
    textSecondary: '#8A8AA8',
    textMuted: '#52526A',
  },
  light: {
    bg: '#F8F8FC',
    surface: '#FFFFFF',
    surfaceRaised: '#F0F0F8',
    surfaceOverlay: '#E8E8F4',
    border: '#D8D8EC',
    borderSubtle: '#E4E4F4',
    textPrimary: '#0F0F1A',
    textSecondary: '#4A4A6A',
    textMuted: '#8A8AAA',
  },
  accents: {
    purple: '#7C3AED',
    purpleLight: '#9D5FF5',
    purpleDark: '#5B21B6',
    purpleDim: 'rgba(124, 58, 237, 0.12)',
    purpleGlow: 'rgba(124, 58, 237, 0.18)',
    purpleBorder: 'rgba(124, 58, 237, 0.30)',
    gold: '#F5C518',
    goldLight: '#FFD740',
    goldDim: 'rgba(245, 197, 24, 0.12)',
  },
  semantic: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
} as const;

export const THEME_FONTS = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  brand: "'Satoshi', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
} as const;
