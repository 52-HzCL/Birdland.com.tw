// After merging three CI runs into the branch: does the site still boot, and
// does the fresh data actually reach the places that render it?
'use strict';
const { chromium } = require('playwright-core');
const { CHROME, BASE } = require('./_env');
const PAGES = ['index.html','about.html','guide.html','executive.html','partner.html','cost-desk.html','product-101.html','contact.html','privacy.html','news.html'];
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  let fail = 0;
  for (const f of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
    page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).slice(0, 140)));
    const bad404 = [];
    page.on('response', r => { if (r.status() >= 400) bad404.push(r.status() + ' ' + r.url().replace(BASE, '')); });
    try { await page.goto(BASE + '/' + f, { waitUntil: 'networkidle', timeout: 45000 }); }
    catch (e) { errs.push('nav: ' + e.message.split('\n')[0]); }
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const chip = document.querySelector('.tm-chip');
      const dot = chip && chip.querySelector('i');
      return {
        title: document.title,
        chip: chip ? (chip.className + ' | ' + (chip.getAttribute('title') || chip.textContent.trim()).slice(0, 60)) : null,
        dotColour: dot ? getComputedStyle(dot).backgroundColor : null,
        // whatever the page prints as its data date
        dates: [...new Set([...document.querySelectorAll('.sec-date,.asof,[data-updated],.dj-date,.upd')]
          .map(e => e.textContent.trim()).filter(Boolean))].slice(0, 3),
        words: (document.body.innerText || '').trim().split(/\s+/).length,
      };
    });
    if (errs.length || bad404.length) fail++;
    console.log(f.padEnd(20) + 'words ' + String(info.words).padEnd(7) +
      (info.dotColour ? 'dot ' + info.dotColour.padEnd(20) : ''.padEnd(24)) +
      (info.dates.length ? 'dates ' + JSON.stringify(info.dates) : ''));
    errs.forEach(e => console.log('    ERROR  ' + e));
    [...new Set(bad404)].forEach(e => console.log('    HTTP   ' + e));
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? '\n' + fail + ' page(s) with problems' : '\nall clean');
  process.exit(fail ? 1 : 0);
})();
