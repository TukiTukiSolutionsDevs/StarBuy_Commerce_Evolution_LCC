'use client';

import { useState } from 'react';

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="relative bg-[#795a00] text-[#fff8f0] py-2 text-center font-label text-xs tracking-widest uppercase"
      role="complementary"
      aria-label="Promotional announcement"
    >
      <span className="px-8 inline-block">
        Free Shipping on Orders Over $50 | Shop the Latest Trends
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#fff8f0]/70 hover:text-[#fff8f0] transition-colors duration-500 rounded-full"
        aria-label="Dismiss announcement"
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          close
        </span>
      </button>
    </div>
  );
}
