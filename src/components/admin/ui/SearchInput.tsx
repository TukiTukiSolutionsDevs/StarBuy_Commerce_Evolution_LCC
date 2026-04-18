/**
 * AdminSearchInput — Phase 1
 *
 * Consistent search bar with icon + clear button.
 * Uses admin tokens for theming. Supports controlled & uncontrolled modes.
 */

'use client';

import { useRef, type ChangeEvent, type KeyboardEvent } from 'react';

interface AdminSearchInputProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  /** Debounce not included — handle externally if needed */
  className?: string;
  autoFocus?: boolean;
}

export function AdminSearchInput({
  value,
  defaultValue,
  placeholder = 'Search…',
  onChange,
  onSearch,
  className = '',
  autoFocus = false,
}: AdminSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = inputRef.current?.value ?? '';
      onSearch?.(val);
    }
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    onChange?.('');
    onSearch?.('');
  };

  const showClear = value !== undefined ? value.length > 0 : false;

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <span
        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none"
        style={{ color: 'var(--admin-text-muted)' }}
      >
        search
      </span>

      <input
        ref={inputRef}
        type="text"
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm outline-none transition-colors"
        style={{
          backgroundColor: 'var(--admin-bg-input)',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--admin-brand)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--admin-border)';
        }}
      />

      {/* Clear button */}
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors hover:opacity-80"
          style={{ color: 'var(--admin-text-muted)' }}
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      )}
    </div>
  );
}
