'use client';

/**
 * Admin Theme Provider — Phase 0
 *
 * Manages dark/light/system theme for the admin panel.
 * Stores preference in localStorage. Applies `data-admin-theme` attribute
 * on the admin root element so CSS tokens activate.
 *
 * Does NOT affect the storefront — only elements inside the admin layout.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type AdminTheme = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: AdminTheme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: AdminTheme) => void;
}

const LS_KEY = 'starbuy:admin-theme';

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSavedTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(LS_KEY);
  if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  return 'dark';
}

function resolveTheme(theme: AdminTheme): 'dark' | 'light' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() => getSavedTheme());
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() =>
    resolveTheme(getSavedTheme()),
  );

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: AdminTheme) => {
    setThemeState(newTheme);
    setResolvedTheme(resolveTheme(newTheme));
    localStorage.setItem(LS_KEY, newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      <div data-admin-theme={resolvedTheme}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(ThemeContext);
}
