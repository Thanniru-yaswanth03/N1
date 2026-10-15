import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRecentDrops,
  saveRecentDrop,
  removeRecentDrop,
  clearAllRecentDrops,
  RecentDropItem,
} from '../src/lib/recent-drops';

class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockLocalStorage = new LocalStorageMock();

// Setup global window mock
(globalThis as any).window = {
  localStorage: mockLocalStorage,
  dispatchEvent: vi.fn(),
};

describe('Task 5: Client-Side Recent Drops Storage & Privacy Integrity', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores and retrieves recent drops correctly', () => {
    const item1: RecentDropItem = {
      code: 'ABC123',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      ownerDeletionToken: 'token-123',
      dropType: 'text',
    };

    saveRecentDrop(item1);

    const items = getRecentDrops();
    expect(items.length).toBe(1);
    expect(items[0]?.code).toBe('ABC123');
    expect(items[0]?.ownerDeletionToken).toBe('token-123');
    expect(items[0]?.dropType).toBe('text');
  });

  it('deduplicates drops by code and orders by most recently added', () => {
    saveRecentDrop({
      code: 'FIRST1',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      ownerDeletionToken: 'tok-1',
    });

    saveRecentDrop({
      code: 'SECOND',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      ownerDeletionToken: 'tok-2',
    });

    saveRecentDrop({
      code: 'FIRST1', // Update existing
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      ownerDeletionToken: 'tok-1-updated',
    });

    const items = getRecentDrops();
    expect(items.length).toBe(2);
    expect(items[0]?.code).toBe('FIRST1');
    expect(items[0]?.ownerDeletionToken).toBe('tok-1-updated');
    expect(items[1]?.code).toBe('SECOND');
  });

  it('allows removing individual drop entries', () => {
    saveRecentDrop({
      code: 'REMOVE',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    });
    saveRecentDrop({
      code: 'REMAIN',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    });

    removeRecentDrop('REMOVE');

    const items = getRecentDrops();
    expect(items.length).toBe(1);
    expect(items[0]?.code).toBe('REMAIN');
  });

  it('allows clearing all entries', () => {
    saveRecentDrop({ code: 'CODE01', createdAt: '', expiresAt: '' });
    saveRecentDrop({ code: 'CODE02', createdAt: '', expiresAt: '' });

    clearAllRecentDrops();

    const items = getRecentDrops();
    expect(items.length).toBe(0);
  });

  it('gracefully handles corrupted localStorage JSON without crashing', () => {
    window.localStorage.setItem('n1_client_recent_drops_v1', 'not valid json {{{');
    const items = getRecentDrops();
    expect(items).toEqual([]);
  });

  it('gracefully handles storage quota exceptions (e.g., Safari private browsing)', () => {
    const setItemSpy = vi.spyOn(mockLocalStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    // Should not throw exception
    expect(() => {
      saveRecentDrop({ code: 'QUOTA1', createdAt: '', expiresAt: '' });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });
});
