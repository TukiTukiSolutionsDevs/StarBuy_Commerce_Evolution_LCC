'use client';

interface AlertBellProps {
  unreadCount: number;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function AlertBell({
  unreadCount,
  onClick,
  href = '/admin/alerts',
  className = '',
}: AlertBellProps) {
  const Tag = onClick ? 'button' : 'a';
  const linkProps = onClick ? { onClick } : { href };

  return (
    <Tag
      data-testid="alert-bell"
      {...linkProps}
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]/60 transition-colors ${className}`}
    >
      <span className="material-symbols-outlined text-xl">notifications</span>
      {unreadCount > 0 && (
        <span
          data-testid="alert-bell-badge"
          // eslint-disable-next-line no-restricted-syntax -- over solid bg-red-500 badge
          className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Tag>
  );
}
