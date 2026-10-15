import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { disconnectTestDb } from './helpers/test-db';

test.describe('N1 Drop ShareSheet & Sharing Fallback E2E Suite', () => {
  test.afterAll(async () => {
    await disconnectTestDb();
  });

  test('Drop Success: ShareSheet modal, QR code download, and copy link fallback', async ({
    page,
    context,
  }) => {
    // 1. Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // 2. Create a Text Drop
    await page.goto('/drop');
    await page.locator('button', { hasText: 'Text Drop' }).click();
    await page.locator('#text-drop-content').fill('ShareSheet and QR Download E2E Verification Payload 2026');

    // Submit
    await page.locator('button[type="submit"]', { hasText: 'Create Text Drop' }).click();
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const dropCode = page.url().match(/\/drop\/success\/([A-Z0-9]{6})/)![1];

    // 3. Test QR code download directly from success page
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button', { hasText: 'Download QR (.PNG)' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`n1-drop-${dropCode}.png`);

    // Verify downloaded file has valid PNG magic bytes
    const filePath = await download.path();
    const buffer = fs.readFileSync(filePath!);
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);

    // 4. Open ShareSheet Modal via "Share" button
    const shareBtn = page.locator('button[aria-label="Open Share Modal"]');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Verify ShareSheet modal contents
    await expect(page.locator(`text=Drop #${dropCode}`).first()).toBeVisible();
    await expect(page.locator('text=Shareable Link')).toBeVisible();

    // 5. Test Copy Link inside ShareSheet
    const copyLinkBtn = page.locator('button', { hasText: 'Copy Link' }).last();
    await copyLinkBtn.click();
    await expect(page.locator('button', { hasText: '✓ Copied' }).first()).toBeVisible();

    // 6. Test Show QR toggle inside ShareSheet
    const showQrBtn = page.locator('button', { hasText: 'Show QR' });
    if (await showQrBtn.isVisible()) {
      await showQrBtn.click();
      await expect(page.locator('button', { hasText: 'Download QR' }).last()).toBeVisible();
      await expect(page.locator('button', { hasText: 'Hide QR' })).toBeVisible();
    }

    // Close ShareSheet
    await page.keyboard.press('Escape');
  });
});
