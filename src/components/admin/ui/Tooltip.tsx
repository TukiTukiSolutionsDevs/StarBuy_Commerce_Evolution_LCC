'use client';

/**
 * AdminTooltip — Lightweight info tooltip for admin UX
 *
 * Shows a help icon (?) next to labels. On hover/focus, displays an
 * explanatory text bubble. Uses admin design tokens — zero hardcoded colors.
 *
 * Usage:
 *   <AdminTooltip text="Explicación del campo" />
 *   <AdminTooltip text="..." position="bottom" />
 */

import { useState, useRef, useCallback } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export function AdminTooltip({
  text,
  position = 'top',
  icon = 'help',
  iconSize = 14,
}: {
  text: string;
  position?: TooltipPosition;
  icon?: string;
  iconSize?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Adjust position if tooltip goes off-screen (via callback ref)
  const tooltipCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      (tooltipRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (position === 'top' && rect.top < 8) setAdjustedPosition('bottom');
      else if (position === 'bottom' && rect.bottom > vh - 8) setAdjustedPosition('top');
      else if (position === 'right' && rect.right > vw - 8) setAdjustedPosition('left');
      else if (position === 'left' && rect.left < 8) setAdjustedPosition('right');
      else setAdjustedPosition(position);
    },
    [position],
  );

  const positionStyles: Record<TooltipPosition, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '6px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '6px' },
  };

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="inline-flex items-center justify-center rounded-full transition-colors outline-none"
        style={{
          width: iconSize + 4,
          height: iconSize + 4,
          color: 'var(--admin-text-disabled)',
          backgroundColor: 'transparent',
        }}
        onMouseDown={(e) => e.preventDefault()} // prevent focus jump
        aria-label={text}
        tabIndex={0}
      >
        <span className="material-symbols-outlined" style={{ fontSize: `${iconSize}px` }}>
          {icon}
        </span>
      </button>

      {visible && (
        <div
          ref={tooltipCallbackRef}
          role="tooltip"
          className="absolute z-[80] w-56 px-3 py-2 rounded-xl text-xs leading-relaxed pointer-events-none"
          style={{
            backgroundColor: 'var(--admin-bg-card)',
            color: 'var(--admin-text-secondary)',
            border: '1px solid var(--admin-border)',
            boxShadow: 'var(--admin-shadow-dropdown)',
            ...positionStyles[adjustedPosition],
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

/**
 * AdminFieldLabel — Label + optional tooltip in one line
 *
 * Usage:
 *   <AdminFieldLabel label="Precio" tooltip="El precio de venta al público" required />
 */
export function AdminFieldLabel({
  label,
  tooltip,
  required,
  htmlFor,
}: {
  label: string;
  tooltip?: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center gap-1 mb-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium"
        style={{ color: 'var(--admin-text-secondary)' }}
      >
        {label}
        {required && <span style={{ color: 'var(--admin-error)' }}> *</span>}
      </label>
      {tooltip && <AdminTooltip text={tooltip} />}
    </div>
  );
}

/**
 * AdminHelpBanner — Collapsible contextual help block
 *
 * Usage:
 *   <AdminHelpBanner
 *     icon="lightbulb"
 *     title="¿Qué es esto?"
 *     description="Explicación amigable..."
 *     defaultOpen={true}
 *   />
 */
export function AdminHelpBanner({
  icon = 'lightbulb',
  title,
  description,
  defaultOpen = true,
  dismissible = true,
}: {
  icon?: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  dismissible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open && dismissible) return null;

  return (
    <div
      className="rounded-xl p-4 flex gap-3"
      style={{
        backgroundColor: 'var(--admin-brand-bg)',
        border: '1px solid var(--admin-brand-border)',
      }}
    >
      <span
        className="material-symbols-outlined text-lg flex-none mt-0.5"
        style={{ color: 'var(--admin-brand)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>
          {title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
          {description}
        </p>
      </div>
      {dismissible && (
        <button
          onClick={() => setOpen(false)}
          className="flex-none p-1 rounded-lg transition-colors"
          style={{ color: 'var(--admin-text-muted)' }}
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      )}
    </div>
  );
}
