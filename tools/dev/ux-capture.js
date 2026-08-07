// Phase 1 capture: screenshots, console errors, horizontal overflow, and a
// census of every font-size / colour / spacing value the browser actually
// computes. Computed values are the honest inventory — the stylesheets say
// what was written, this says what the reader gets.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');

const { CHROME, BASE, REPO, SHOTS } = require('./_env');
const OUT = path.join(REPO, 'screenshots', 'after');
const REPORT = path.join(SHOTS, 'ux-data-after.json');

const PAGES = [
  ['index.html', 'Home'],
  ['about.html', 'About'],
  ['product-101.html', 'Factory'],
  ['guide.html', 'Guide'],
  ['executive.html', 'ABrief'],
  ['partner.html', 'AsiaSource'],
  ['cost-desk.html', 'CostNow'],
  ['my-market.html', 'My Market'],
  ['team.html', 'Team Desk'],
  ['contact.html', 'Contact'],
  ['privacy.html', 'Privacy'],
  ['birdland-intro.html', 'Intro'],
];

const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 380, height: 780 }],
];

// Runs in the page. Walks every rendered element once.
const CENSUS = `(() => {
  const seen = {fontSize:{}, fontFamily:{}, color:{}, background:{}, radius:{}, gap:{}, pad:{}, margin:{}, dur:{}};
  const bump = (b, k) => { if (k) seen[b][k] = (seen[b][k] || 0) + 1; };
  const els = document.querySelectorAll('body *');
  els.forEach(el => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;               // not rendered
    const s = getComputedStyle(el);
    bump('fontSize', s.fontSize);
    bump('fontFamily', (s.fontFamily || '').split(',')[0].replace(/["']/g, ''));
    if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) bump('color', s.color);
    if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') bump('background', s.backgroundColor);
    if (s.borderRadius && s.borderRadius !== '0px') bump('radius', s.borderRadius);
    if (s.gap && s.gap !== 'normal') bump('gap', s.gap);
    ['paddingTop','paddingBottom','paddingLeft','paddingRight'].forEach(p => { if (s[p] !== '0px') bump('pad', s[p]); });
    ['marginTop','marginBottom'].forEach(p => { if (s[p] !== '0px') bump('margin', s[p]); });
    if (s.transitionDuration && s.transitionDuration !== '0s') s.transitionDuration.split(',').forEach(d => bump('dur', d.trim()));
  });
  const over = [...els].filter(el => el.getBoundingClientRect().right > innerWidth + 1)
    .map(el => (el.tagName + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '')).slice(0, 48));
  return {
    census: seen,
    elements: els.length,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    overflow: [...new Set(over)].slice(0, 12),
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 90)),
    h2: [...document.querySelectorAll('h2')].map(h => h.textContent.trim().slice(0, 70)),
    words: (document.body.innerText || '').trim().split(/\\s+/).length,
  };
})()`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const out = {};

  for (const [file, label] of PAGES) {
    out[file] = { label, viewports: {} };
    for (const [vpName, vp] of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
      page.on('pageerror', e => errors.push('pageerror: ' + String(e.message).slice(0, 200)));
      try {
        await page.goto(BASE + '/' + file, { waitUntil: 'networkidle', timeout: 45000 });
      } catch (e) { errors.push('nav: ' + e.message.split('\n')[0]); }
      await page.waitForTimeout(1200);

      // CLS and LCP, measured directly rather than through a Lighthouse run,
      // so the number belongs to this viewport.
      const vitals = await page.evaluate(() => new Promise(res => {
        let cls = 0, lcp = 0;
        try {
          new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver(l => { const e = l.getEntries(); if (e.length) lcp = e[e.length - 1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}
        setTimeout(() => res({ cls: Math.round(cls * 1000) / 1000, lcp: Math.round(lcp) }), 900);
      }));

      const data = await page.evaluate(CENSUS);
      const png = await page.screenshot({ fullPage: true });
      const name = file.replace('.html', '') + '-' + vpName + '.webp';
      // Factory and the desks run to tens of thousands of pixels tall; WebP
      // tops out at 16383 in either direction, so the long ones are scaled to
      // fit rather than dropped.
      await sharp(png)
        .resize({ width: vp.width === 1440 ? 1000 : 380, height: 16000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72 }).toFile(path.join(OUT, name));
      const bytes = fs.statSync(path.join(OUT, name)).size;

      out[file].viewports[vpName] = { ...data, ...vitals, errors, shot: name, shotBytes: bytes };
      console.log(('  ' + file + ' ' + vpName).padEnd(38) +
        'CLS ' + String(vitals.cls).padEnd(6) + 'LCP ' + String(vitals.lcp).padEnd(6) +
        'els ' + String(data.elements).padEnd(6) + 'words ' + String(data.words).padEnd(7) +
        (data.scrollWidth > data.innerWidth + 1 ? 'OVERFLOW +' + (data.scrollWidth - data.innerWidth) + 'px ' : '') +
        (errors.length ? errors.length + ' console errors' : ''));
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(REPORT, JSON.stringify(out, null, 1));
  console.log('\nwrote ' + REPORT);
})();
