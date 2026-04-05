const WISHLIST_KEY = 'starbuy_wishlist';

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
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('starbuy:wishlist-change', { detail: ids }));
  } catch {
    // localStorage might be unavailable (private browsing)
  }
}

export function getWishlist(): string[] {
  return getWishlistIds();
}

export function isInWishlist(productId: string): boolean {
  return getWishlistIds().includes(productId);
}

export function addToWishlist(productId: string): void {
  const ids = getWishlistIds();
  if (!ids.includes(productId)) {
    saveWishlistIds([...ids, productId]);
  }
}

export function removeFromWishlist(productId: string): void {
  const ids = getWishlistIds();
  saveWishlistIds(ids.filter((id) => id !== productId));
}

export function toggleWishlist(productId: string): boolean {
  if (isInWishlist(productId)) {
    removeFromWishlist(productId);
    return false;
  } else {
    addToWishlist(productId);
    return true;
  }
}
