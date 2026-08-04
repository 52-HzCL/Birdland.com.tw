// The chip existed on the desks with no stylesheet and no script behind it.
// Fixed — but "the CSS loads" is not "the feature works". Click it and see.
'use strict';
const { chromium } = require('playwright-core');
const { CHROME, BASE } = require('./_env');
// Site pages only. The three desks are standalone apps since 2026-08: they
// carry no Terminal chip on purpose — the launcher is the way in, and their
// own chrome carries the way back.
const PAGES = ['index.html', 'guide.html', 'about.html'];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  let fail = 0;
  for (const f of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
    await page.goto(BASE + '/' + f, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => errs.push('nav ' + e.message));
    await page.waitForTimeout(1200);

    const chip = await page.$('.tm-chip');
    if (!chip) { console.log(f.padEnd(18) + 'NO CHIP'); fail++; await ctx.close(); continue; }

    const dot = await page.evaluate(() => {
      const d = document.querySelector('.tm-chip i');
      const r = d.getBoundingClientRect();
      return getComputedStyle(d).backgroundColor + '  ' + r.width + 'x' + r.height;
    });

    await chip.click();
    await page.waitForTimeout(700);

    const open = await page.evaluate(() => {
      const p = document.querySelector('.tm-panel, #tm-panel, [data-terminal-panel]');
      if (!p) return { found: false };
      const r = p.getBoundingClientRect();
      const steps = [...p.querySelectorAll('.tm-step, .tm-stage')].map(s => (s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 34));
      const input = p.querySelector('input');
      return {
        found: true,
        visible: r.width > 100 && r.height > 100 && getComputedStyle(p).visibility !== 'hidden',
        box: Math.round(r.width) + 'x' + Math.round(r.height),
        steps: steps.slice(0, 3),
        hasSearch: !!input,
      };
    });

    let search = '-';
    if (open.hasSearch) {
      await page.fill('.tm-panel input, #tm-panel input, [data-terminal-panel] input', '420J2');
      await page.waitForTimeout(600);
      search = await page.evaluate(() => {
        const rs = document.querySelectorAll('.tm-result, .tm-hit, [data-tm-result]');
        return rs.length + ' hits' + (rs.length ? ' — ' + (rs[0].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) : '');
      });
    }

    // The close path, which this gate did not test until it shipped a site
    // where every page was dead after one click: the backdrop kept
    // pointer-events:auto at opacity 0, so an invisible sheet covered
    // everything. "It opens" is not "it works".
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    const closed = await page.evaluate(() => {
      const gone = sel => {
        const e = document.querySelector(sel);
        if (!e) return true;                       // never created is fine
        const c = getComputedStyle(e);
        return c.pointerEvents === 'none' || c.visibility === 'hidden' || c.display === 'none';
      };
      // Something visible and clickable in the header must be reachable
      // again. Links inside a closed <details> are laid out but deliberately
      // not hit-testable, so they would report a false failure.
      const link = [...document.querySelectorAll('.bl-nav a, .dbar-nav a')]
        .find(a => a.getBoundingClientRect().width > 0 && !a.closest('details:not([open])'));
      let reachable = null;
      if (link) {
        const r = link.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        reachable = hit === link || link.contains(hit);
      }
      return {
        inert: gone('.tm-dim') && gone('.tm-panel'),
        reachable,
        expanded: (document.querySelector('.tm-chip') || {}).getAttribute('aria-expanded'),
      };
    });
    const closeOk = closed.inert && closed.expanded === 'false' && closed.reachable !== false;

    const ok = open.found && open.visible;
    if (!ok || !closeOk || errs.length) fail++;
    console.log(f.padEnd(18) + 'dot ' + dot.padEnd(28) +
      'panel ' + (ok ? open.box.padEnd(12) : 'NOT OPEN    ') +
      'search ' + search.padEnd(46) +
      'close ' + (closeOk ? 'page released' : 'STILL BLOCKING' +
        (closed.inert ? '' : ' (backdrop live)') + (closed.reachable === false ? ' (nav unreachable)' : '')));
    if (open.steps && open.steps.length) console.log('   steps: ' + JSON.stringify(open.steps));
    errs.forEach(e => console.log('   ERROR ' + e));
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? '\n' + fail + ' page(s) failed' : '\nterminal works on every page that carries it');
  process.exit(fail ? 1 : 0);
})();
