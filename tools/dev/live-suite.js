// The production walk-through: every page, real Chrome, real clicks — nav,
// dropdown, Terminal open/search/navigate/close, text size, hero hover,
// contact routing, language picker. Against birdland.com.tw, not localhost.
'use strict';
const { chromium } = require('playwright-core');
const { CHROME } = require('./_env');
const BASE = 'https://birdland.com.tw';
let fail = 0;
const bad = (m) => { fail++; console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('bd_team', '1'); } catch (e) {} });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(p.url().split('/').pop() + ': ' + e.message.slice(0, 110)));
  p.on('console', m => { if (m.type() === 'error') errs.push(p.url().split('/').pop() + ': ' + m.text().slice(0, 110)); });

  // 1 — every page loads, no 4xx on subresources
  console.log('① 逐頁載入');
  for (const f of ['', 'about.html', 'guide.html', 'product-101.html', 'executive.html',
    'partner.html', 'cost-desk.html', 'team.html', 'contact.html', 'privacy.html', 'news.html']) {
    const missing = [];
    const h = r => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url().replace(BASE, '')); };
    p.on('response', h);
    await p.goto(BASE + '/' + f, { waitUntil: 'networkidle', timeout: 50000 }).catch(e => bad(f + ' nav: ' + e.message.split('\n')[0]));
    await p.waitForTimeout(700);
    p.off('response', h);
    if (missing.length) bad((f || 'index') + ' -> ' + [...new Set(missing)].join(', '));
  }
  ok('11 頁載入' + (fail ? '(見上)' : ',子資源零 4xx'));

  // 2 — nav: About dropdown really navigates
  console.log('② 導覽');
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.click('.bl-menu summary');
  await p.waitForTimeout(300);
  await p.click('.bl-menu-panel a[href="about.html"]');
  await p.waitForLoadState('networkidle');
  /about\.html$/.test(p.url()) ? ok('About▾ -> Us 抵達 about.html') : bad('About 下拉點了沒到:' + p.url());
  // Assert the outcome, not the technique. This used to count three <svg>
  // and failed the day the drawings became images — the page was correct and
  // the gate was describing an implementation detail.
  await p.evaluate(() => document.querySelectorAll('.ab-fig').forEach(f => f.scrollIntoView()));
  await p.waitForTimeout(1100);
  const plates = await p.evaluate(() => [...document.querySelectorAll('.ab-fig')].map(f => {
    const im = f.querySelector('img');
    if (im) return im.complete && im.naturalWidth > 0 ? 'img' : 'BROKEN';
    return f.querySelector('svg') ? 'svg' : 'EMPTY';
  }));
  (plates.length === 3 && !plates.some(s => s === 'BROKEN' || s === 'EMPTY'))
    ? ok('三張圖版都在並已載入 (' + plates.join('/') + ')')
    : bad('圖版狀態 ' + JSON.stringify(plates));

  // 3 — Terminal: open, tiles, navigate through a tile, reopen, search, ESC releases
  console.log('③ Terminal');
  await p.click('.tm-chip'); await p.waitForTimeout(800);
  const tiles = await p.evaluate(() => ({
    ico: document.querySelectorAll('.tm-ico svg').length,
    no: document.querySelectorAll('.tm-no').length,
    live: document.querySelectorAll('.tm-live').length,
  }));
  (tiles.ico === 4 && tiles.no === 0 && tiles.live === 0) ? ok('launcher:4 icon、零編號、零指數') : bad('launcher 狀態 ' + JSON.stringify(tiles));
  await p.click('.tm-step[href="partner.html"]');
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500);
  /partner\.html$/.test(p.url()) ? ok('點 Buyer Desk 磁磚抵達 partner.html') : bad('磁磚導航失敗:' + p.url());

  await p.click('.tm-chip'); await p.waitForTimeout(700);
  await p.fill('.tm-panel input', '420J2'); await p.waitForTimeout(700);
  const hits = await p.evaluate(() => document.querySelectorAll('.tm-hit').length);
  hits > 0 ? ok('搜尋 420J2 -> ' + hits + ' 筆') : bad('搜尋零結果');
  await p.keyboard.press('Escape'); await p.waitForTimeout(900);
  const released = await p.evaluate(() => {
    const d = document.querySelector('.tm-dim');
    return !d || getComputedStyle(d).pointerEvents === 'none';
  });
  released ? ok('ESC 後頁面解鎖') : bad('關閉後遮罩仍攔截');

  // 4 — text size: set Large on desk, land on home still Large
  console.log('④ 字級');
  await p.click('.bl-textsize button[data-size="lg"]'); await p.waitForTimeout(400);
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const big = await p.evaluate(() => ({
    cls: document.documentElement.classList.contains('ui-lg'),
    h1: getComputedStyle(document.querySelector('h1')).fontSize,
  }));
  big.cls ? ok('Large 跨頁生效,h1 ' + big.h1) : bad('Large 沒跨頁');
  await p.click('.bl-textsize button[data-size="sm"]'); await p.waitForTimeout(300);

  // 5 — hero: markers breathe, hover lights exactly one, intro suppressed on reload
  console.log('⑤ Hero');
  const mk = await p.evaluate(() => getComputedStyle(document.querySelector('.bl-ink-marker')).animationName);
  mk !== 'none' ? ok('標記呼吸中 (' + mk + ')') : bad('標記沒有動畫');
  const c = await p.evaluate(() => {
    const e = document.querySelectorAll('[data-ink-main]')[1].getBoundingClientRect();
    return [Math.round(e.left + e.width / 2), Math.round(e.top + e.height / 2)];
  });
  await p.mouse.move(c[0], c[1]); await p.waitForTimeout(700);
  const lit = await p.evaluate(() => [...document.querySelectorAll('[data-ink-main]')]
    .filter(e => getComputedStyle(e).opacity > .5).length);
  lit === 1 ? ok('hover 只亮一塊') : bad('hover 亮了 ' + lit + ' 塊');

  // 6 — contact: selects filled, desk name updates, reveal shows an address
  console.log('⑥ Contact');
  await p.goto(BASE + '/contact.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const optN = await p.evaluate(() => document.getElementById('mr-region').options.length);
  optN > 1 ? ok('市場選單有 ' + optN + ' 項') : bad('市場選單空的');
  await p.selectOption('#mr-region', { index: 1 }); await p.waitForTimeout(300);
  await p.click('#mr-reveal'); await p.waitForTimeout(300);
  const addr = await p.evaluate(() => document.getElementById('mr-addr').textContent);
  /@/.test(addr) ? ok('地址揭示:' + addr.replace(/^(.{4}).*@/, '$1…@')) : bad('地址沒出現');

  // 7 — header: Office status text, chip matches nav metrics
  console.log('⑦ Header');
  const hdr = await p.evaluate(() => {
    const lbl = document.querySelector('[data-hq-label]');
    const chip = document.querySelector('.tm-chip'), a = document.querySelector('.bl-nav>a');
    const g = e => getComputedStyle(e).fontSize + '/' + getComputedStyle(e).fontWeight;
    return { office: lbl && lbl.textContent, same: g(chip) === g(a), pulse: getComputedStyle(chip.querySelector('i')).animationName };
  });
  /Working|Resting/.test(hdr.office) ? ok('Office 狀態字:' + hdr.office) : bad('狀態字 ' + hdr.office);
  hdr.same ? ok('晶片字級=導覽連結') : bad('晶片字級偏離');
  hdr.pulse !== 'none' ? ok('綠點脈動 (' + hdr.pulse + ')') : bad('綠點沒動');

  console.log('\n' + (errs.length ? 'console 錯誤:\n  ' + [...new Set(errs)].join('\n  ') : 'console 全程零錯誤'));
  if (errs.length) fail++;
  console.log(fail ? '\n共 ' + fail + ' 個問題' : '\n線上驗收全部通過');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
