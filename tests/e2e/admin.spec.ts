import { test, expect } from '@playwright/test';

test.describe('N1 Admin & Moderation Console E2E Suite', () => {
  test('Admin Authentication Guard, Login, and Tab Navigation', async ({ page }) => {
    // 1. Visiting /admin while unauthenticated redirects to /admin/login
    await page.goto('/admin');
    await page.waitForURL('/admin/login');
    await expect(page.locator('h1', { hasText: 'System Administration' })).toBeVisible();

    // 2. Attempt login with invalid credentials
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••••••').fill('WrongPassword123!');
    await page.locator('button[type="submit"]', { hasText: 'Enter Admin Portal' }).click();

    await expect(page.locator('text=Invalid admin username or password')).toBeVisible();

    // 3. Login with valid credentials
    await page.getByPlaceholder('••••••••••••').fill('N1SecureAdminPassword2026!');
    await page.locator('button[type="submit"]', { hasText: 'Enter Admin Portal' }).click();

    // Redirected to /admin dashboard
    await page.waitForURL('/admin');
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByText('Operator:')).toBeVisible();

    // 4. Verify all navigation tabs are present
    const tabs = [
      'Drops Moderation',
      'Abuse Reports',
      'Blocked Sources',
      'System & Storage',
      'Security Audit Logs',
    ];
    for (const tabName of tabs) {
      const tabButton = page.locator('button', { hasText: tabName });
      await expect(tabButton).toBeVisible();
    }

    // 5. Switch to Abuse Reports tab
    await page.locator('button', { hasText: 'Abuse Reports' }).click();
    await expect(page.locator('text=Total Reports:')).toBeVisible();

    // 6. Switch to Blocked Sources tab
    await page.locator('button', { hasText: 'Blocked Sources' }).click();
    await expect(page.locator('text=Blocked Source Signatures')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Add Source Block' })).toBeVisible();

    // 7. Switch to System & Storage tab
    await page.locator('button', { hasText: 'System & Storage' }).click();
    await expect(page.locator('text=System State')).toBeVisible();
    await expect(page.locator('text=MongoDB Connection')).toBeVisible();

    // 8. Switch to Security Audit Logs tab
    await page.locator('button', { hasText: 'Security Audit Logs' }).click();
    await expect(page.locator('text=Total Audit Events:')).toBeVisible();

    // 9. Verify sensitive secrets are never leaked in the client DOM
    const content = await page.content();
    expect(content.includes('$2a$')).toBe(false); // No raw bcrypt hash leaked
    expect(content.includes('LOCAL_STORAGE_PATH')).toBe(false);

    // 10. Logout workflow
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('/admin/login');
    await expect(page.locator('h1', { hasText: 'System Administration' })).toBeVisible();
  });
});
