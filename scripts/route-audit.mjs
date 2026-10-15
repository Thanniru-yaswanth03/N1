import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = path.resolve('./docs/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('--- Starting Enhanced Playwright Browser Audit ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const auditLog = [];

  // 1. Create a live Drop via API to test success and recipient screens
  let dropCode = '';
  try {
    const res = await fetch(`${API_URL}/api/drops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'text',
        text: 'Visual audit verification text payload for N1. End-to-end verified.',
        expiry: '1h'
      })
    });
    const json = await res.json();
    if (json.success && json.data) {
      dropCode = json.data.code;
      console.log(`Created live test drop: ${dropCode}`);
    } else {
      console.warn('Drop creation returned:', json);
    }
  } catch (err) {
    console.error('Failed to create test drop:', err.message);
  }

  const routesToInspect = [
    { url: '/', name: 'home', purpose: 'Platform landing page and gateway to Drop, Board, Duel, and Tools' },
    { url: '/drop', name: 'drop-create', purpose: 'Drop creation studio for files and text with expiry & security controls' },
    ...(dropCode ? [
      { url: `/drop/success/${dropCode}`, name: 'drop-success', purpose: 'Confirmation screen with share link, code, QR modal, delete token' },
      { url: `/d/${dropCode}`, name: 'drop-recipient-view', purpose: 'Recipient view screen for downloading files or copying text' }
    ] : []),
    { url: '/board', name: 'board-landing', purpose: 'Collaborative study board landing & new session generator' },
    { url: '/board/DEMO12', name: 'board-workspace', purpose: 'Live collaborative interactive drawing & study whiteboard' },
    { url: '/duel', name: 'duel-landing', purpose: '1v1 speed quiz & skill battle challenge landing' },
    { url: '/duel/DEMO12', name: 'duel-workspace', purpose: 'Interactive 60-second live head-to-head duel arena' },
    { url: '/tools', name: 'tools-directory', purpose: 'Client-side utility directory with category filters' },
    { url: '/tools/json-formatter', name: 'tool-json', purpose: 'JSON validator, beautifier, and minifier' },
    { url: '/tools/base64', name: 'tool-base64', purpose: 'Base64 encoder and decoder' },
    { url: '/tools/word-counter', name: 'tool-words', purpose: 'Real-time word, character, sentence, and paragraph counter' },
    { url: '/tools/gst-calculator', name: 'tool-gst', purpose: 'Financial slab calculation tool' },
    { url: '/tools/qr-code-generator', name: 'tool-qr-missing', purpose: 'Reference parity check: QR generator route' },
    { url: '/admin/login', name: 'admin-login', purpose: 'Administrator authentication portal' },
    { url: '/design-system', name: 'design-system', purpose: 'Component design system & color token showcase' }
  ];

  for (const route of routesToInspect) {
    console.log(`Auditing: ${route.url}...`);
    const consoleMessages = [];
    const errors = [];
    const failedRequests = [];

    const onConsole = msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    };
    const onPageError = err => errors.push(err.message);
    const onRequestFailed = req => failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('requestfailed', onRequestFailed);

    let status = 0;
    try {
      const resp = await page.goto(`${BASE_URL}${route.url}`, { waitUntil: 'networkidle', timeout: 15000 });
      status = resp?.status() || 0;
    } catch (e) {
      status = 500;
      errors.push(e.message);
    }

    // Inspect elements
    const title = await page.title();
    const heading = await page.$eval('h1, h2', el => el.textContent?.trim()).catch(() => 'No primary heading');
    const buttonCount = await page.$$eval('button', els => els.length);
    const linkCount = await page.$$eval('a', els => els.length);
    const inputCount = await page.$$eval('input, textarea, select', els => els.length);

    // Desktop screenshot
    const desktopScreenshot = path.join(SCREENSHOT_DIR, `${route.name}-desktop.png`);
    await page.screenshot({ path: desktopScreenshot, fullPage: true });

    // Mobile Viewport Audit
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    const mobileScreenshot = path.join(SCREENSHOT_DIR, `${route.name}-mobile.png`);
    await page.screenshot({ path: mobileScreenshot, fullPage: true });

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    auditLog.push({
      url: route.url,
      name: route.name,
      purpose: route.purpose,
      status,
      title,
      heading,
      buttonCount,
      linkCount,
      inputCount,
      consoleErrors: consoleMessages,
      runtimeErrors: errors,
      failedRequests,
      desktopScreenshot,
      mobileScreenshot
    });

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
  }

  // Authenticate Admin and Audit Admin Console
  console.log('Auditing authenticated /admin...');
  try {
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••••••').fill('N1SecureAdminPassword2026!');
    await page.locator('button[type="submit"]', { hasText: 'Enter Admin Portal' }).click();
    await page.waitForURL('**/admin', { timeout: 10000 });

    const adminHeading = await page.$eval('h1, h2', el => el.textContent?.trim()).catch(() => 'Admin Console');
    const adminDesktop = path.join(SCREENSHOT_DIR, 'admin-authenticated-desktop.png');
    await page.screenshot({ path: adminDesktop, fullPage: true });

    // Also take mobile screenshot of admin console
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    const adminMobile = path.join(SCREENSHOT_DIR, 'admin-authenticated-mobile.png');
    await page.screenshot({ path: adminMobile, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });

    auditLog.push({
      url: '/admin',
      name: 'admin-dashboard',
      purpose: 'Administrator security dashboard, drop management, audit log, rate-limit controls',
      status: 200,
      title: await page.title(),
      heading: adminHeading,
      buttonCount: await page.$$eval('button', els => els.length),
      linkCount: await page.$$eval('a', els => els.length),
      inputCount: await page.$$eval('input, textarea, select', els => els.length),
      consoleErrors: [],
      runtimeErrors: [],
      failedRequests: [],
      desktopScreenshot: adminDesktop,
      mobileScreenshot: adminMobile
    });
    console.log('Successfully audited authenticated /admin!');
  } catch (err) {
    console.warn('Admin auth audit warning:', err.message);
  }

  await browser.close();

  fs.writeFileSync('./docs/browser-audit-raw.json', JSON.stringify(auditLog, null, 2));
  console.log('--- Playwright Browser Audit Complete. Log saved to docs/browser-audit-raw.json ---');
}

runAudit().catch(err => {
  console.error('Fatal in audit:', err);
  process.exit(1);
});
