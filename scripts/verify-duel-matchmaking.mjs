import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function main() {
  const screenshotDir = path.resolve('docs/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Starting Dual-Client Duel Matchmaking Browser Test...');
  const browser = await chromium.launch({ headless: true });

  const contextA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const contextB = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  pageA.on('console', msg => console.log('[Client A Console]', msg.type(), msg.text()));
  pageB.on('console', msg => console.log('[Client B Console]', msg.type(), msg.text()));
  pageA.on('pageerror', err => console.log('[Client A Error]', err.message));
  pageB.on('pageerror', err => console.log('[Client B Error]', err.message));

  try {
    // 1. Client A opens /duel, sets up Nickname and starts matchmaking
    console.log('Navigating Client A (Alice) to /duel...');
    await pageA.goto('http://localhost:3000/duel', { waitUntil: 'networkidle' });
    await pageA.fill('input[placeholder="e.g. MasterCoder"]', 'Alice');
    
    // Select Python category
    await pageA.click('button:has-text("Python")');
    console.log('Client A clicking "Find Online Opponent"...');
    await pageA.click('button:has-text("Find Online Opponent")');

    // Verify queue indicator
    await pageA.waitForSelector('text=Searching for an opponent', { timeout: 5000 });
    console.log('✅ Client A entered matchmaking queue successfully');
    await pageA.screenshot({ path: path.join(screenshotDir, 'duel-client-a-queue.png') });

    // 2. Client B opens /duel, selects Python, sets up Bob, and clicks Find Online Opponent
    console.log('Navigating Client B (Bob) to /duel...');
    await pageB.goto('http://localhost:3000/duel', { waitUntil: 'networkidle' });
    await pageB.fill('input[placeholder="e.g. MasterCoder"]', 'Bob');
    await pageB.click('button:has-text("Python")');
    console.log('Client B clicking "Find Online Opponent"...');
    await pageB.click('button:has-text("Find Online Opponent")');

    // 3. Both should get matched and automatically redirected to /duel/[code]
    console.log('Waiting for match confirmation and auto-redirect...');
    await Promise.all([
      pageA.waitForURL(/\/duel\/[A-Z0-9]{6}/, { timeout: 10000 }),
      pageB.waitForURL(/\/duel\/[A-Z0-9]{6}/, { timeout: 10000 }),
    ]);

    const urlA = pageA.url();
    const urlB = pageB.url();
    console.log(`✅ Client A URL: ${urlA}`);
    console.log(`✅ Client B URL: ${urlB}`);

    if (urlA !== urlB) {
      throw new Error(`Room codes do not match! A: ${urlA}, B: ${urlB}`);
    }

    // 4. Wait for countdown / match start
    console.log('Waiting for match arena / countdown...');
    await pageA.waitForTimeout(4000); // allow countdown to complete into live arena

    // Take screenshots of both clients in the match
    await pageA.screenshot({ path: path.join(screenshotDir, 'duel-client-a-matched.png') });
    await pageB.screenshot({ path: path.join(screenshotDir, 'duel-client-b-matched.png') });
    console.log('✅ Screenshots saved: duel-client-a-matched.png and duel-client-b-matched.png');

    console.log('🎉 Dual-client browser matchmaking verification PASSED completely!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌ Matchmaking browser verification failed:', err);
  process.exit(1);
});
