import { test, expect } from '@playwright/test';

test.describe('N1 Study Board Multi-Client Synchronization & Classroom Mode E2E Suite', () => {
  test('Collaborative Classroom: Teacher & Student roles, live synchronization, and permission locking', async ({
    browser,
  }) => {
    // 1. Browser Context A: Teacher creates a new Study Board
    const contextA = await browser.newContext();
    await contextA.grantPermissions(['clipboard-read', 'clipboard-write']);
    const pageA = await contextA.newPage();
    await pageA.goto('/board');

    // Launch anonymous study board
    await pageA.locator('button', { hasText: 'Create Anonymous Study Board →' }).click();
    await pageA.waitForURL(/\/board\/[A-Z0-9]{6}/);
    const roomCode = pageA.url().match(/\/board\/([A-Z0-9]{6})/)![1];

    // Verify room code badge and connected status on Teacher browser
    await expect(pageA.locator(`text=${roomCode}`).first()).toBeVisible();
    await expect(pageA.locator('text=CONNECTED').first()).toBeVisible();

    // Verify Teacher role indicator is visible on Creator screen
    await expect(pageA.locator('text=Teacher').first()).toBeVisible();
    await expect(pageA.locator('button', { hasText: 'Broadcast' }).or(pageA.locator('button', { hasText: 'Live View' }))).toBeVisible();

    // 2. Browser Context B: Student joins the same board room via shared link
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto(`/board/${roomCode}`);

    // Verify Student joins and connects successfully
    await expect(pageB.locator(`text=${roomCode}`).first()).toBeVisible();
    await expect(pageB.locator('text=CONNECTED').first()).toBeVisible();

    // Verify Student role indicator on Participant screen
    await expect(pageB.locator('text=Student').first()).toBeVisible();
    await expect(pageB.locator('text=Follow Teacher').or(pageB.locator('text=Snap to Teacher'))).toBeVisible();

    // 3. Test Viewport / Presentation Mode Broadcast Toggle on Teacher
    const broadcastBtn = pageA.locator('button', { hasText: 'Broadcast' });
    if (await broadcastBtn.isVisible()) {
      await broadcastBtn.click();
      await expect(pageA.locator('button', { hasText: 'Live View' })).toBeVisible();
    }

    // 4. Test Teacher toggling Student Editing lock
    const editToggleBtn = pageA.locator('button', { hasText: 'Student Edits: ON' });
    if (await editToggleBtn.isVisible()) {
      await editToggleBtn.click();
      // Teacher sees LOCKED state
      await expect(pageA.locator('text=Student Edits: LOCKED')).toBeVisible();

      // Student screen immediately shows "View Only" lock badge without refresh
      await expect(pageB.locator('text=View Only').first()).toBeVisible();
      await expect(pageB.locator('text=Teacher has locked participant editing')).toBeVisible();

      // Unlock back
      await pageA.locator('button', { hasText: 'Student Edits: LOCKED' }).click();
      await expect(pageA.locator('text=Student Edits: ON')).toBeVisible();
    }

    // 5. Test Share Modal on Teacher
    const shareBtn = pageA.locator('header button', { hasText: 'Share' });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Verify Share Modal rendered with link & QR
    await expect(pageA.locator('text=Share Study Room')).toBeVisible();
    const copyBtn = pageA.getByRole('button', { name: 'Copy', exact: true });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(pageA.locator('text=Copied!')).toBeVisible();

    // Close Share Modal
    await pageA.keyboard.press('Escape');

    // 6. Test Export dropdown on Teacher
    const exportBtn = pageA.locator('header button', { hasText: 'Export' });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify Export options are visible
    await expect(pageA.locator('text=Export as PNG')).toBeVisible();
    await expect(pageA.locator('text=Export as SVG')).toBeVisible();
    await expect(pageA.locator('text=Export as JSON')).toBeVisible();

    // Close Export menu
    await pageA.keyboard.press('Escape');

    // 7. Test Mobile Viewport Layout
    await pageB.setViewportSize({ width: 375, height: 667 });
    await expect(pageB.locator(`text=${roomCode}`).first()).toBeVisible();
    await expect(pageB.locator('canvas').first()).toBeVisible();

    // Cleanup contexts
    await pageA.close();
    await pageB.close();
    await contextA.close();
    await contextB.close();
  });
});
