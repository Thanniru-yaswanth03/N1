import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 320, height: 568, name: '320px-iphone-se1' },
  { width: 375, height: 667, name: '375px-iphone-se2' },
  { width: 390, height: 844, name: '390px-iphone-14' },
  { width: 414, height: 896, name: '414px-iphone-xr' },
  { width: 430, height: 932, name: '430px-iphone-15-pro-max' },
  { width: 768, height: 1024, name: '768px-ipad-mini' },
];

test.describe('N1 Targeted Mobile UX Audit — Multi-Viewport Verification', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`[${vp.width}px] Core Static & Content Routes (/, /tools, /help, /privacy, /terms)`, async ({ page }) => {
        const routes = ['/', '/tools', '/tools/json-formatter', '/help', '/privacy', '/terms'];

        for (const route of routes) {
          await page.goto(route);
          await page.waitForLoadState('domcontentloaded');

          const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });
          expect(hasOverflow, `Route ${route} should not have horizontal overflow at ${vp.width}px`).toBe(false);
        }
      });

      test(`[${vp.width}px] Drop Pillar Flow (/drop, /drop/success/[code], /d/[code])`, async ({ page }) => {
        // 1. /drop create page
        await page.goto('/drop');
        await page.waitForLoadState('domcontentloaded');
        let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `/drop should not overflow at ${vp.width}px`).toBe(false);

        // Create a fast text drop
        await page.locator('button[role="tab"]', { hasText: 'Text' }).click();
        await page.locator('textarea#text-drop-content').fill('Playwright Mobile Audit Payload');
        await page.locator('button[type="submit"]').click();

        // 2. /drop/success/[code]
        await page.waitForURL(/\/drop\/success\/[A-Za-z0-9]{6}/);
        overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `/drop/success/[code] should not overflow at ${vp.width}px`).toBe(false);

        // Verify copy code button & share button are visible and clickable
        await expect(page.locator('button', { hasText: /Copy Code/i })).toBeVisible();
        const shareBtn = page.locator('button', { hasText: 'Share' });
        await expect(shareBtn).toBeVisible();

        // 3. /d/[code] recipient page
        const codeMatch = page.url().match(/\/drop\/success\/([A-Za-z0-9]{6})/);
        const code = codeMatch ? codeMatch[1] : '';
        await page.goto(`/d/${code}`);
        await page.waitForLoadState('domcontentloaded');
        overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `/d/[code] should not overflow at ${vp.width}px`).toBe(false);
      });

      test(`[${vp.width}px] Study Board Flow (/board, /board/[code])`, async ({ page }) => {
        // 1. /board hub
        await page.goto('/board');
        await page.waitForLoadState('domcontentloaded');
        let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `/board should not overflow at ${vp.width}px`).toBe(false);

        // Launch board
        await page.locator('button', { hasText: 'Create Anonymous Study Board →' }).click();
        await page.waitForURL(/\/board\/[A-Z0-9]{6}/);
        overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `/board/[code] should not overflow at ${vp.width}px`).toBe(false);

        // Verify canvas & toolbar & header controls
        await expect(page.locator('header button', { hasText: /Share/i })).toBeVisible();
        await expect(page.locator('aside[aria-label="Drawing tools"]')).toBeVisible();
        await expect(page.locator('div[aria-label="Canvas Zoom and Fit Controls"]')).toBeVisible();

        // Open Share Modal
        await page.locator('header button', { hasText: /Share/i }).click();
        await expect(page.locator('div[role="dialog"]')).toBeVisible();
        overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `ShareModal should not cause overflow at ${vp.width}px`).toBe(false);
      });

      test(`[${vp.width}px] Quably Duel Flow (/duel, /duel/[code])`, async ({ page }) => {
        // 1. /duel lobby hub
        await page.goto('/duel');
        await page.waitForLoadState('domcontentloaded');
        let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `/duel should not overflow at ${vp.width}px`).toBe(false);

        // Create duel room
        await page.locator('button', { hasText: 'Create Challenge Room' }).click();
        await page.waitForURL(/\/duel\/[A-Z0-9]{6}/);
        overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow, `/duel/[code] should not overflow at ${vp.width}px`).toBe(false);

        // Verify room code & copy link buttons
        await expect(page.locator('button', { hasText: /Copy Code/i })).toBeVisible();
        await expect(page.locator('button', { hasText: /Copy Link/i })).toBeVisible();
      });
    });
  }
});
