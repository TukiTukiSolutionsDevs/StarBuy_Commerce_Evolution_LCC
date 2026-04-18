/**
 * AdminEmptyState — Phase 1
 *
 * Icon + title + description + optional CTA button.
 * Replaces 10+ custom empty state implementations across admin pages.
 */

import type { ReactNode } from 'react';

interface AdminEmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function AdminEmptyState({ icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span
        className="material-symbols-outlined text-5xl mb-4"
        style={{ color: 'var(--admin-text-disabled)' }}
      >
        {icon}
      </span>
      <h3 className="admin-h2 mb-1">{title}</h3>
      {description && (
        <p className="text-sm max-w-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
