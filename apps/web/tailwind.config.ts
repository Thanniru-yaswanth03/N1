import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/*/src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'n1-bg': 'var(--color-bg)',
        'n1-surface': 'var(--color-surface)',
        'n1-surface-raised': 'var(--color-surface-raised)',
        'n1-surface-overlay': 'var(--color-surface-overlay)',
        'n1-border': 'var(--color-border)',
        'n1-border-subtle': 'var(--color-border-subtle)',
        'n1-text-primary': 'var(--color-text-primary)',
        'n1-text-secondary': 'var(--color-text-secondary)',
        'n1-text-muted': 'var(--color-text-muted)',
        'n1-purple': {
          DEFAULT: '#7C3AED',
          light: '#9D5FF5',
          dark: '#5B21B6',
          dim: 'rgba(124, 58, 237, 0.12)',
          glow: 'rgba(124, 58, 237, 0.18)',
          border: 'rgba(124, 58, 237, 0.30)',
        },
        'n1-gold': {
          DEFAULT: '#F5C518',
          light: '#FFD740',
          dim: 'rgba(245, 197, 24, 0.12)',
        },
        'n1-success': '#22C55E',
        'n1-error': '#EF4444',
        'n1-warning': '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        brand: ['Satoshi', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        full: '9999px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        purple: '0 0 40px rgba(124, 58, 237, 0.20)',
      },
    },
  },
  plugins: [],
};

export default config;
