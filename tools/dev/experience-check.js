'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');
const env = require('./_env');

// Verify continuity during real operations, not only whether a control exists.
(async () => {
  const browser = await chromium.launch({ executablePath: env.CHROME });
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const load = async file => { await page.goto(env.BASE + '/' + file); await page.waitForTimeout(800); };
      await load('products.html');
      await page.locator('#cat-q').fill('BT-3171');
      await page.waitForTimeout(200);
      const add = page.locator('.cat-row[data-id="bt-3171"] [data-add]');
      await add.focus();
      await page.keyboard.press('Enter');
      assert(await add.evaluate(e => e === document.activeElement), 'Adding a model loses keyboard focus');
      assert.equal(await add.getAttribute('aria-pressed'), 'true');
      await page.locator('.cat-row[data-id="bt-3171"]').click({ position: { x: 20, y: 20 } });
      const dialog = page.locator('.cat-product-dialog');
      assert(await dialog.evaluate(e => e.open));
      const backgroundY = await page.evaluate(() => scrollY);
      await page.mouse.move(2, 2); await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => scrollY), backgroundY, 'Modal wheel scrolls background');
      await page.keyboard.press('Escape');
      assert(await page.locator('.cat-row[data-id="bt-3171"]').evaluate(e => e === document.activeElement));
      await page.locator('.cat-row[data-id="bt-3171"]').click({ position: { x: 20, y: 20 } });
      await page.mouse.click(2, 2);
      assert(!(await dialog.evaluate(e => e.open)), 'Backdrop does not dismiss product modal');
      const axis = page.locator('#cat-rail [data-axis]').last();
      const category = await axis.getAttribute('data-axis');
      await axis.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.axis), category);
      await load('partner.html#studio-needs');
      await page.locator('[data-mode="model"]').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.mode), 'model');
      await page.locator('[data-mode="idea"]').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.mode), 'idea');
      await load('products.html');
      const menu = page.locator('.bj-language');
      await menu.locator('summary').click(); assert(await menu.evaluate(e => e.open));
      await page.keyboard.press('Escape'); assert(!(await menu.evaluate(e => e.open)));
      assert(await menu.locator('summary').evaluate(e => e === document.activeElement));
      await menu.locator('summary').click(); await page.mouse.click(10, 200);
      assert(!(await menu.evaluate(e => e.open)));
      for (const file of ['products.html', 'partner.html', 'buying-tools.html', 'executive.html', 'my-market.html', 'product-101.html', 'contact.html']) {
        await load(file);
        await page.screenshot({ path: path.join(env.SHOTS, `experience-after-${file}-${width}.png`) });
        await page.evaluate(() => document.documentElement.classList.add('ui-lg'));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), file + ' overflows with large text');
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: keyboard continuity, modal return, menu dismissal, reduced motion and large text`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
