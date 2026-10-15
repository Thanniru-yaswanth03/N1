import { test, expect } from '@playwright/test';

test.describe('N1 Homepage, Navigation & Onboarding E2E Suite', () => {
  test('Homepage loads with hero, badges, pillar capabilities and footer', async ({ page }) => {
    await page.goto('/');

    // Check title and hero
    await expect(page).toHaveTitle(/N1/i);
    await expect(page.locator('h1', { hasText: 'Share without trace.' })).toBeVisible();

    // Check Badges
    await expect(page.locator('text=Anonymous • Zero-Account Platform')).toBeVisible();
    await expect(page.locator('section').first().getByText('Self-Destructing by Design')).toBeVisible();

    // Check 4 Platform Capabilities
    await expect(page.locator('h3', { hasText: 'N1 Drop' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Study Board' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Quably Duel' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Developer Toolbox' })).toBeVisible();

    // Check Footer Links
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer a', { hasText: 'Privacy Policy' }).first()).toBeVisible();
    await expect(page.locator('footer a', { hasText: 'Terms of Service' }).first()).toBeVisible();
  });

  test('Primary navigation links route correctly across all pillars and docs', async ({ page }) => {
    await page.goto('/');

    // Navigate to Drop
    await page.locator('nav a', { hasText: 'Drop' }).click();
    await page.waitForURL('/drop');
    await expect(page.locator('h1', { hasText: 'Create an Anonymous Drop' })).toBeVisible();

    // Navigate to Study Board
    await page.locator('nav a', { hasText: 'Study Board' }).click();
    await page.waitForURL('/board');
    await expect(page.locator('h1', { hasText: 'Collaborate Freely.' })).toBeVisible();

    // Navigate to Quably Duel
    await page.locator('nav a', { hasText: 'Quably Duel' }).click();
    await page.waitForURL('/duel');
    await expect(page.locator('h1', { hasText: 'Anonymous Multiplayer Quiz Arena' })).toBeVisible();

    // Navigate to Tools
    await page.locator('nav a', { hasText: 'Tools' }).click();
    await page.waitForURL('/tools');
    await expect(page.locator('h1', { hasText: 'Toolbox' })).toBeVisible();
  });

  test('Drop Code quick lookup validates format and navigates to recipient URL', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('#homepage-drop-code-input');
    const submitBtn = page.locator('button', { hasText: 'Open Drop →' });

    await expect(input).toBeVisible();

    // Test invalid short code validation
    await input.fill('123');
    await submitBtn.click();
    await expect(page.locator('text=Code must be exactly 6 alphanumeric characters')).toBeVisible();

    // Test valid formatted code redirect
    await input.fill('TEST99');
    await submitBtn.click();
    await page.waitForURL('/d/TEST99');
    expect(page.url()).toContain('/d/TEST99');
  });

  test('First-time onboarding guide banner displays and dismissal persists in localStorage', async ({
    page,
  }) => {
    // Clear localStorage to ensure first-time user state
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('n1_onboarding_dismissed_v1'));
    await page.reload();

    // Verify Welcome Guide banner is visible
    const guideBanner = page.locator('h2', { hasText: 'Welcome to N1' });
    await expect(guideBanner).toBeVisible();

    // Click "Got it, dismiss"
    await page.locator('button', { hasText: 'Got it, dismiss' }).click();

    // Verify banner is removed from DOM
    await expect(guideBanner).not.toBeVisible();

    // Reload page and verify banner stays dismissed
    await page.reload();
    await expect(guideBanner).not.toBeVisible();
  });
});
