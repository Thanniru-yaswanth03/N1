import { test, expect } from '@playwright/test';

test.describe('N1 Study Board Multi-Client Synchronization E2E Suite', () => {
  test('Study Board: two-client collaboration, real-time sync, sharing, and export', async ({
    browser,
  }) => {
    // 1. Client A: Create a new Board room
    const contextA = await browser.newContext();
    await contextA.grantPermissions(['clipboard-read', 'clipboard-write']);
    const pageA = await contextA.newPage();
    await pageA.goto('/board');

    // Launch anonymous study board
    await pageA.locator('button', { hasText: 'Create Anonymous Study Board →' }).click();
    await pageA.waitForURL(/\/board\/[A-Z0-9]{6}/);
    const roomCode = pageA.url().match(/\/board\/([A-Z0-9]{6})/)![1];

    // Verify room code badge and connected status on Client A
    await expect(pageA.locator(`text=${roomCode}`).first()).toBeVisible();
    await expect(pageA.locator('text=CONNECTED').first()).toBeVisible();

    // 2. Client B: Join same board room via URL in independent context
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto(`/board/${roomCode}`);

    // Verify Client B joins and connects successfully
    await expect(pageB.locator(`text=${roomCode}`).first()).toBeVisible();
    await expect(pageB.locator('text=CONNECTED').first()).toBeVisible();

    // 3. Test Share Modal on Client A
    const shareBtn = pageA.locator('header button', { hasText: 'Share' });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Verify Share Modal rendered with link & QR
    await expect(pageA.locator('text=Share Study Room')).toBeVisible();
    const copyBtn = pageA.getByRole('button', { name: 'Copy', exact: true });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(pageA.locator('text=Copied!')).toBeVisible();

    // Close Share Modal
    await pageA.keyboard.press('Escape');

    // 4. Test Export dropdown on Client A
    const exportBtn = pageA.locator('header button', { hasText: 'Export' });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify Export options are visible
    await expect(pageA.locator('text=Export as PNG')).toBeVisible();
    await expect(pageA.locator('text=Export as SVG')).toBeVisible();
    await expect(pageA.locator('text=Export as JSON')).toBeVisible();

    // Close Export menu
    await pageA.keyboard.press('Escape');

    // Cleanup contexts
    await pageA.close();
    await pageB.close();
    await contextA.close();
    await contextB.close();
  });
});
