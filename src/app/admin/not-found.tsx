import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-[#0d1526] border border-[#1f2d4e] p-8 text-center shadow-xl">
          {/* 404 number */}
          <p className="text-[80px] font-extrabold leading-none text-[#d4a843] opacity-10 select-none">
            404
          </p>

          <div className="-mt-4">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f2d4e]">
              <span
                className="material-symbols-outlined text-2xl text-[#d4a843]"
                aria-hidden="true"
              >
                search_off
              </span>
            </div>

            <h1 className="text-xl font-bold text-white">Page not found</h1>
            <p className="mt-2 text-sm text-[#9ca3af] leading-relaxed">
              The admin page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4a843] px-5 py-2.5 text-sm font-semibold text-[#0a0f1e] hover:bg-[#e4c06a] transition-colors"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  home
                </span>
                Go to Dashboard
              </Link>
              <Link
                href="/admin/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1f2d4e] px-5 py-2.5 text-sm font-semibold text-[#9ca3af] hover:text-white hover:border-[#d4a843]/40 transition-colors"
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
