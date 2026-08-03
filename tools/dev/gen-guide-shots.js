// Capture the Guide's screenshots from the live pages.
//
// The Guide tells a buyer which page answers which question. Describing those
// pages in prose goes stale the moment one of them is redesigned; a picture of
// the actual page cannot lie about what is on it. So these are taken from the
// running site rather than drawn.
//
// Not part of the daily CI: that machine has Python, not Playwright. Re-run
// this by hand after a redesign — the Guide will otherwise show the old page,
// which is exactly the failure mode it is meant to avoid.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');

const { CHROME } = require('./_env');
const { REPO: R } = require('./_env');
const OUT = path.join(R, 'images', 'guide');

// One per step of the Guide. The crop height is the top of the page: what a
// buyer sees when they arrive, not the whole scroll.
const SHOTS = [
  ['about.html', 'about', 1180],
  ['product-101.html', 'factory', 1180],
  ['executive.html', 'news', 1180],
  ['partner.html', 'buyer', 1180],
  ['cost-desk.html#p-landed2', 'cost', 1180],
  ['contact.html', 'contact', 1180],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  for (const [url, name, h] of SHOTS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8123/' + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    // Close anything that opens over the page, so the shot is the page.
    await page.evaluate(() => {
      document.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
      const p = document.querySelector('.tm-panel'); if (p) p.remove();
      const d = document.querySelector('.tm-dim'); if (d) d.remove();
    });
    const png = await page.screenshot();
    const file = path.join(OUT, name + '.webp');
    await sharp(png).resize({ width: 900 }).webp({ quality: 74 }).toFile(file);
    console.log('  ' + name.padEnd(9) + path.basename(file) + '  ' + fs.statSync(file).size + ' bytes  ← ' + url);
    await ctx.close();
  }
  await browser.close();
})();
