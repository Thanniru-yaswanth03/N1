/**
 * Client-Side Recent Drops Storage
 *
 * PRIVACY GUARANTEES:
 * 1. Stored exclusively in the user's browser localStorage.
 * 2. NEVER transmitted to any server or API endpoint.
 * 3. Zero user accounts or tracking identifiers.
 * 4. Graceful fallbacks for private browsing, quota limits, or corrupted JSON.
 */

export interface RecentDropItem {
  code: string;
  createdAt: string;
  expiresAt: string;
  ownerDeletionToken?: string;
  dropType?: 'text' | 'files';
  fileCount?: number;
}

const STORAGE_KEY = 'n1_client_recent_drops_v1';
const MAX_RECENT_DROPS = 30;

export function getRecentDrops(): RecentDropItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    // Validate and sanitize records
    const validItems: RecentDropItem[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item.code === 'string' &&
        /^[A-Z0-9]{6}$/.test(item.code.toUpperCase()) &&
        typeof item.createdAt === 'string' &&
        typeof item.expiresAt === 'string'
      ) {
        validItems.push({
          code: item.code.toUpperCase(),
          createdAt: item.createdAt,
          expiresAt: item.expiresAt,
          ownerDeletionToken: typeof item.ownerDeletionToken === 'string' ? item.ownerDeletionToken : undefined,
          dropType: item.dropType === 'files' ? 'files' : 'text',
          fileCount: typeof item.fileCount === 'number' ? item.fileCount : undefined,
        });
      }
    }

    return validItems;
  } catch (err) {
    console.warn('[RecentDrops] Failed to read from localStorage:', err);
    return [];
  }
}

export function saveRecentDrop(item: RecentDropItem): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getRecentDrops();
    // Prepend new item and filter out duplicate code if already present
    const updated = [
      {
        ...item,
        code: item.code.toUpperCase(),
      },
      ...existing.filter(i => i.code !== item.code.toUpperCase()),
    ].slice(0, MAX_RECENT_DROPS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    dispatchRecentDropsChange();
  } catch (err) {
    console.warn('[RecentDrops] Failed to save to localStorage (private browsing or quota limit):', err);
  }
}

export function removeRecentDrop(code: string): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getRecentDrops();
    const updated = existing.filter(i => i.code !== code.toUpperCase());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    dispatchRecentDropsChange();
  } catch (err) {
    console.warn('[RecentDrops] Failed to remove drop from localStorage:', err);
  }
}

export function clearAllRecentDrops(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    dispatchRecentDropsChange();
  } catch (err) {
    console.warn('[RecentDrops] Failed to clear localStorage:', err);
  }
}

function dispatchRecentDropsChange(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('n1_recent_drops_changed'));
  } catch {
    // ignore
  }
}
