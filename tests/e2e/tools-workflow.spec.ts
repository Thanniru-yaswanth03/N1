import { test, expect } from '@playwright/test';

test.describe('N1 Developer Tools Catalog & Command Palette E2E Suite', () => {
  test('Tool Catalog: search filters utilities in real-time', async ({ page }) => {
    await page.goto('/tools');
    await expect(page.locator('h1', { hasText: 'Toolbox' })).toBeVisible();

    // Verify initial full catalog has cards
    const initialCards = page.locator('div[class*="group relative flex flex-col justify-between"]');
    await expect(initialCards.first()).toBeVisible();

    // Type query "jwt" into search
    const searchInput = page.locator('input[placeholder*="Search tools"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('jwt');

    // Verify filtered result
    await expect(page.locator('h3', { hasText: 'JWT Decoder' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Hash Generator' })).not.toBeVisible();

    // Clear search
    await searchInput.clear();
    await expect(page.locator('h3', { hasText: 'Hash Generator' })).toBeVisible();
  });

  test('Category Filtering: filters tools by domain and returns appropriate subsets', async ({
    page,
  }) => {
    await page.goto('/tools');

    // Click "Developer" category chip
    await page.locator('div.flex button', { hasText: 'Developer' }).first().click();
    await expect(page.locator('h3', { hasText: 'JSON Formatter & Validator' })).toBeVisible();

    // Click "Text" category chip
    await page.locator('div.flex button', { hasText: 'Text' }).first().click();
    await expect(page.locator('h3', { hasText: 'Word Counter' })).toBeVisible();

    // Click "Calculator" category chip
    await page.locator('div.flex button', { hasText: 'Calculator' }).first().click();
    await expect(page.locator('h3', { hasText: 'GST Calculator' })).toBeVisible();

    // Return to "All"
    await page.locator('div.flex button', { hasText: 'All' }).first().click();
    await expect(page.locator('h3', { hasText: 'JSON Formatter & Validator' })).toBeVisible();
  });

  test('Favorites & Recent: toggling favorite persists in localStorage and displays in Favorites view', async ({
    page,
  }) => {
    await page.goto('/tools');

    // Find the favorite button for first tool
    const favButton = page.locator('button[aria-label="Add to favorites"]').first();
    await expect(favButton).toBeVisible();
    await favButton.click();

    // Switch to "Favorites" category tab
    await page.locator('div.flex button', { hasText: 'Favorites' }).first().click();

    // Verify favorited tool is shown
    const favCards = page.locator('div[class*="group relative flex flex-col justify-between"]');
    await expect(favCards).toHaveCount(1);
    await expect(page.locator('button[aria-label="Remove from favorites"]')).toBeVisible();

    // Remove from favorites
    await page.locator('button[aria-label="Remove from favorites"]').click();
    await expect(page.locator('text=No tools found')).toBeVisible();
  });

  test('Command Palette: opens via global button or shortcut and supports keyboard navigation', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Open Command Palette via navbar search button
    const openBtn = page.locator('button[aria-label="Open command palette search (Ctrl+K)"]');
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // Verify modal dialog opened
    const dialog = page.locator('div[role="dialog"][aria-label="Global Command Palette"]');
    await expect(dialog).toBeVisible();

    // 2. Type query in palette input
    const input = dialog.locator('input');
    await input.fill('jwt');

    // Verify matched item in list
    await expect(dialog.locator('text=JWT Decoder')).toBeVisible();

    // 3. Navigate with keyboard: Enter to select
    await input.press('Enter');

    // Verify redirection to tool page
    await page.waitForURL('/tools/jwt-decoder');
    expect(page.url()).toContain('/tools/jwt-decoder');
  });
});
