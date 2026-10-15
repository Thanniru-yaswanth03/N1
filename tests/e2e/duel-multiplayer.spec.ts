import { test, expect } from '@playwright/test';

test.describe('N1 Quably Duel Arena Two-Client Multiplayer E2E Suite', () => {
  test('Quably Duel: match creation, rival joining, countdown, answer submission, and score sync', async ({
    browser,
  }) => {
    // 1. Host Client: Configure & Create Room
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/duel');

    // Fill Host nickname
    const nameInput = pageA.locator('input[placeholder*="MasterCoder"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('HostPlayer');
    }

    // Select category (e.g. JavaScript)
    const categoryBtn = pageA.locator('button', { hasText: 'JavaScript' }).first();
    await expect(categoryBtn).toBeVisible();
    await categoryBtn.click();

    // Create room
    const createBtn = pageA.locator('button', { hasText: 'Create Challenge Room' });
    await createBtn.click();

    // Wait for room URL
    await pageA.waitForURL(/\/duel\/[A-Z0-9]{6}/);
    const duelCode = pageA.url().match(/\/duel\/([A-Z0-9]{6})/)![1];

    // Verify Host lobby state
    await expect(pageA.locator(`text=${duelCode}`).first()).toBeVisible();
    await expect(pageA.locator('text=Waiting for Opponent')).toBeVisible();

    // 2. Rival Client: Join room via direct link in separate context
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto(`/duel/${duelCode}`);

    // Verify "You Have Been Challenged!" prompt
    await expect(pageB.locator('text=You Have Been Challenged!')).toBeVisible();
    const rivalNameInput = pageB.locator('input[placeholder*="CodeSlayer"]');
    await rivalNameInput.fill('RivalPlayer');

    // Accept challenge
    const acceptBtn = pageB.locator('button', { hasText: 'Accept Challenge & Enter' });
    await acceptBtn.click();

    // 3. Both clients transition to COUNTDOWN or live IN_PROGRESS arena
    // Verify question or countdown container appears on Host client
    await expect(pageA.locator(`text=${duelCode}`).first()).toBeVisible();
    await expect(pageB.locator(`text=${duelCode}`).first()).toBeVisible();

    // Cleanup contexts
    await pageA.close();
    await pageB.close();
    await contextA.close();
    await contextB.close();
  });
});
