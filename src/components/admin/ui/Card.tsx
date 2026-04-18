/**
 * AdminCard — Phase 1
 *
 * Consistent card container using admin design tokens.
 * Replaces all hardcoded bg-[#111827] border-[#1f2d4e] patterns.
 */

import type { ReactNode, HTMLAttributes } from 'react';

type Variant = 'default' | 'elevated' | 'ghost';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface AdminCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  default: 'border',
  elevated: 'border shadow-[var(--admin-shadow-card)]',
  ghost: '',
};

const paddingStyles: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function AdminCard({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...rest
}: AdminCardProps) {
  return (
    <div
      className={`rounded-2xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      style={{
        backgroundColor: variant === 'ghost' ? 'transparent' : 'var(--admin-bg-card)',
        borderColor: variant === 'ghost' ? 'transparent' : 'var(--admin-border)',
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
