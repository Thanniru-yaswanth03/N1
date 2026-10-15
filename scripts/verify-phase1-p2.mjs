import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function main() {
  const screenshotDir = path.resolve('docs/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Starting Phase 1 P2 Browser Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Verify Homepage "Enter Drop Code"
    console.log('1. Testing Homepage "Enter Drop Code"...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForSelector('#homepage-drop-code-input');
    await page.fill('#homepage-drop-code-input', 'TEST99');
    await page.screenshot({ path: path.join(screenshotDir, 'homepage-enter-drop-code.png') });
    console.log('✅ Homepage Enter Drop Code verified');

    // 2. Create a live drop via API to test /d/[code] with Expiry Urgency
    console.log('2. Creating a test drop for Expiry Urgency visualization...');
    const dropRes = await fetch('http://localhost:5000/api/drop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'text',
        text_content: 'Confidential ephemeral content for Phase 1 testing.',
        expiry: '1h',
      }),
    });
    const dropData = await dropRes.json();
    const dropCode = dropData.data.code;
    console.log(`Created test drop: ${dropCode}`);

    // Navigate to /d/[code]
    await page.goto(`http://localhost:3000/d/${dropCode}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Drop Lifetime Countdown', { timeout: 5000 });
    await page.waitForSelector('[role="progressbar"]', { timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotDir, 'drop-expiry-urgency-card.png') });
    console.log('✅ Expiry Urgency visualization verified on /d/[code]');

    // 3. Test standalone /privacy page
    console.log('3. Testing /privacy page...');
    await page.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Privacy Policy & Data Architecture', { timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotDir, 'privacy-policy-page.png') });
    console.log('✅ /privacy page loaded and verified');

    // 4. Test standalone /terms page
    console.log('4. Testing /terms page...');
    await page.goto('http://localhost:3000/terms', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Terms of Service', { timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotDir, 'terms-of-service-page.png') });
    console.log('✅ /terms page loaded and verified');

    console.log('🎉 All Phase 1 P2 browser checks PASSED!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌ Phase 1 P2 verification failed:', err);
  process.exit(1);
});
