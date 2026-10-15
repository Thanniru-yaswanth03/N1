import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import {
  getDropRecord,
  getDropFilesRecords,
  checkPhysicalFileExists,
  forceExpireDrop,
  disconnectTestDb,
} from './helpers/test-db';

test.describe('Critical Scenario: File Drop Full Lifecycle', () => {
  test.afterAll(async () => {
    await disconnectTestDb();
  });

  test('Upload file -> Create Drop -> Open recipient URL -> Download file -> Verify downloaded file -> Download ZIP -> Verify ZIP contents -> Expire Drop -> Verify download rejected -> Verify physical file removed', async ({
    page,
    request,
  }) => {
    const fixturePath = path.resolve(__dirname, '../fixtures/sample.txt');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');

    // 1. Navigate to Drop creation page
    await page.goto('/drop');

    // 2. Upload file via the hidden input element
    const fileInput = page.locator('#drop-file-input');
    await fileInput.setInputFiles(fixturePath);

    // Verify file card is rendered in the list
    await expect(page.locator('text=sample.txt')).toBeVisible();
    await expect(page.locator('text=1 file attached')).toBeVisible();

    // 3. Submit the Drop
    const submitBtn = page.locator('button[type="submit"]', { hasText: /Create Drop/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 4. Verify redirect to success page
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const url = page.url();
    const codeMatch = url.match(/\/drop\/success\/([A-Z0-9]{6})/);
    expect(codeMatch).toBeTruthy();
    const dropCode = codeMatch![1];

    // Verify file physical presence in storage before expiration
    const dropRecord = await getDropRecord(dropCode);
    expect(dropRecord).toBeTruthy();
    const fileRecords = await getDropFilesRecords(dropRecord._id);
    expect(fileRecords.length).toBe(1);
    const targetFile = fileRecords[0];
    expect(checkPhysicalFileExists(targetFile.filePath)).toBe(true);

    // 5. Open recipient URL
    await page.goto(`/d/${dropCode}`);

    // Verify file card visible with correct metadata
    await expect(page.locator(`text=DROP #${dropCode}`)).toBeVisible();
    await expect(page.locator('text=sample.txt')).toBeVisible();

    // 6. Download single file & verify contents
    const downloadPromise = page.waitForEvent('download');
    const downloadFileBtn = page.locator('button[aria-label="Download sample.txt"]');
    await downloadFileBtn.click();
    const download = await downloadPromise;

    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    const downloadedContent = fs.readFileSync(downloadedPath!, 'utf-8');
    expect(downloadedContent).toBe(fixtureContent);

    // 7. Download ZIP & verify ZIP headers and structure
    const zipDownloadPromise = page.waitForEvent('download');
    const downloadZipBtn = page.locator('button', { hasText: 'Download All (.ZIP)' });
    await downloadZipBtn.click();
    const zipDownload = await zipDownloadPromise;

    const zipPath = await zipDownload.path();
    expect(zipPath).toBeTruthy();
    const zipBuffer = fs.readFileSync(zipPath!);
    // Assert standard ZIP file signature 0x50 0x4B 0x03 0x04 (PK\x03\x04)
    expect(zipBuffer[0]).toBe(0x50);
    expect(zipBuffer[1]).toBe(0x4b);
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);
    // Verify that the ZIP archive contains 'sample.txt' filename in its header
    expect(zipBuffer.includes(Buffer.from('sample.txt'))).toBe(true);

    // 8. Expire Drop
    await forceExpireDrop(dropCode);

    // 9. Verify physical file is completely removed from disk
    expect(checkPhysicalFileExists(targetFile.filePath)).toBe(false);

    // 10. Verify recipient page access is rejected
    await page.reload();
    await expect(page.getByRole('heading', { name: 'This Drop has expired.' })).toBeVisible();

    // 11. Verify raw download API request is rejected with 410 Gone
    const downloadRes = await request.get(
      `http://localhost:5000/api/drop/${dropCode}/download/${targetFile.id}`
    );
    expect(downloadRes.status()).toBe(410);
  });
});
