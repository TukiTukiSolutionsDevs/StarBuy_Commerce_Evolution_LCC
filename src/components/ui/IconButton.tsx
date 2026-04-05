import { type ButtonHTMLAttributes, forwardRef } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string; // accessibility
  size?: 'sm' | 'md' | 'lg';
  badge?: number;
};

const sizeStyles = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ children, className = '', label, size = 'md', badge, ...props }, ref) {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={[
          'relative inline-flex items-center justify-center rounded-[var(--radius-md)]',
          'text-current transition-colors duration-150',
          'hover:bg-white/10 active:bg-white/20',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeStyles[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span
            aria-label={`${badge} items`}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[10px] font-bold text-[var(--color-primary)]"
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }
);
