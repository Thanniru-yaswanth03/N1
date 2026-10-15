import { test, expect } from '@playwright/test';
import { forceExpireDrop, disconnectTestDb } from './helpers/test-db';

test.describe('Critical Scenario: Text Drop Full Lifecycle', () => {
  test.afterAll(async () => {
    await disconnectTestDb();
  });

  test('Create text Drop -> Receive code -> Open Drop -> Read text -> Copy text -> Expire Drop -> Verify access is rejected', async ({
    page,
    context,
  }) => {
    // 1. Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // 2. Navigate to Drop creation page
    await page.goto('/drop');
    await expect(page).toHaveTitle(/N1/i);

    // 3. Switch to Text Drop tab
    const textTabTrigger = page.locator('button', { hasText: 'Text Drop' });
    await textTabTrigger.click();

    // 4. Fill text payload
    const secretText = 'N1 Confidential Secret Message - Top Secret E2E Verification 2026';
    const textArea = page.locator('#text-drop-content');
    await textArea.fill(secretText);

    // Verify live character counter updates
    await expect(page.locator('text=/' + secretText.length + ' \\/ 10,000/')).toBeVisible();

    // 5. Select 1h Expiration
    const oneHourPill = page.locator('button', { hasText: '1h' }).first();
    await oneHourPill.click();

    // 6. Submit the Drop
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Create Text Drop' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 7. Receive code & verify redirect to success page
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const url = page.url();
    const codeMatch = url.match(/\/drop\/success\/([A-Z0-9]{6})/);
    expect(codeMatch).toBeTruthy();
    const dropCode = codeMatch![1];

    // Verify success page elements
    await expect(page.locator(`text=${dropCode}`).first()).toBeVisible();
    await expect(page.locator('text=Drop Created Successfully!')).toBeVisible();

    // 8. Open Drop recipient page
    await page.goto(`/d/${dropCode}`);

    // 9. Read text
    const textContainer = page.locator('pre');
    await expect(textContainer).toBeVisible();
    await expect(textContainer).toHaveText(secretText);

    // 10. Copy text
    const copyButton = page.locator('button', { hasText: 'Copy Text' });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await expect(page.locator('text=Copied!')).toBeVisible();

    // 11. Expire Drop (simulating background TTL expiration)
    await forceExpireDrop(dropCode);

    // 12. Verify access is rejected on subsequent request
    await page.reload();
    await expect(page.getByRole('heading', { name: 'This Drop has expired.' })).toBeVisible();
    await expect(page.locator('pre')).toHaveCount(0);
    await expect(page.locator('text=Create a new Drop')).toBeVisible();
  });
});
