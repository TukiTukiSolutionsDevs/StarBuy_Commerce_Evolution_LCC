type BadgeVariant = 'sale' | 'new' | 'trending' | 'default';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  sale: 'bg-[var(--color-error)] text-white',
  new: 'bg-[var(--color-secondary)] text-[var(--color-primary)]',
  trending: 'bg-[var(--color-primary)] text-white',
  default: 'bg-[#eeeeea] text-[#5d605c]',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
