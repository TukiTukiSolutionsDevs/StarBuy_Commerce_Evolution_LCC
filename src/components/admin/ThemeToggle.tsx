'use client';

/**
 * Admin Theme Toggle — Phase 0
 *
 * Cycles through dark → light → system.
 * Shows the current mode icon. Compact for the top bar.
 */

import { useAdminTheme, type AdminTheme } from './ThemeProvider';

const CYCLE: AdminTheme[] = ['dark', 'light', 'system'];

const ICONS: Record<AdminTheme, string> = {
  dark: 'dark_mode',
  light: 'light_mode',
  system: 'monitor',
};

const LABELS: Record<AdminTheme, string> = {
  dark: 'Dark mode',
  light: 'Light mode',
  system: 'System',
};

export function ThemeToggle() {
  const { theme, setTheme } = useAdminTheme();

  function cycleTheme() {
    const idx = CYCLE.indexOf(theme);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setTheme(next);
  }

  return (
    <button
      onClick={cycleTheme}
      title={`Theme: ${LABELS[theme]} — click to change`}
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:bg-[var(--admin-bg-hover)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        {ICONS[theme]}
      </span>
    </button>
  );
}
