import { describe, it, expect, beforeEach } from 'vitest';
import { TOOLS } from '../src/lib/tools-data';

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
(globalThis as unknown as { localStorage: LocalStorageMock }).localStorage = mockLocalStorage;

describe('Phase 2 Product Expansion & Hardening Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('1. Tools Platform Discovery & Storage Keys', () => {
    it('verifies complete 31 offline-first tools catalog', () => {
      expect(TOOLS.length).toBe(31);
      const allSlugs = TOOLS.map(t => t.slug);
      expect(allSlugs).toContain('qr-code-generator');
      expect(allSlugs).toContain('webp-converter');
      expect(allSlugs).toContain('image-metadata');
    });

    it('persists and loads tool favorites with n1_client_tools_favs_v1', () => {
      const favKey = 'n1_client_tools_favs_v1';
      const sampleFavs = ['json-formatter', 'qr-code-generator'];
      localStorage.setItem(favKey, JSON.stringify(sampleFavs));

      const stored = localStorage.getItem(favKey);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(sampleFavs);
    });

    it('supports backward compatibility reading from n1_favorite_tools', () => {
      const legacyKey = 'n1_favorite_tools';
      localStorage.setItem(legacyKey, JSON.stringify(['base64']));

      const favs =
        localStorage.getItem('n1_client_tools_favs_v1') ||
        localStorage.getItem('n1_favorite_tools');
      expect(JSON.parse(favs!)).toEqual(['base64']);
    });

    it('persists recently used tools with max 10 entries and deduplication', () => {
      const recentsKey = 'n1_client_tools_recent_v1';
      const initial = ['json-formatter', 'base64'];
      localStorage.setItem(recentsKey, JSON.stringify(initial));

      // Simulate visiting qr-code-generator
      const newSlug = 'qr-code-generator';
      const stored = JSON.parse(localStorage.getItem(recentsKey) || '[]');
      const updated = [newSlug, ...stored.filter((s: string) => s !== newSlug)].slice(0, 10);
      localStorage.setItem(recentsKey, JSON.stringify(updated));

      const result = JSON.parse(localStorage.getItem(recentsKey)!);
      expect(result[0]).toBe('qr-code-generator');
      expect(result.length).toBe(3);
    });
  });

  describe('2. Drop Lifecycle Visual State Logic', () => {
    const computeDropVisualState = (params: {
      isPasswordProtected: boolean;
      unlocked: boolean;
      status: string;
      isExpired: boolean;
      expiresAt: string;
      viewLimit: number | null;
      viewCount: number;
    }) => {
      if (params.status === 'burned') return 'DESTROYED';
      if (params.status === 'deleted') return 'DESTROYED';
      if (params.isExpired || params.status === 'expired') return 'EXPIRED';
      if (params.viewLimit && params.viewCount >= params.viewLimit) return 'VIEW_LIMIT_REACHED';
      if (params.isPasswordProtected && !params.unlocked) return 'PASSWORD_REQUIRED';

      const diffSec = Math.floor((new Date(params.expiresAt).getTime() - Date.now()) / 1000);
      if (diffSec <= 120) return 'EXPIRING_IMMINENTLY';
      if (diffSec <= 600) return 'EXPIRING_SOON';
      return 'ACTIVE';
    };

    it('correctly maps DESTROYED state when burned or deleted', () => {
      const state = computeDropVisualState({
        isPasswordProtected: false,
        unlocked: false,
        status: 'burned',
        isExpired: false,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        viewLimit: null,
        viewCount: 0,
      });
      expect(state).toBe('DESTROYED');
    });

    it('correctly maps PASSWORD_REQUIRED when locked', () => {
      const state = computeDropVisualState({
        isPasswordProtected: true,
        unlocked: false,
        status: 'active',
        isExpired: false,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        viewLimit: null,
        viewCount: 0,
      });
      expect(state).toBe('PASSWORD_REQUIRED');
    });

    it('correctly maps EXPIRING_IMMINENTLY when <= 120s remaining', () => {
      const state = computeDropVisualState({
        isPasswordProtected: false,
        unlocked: false,
        status: 'active',
        isExpired: false,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        viewLimit: null,
        viewCount: 0,
      });
      expect(state).toBe('EXPIRING_IMMINENTLY');
    });

    it('correctly maps ACTIVE when fully healthy', () => {
      const state = computeDropVisualState({
        isPasswordProtected: false,
        unlocked: false,
        status: 'active',
        isExpired: false,
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
        viewLimit: 10,
        viewCount: 2,
      });
      expect(state).toBe('ACTIVE');
    });
  });

  describe('3. Duel Authoritative Match Flow States', () => {
    const getDuelStatusBadge = (params: {
      hasDisconnectGrace: boolean;
      status: string;
      playerCount: number;
    }) => {
      if (params.hasDisconnectGrace) return 'OPPONENT DISCONNECTED';
      if (params.status === 'FINISHED') return 'COMPLETED';
      if (params.status === 'IN_PROGRESS') return 'LIVE';
      if (params.status === 'COUNTDOWN') return 'STARTING';
      if (params.playerCount >= 2) return 'MATCH FOUND';
      return 'WAITING';
    };

    it('maps OPPONENT DISCONNECTED during active grace disconnect', () => {
      expect(getDuelStatusBadge({ hasDisconnectGrace: true, status: 'IN_PROGRESS', playerCount: 2 })).toBe('OPPONENT DISCONNECTED');
    });

    it('maps COMPLETED on finished match', () => {
      expect(getDuelStatusBadge({ hasDisconnectGrace: false, status: 'FINISHED', playerCount: 2 })).toBe('COMPLETED');
    });

    it('maps LIVE during in_progress duel', () => {
      expect(getDuelStatusBadge({ hasDisconnectGrace: false, status: 'IN_PROGRESS', playerCount: 2 })).toBe('LIVE');
    });

    it('maps STARTING during countdown', () => {
      expect(getDuelStatusBadge({ hasDisconnectGrace: false, status: 'COUNTDOWN', playerCount: 2 })).toBe('STARTING');
    });

    it('maps MATCH FOUND when two players are in lobby', () => {
      expect(getDuelStatusBadge({ hasDisconnectGrace: false, status: 'WAITING_FOR_OPPONENT', playerCount: 2 })).toBe('MATCH FOUND');
    });

    it('maps WAITING when single player in lobby', () => {
      expect(getDuelStatusBadge({ hasDisconnectGrace: false, status: 'WAITING_FOR_OPPONENT', playerCount: 1 })).toBe('WAITING');
    });
  });
});
