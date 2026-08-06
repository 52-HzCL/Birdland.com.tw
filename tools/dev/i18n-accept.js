// Phone acceptance for the ten editions.
//
// The question is not "is there a picker in the DOM" — that was true while the
// picker was a dead <select>. The questions are: can a thumb reach it at
// 390px, does opening it show ten editions, and after choosing one does the
// chrome the reader is looking at actually come back in that language. The
// last one is answered by reading innerText, never by counting nodes.
//
//   node tools/dev/i18n-accept.js
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const { CHROME, BASE, SHOTS, REPO } = require('./_env');

const W = 390, H = 844;

// page, language, and a phrase that must be on screen afterwards. The phrases
// are chrome the dictionary or the static edition is responsible for, taken
// from i18n/app.<lang>.json and the facade pairs — not invented here.
const CASES = [
  // The four desk apps switch by stored preference.
  { file: 'executive.html', pick: 'de', shot: 'fix-executive-de-390', expect: ['Schriftgröße', 'Sprache'] },
  { file: 'partner.html', pick: 'de', shot: 'fix-partner-de-390', expect: ['Schriftgröße', 'Sprache'] },
  { file: 'cost-desk.html', pick: 'de', shot: 'fix-cost-desk-de-390', expect: ['Schriftgröße', 'Sprache'] },
  // The Team Desk sits behind its PIN gate, which is an overlay: unlocked the
  // way a returning colleague is, by the session flag its own script sets.
  { file: 'team.html', pick: 'de', shot: 'fix-team-de-390', expect: ['Schriftgröße', 'Sprache'], unlock: true },
  // The Guide is a built artifact too, so it switches the same way.
  { file: 'guide.html', pick: 'ja', shot: 'fix-guide-ja-390', expect: ['文字サイズ', '言語'] },
  // The English experience must be unchanged.
  { file: 'executive.html', pick: null, shot: 'fix-executive-en-390', expect: ['Language', 'Normal', 'Large'] },
  // The static editions switch by folder: the picker is ten links.
  { file: 'product-101.html', follow: 'zh-tw', shot: 'fix-factory-zh-tw-390', expect: ['繁體中文', '工廠'] },
  { file: 'contact.html', follow: 'de', shot: 'fix-contact-de-390', expect: ['Deutsch', 'Kontakt'] },
  { file: 'about.html', follow: 'zh-tw', shot: 'fix-about-zh-tw-390', expect: ['繁體中文', '關於'] },
];

const EXTRA = [
  // Arriving on a translated folder page is a language choice: the desks must
  // pick it up without the reader touching the picker again.
  { from: 'de/index.html', to: 'executive.html', want: 'de' },
  { from: 'zh-tw/about.html', to: 'partner.html', want: 'zh-tw' },
  { from: 'de/contact.html', to: 'cost-desk.html', want: 'de' },
  { from: 'ja/product-101.html', to: 'guide.html', want: 'ja' },
];

let fail = 0;
const say = (ok, msg) => { if (!ok) fail++; console.log((ok ? '  ok   ' : '  FAIL ') + msg); };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });

  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
    if (c.unlock) await page.addInitScript(() => { try { sessionStorage.setItem('bd_team', '1'); } catch (e) {} });
    await page.goto(BASE + '/' + c.file, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);

    // 1) The control is on screen and inside the viewport, not clipped off it.
    const box = await page.evaluate(() => {
      const s = document.querySelector('[data-language-picker] summary');
      if (!s) return null;
      const r = s.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, text: s.textContent.trim() };
    });
    say(!!box, c.file + ' @' + W + ': the picker has a summary to tap');
    if (box) say(box.w >= 24 && box.h >= 16 && box.x >= 0 && box.x + box.w <= W && box.y >= 0,
      c.file + ' @' + W + ': tappable and on screen  ' + JSON.stringify([Math.round(box.x), Math.round(box.y), Math.round(box.w), Math.round(box.h)]));

    // 2) Open it by clicking, the way a thumb does.
    await page.click('[data-language-picker] summary');
    await page.waitForTimeout(400);
    const pop = await page.evaluate(() => {
      const d = document.querySelector('[data-language-picker]');
      const panel = d.querySelector('div');
      const a = [...d.querySelectorAll('a')];
      const R = e => { const r = e.getBoundingClientRect(); return [r.x, r.right, r.width]; };
      return { names: a.map(x => x.textContent.trim()), panel: R(panel), links: a.map(R) };
    });
    say(pop.names.length === 10, c.file + ' @' + W + ': ten editions in the popover (' + pop.names.length + ')');
    // The popover once opened 121px off the left edge: ten editions present in
    // the DOM, none of them on the phone. Measure where they landed.
    const boxes = [pop.panel].concat(pop.links);
    const offscreen = boxes.filter(b => b[0] < 0 || b[1] > W || b[2] < 40);
    say(!offscreen.length, c.file + ' @' + W + ': popover and all ten links inside the viewport' +
      (offscreen.length ? ' — ' + offscreen.length + ' outside, first at x=' + Math.round(offscreen[0][0]) : ''));

    // 3) Choose one, the way a thumb does.
    if (c.pick) {
      await page.click('[data-language-picker] a[data-bl-lang="' + c.pick + '"]');
      await page.waitForTimeout(2500);
    } else if (c.follow) {
      await page.click('[data-language-picker] a[href*="' + c.follow + '/"]');
      await page.waitForLoadState('networkidle', { timeout: 60000 });
      await page.waitForTimeout(1500);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 4) Read what is on the screen. Open the picker again so its own words
    //    are part of what is read and part of what is photographed.
    await page.evaluate(() => { const d = document.querySelector('[data-language-picker]'); if (d) d.open = true; });
    await page.waitForTimeout(600);
    const seen = await page.evaluate(() => document.body.innerText + '\n' +
      [...document.querySelectorAll('[aria-label],[title]')].map(e => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '')).join('\n'));
    for (const phrase of c.expect) say(seen.includes(phrase), c.shot + ': innerText contains ' + JSON.stringify(phrase));
    say(!errs.length, c.shot + ': no page errors' + (errs.length ? ' — ' + errs[0] : ''));

    const png = await page.screenshot({ fullPage: false });
    await sharp(png).webp({ quality: 82 }).toFile(path.join(SHOTS, c.shot + '.webp'));
    console.log('       shot ' + c.shot + '.webp');
    await ctx.close();
  }

  // The handoff, end to end: land on a translated folder page, then walk into
  // an app and see it already speaking that language.
  for (const h of EXTRA) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/' + h.from, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(800);
    const stored = await page.evaluate(() => { try { return localStorage.getItem('bl_lang'); } catch (e) { return 'ERR'; } });
    say(stored === h.want, h.from + ' stores bl_lang=' + JSON.stringify(h.want) + ' (got ' + JSON.stringify(stored) + ')');
    await page.goto(BASE + '/' + h.to, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const lang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
    say(lang && lang.toLowerCase().startsWith(h.want.split('-')[0]),
      h.from + ' -> ' + h.to + ' opens in ' + h.want + ' (html lang=' + lang + ')');
    await ctx.close();
  }

  await browser.close();
  console.log(fail ? '\n' + fail + ' FAILED' : '\nphone acceptance: all green');
  process.exit(fail ? 1 : 0);
})();
