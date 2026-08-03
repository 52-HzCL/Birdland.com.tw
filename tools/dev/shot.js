// Small reusable shot + measure. Usage:
//   node shot.js <page.html> [w] [h] [outName]
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const { CHROME, SHOTS } = require('./_env');
const OUT = SHOTS;

const [file, w = '1440', h = '900', out] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await page.goto('http://localhost:8123/' + file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  // Whether the page actually scrolls sideways, not whether some box is wide.
  // documentElement.scrollWidth counts content inside overflow:auto containers
  // too, so a table that scrolls correctly inside its own wrapper reported as a
  // page-level overflow. The honest test is to try to scroll.
  const m = await page.evaluate(() => {
    const x0 = window.scrollX;
    window.scrollTo(9999, window.scrollY);
    const moved = window.scrollX;
    window.scrollTo(x0, window.scrollY);
    // Only boxes that are not inside a scrollable ancestor can push the page.
    const scrollable = e => {
      for (let n = e.parentElement; n; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
      }
      return false;
    };
    return {
      sw: document.documentElement.scrollWidth, iw: innerWidth, moved,
      over: [...new Set([...document.querySelectorAll('body *')]
        .filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !scrollable(e))
        .map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '')))].slice(0, 8),
    };
  });
  const png = await page.screenshot({ fullPage: true });
  const name = (out || file.replace(/[#.].*$/, '')) + '-' + w + '.webp';
  await sharp(png).resize({ width: +w > 700 ? 1000 : 380, height: 16000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 74 }).toFile(path.join(OUT, name));
  console.log(name + '  ' + (m.moved > 0 ? 'SCROLLS SIDEWAYS ' + m.moved + 'px' + (m.over.length ? ': ' + m.over.join(', ') : '') : 'no sideways scroll') +
    (errs.length ? '\n  errors: ' + errs.join(' | ') : '  no errors'));
  await browser.close();
})();
