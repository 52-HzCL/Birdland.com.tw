'use strict';

// Fast, repeatable layout smoke test for the public buyer journey. It deliberately
// measures browser geometry rather than relying on screenshots alone.
const { chromium } = require('playwright-core');
const { CHROME, BASE } = require('./_env');

const pages = [
  'index.html', 'products.html', 'partner.html', 'product-101.html',
  'buying-tools.html', 'cost-desk.html', 'executive.html', 'my-market.html',
  'configurator.html', 'about.html', 'contact.html', 'guide.html'
];
const viewports = [{ name: 'desktop', width: 1440, height: 960 }, { name: 'small-desktop', width: 1024, height: 960 }, { name: 'phone-wide', width: 390, height: 844 }, { name: 'tablet', width: 768, height: 960 }, { name: 'phone', width: 375, height: 844 }];

function fail(message) { process.exitCode = 1; console.error('FAIL ' + message); }

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const errors = [];
      page.on('pageerror', err => errors.push('pageerror: ' + err.message));
      page.on('requestfailed', request => {
        if (!request.url().startsWith('data:')) errors.push('requestfailed: ' + request.url());
      });
      for (const file of pages) {
        await page.goto(BASE + '/' + file, { waitUntil: 'domcontentloaded' });
        // The three preserved apps retain their branded launch screen. Audit
        // the usable page underneath it, not the transition frame.
        if (await page.locator('#ab-splash').count()) {
          await page.waitForFunction(() => {
            const splash = document.getElementById('ab-splash');
            return !splash || getComputedStyle(splash).display === 'none';
          }, null, { timeout: 3500 }).catch(() => {});
        }
        await page.waitForTimeout(180);
        const data = await page.evaluate(() => {
          const rect = el => { const r = el.getBoundingClientRect(); return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height }; };
          const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
          const preservedApp = ['partner.html', 'executive.html', 'my-market.html'].includes(location.pathname.split('/').pop());
          const nav = document.querySelector(preservedApp ? '#app-bar' : '.bj-nav');
          const navChildren = nav ? [...nav.querySelectorAll('.bj-brand,.bj-links,.bj-nav-actions,.bj-nav>button,.bj-nav>details,.bj-language')].filter(visible).map(rect) : [];
          const controls = [...document.querySelectorAll('input,select,textarea,button')].filter(visible).map(el => ({ tag:el.tagName, type:el.type || '', cls:el.className || '', rect:rect(el) }));
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
            nav: nav ? rect(nav) : null,
            preservedApp,
            unwantedShell: preservedApp && !!document.querySelector('.bj-nav'),
            navChildren,
            controls
          };
        });
        if (data.scrollWidth > data.clientWidth + 1) fail(`${viewport.name} ${file}: horizontal overflow ${data.scrollWidth - data.clientWidth}px`);
        if (!data.nav) fail(`${viewport.name} ${file}: missing page navigation`);
        if (data.unwantedShell) fail(`${viewport.name} ${file}: corporate shell overrides preserved app`);
        if (data.nav && data.navChildren.some(r => r.left < data.nav.left - 1 || r.right > data.nav.right + 1 || r.top < data.nav.top - 1 || r.bottom > data.nav.bottom + 1)) fail(`${viewport.name} ${file}: navigation child is cut outside its bar`);
        await page.evaluate(() => window.scrollTo(0, 0));
        if (data.scrollHeight > data.clientHeight + 80) {
          await page.mouse.move(viewport.width / 2, viewport.height / 2);
          await page.mouse.wheel(0, 600);
          await page.waitForTimeout(80);
          const moved = await page.evaluate(() => window.scrollY);
          if (moved < 10) fail(`${viewport.name} ${file}: mouse wheel does not scroll the page`);
        }
        if (errors.length) { errors.splice(0).forEach(error => fail(`${viewport.name} ${file}: ${error}`)); }
        console.log(`OK ${viewport.name} ${file}`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
