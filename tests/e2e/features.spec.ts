import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { disconnectTestDb } from './helpers/test-db';

test.describe('N1 Feature Scenarios E2E Suite', () => {
  test.afterAll(async () => {
    await disconnectTestDb();
  });

  test('Password-Protected Drop: enforces passphrase challenge and decrypts upon valid entry', async ({
    page,
  }) => {
    await page.goto('/drop');

    // Switch to Text tab
    await page.locator('button', { hasText: 'Text Drop' }).click();
    await page.locator('#text-drop-content').fill('Top Secret Passphrase Protected Content 2026');

    // Enable Password Protection
    await page.locator('label[for="password-toggle"]').click();

    // Enter passphrase
    const secretPassphrase = 'CorrectHorseBatteryStaple!2026';
    const passwordInput = page.getByPlaceholder(/Enter a secret passphrase/i);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(secretPassphrase);

    // Submit
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Create Text Drop' });
    await submitBtn.click();

    // Success page
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const dropCode = page.url().match(/\/drop\/success\/([A-Z0-9]{6})/)![1];

    // Navigate to recipient page
    await page.goto(`/d/${dropCode}`);

    // Verify Passphrase Required challenge
    await expect(page.locator('text=Passphrase Required')).toBeVisible();
    await expect(page.locator('pre')).toHaveCount(0);

    // Attempt invalid passphrase
    const unlockInput = page.locator('#passphrase-input');
    await unlockInput.fill('WrongPassword123');
    await page.locator('button', { hasText: 'Unlock Drop Content' }).click();

    // Verify error feedback
    await expect(page.locator('text=The passphrase you entered is incorrect.')).toBeVisible();

    // Enter correct passphrase
    await unlockInput.fill(secretPassphrase);
    await page.locator('button', { hasText: 'Unlock Drop Content' }).click();

    // Verify decrypted content is now visible
    const textContainer = page.locator('pre');
    await expect(textContainer).toBeVisible();
    await expect(textContainer).toHaveText('Top Secret Passphrase Protected Content 2026');
  });

  test('View Limit: enforces view count cutoff and expires drop once limit is reached', async ({
    page,
  }) => {
    await page.goto('/drop');
    await page.locator('button', { hasText: 'Text Drop' }).click();
    await page.locator('#text-drop-content').fill('Limited View Secret Information');

    // Select 2 views limit
    const viewLimitSelect = page.locator('#view-limit-select');
    await viewLimitSelect.selectOption('2');

    // Submit
    await page.locator('button[type="submit"]', { hasText: 'Create Text Drop' }).click();
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const dropCode = page.url().match(/\/drop\/success\/([A-Z0-9]{6})/)![1];

    // View 1
    await page.goto(`/d/${dropCode}`);
    await expect(page.locator('text=Limited View Secret Information')).toBeVisible();
    await expect(page.locator('text=Views: 1 / 2')).toBeVisible();

    // View 2 (final view)
    await page.goto(`/d/${dropCode}`);
    await expect(page.locator('text=Limited View Secret Information')).toBeVisible();
    await expect(page.locator('text=Final view accessed')).toBeVisible();

    // View 3 (exceeded)
    await page.goto(`/d/${dropCode}`);
    await expect(page.getByRole('heading', { name: 'This Drop has expired.' })).toBeVisible();
    await expect(page.locator('pre')).toHaveCount(0);
  });

  test('Burn-After-Reading: destroys drop immediately upon first reading', async ({ page }) => {
    await page.goto('/drop');
    await page.locator('button', { hasText: 'Text Drop' }).click();
    await page.locator('#text-drop-content').fill('Burn After Reading Mission Orders');

    // Enable Burn-After-Reading
    await page.locator('label[for="burn-toggle"]').click();

    // Submit
    await page.locator('button[type="submit"]', { hasText: 'Create Text Drop' }).click();
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const dropCode = page.url().match(/\/drop\/success\/([A-Z0-9]{6})/)![1];

    // Open Drop: first read
    await page.goto(`/d/${dropCode}`);
    await expect(page.locator('text=Burn-After-Reading Active')).toBeVisible();
    await expect(page.locator('text=Burn After Reading Mission Orders')).toBeVisible();

    // Attempt second read by reloading
    await page.reload();
    await expect(page.getByRole('heading', { name: 'This Drop has expired.' })).toBeVisible();
    await expect(page.locator('pre')).toHaveCount(0);
  });

  test('Manual Deletion: owner can destroy Drop immediately from success page', async ({
    page,
  }) => {
    await page.goto('/drop');
    await page.locator('button', { hasText: 'Text Drop' }).click();
    await page.locator('#text-drop-content').fill('Content to be destroyed manually by creator');

    // Submit
    await page.locator('button[type="submit"]', { hasText: 'Create Text Drop' }).click();
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const dropCode = page.url().match(/\/drop\/success\/([A-Z0-9]{6})/)![1];

    // Click "Delete Drop" button on success page
    const deleteBtn = page.locator('button', { hasText: 'Delete Drop' });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Confirm deletion in modal
    const confirmDeleteBtn = page.locator('button', { hasText: 'Yes, Delete Permanently' });
    await expect(confirmDeleteBtn).toBeVisible();
    await confirmDeleteBtn.click();

    // Verify destroyed screen on success page
    await expect(page.locator('text=Permanently Deleted')).toBeVisible();
    await expect(page.locator(`text=Drop #${dropCode} Has Been Destroyed`)).toBeVisible();

    // Verify recipient page now rejects access
    await page.goto(`/d/${dropCode}`);
    await expect(page.getByRole('heading', { name: 'This Drop has expired.' })).toBeVisible();
  });

  test('QR Code Link: renders QR canvas and supports modal preview', async ({ page }) => {
    await page.goto('/drop');
    await page.locator('button', { hasText: 'Text Drop' }).click();
    await page.locator('#text-drop-content').fill('QR Code Sharing Verification');

    await page.locator('button[type="submit"]', { hasText: 'Create Text Drop' }).click();
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);

    // Verify QR Code Canvas rendered
    const qrCanvas = page.locator('canvas');
    await expect(qrCanvas).toBeVisible();

    // Open QR Code Modal
    const qrModalTrigger = page.locator('button', { hasText: 'Scan to Open on Mobile' });
    if (await qrModalTrigger.isVisible()) {
      await qrModalTrigger.click();
      await expect(page.locator('text=Mobile Quick Access')).toBeVisible();
      // Close modal
      await page.keyboard.press('Escape');
    }
  });

  test('Multiple Files Drop: packages multiple attachments and streams in unified ZIP', async ({
    page,
  }) => {
    const fixture1 = path.resolve(__dirname, '../fixtures/sample.txt');
    const fixture2 = path.resolve(__dirname, '../fixtures/sample-doc.txt');
    fs.writeFileSync(fixture2, 'Second test file for multiple attachments verification 2026.');

    await page.goto('/drop');

    // Attach two files
    const fileInput = page.locator('#drop-file-input');
    await fileInput.setInputFiles([fixture1, fixture2]);

    // Verify 2 files attached
    await expect(page.locator('text=2 files attached')).toBeVisible();
    await expect(page.locator('text=sample.txt')).toBeVisible();
    await expect(page.locator('text=sample-doc.txt')).toBeVisible();

    // Submit
    const submitBtn = page.locator('button[type="submit"]', { hasText: /Create Drop \(2 files\)/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Success page redirect
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const dropCode = page.url().match(/\/drop\/success\/([A-Z0-9]{6})/)![1];

    // Recipient page
    await page.goto(`/d/${dropCode}`);
    await expect(page.locator('text=Files (2)')).toBeVisible();
    await expect(page.locator('text=sample.txt')).toBeVisible();
    await expect(page.locator('text=sample-doc.txt')).toBeVisible();

    // Download unified ZIP
    const zipPromise = page.waitForEvent('download');
    await page.locator('button', { hasText: 'Download All (.ZIP)' }).click();
    const zipDownload = await zipPromise;

    const zipPath = await zipDownload.path();
    const zipBuffer = fs.readFileSync(zipPath!);
    expect(zipBuffer.includes(Buffer.from('sample.txt'))).toBe(true);
    expect(zipBuffer.includes(Buffer.from('sample-doc.txt'))).toBe(true);
  });
});
