'use client';

/**
 * Admin Collections Page
 *
 * Visual grid of all Shopify collections.
 */

import { useEffect, useState } from 'react';

type Collection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  productsCount: { count: number };
  image: { url: string; altText: string | null } | null;
  updatedAt: string;
};

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-40 bg-[#1f2d4e]" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-[#1f2d4e] rounded w-3/4" />
        <div className="h-3 bg-[#1f2d4e] rounded w-1/2" />
        <div className="h-3 bg-[#1f2d4e] rounded w-full" />
      </div>
    </div>
  );
}

// ─── Collection Card ───────────────────────────────────────────────────────────

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <div className="bg-[#111827] border border-[#1f2d4e] hover:border-[#d4a843]/30 rounded-2xl overflow-hidden transition-all group cursor-default">
      {/* Image / Placeholder */}
      <div className="relative h-40 bg-[#0d1526] overflow-hidden">
        {collection.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.image.url}
            alt={collection.image.altText ?? collection.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[#1f2d4e] text-5xl">collections_bookmark</span>
          </div>
        )}
        {/* Product count badge */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#d4a843] text-sm">inventory_2</span>
          <span className="text-white text-xs font-medium">{collection.productsCount.count}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3
          className="text-white font-semibold text-sm mb-1 group-hover:text-[#d4a843] transition-colors line-clamp-1"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {collection.title}
        </h3>
        <p className="text-[#6b7280] text-xs mb-3 line-clamp-2 leading-relaxed">
          {collection.description || 'No description'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[#374151] text-xs font-mono">/{collection.handle}</span>
          <span className="text-[#374151] text-xs">
            {new Date(collection.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCollections() {
      try {
        const res = await fetch('/api/admin/collections');
        const data = await res.json() as { collections?: Collection[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to load');
        setCollections(data.collections ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collections');
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Collections
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          {loading ? 'Loading…' : `${collections.length} collection${collections.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Grid */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-[#ef4444] text-4xl mb-3">error</span>
          <p className="text-[#ef4444] text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-[#d4a843] text-sm hover:text-[#e4c06a] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-[#374151] text-5xl mb-4">collections_bookmark</span>
          <p className="text-white font-semibold mb-2">No collections yet</p>
          <p className="text-[#6b7280] text-sm">
            Create collections in Shopify to organize your products.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
