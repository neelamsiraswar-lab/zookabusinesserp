/**
 * Storage and comparison helpers for high-performance state synchronization
 */

/**
 * Safely sets an item in localStorage with error handling for quota exceed errors
 */
export function safeStorageSet(key: string, value: any): boolean {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn(`LocalStorage quota exceeded while saving key "${key}". Skipping cache.`);
    } else {
      console.warn(`LocalStorage write error for key "${key}":`, err);
    }
    return false;
  }
}

/**
 * Safely gets and parses an item from localStorage with fallback
 */
export function safeStorageGet<T>(key: string, fallback: T, legacyKey?: string): T {
  try {
    let item = localStorage.getItem(key);
    if (!item && legacyKey) {
      item = localStorage.getItem(legacyKey);
      if (item) {
        safeStorageSet(key, item);
      }
    }
    if (!item || item === 'undefined' || item === 'null') return fallback;
    try {
      const parsed = JSON.parse(item);
      if (parsed === null || parsed === undefined) return fallback;
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed as T;
    } catch {
      // If parsing as JSON fails but fallback or item is a string, return the raw string value
      if (typeof fallback === 'string' && typeof item === 'string') {
        return item as unknown as T;
      }
      return fallback;
    }
  } catch (e) {
    console.warn(`Error reading key "${key}" from storage:`, e);
    return fallback;
  }
}

/**
 * Fast comparison for array state updates from Firestore onSnapshot
 * Avoids expensive JSON.stringify on every snapshot event when collections are identical
 */
export function hasCollectionChanged<T extends { id?: string; updatedAt?: string }>(
  prev: T[],
  next: T[]
): boolean {
  if (prev === next) return false;
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  if (prev.length === 0) return false;

  // Fast check by id and updatedAt timestamps
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (!a || !b) return true;
    if (a.id !== b.id) return true;
    if (a.updatedAt !== undefined || b.updatedAt !== undefined) {
      if (a.updatedAt !== b.updatedAt) return true;
    }
  }

  // If IDs and timestamps match, do shallow compare on objects
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i] as any;
    const b = next[i] as any;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return true;
    for (const key of keysA) {
      const valA = a[key];
      const valB = b[key];
      if (typeof valA !== 'object' && valA !== valB) {
        return true;
      }
    }
  }

  return false;
}
