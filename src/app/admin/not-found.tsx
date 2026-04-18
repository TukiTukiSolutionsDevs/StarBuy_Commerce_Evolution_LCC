import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl p-8 text-center shadow-xl"
          style={{
            backgroundColor: 'var(--admin-bg-elevated)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'var(--admin-border)',
          }}
        >
          {/* 404 number */}
          <p
            className="text-[80px] font-extrabold leading-none opacity-10 select-none"
            style={{ color: 'var(--admin-brand)' }}
          >
            404
          </p>

          <div className="-mt-4">
            {/* Icon */}
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--admin-border)' }}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ color: 'var(--admin-brand)' }}
                aria-hidden="true"
              >
                search_off
              </span>
            </div>

            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
              Page not found
            </h1>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: 'var(--admin-text-secondary)' }}
            >
              The admin page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
                style={{ backgroundColor: 'var(--admin-brand)', color: 'var(--admin-bg)' }}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  home
                </span>
                Go to Dashboard
              </Link>
              <Link
                href="/admin/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: 'var(--admin-border)',
                  color: 'var(--admin-text-secondary)',
                }}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  inventory_2
                </span>
                Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
