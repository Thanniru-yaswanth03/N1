'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'n1-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [, startTransition] = useTransition();

  // Read initial stored theme on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        setThemeState(stored);
      } else {
        setThemeState('system');
      }
    } catch {
      setThemeState('system');
    }
  }, []);

  // Sync theme changes to DOM and localStorage
  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark');
    const newResolved: ResolvedTheme = isDark ? 'dark' : 'light';

    startTransition(() => {
      setResolvedTheme(newResolved);
    });

    document.documentElement.setAttribute('data-theme', newResolved);

    // Update meta theme-color for browser chrome / mobile status bars
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#09090F' : '#F8F8FC');
    }

    // Listen for OS system theme changes if set to system
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const sysResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(sysResolved);
        document.documentElement.setAttribute('data-theme', sysResolved);
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', e.matches ? '#09090F' : '#F8F8FC');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    return undefined;
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage write errors (e.g. incognito restrictions)
    }
  };

  const toggleTheme = () => {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
