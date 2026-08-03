// The text-size control: does it appear on every page, does it move real
// rendered text, does it survive a reload, and does it survive the header
// being replaced by desk-banner.js?
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const { CHROME, BASE, SHOTS } = require('./_env');

const PAGES = ['index.html', 'about.html', 'contact.html', 'privacy.html', 'product-101.html',
  'guide.html', 'partner.html', 'cost-desk.html', 'team.html', 'executive.html'];

const measure = () => ({
  present: !!document.querySelector('.bl-textsize'),
  buttons: document.querySelectorAll('.bl-textsize button').length,
  pressed: (() => { const b = document.querySelector('.bl-textsize button[aria-pressed="true"]'); return b ? b.getAttribute('aria-label') : null; })(),
  cls: document.documentElement.className.trim() || '(none)',
  // A real paragraph, not a token: what the reader actually gets.
  body: (() => {
    // team.html has almost no long <p> — fall back to any visible text node
    // carrier so the gate measures the page instead of reporting n/a.
    const pick = sel => [...document.querySelectorAll(sel)].find(e =>
      e.textContent.trim().length > 40 && e.getBoundingClientRect().width > 0);
    const el = pick('p,li,td') || pick('div,span,b,h2,h3');
    return el ? getComputedStyle(el).fontSize : 'n/a';
  })(),
  smallest: (() => {
    const sizes = [...document.querySelectorAll('body *')]
      .filter(e => e.getBoundingClientRect().width > 0 && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(e => parseFloat(getComputedStyle(e).fontSize));
    return sizes.length ? Math.min(...sizes) : 0;
  })(),
});

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  let fail = 0;
  for (const f of PAGES) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    // The Team Desk's gate is an overlay released by sessionStorage, and it
    // intercepts every click until it is.
    await ctx.addInitScript(() => { try { sessionStorage.setItem('bd_team', '1'); } catch (e) {} });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 90)));
    await p.goto(BASE + '/' + f, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1400);

    const before = await p.evaluate(measure);
    if (!before.present) { console.log(f.padEnd(18) + 'NO CONTROL'); fail++; await ctx.close(); continue; }

    await p.click('.bl-textsize button[data-size="lg"]');
    await p.waitForTimeout(500);
    const big = await p.evaluate(measure);

    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(1400);
    const kept = await p.evaluate(measure);

    const grew = parseFloat(big.body) > parseFloat(before.body);
    const stuck = kept.cls.includes('ui-lg') && kept.present;
    if (!grew || !stuck || errs.length) fail++;
    console.log(f.padEnd(18) +
      '按鈕 ' + before.buttons +
      '  內文 ' + before.body.padEnd(7) + '-> ' + big.body.padEnd(7) +
      '  最小字 ' + before.smallest + 'px -> ' + big.smallest + 'px' +
      '  ' + (grew ? '放大 OK' : '沒變大') +
      '  ' + (stuck ? '重載記住' : '重載掉了'));
    errs.forEach(e => console.log('   ERROR ' + e));

    if (f === 'index.html' || f === 'partner.html') {
      const png = await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 170 } });
      await sharp(png).resize({ width: 1300 }).webp({ quality: 88 })
        .toFile(path.join(SHOTS, 'textsize-' + f.replace('.html', '') + '.webp'));
    }
    await ctx.close();
  }
  await b.close();
  console.log(fail ? '\n' + fail + ' 頁有問題' : '\n全部通過');
  process.exit(fail ? 1 : 0);
})();
