/**
 * AdminPageHeader — Phase 1
 *
 * Consistent page title + subtitle + optional action buttons.
 * Replaces the inconsistent h1/h2 headers with inline styles on every page.
 */

import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="admin-h1">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  );
}
