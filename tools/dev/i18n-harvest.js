// What does a phone actually have on screen that the dictionary has never
// seen?
//
// The 354 keys in i18n/app.en.json were collected from a 1440px window. Below
// 900px the app bar drops its adopted status chips and shows a different set of
// labels, the desks collapse panels into <details>, and the dock shows names
// the wide layout shows as icons. None of that was in the harvest.
//
// So this one renders at 390x844 and reads the document, not the design:
// every text node and every translatable attribute, minus anything that is a
// value out of outlook-data.json or terminal.json — the day's steel price is
// the same word in every edition and must never enter a dictionary.
//
//   node tools/dev/i18n-harvest.js            # report the gap
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { CHROME, BASE, REPO } = require('./_env');

const PAGES = ['executive.html', 'partner.html', 'cost-desk.html', 'team.html', 'guide.html'];

// ---- what counts as data -----------------------------------------------------
// Both feeds are read whole and flattened to their string leaves. A candidate
// that is one of those leaves — or sits inside one — is data.
function leaves(v, out) {
  if (typeof v === 'string') { const t = v.trim(); if (t) out.add(t); return out; }
  if (Array.isArray(v)) { v.forEach(x => leaves(x, out)); return out; }
  if (v && typeof v === 'object') { Object.values(v).forEach(x => leaves(x, out)); return out; }
  return out;
}
const DATA = new Set();
for (const f of ['outlook-data.json', 'terminal.json']) {
  const p = path.join(REPO, f);
  if (fs.existsSync(p)) leaves(JSON.parse(fs.readFileSync(p, 'utf8')), DATA);
}
// One haystack for the substring test: a chip that renders "Rotterdam · CIF"
// is built from data even though neither half is a leaf on its own.
const HAY = [...DATA].join('\n');

const EN = JSON.parse(fs.readFileSync(path.join(REPO, 'i18n', 'app.en.json'), 'utf8'));
const known = new Set(EN);

// Collected in the page: every text node and translatable attribute, with the
// tag it sits on and whether the phone can currently see it. A closed <details>
// is chrome the reader opens, not chrome that is absent.
const collect = () => {
  const SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, TEXTAREA: 1, NOSCRIPT: 1, TITLE: 1, PRE: 1 };
  const ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
  const out = [];
  const shown = el => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
    }
    return true;
  };
  const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const p = n.parentElement;
    if (!p || SKIP[p.nodeName]) continue;
    const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    out.push({ kind: 'text', tag: p.nodeName.toLowerCase(), cls: String(p.className || '').split(/\s+/)[0], t, vis: shown(p) });
  }
  for (const el of document.querySelectorAll('[alt],[title],[aria-label],[placeholder]')) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || !v.trim()) continue;
      out.push({ kind: a, tag: el.nodeName.toLowerCase(), cls: String(el.className || '').split(/\s+/)[0], t: v.replace(/\s+/g, ' ').trim(), vis: shown(el) });
    }
  }
  return out;
};

// The chrome is the frame around the desk, and it is named: the app bar
// (ab-), the Guide's banner (dbar-), the facade classes the desks borrow
// (bl-), the Terminal chip, the command palette, the section rails. A string
// carried by one of these is a label somebody typed into a template. A string
// in a <td>, an <option> or a story paragraph is the day's reading.
const CHROME_CLS = /^(ab-|dbar-|bl-|tm-|pd-omni|pd-nav|toc|sysgrp|tpk|strip-|team-nav|updstamp|ab$|dbar$)/;
const CHROME_TAG = /^(summary|button|nav|label|legend|th|h1|h2|h3|h4|figcaption)$/;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const found = new Map();   // string -> {pages,tags,kinds,vis,widths}
  const read = async (f, width, height) => {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(BASE + '/' + f, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    // Open everything that folds, so collapsed chrome is read too, then let
    // the desks finish whatever the opening triggered.
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(d => d.open = true);
      document.querySelectorAll('[hidden]').forEach(e => e.removeAttribute('hidden'));
    });
    await page.waitForTimeout(900);
    const rows = await page.evaluate(collect);
    for (const r of rows) {
      const rec = found.get(r.t) || { pages: new Set(), tags: new Set(), kinds: new Set(), widths: new Set(), vis: false, chrome: false };
      rec.pages.add(f); rec.tags.add(r.tag + (r.cls ? '.' + r.cls : '')); rec.kinds.add(r.kind);
      rec.widths.add(width);
      rec.vis = rec.vis || r.vis;
      rec.chrome = rec.chrome || CHROME_CLS.test(r.cls) || CHROME_TAG.test(r.tag) || r.kind !== 'text';
      found.set(r.t, rec);
    }
    await ctx.close();
    console.error('read ' + f + ' @' + width + ' — ' + rows.length + ' nodes');
  };
  for (const f of PAGES) { await read(f, 1440, 900); await read(f, 390, 844); }
  await browser.close();

  const isData = t => DATA.has(t) || (t.length >= 4 && HAY.includes(t));
  const gap = [...found.entries()]
    .filter(([t]) => !known.has(t))
    .filter(([t]) => /[A-Za-z]/.test(t))          // language, not a number or a glyph
    .filter(([t]) => t.length >= 2 && t.length <= 90)
    .filter(([t]) => !/^[\d\s.,%+\-–—·:;/()"'#&≈~↑↓▲▼■°*€$£¥]+$/.test(t))
    .filter(([t]) => !isData(t))
    .filter(([, r]) => r.chrome)
    .sort((a, b) => b[1].pages.size - a[1].pages.size || a[0].localeCompare(b[0]));

  const line = ([t, rec]) => JSON.stringify(t) + '\t' + [...rec.pages].map(p => p.replace('.html', '')).join(',') +
    '\t' + [...rec.kinds].join(',') + '\t' + [...rec.tags].slice(0, 3).join(' ') +
    '\t' + [...rec.widths].join('+') + (rec.vis ? '' : '\t(folded)');

  const phoneOnly = gap.filter(([, r]) => !r.widths.has(1440));
  console.log('# dictionary ' + EN.length + ' keys; ' + found.size + ' distinct strings seen; ' +
    gap.length + ' chrome strings not in the dictionary, of which ' + phoneOnly.length + ' appear only at 390px\n');
  console.log('## phone only');
  phoneOnly.forEach(r => console.log(line(r)));
  console.log('\n## both widths');
  gap.filter(([, r]) => r.widths.has(1440)).forEach(r => console.log(line(r)));
})();
