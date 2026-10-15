import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/tools/qr-code-generator', { waitUntil: 'networkidle' });

  const heading = await page.textContent('h1');
  console.log('Page H1:', heading);

  // Verify interactive components
  await page.fill('textarea', 'https://quably.in/drop');
  await page.waitForTimeout(500);

  const imgVisible = await page.isVisible('img[alt="Generated QR Code Preview"]');
  console.log('QR Preview Visible:', imgVisible);

  await page.screenshot({ path: './docs/screenshots/tool-qr-code-generator-working-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: './docs/screenshots/tool-qr-code-generator-working-mobile.png', fullPage: true });

  await browser.close();
  console.log('Task 1 Browser Verification Complete!');
}

main().catch(console.error);
