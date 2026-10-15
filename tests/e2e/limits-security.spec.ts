import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

test.describe('N1 Limits & Security E2E Suite', () => {
  test('Text Drop Character Counters: transitions through normal, warning, error, and over-limit states', async ({
    page,
  }) => {
    await page.goto('/drop');
    await page.locator('button', { hasText: 'Text Drop' }).click();
    const textArea = page.locator('#text-drop-content');
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Create Text Drop' });

    // Empty state: submit is disabled
    await expect(submitBtn).toBeDisabled();

    // 1. Normal State (< 8000 chars)
    const normalText = 'A'.repeat(500);
    await textArea.fill(normalText);
    const counterNormal = page.locator('span.font-mono', { hasText: '500 / 10,000' });
    await expect(counterNormal).toBeVisible();
    await expect(counterNormal).toHaveClass(/text-n1-text-muted/);
    await expect(submitBtn).toBeEnabled();

    // 2. Warning State (>= 8000 chars)
    const warningText = 'B'.repeat(8100);
    await textArea.fill(warningText);
    const counterWarn = page.locator('span.font-mono', { hasText: '8,100 / 10,000' });
    await expect(counterWarn).toBeVisible();
    await expect(counterWarn).toHaveClass(/text-amber-400/);
    await expect(submitBtn).toBeEnabled();

    // 3. Error State (>= 9500 chars and <= 10000)
    const nearLimitText = 'C'.repeat(9600);
    await textArea.fill(nearLimitText);
    const counterErr = page.locator('span.font-mono', { hasText: '9,600 / 10,000' });
    await expect(counterErr).toBeVisible();
    await expect(counterErr).toHaveClass(/text-rose-400/);
    await expect(submitBtn).toBeEnabled();

    // 4. Over Limit (> 10,000 chars): disables submission
    const overLimitText = 'D'.repeat(10050);
    await textArea.fill(overLimitText);
    await expect(
      page.locator('text=Text exceeds the 10,000 character limit. Please shorten your content.')
    ).toBeVisible();
    await expect(submitBtn).toBeDisabled();
  });

  test('Client-Side Duplicate Detection: flags identical files (name + size)', async ({ page }) => {
    const fixture = path.resolve(__dirname, '../fixtures/sample.txt');
    await page.goto('/drop');

    const fileInput = page.locator('#drop-file-input');

    // Attach sample.txt
    await fileInput.setInputFiles(fixture);
    await expect(page.locator('text=1 file attached')).toBeVisible();

    // Attach sample.txt again
    await fileInput.setInputFiles(fixture);

    // Verify duplicate notice banner appears
    await expect(page.locator('text=Duplicate file detected:')).toBeVisible();
    await expect(page.locator('text=1 file attached')).toBeVisible();
  });

  test('Invalid File Upload Rejection: blocks disallowed file extensions', async ({ page }) => {
    const invalidFile = path.resolve(__dirname, '../fixtures/malicious.sh');
    fs.writeFileSync(invalidFile, '#!/bin/bash\necho "Malicious payload"');

    await page.goto('/drop');

    const fileInput = page.locator('#drop-file-input');
    await fileInput.setInputFiles(invalidFile);

    // Verify unsupported extension error banner appears
    await expect(page.locator('text=Unsupported extension in: "malicious.sh"')).toBeVisible();

    // Submit button remains disabled because no valid files were added
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('Security Attacks: path traversal and non-existent drop handling', async ({
    page,
    request,
  }) => {
    // 1. Non-existent drop code returns 404 UI
    await page.goto('/d/NOTFND');
    await expect(page.getByRole('heading', { name: 'Drop Not Found' })).toBeVisible();
    await expect(page.locator('text=Please verify the 6-character access code.')).toBeVisible();

    // 2. Direct API path traversal rejection
    const traversalRes = await request.get('http://localhost:5000/api/drop/..%2F..%2Fetc%2Fpasswd');
    expect(traversalRes.status()).toBe(404);

    // 3. Security Headers verification on API
    const healthRes = await request.get('http://localhost:5000/api/health');
    const headers = healthRes.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();
  });
});
