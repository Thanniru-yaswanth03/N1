import { test, expect } from '@playwright/test';

test.describe('N1 Mobile Cross-Pillars Responsiveness & Layout Suite', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE / Compact mobile
  });

  test('Mobile: Homepage renders with zero horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1', { hasText: 'Share without trace.' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('Mobile: Study Board hub and canvas adapt cleanly', async ({ page }) => {
    await page.goto('/board');
    await expect(page.locator('h1', { hasText: 'Collaborate Freely.' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Launch Board
    await page.locator('button', { hasText: 'Create Anonymous Study Board →' }).click();
    await page.waitForURL(/\/board\/[A-Z0-9]{6}/);

    // Verify Board Header fits without breaking
    await expect(page.locator('header button', { hasText: 'Share' })).toBeVisible();
  });

  test('Mobile: Quably Duel lobby renders responsive challenge options', async ({ page }) => {
    await page.goto('/duel');
    await expect(page.locator('h1', { hasText: 'Anonymous Multiplayer Quiz Arena' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify create challenge button is reachable
    const createBtn = page.locator('button', { hasText: 'Create Challenge Room' });
    await expect(createBtn).toBeVisible();
  });

  test('Mobile: Developer Tools catalog cards stack cleanly with accessible touch targets', async ({
    page,
  }) => {
    await page.goto('/tools');
    await expect(page.locator('h1', { hasText: 'Toolbox' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify category chips are visible
    await expect(page.locator('div.flex button', { hasText: 'Developer' }).first()).toBeVisible();
    await expect(page.locator('div.flex button', { hasText: 'Text' }).first()).toBeVisible();
  });
});
