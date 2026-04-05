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
    { id: 'reviews', label: 'Reviews (128)' },
  ];

  return (
    <div className="mb-20 mt-12">
      {/* Tab list — matches Stitch style */}
      <div className="flex border-b border-slate-200 gap-8 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'pb-4 font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-[#1B2A5E] text-[#1B2A5E] font-bold'
                : 'border-transparent text-slate-500 hover:text-[#1B2A5E]',
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
            className="prose max-w-none text-slate-500 leading-relaxed [&_h1]:font-[var(--font-heading)] [&_h2]:font-[var(--font-heading)] [&_h3]:font-[var(--font-heading)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{
              __html: descriptionHtml || '<p>No description available.</p>',
            }}
          />
        )}

        {activeTab === 'specifications' && (
          <dl className="divide-y divide-gray-100">
            {productType && (
              <div className="flex gap-4 py-3">
                <dt className="w-40 flex-shrink-0 text-sm font-medium text-slate-500">Type</dt>
                <dd className="text-sm text-[#1A1A2E]">{productType}</dd>
              </div>
            )}
            {vendor && (
              <div className="flex gap-4 py-3">
                <dt className="w-40 flex-shrink-0 text-sm font-medium text-slate-500">Brand</dt>
                <dd className="text-sm text-[#1A1A2E]">{vendor}</dd>
              </div>
            )}
            {tags && tags.length > 0 && (
              <div className="flex gap-4 py-3">
                <dt className="w-40 flex-shrink-0 text-sm font-medium text-slate-500">Tags</dt>
                <dd className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#F8F9FC] border border-slate-100 px-3 py-1 text-xs text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {!productType && !vendor && (!tags || tags.length === 0) && (
              <p className="py-4 text-sm text-slate-500">No specifications available.</p>
            )}
          </dl>
        )}

        {activeTab === 'reviews' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <span
              className="material-symbols-outlined text-5xl text-gray-300"
              aria-hidden="true"
            >
              star_border
            </span>
            <p className="text-slate-500 font-medium">
              Reviews coming soon. Be the first to review this product!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
