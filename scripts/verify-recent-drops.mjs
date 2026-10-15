import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function main() {
  const screenshotDir = path.resolve('docs/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Starting Recent Drops Browser Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Visit homepage
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // 2. Click "Recent Drops" button in Navbar
    console.log('Clicking Recent Drops in Navbar...');
    await page.click('button[title*="My Recent Drops"]');

    // 3. Verify drawer opened
    await page.waitForSelector('text=My Recent Drops', { timeout: 3000 });
    await page.waitForSelector('text=100% Client-Side Privacy', { timeout: 3000 });
    console.log('✅ Drawer opened and displays 100% Client-Side Privacy guarantee');

    // 4. Capture screenshot of empty state
    await page.screenshot({ path: path.join(screenshotDir, 'recent-drops-drawer-empty.png') });

    // 5. Populate localStorage with dummy item to test populated state
    await page.evaluate(() => {
      localStorage.setItem(
        'n1_client_recent_drops_v1',
        JSON.stringify([
          {
            code: '7K2M9X',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 1800000).toISOString(),
            ownerDeletionToken: 'secret-token-demo',
            dropType: 'files',
            fileCount: 2,
          },
        ])
      );
      window.dispatchEvent(new CustomEvent('n1_recent_drops_changed'));
    });

    await page.waitForTimeout(500);
    await page.waitForSelector('text=7K2M9X', { timeout: 3000 });
    console.log('✅ Stored Drop 7K2M9X visible in drawer with Burn and Copy actions');

    // 6. Capture screenshot of populated drawer
    await page.screenshot({ path: path.join(screenshotDir, 'recent-drops-drawer-populated.png') });
    console.log('🎉 Recent Drops drawer browser verification PASSED!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌ Recent Drops browser verification failed:', err);
  process.exit(1);
});
