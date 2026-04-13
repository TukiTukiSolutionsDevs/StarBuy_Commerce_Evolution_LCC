'use client';

import { useState } from 'react';

type ProductTabsProps = {
  descriptionHtml: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
};

type Tab = 'description' | 'specifications' | 'reviews';

export function ProductTabs({ descriptionHtml, productType, vendor, tags }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('description');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'description', label: 'Description' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'reviews', label: 'Reviews' },
  ];

  return (
    <div className="mb-20 mt-12">
      {/* Tab list — Celestial Pastel style */}
      <div className="flex border-b border-[#b1b2af] gap-8 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'pb-4 font-label text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-[#795a00] text-[#795a00] font-bold'
                : 'border-transparent text-[#5d605c] hover:text-[#303330]',
            ].join(' ')}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="max-w-4xl" role="tabpanel">
        {activeTab === 'description' && (
          <div
            className="prose max-w-none text-[#303330] leading-relaxed [&_h1]:font-headline [&_h2]:font-headline [&_h3]:font-headline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{
              __html: descriptionHtml || '<p>No description available.</p>',
            }}
          />
        )}

        {activeTab === 'specifications' && (
          <dl className="divide-y divide-[#f4f4f0]">
            {productType && (
              <div className="flex gap-4 py-3">
                <dt className="w-40 flex-shrink-0 text-sm font-medium text-[#5d605c]">Type</dt>
                <dd className="text-sm text-[#303330]">{productType}</dd>
              </div>
            )}
            {vendor && (
              <div className="flex gap-4 py-3">
                <dt className="w-40 flex-shrink-0 text-sm font-medium text-[#5d605c]">Brand</dt>
                <dd className="text-sm text-[#303330]">{vendor}</dd>
              </div>
            )}
            {tags && tags.length > 0 && (
              <div className="flex gap-4 py-3">
                <dt className="w-40 flex-shrink-0 text-sm font-medium text-[#5d605c]">Tags</dt>
                <dd className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#f4f4f0] border border-[#b1b2af] px-3 py-1 text-xs text-[#5d605c]"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {!productType && !vendor && (!tags || tags.length === 0) && (
              <p className="py-4 text-sm text-[#5d605c]">No specifications available.</p>
            )}
          </dl>
        )}

        {activeTab === 'reviews' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="material-symbols-outlined text-5xl text-[#b1b2af]" aria-hidden="true">
              star_border
            </span>
            <p className="text-[#5d605c] font-medium">
              Reviews coming soon. Be the first to review this product!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
