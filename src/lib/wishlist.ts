const WISHLIST_KEY = 'starbuy_wishlist';
const WISHLIST_DATA_KEY = 'starbuy_wishlist_data';

export type WishlistItem = {
  id: string;
  handle: string;
  title: string;
  price: string;
  currencyCode: string;
  image: string;
  addedAt: number;
};

// ─── ID-based store (backward compat with WishlistButton) ─────────────────────

function getWishlistIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function saveWishlistIds(ids: string[]): void {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent('starbuy:wishlist-change', { detail: ids }));
  } catch {
    // localStorage might be unavailable (private browsing)
  }
}

// ─── Rich data store ──────────────────────────────────────────────────────────

function getWishlistData(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_DATA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

function saveWishlistData(items: WishlistItem[]): void {
  try {
    localStorage.setItem(WISHLIST_DATA_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getWishlist(): WishlistItem[] {
  return getWishlistData().sort((a, b) => b.addedAt - a.addedAt);
}

export function isInWishlist(productId: string): boolean {
  return getWishlistIds().includes(productId);
}

export function addToWishlist(item: Omit<WishlistItem, 'addedAt'>): void {
  // Update ID store
  const ids = getWishlistIds();
  if (!ids.includes(item.id)) {
    saveWishlistIds([...ids, item.id]);
  }
  // Update data store
  const data = getWishlistData();
  if (!data.some((d) => d.id === item.id)) {
    saveWishlistData([...data, { ...item, addedAt: Date.now() }]);
  }
}

export function removeFromWishlist(productId: string): void {
  // Update ID store
  const ids = getWishlistIds();
  saveWishlistIds(ids.filter((id) => id !== productId));
  // Update data store
  const data = getWishlistData();
  saveWishlistData(data.filter((d) => d.id !== productId));
}

/** Also accepts handle for convenience */
export function removeFromWishlistByHandle(handle: string): void {
  const data = getWishlistData();
  const item = data.find((d) => d.handle === handle);
  if (item) {
    removeFromWishlist(item.id);
  }
}

export function toggleWishlist(productId: string): boolean {
  if (isInWishlist(productId)) {
    removeFromWishlist(productId);
    return false;
  } else {
    // For toggle without data, just add ID (backward compat)
    const ids = getWishlistIds();
    if (!ids.includes(productId)) {
      saveWishlistIds([...ids, productId]);
    }
    return true;
  }
}

export function clearWishlist(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WISHLIST_KEY);
    localStorage.removeItem(WISHLIST_DATA_KEY);
    window.dispatchEvent(new CustomEvent('starbuy:wishlist-change', { detail: [] }));
  } catch {
    // ignore
  }
}

export function getWishlistCount(): number {
  return getWishlistIds().length;
}
