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

// Default determinista para SSR y primer render del cliente.
// Sin este default constante, `useState(() => getSavedTheme())` crea un
// hydration mismatch: el server no tiene localStorage → cae a 'dark',
// pero el cliente sí lo tiene → puede leer 'light'.
const SSR_DEFAULT_THEME: AdminTheme = 'dark';
const SSR_DEFAULT_RESOLVED: 'dark' | 'light' = 'dark';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readSavedTheme(): AdminTheme {
  const saved = localStorage.getItem(LS_KEY);
  if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  return SSR_DEFAULT_THEME;
}

function resolveTheme(theme: AdminTheme): 'dark' | 'light' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  // SSR y primer render del cliente SIEMPRE parten del mismo default.
  // Evita el hydration mismatch. El valor real se hidrata en el useEffect de abajo.
  const [theme, setThemeState] = useState<AdminTheme>(SSR_DEFAULT_THEME);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(SSR_DEFAULT_RESOLVED);

  // Hidratar desde localStorage tras el mount (ya existe `window`).
  // Este effect corre DESPUÉS de que React haya hecho match server vs. client.
  //
  // ────────────────────────────────────────────────────────────────────────
  // NOTA ARQUITECTURAL — por qué deshabilitamos `react-hooks/set-state-in-effect`:
  //
  // La regla apunta a un problema real: setState síncrono dentro de useEffect
  // genera un render en cascada (commit → effect → setState → re-render).
  // Sin embargo, es el ÚNICO patrón viable para hidratar state desde
  // localStorage sin causar un hydration mismatch, porque:
  //
  //   1. En SSR no existe `window` → no podemos leer localStorage allá.
  //   2. Si leemos localStorage en el initializer de useState, el cliente
  //      produce un state distinto al del server → React lanza
  //      "Hydration failed: server text didn't match client".
  //   3. Alternativas (useSyncExternalStore) no encajan porque localStorage
  //      no dispara eventos en la misma pestaña — requiere pub/sub custom
  //      que es over-engineering para este caso.
  //
  // Este es el mismo patrón que usa `next-themes` y la mayoría de providers
  // de theming/auth en React 18+. El costo de un render extra por montaje
  // es trivial y está justificado por la correctness del hydration.
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = readSavedTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ver nota arquitectural arriba
    setThemeState(saved);

    setResolvedTheme(resolveTheme(saved));
  }, []);

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
