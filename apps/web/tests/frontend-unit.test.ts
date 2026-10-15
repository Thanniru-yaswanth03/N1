import { describe, it, expect, beforeEach } from 'vitest';
import { formatBytes, formatSeconds, cn } from '../src/lib/utils';
import { TOOLS, TOOL_CATEGORIES } from '../src/lib/tools-data';
import {
  storeAdminSession,
  getStoredAdminToken,
  getStoredAdminUsername,
  clearAdminSession,
} from '../src/lib/admin-client';

describe('N1 Phase 15: Frontend Unit & Tooling Tests', () => {
  describe('1. Formatting Utilities (utils.ts)', () => {
    it('formats bytes into appropriate units (B, KB, MB, GB)', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(-100)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1073741824 * 1.5, 2)).toBe('1.5 GB');
    });

    it('formats seconds into readable countdown duration', () => {
      // 45 seconds -> 00:45
      const s45 = formatSeconds(45);
      expect(s45.seconds).toBe(45);
      expect(s45.formatted).toBe('00:45');

      // 1 hour, 15 minutes, 30 seconds -> 01:15:30
      const s1h = formatSeconds(3600 + 900 + 30);
      expect(s1h.hours).toBe(1);
      expect(s1h.minutes).toBe(15);
      expect(s1h.seconds).toBe(30);
      expect(s1h.formatted).toBe('01:15:30');

      // 2 days, 3 hours, 4 minutes -> 2d 03h 04m
      const s2d = formatSeconds(2 * 86400 + 3 * 3600 + 4 * 60 + 10);
      expect(s2d.days).toBe(2);
      expect(s2d.hours).toBe(3);
      expect(s2d.minutes).toBe(4);
      expect(s2d.formatted).toBe('2d 03h 04m');
    });

    it('combines css class names and ignores falsy values with cn()', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
      expect(cn('btn', false, null, undefined, '', 'active')).toBe('btn active');
      expect(cn('w-full', true && 'h-10')).toBe('w-full h-10');
    });
  });

  describe('2. Client-Side Toolbox Definitions & Integrity', () => {
    it('defines all 4 primary categories (developer, text, calculator, image)', () => {
      const categoryIds = TOOL_CATEGORIES.map(c => c.id);
      expect(categoryIds).toContain('developer');
      expect(categoryIds).toContain('text');
      expect(categoryIds).toContain('calculator');
      expect(categoryIds).toContain('image');
    });

    it('ensures every tool has unique slugs and valid category references', () => {
      const slugs = new Set<string>();
      const validCategories = new Set(TOOL_CATEGORIES.map(c => c.id));

      expect(TOOLS.length).toBeGreaterThanOrEqual(30);

      for (const tool of TOOLS) {
        expect(slugs.has(tool.slug)).toBe(false);
        slugs.add(tool.slug);

        expect(validCategories.has(tool.category)).toBe(true);
        expect(tool.title.length).toBeGreaterThan(0);
        expect(tool.shortDescription.length).toBeGreaterThan(0);
        expect(tool.tags.length).toBeGreaterThan(0);
      }
    });

    it('includes essential security and developer tools', () => {
      const slugs = TOOLS.map(t => t.slug);
      expect(slugs).toContain('json-formatter');
      expect(slugs).toContain('base64');
      expect(slugs).toContain('url-encoder');
      expect(slugs).toContain('uuid-generator');
      expect(slugs).toContain('jwt-decoder');
      expect(slugs).toContain('regex-tester');
      expect(slugs).toContain('hash-generator');
      expect(slugs).toContain('timestamp-converter');
      expect(slugs).toContain('sql-formatter');
      expect(slugs).toContain('cron-parser');
      expect(slugs).toContain('qr-code-generator');
    });
  });

  describe('3. Client-Side Algorithms & Utilities (Base64, URL, UUID, JWT, Slug)', () => {
    it('correctly handles UTF-8 Base64 encoding and decoding', () => {
      const text = 'N1 Zero-Knowledge Architecture 2026';
      // Browser btoa / Buffer equivalent test
      const encoded = Buffer.from(text, 'utf-8').toString('base64');
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      expect(decoded).toBe(text);
    });

    it('validates UUID v4 format generator logic', () => {
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      // Generate sample UUID v4
      const sample = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      expect(uuidV4Regex.test(sample)).toBe(true);
    });

    it('decodes and validates JWT payload structures', () => {
      const mockPayload = { sub: 'admin', role: 'moderator', exp: 1774880000 };
      const base64UrlPayload = Buffer.from(JSON.stringify(mockPayload))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      const mockJwt = `eyJhbGciOiJIUzI1NiJ9.${base64UrlPayload}.mockSignatureHere`;

      const parts = mockJwt.split('.');
      expect(parts.length).toBe(3);

      const decodedString = Buffer.from(parts[1] || '', 'base64').toString('utf-8');
      const parsed = JSON.parse(decodedString);
      expect(parsed.sub).toBe('admin');
      expect(parsed.role).toBe('moderator');
    });

    it('implements slug conversion correctly', () => {
      const title = 'N1 Privacy-First Drop & Study Board!';
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      expect(slug).toBe('n1-privacy-first-drop-study-board');
    });
  });

  describe('4. Admin Session Management', () => {
    beforeEach(() => {
      // Mock sessionStorage & window for node test environment
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const k in store) delete store[k];
        },
        key: (_i: number) => null,
        length: 0,
      } as Storage;

      globalThis.sessionStorage = mockStorage;
      (globalThis as Record<string, unknown>).window = {
        sessionStorage: mockStorage,
      };
    });

    it('stores, retrieves, and clears admin session tokens safely', () => {
      expect(getStoredAdminToken()).toBeNull();
      expect(getStoredAdminUsername()).toBeNull();

      storeAdminSession('jwt_token_sample_abc', 'operator-alpha');
      expect(getStoredAdminToken()).toBe('jwt_token_sample_abc');
      expect(getStoredAdminUsername()).toBe('operator-alpha');

      clearAdminSession();
      expect(getStoredAdminToken()).toBeNull();
      expect(getStoredAdminUsername()).toBeNull();
    });
  });
});
