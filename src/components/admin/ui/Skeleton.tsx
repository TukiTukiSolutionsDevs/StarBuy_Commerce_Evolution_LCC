/**
 * AdminSkeleton — Phase 1
 *
 * Unified skeleton loader with preset variants for card, table row, stat, and text.
 * Replaces the per-page custom Skeleton components (e.g. KpiSkeleton, ChartSkeleton).
 */

type SkeletonVariant = 'text' | 'card' | 'stat' | 'table-row' | 'circle';

interface AdminSkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  /** Number of skeleton items to render (useful for table-row / text) */
  count?: number;
}

const base = 'animate-pulse rounded-lg';

const variantStyles: Record<SkeletonVariant, string> = {
  text: `${base} h-4 w-full`,
  card: `${base} rounded-2xl h-40 w-full`,
  stat: `${base} rounded-2xl h-28 w-full`,
  'table-row': `${base} h-10 w-full`,
  circle: `${base} rounded-full h-10 w-10`,
};

export function AdminSkeleton({ variant = 'text', className = '', count = 1 }: AdminSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`${variantStyles[variant]} ${className}`}
          style={{ backgroundColor: 'color-mix(in srgb, var(--admin-border) 40%, transparent)' }}
        />
      ))}
    </>
  );
}
