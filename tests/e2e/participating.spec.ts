import { test, expect } from '@playwright/test';

test.describe('N1 E2E: Participating, Duel Arena, and Study Board Suite', () => {
  test('Quably Duel: configure challenge, create room, and participate in lobby', async ({
    page,
  }) => {
    // 1. Navigate to Quably Duel Hub
    await page.goto('/duel');
    await expect(page.locator('h1', { hasText: 'Anonymous Multiplayer Quiz Arena' })).toBeVisible();

    // 2. Select Category (e.g. Python)
    const pythonBtn = page.locator('button', { hasText: 'Python' });
    await expect(pythonBtn).toBeVisible();
    await pythonBtn.click();

    // 3. Select Difficulty (Medium)
    const mediumBtn = page.locator('button', { hasText: /Medium/i });
    if (await mediumBtn.isVisible()) {
      await mediumBtn.click();
    }

    // 4. Fill player nickname
    const nameInput = page.getByPlaceholder(/Enter your nickname/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('TesterHost');
    }

    // 5. Submit challenge creation
    const createBtn = page.locator('button', { hasText: 'Create Challenge Room' });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // 6. Redirected to live duel arena
    await page.waitForURL(/\/duel\/[A-Z0-9]{6}/);
    const codeMatch = page.url().match(/\/duel\/([A-Z0-9]{6})/);
    expect(codeMatch).toBeTruthy();
    const duelCode = codeMatch![1];

    // Verify room code and lobby state rendered
    await expect(page.locator(`text=${duelCode}`)).toBeVisible();
    await expect(page.locator('text=Waiting for Opponent')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Copy Link' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Copy Code' })).toBeVisible();
  });

  test('Study Board: configure template, launch room, and participate on canvas', async ({
    page,
  }) => {
    // 1. Navigate to Study Board Hub
    await page.goto('/board');
    await expect(page.locator('h1', { hasText: 'Collaborate Freely.' })).toBeVisible();

    // 2. Select Template (Flowchart or Mind Map)
    const mindMapCard = page.locator('text=Mind Map');
    if (await mindMapCard.isVisible()) {
      await mindMapCard.click();
    }

    // 3. Fill board title
    const titleInput = page.locator('#board-title-input');
    if (await titleInput.isVisible()) {
      await titleInput.fill('System Architecture Revision');
    }

    // 4. Launch board
    const launchBtn = page.locator('button', { hasText: 'Create Anonymous Study Board →' });
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // 5. Redirected to active board canvas
    await page.waitForURL(/\/board\/[A-Z0-9]{6}/);
    const codeMatch = page.url().match(/\/board\/([A-Z0-9]{6})/);
    expect(codeMatch).toBeTruthy();
    const boardCode = codeMatch![1];

    // Verify board controls and canvas toolbar
    await expect(page.locator(`text=${boardCode}`)).toBeVisible();
    await expect(page.locator('button', { hasText: 'Share' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Export' })).toBeVisible();
  });

  test('Drop Browsing & Dashboard: verify drop lifecycle, code lookup, and owner controls', async ({
    page,
  }) => {
    // 1. Create a drop
    await page.goto('/drop');
    await page.locator('button', { hasText: 'Text Drop' }).click();
    await page.locator('#text-drop-content').fill('Drop browsing & dashboard verification payload');
    await page.locator('button[type="submit"]', { hasText: 'Create Text Drop' }).click();

    // 2. Success dashboard page
    await page.waitForURL(/\/drop\/success\/[A-Z0-9]{6}/);
    const dropCode = page.url().match(/\/drop\/success\/([A-Z0-9]{6})/)![1];

    // Verify dashboard metrics and action items
    await expect(page.locator(`text=${dropCode}`)).toBeVisible();
    await expect(page.locator('button', { hasText: 'Copy Link' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'View Drop' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Delete Drop' })).toBeVisible();

    // 3. Browse recipient drop page
    await page.locator('button', { hasText: 'View Drop' }).click();
    await page.waitForURL(`/d/${dropCode}`);

    // Verify recipient view rendered
    await expect(page.locator(`text=DROP #${dropCode}`)).toBeVisible();
    await expect(page.locator('text=Drop browsing & dashboard verification payload')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Copy Text' })).toBeVisible();
  });
});
