const STORAGE_KEY = 'starbuy-recently-viewed';
const MAX_ITEMS = 12;

export type RecentProduct = {
  id: string;
  handle: string;
  title: string;
  price: string;
  currencyCode: string;
  image: string;
  viewedAt: number;
};

function readStorage(): RecentProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentProduct[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: RecentProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage might be unavailable (private browsing, quota exceeded)
  }
}

export function addRecentlyViewed(product: Omit<RecentProduct, 'viewedAt'>): void {
  const items = readStorage();
  // Remove existing entry for this handle (dedupe)
  const filtered = items.filter((item) => item.handle !== product.handle);
  // Add to front with current timestamp
  const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
  writeStorage(updated);
}

export function getRecentlyViewed(): RecentProduct[] {
  return readStorage().sort((a, b) => b.viewedAt - a.viewedAt);
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
