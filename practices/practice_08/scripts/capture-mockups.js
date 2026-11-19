const { chromium } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'design', 'mockups', '_shots');
const BASE = 'http://127.0.0.1:3100';

const variants = [
  'variant-1-orbita.html',
  'variant-2-tumannost.html',
  'variant-3-pult.html',
  'variant-4-luna.html',
  'variant-5-stanciya.html',
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const file of variants) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
    page.on('requestfailed', (req) => errors.push('requestfailed: ' + req.url() + ' ' + (req.failure()?.errorText || '')));
    await page.goto(`${BASE}/${file}`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1500);
    const name = path.basename(file, '.html');
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    const tall = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`${name}: height=${tall}px errors=${errors.length}`);
    for (const e of errors) console.log('   ! ' + e);
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${BASE}/${file}`, { waitUntil: 'load', timeout: 45000 });
    await mobile.waitForTimeout(800);
    await mobile.screenshot({ path: path.join(OUT, name + '-mobile.png'), fullPage: true });
    await mobile.close();
    await page.close();
  }
  await browser.close();
})();
