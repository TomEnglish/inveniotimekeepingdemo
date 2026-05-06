/**
 * Capture screenshots of every page in the live Timekeeping app.
 *
 * Usage:
 *   npm install -D playwright
 *   npx playwright install chromium
 *   APP_URL=https://invenio-timekeeping.netlify.app \
 *   APP_EMAIL=t.elliott.english@gmail.com \
 *   APP_PASSWORD='your-password' \
 *   node screenshots.js
 *
 * Writes PNGs into ./screenshots/.
 *
 * Re-run any time the UI changes — overwrites in place.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const APP_URL = process.env.APP_URL || 'https://invenio-timekeeping.netlify.app';
const APP_EMAIL = process.env.APP_EMAIL;
const APP_PASSWORD = process.env.APP_PASSWORD;

if (!APP_EMAIL || !APP_PASSWORD) {
  console.error('Set APP_EMAIL and APP_PASSWORD env vars before running.');
  process.exit(1);
}

// Each entry captures one route. `wait` is a selector to wait for after
// navigation; `clickInto` is an optional selector to click after the list
// page loads (used for detail-page captures where the route needs an :id).
const PAGES = [
  { path: '/', file: 'dashboard.png', wait: 'h1:has-text("Dashboard")' },
  { path: '/admin/flows', file: 'flows-list.png', wait: 'h1:has-text("Flows"), h1:has-text("Approval flows")' },
  {
    path: '/admin/flows',
    file: 'flow-editor.png',
    wait: 'table tbody tr',
    clickInto: 'table tbody tr a, table tbody tr [role="link"]',
    afterClickWait: 'text=/Node|Approver/i',
  },
  { path: '/admin/projects', file: 'projects.png', wait: 'h1:has-text("Projects")' },
  { path: '/admin/employees', file: 'employees.png', wait: 'h1:has-text("Employees")' },
  { path: '/admin/codes', file: 'codes.png', wait: 'text=/Task codes|CWPs|FCOs|Subcontractors/i' },
  { path: '/my-timesheets', file: 'my-timesheets.png', wait: 'h1:has-text("My timesheets"), text=/My staff weeks|Open to claim/i' },
  { path: '/field-timesheets', file: 'field-timesheets.png', wait: 'h1:has-text("Field timesheets"), text=/Open shells|Claim/i' },
  { path: '/admin/timesheets', file: 'admin-timesheets.png', wait: 'h1:has-text("Manage timesheets"), h1:has-text("Timesheets")' },
  { path: '/admin/badges', file: 'badges.png', wait: 'h1:has-text("Badge"), text=/Override/i' },
  { path: '/exports', file: 'exports.png', wait: 'h1:has-text("Labor"), h1:has-text("Exports")' },
];

const OUT_DIR = resolve('./screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2, // retina-quality screenshots
});
const page = await context.newPage();

console.log(`→ ${APP_URL}/sign-in`);
await page.goto(`${APP_URL}/sign-in`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', APP_EMAIL);
await page.fill('input[type="password"]', APP_PASSWORD);
await page.click('button[type="submit"]');

// Wait for either: navigation away from /sign-in (success) OR an error
// banner appearing on the form (bad creds, MFA, etc.). Whichever fires
// first wins so we get a meaningful error instead of a 15s timeout.
const result = await Promise.race([
  page
    .waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 30000 })
    .then(() => 'navigated'),
  page
    .waitForSelector('[role="alert"]', { timeout: 30000 })
    .then(() => 'alert'),
]);

if (result === 'alert') {
  const msg = (await page.locator('[role="alert"]').first().textContent()) ?? '(no message)';
  throw new Error(`Sign-in failed: ${msg.trim()}`);
}

// Confirm we landed somewhere authenticated (dashboard heading is a good
// canary; falls back to any post-login route).
try {
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 8000 });
} catch {
  console.warn(`  (signed in but didn't see Dashboard heading at ${page.url()})`);
}
console.log(`✓ signed in (now at ${page.url()})`);

for (const p of PAGES) {
  const url = `${APP_URL}${p.path}`;
  console.log(`→ ${p.path}${p.clickInto ? ' (drilling in)' : ''}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  try {
    await page.waitForSelector(p.wait, { timeout: 8000 });
  } catch {
    console.warn(`  (selector not found, screenshotting anyway: ${p.wait})`);
  }

  if (p.clickInto) {
    try {
      await page.locator(p.clickInto).first().click({ timeout: 5000 });
      if (p.afterClickWait) {
        await page.waitForSelector(p.afterClickWait, { timeout: 8000 });
      }
      await page.waitForLoadState('networkidle');
    } catch (err) {
      console.warn(`  (drill-in failed for ${p.file}: ${err.message})`);
    }
  }

  await page.waitForTimeout(800); // let any animations settle
  const out = resolve(OUT_DIR, p.file);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`  ✓ ${p.file}`);
}

await browser.close();
console.log(`\nDone. ${PAGES.length} screenshots in ${OUT_DIR}`);
