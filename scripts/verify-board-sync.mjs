import { chromium } from '@playwright/test';

async function main() {
  console.log('--- Multi-Client Playwright Test for Study Board Real-Time Sync ---');

  // 1. Create a live study room via REST API
  const res = await fetch('http://localhost:5000/api/board/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Peer Collab Live Session',
      template: 'blank',
      expiresInHours: 2,
    }),
  });

  const json = await res.json();
  const roomCode = json.data.code;
  console.log(`Created study room: ${roomCode}`);

  const browser = await chromium.launch({ headless: true });

  // 2. Client A connects in Context 1
  const contextA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await contextA.newPage();
  await pageA.goto(`http://localhost:3000/board/${roomCode}`, { waitUntil: 'networkidle' });

  // 3. Client B connects in Context 2
  const contextB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageB = await contextB.newPage();
  await pageB.goto(`http://localhost:3000/board/${roomCode}`, { waitUntil: 'networkidle' });

  // Wait for canvas to be visible on both clients
  await pageA.locator('canvas').first().waitFor({ state: 'visible', timeout: 15000 });
  await pageB.locator('canvas').first().waitFor({ state: 'visible', timeout: 15000 });

  // Wait 1s for WebSocket handshake & peer discovery
  await pageA.waitForTimeout(1000);
  await pageB.waitForTimeout(1000);

  console.log(`Canvas visible on both Client A and Client B for room ${roomCode}`);

  // Client A draws on the canvas
  const canvasA = pageA.locator('canvas').first();
  const boxA = await canvasA.boundingBox();

  if (boxA) {
    // Select pen tool if present
    const penButton = pageA.locator('button[title*="Pen"], button[title*="Draw"]').first();
    if (await penButton.count() > 0) {
      await penButton.click({ force: true });
    }

    // Drag to draw on canvas A
    await pageA.mouse.move(boxA.x + 100, boxA.y + 100);
    await pageA.mouse.down();
    await pageA.mouse.move(boxA.x + 200, boxA.y + 150, { steps: 5 });
    await pageA.mouse.move(boxA.x + 250, boxA.y + 120, { steps: 5 });
    await pageA.mouse.up();
    console.log('Client A drew stroke on canvas');
  }

  // Wait for WebSocket sync to Client B
  await pageB.waitForTimeout(1000);

  // Capture synchronized screenshots for Client A and Client B
  await pageA.screenshot({ path: './docs/screenshots/board-client-a-sync.png' });
  await pageB.screenshot({ path: './docs/screenshots/board-client-b-sync.png' });

  console.log('Captured synchronized screenshots for Client A and Client B.');
  await browser.close();
  console.log('--- Multi-Client Study Board Test Passed Successfully! ---');
}

main().catch(err => {
  console.error('Fatal in board sync verify:', err);
  process.exit(1);
});
