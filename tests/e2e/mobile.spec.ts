import { test, expect } from '@playwright/test';

test.describe('N1 Mobile Layout & Responsiveness Suite', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14 / modern smartphone
  });

  test('Mobile navigation drawer opens and navigates smoothly', async ({ page }) => {
    await page.goto('/');

    // Verify Hamburger button is visible on mobile
    const hamburgerBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(hamburgerBtn).toBeVisible();

    // Open mobile menu
    await hamburgerBtn.click();

    // Verify drawer items
    await expect(page.getByRole('link', { name: 'Drop', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tools', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Study Board', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quably Duel', exact: true })).toBeVisible();

    // Click Tools link
    await page.getByRole('link', { name: 'Tools', exact: true }).click();
    await page.waitForURL('/tools');
    await expect(page.locator('h1', { hasText: 'Toolbox' })).toBeVisible();
  });

  test('Mobile Drop Creation Page: responsive layout without horizontal overflow', async ({
    page,
  }) => {
    await page.goto('/drop');

    // Verify elements are properly sized and readable
    await expect(page.locator('h1', { hasText: 'Create an Anonymous Drop' })).toBeVisible();

    // Verify tabs are visible and clickable on mobile
    const filesTab = page.locator('button', { hasText: /Files Drop/i });
    const textTab = page.locator('button', { hasText: /Text Drop/i });
    await expect(filesTab).toBeVisible();
    await expect(textTab).toBeVisible();

    await textTab.click();
    const textArea = page.locator('#text-drop-content');
    await expect(textArea).toBeVisible();
    await textArea.fill('Mobile test typing content 2026.');

    // Check no horizontal scrollbar overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
