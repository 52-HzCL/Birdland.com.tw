'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const env=require('./_env');
const {registry}=require('../build/site');
(async()=>{
  const browser=await chromium.launch({executablePath:env.CHROME,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1100},permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function load(path='/partner.html'){
    await page.goto(env.BASE+path,{waitUntil:'networkidle'});
    await page.locator('#studio-needs h1').waitFor();
    // The original app splash exits on its own timer.
    await page.waitForTimeout(2200);
  }
  async function fits(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await load();assert(await page.locator('#studio-needs').isVisible());await fits();
  let initial=await page.locator('#sn-plain').textContent();assert(!initial.includes('SK5'));assert(!initial.includes('Cost stability'));
  assert.equal(await page.locator('[data-need][aria-pressed=true]').count(),0);
  await page.selectOption('#sn-category','pruners');await page.selectOption('#sn-use','professional');
  await page.click('[data-need=Rust]');await page.click('[data-need=Durability]');await page.click('[data-need=Weight]');
  assert.equal(await page.locator('[data-need][aria-pressed=true]').count(),2);
  await page.click('[data-need=Rust]');await page.click('[data-need=Rust]');
  await page.click('#sn-copy');assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),await page.locator('#sn-plain').textContent());
  await page.screenshot({path:env.SHOTS+'/studio-needs-1440.png',fullPage:true});
  await page.setViewportSize({width:375,height:900});await fits();
  await page.screenshot({path:env.SHOTS+'/studio-needs-375.png',fullPage:true});
  await page.click('[data-mode=model]');await page.selectOption('#sn-model','bt-3171');
  assert.match(await page.locator('#sn-summary').textContent(),/BT-3171.*Made in Taiwan/);
  assert.match(await page.locator('#sn-product img').getAttribute('src'),/bt-3171/);
  assert.equal(await page.locator('#sn-model option').count(),70);
  const bc=await page.locator('#sn-model option').evaluateAll(ns=>ns.find(n=>n.textContent.includes('BC-')).value);
  await page.selectOption('#sn-model',bc);assert.match(await page.locator('#sn-summary').textContent(),/Made in China/);
  await page.locator('.sn-engineering>summary').click();assert(await page.locator('#bd-builder, #pd-builder').last().isVisible());
  assert(await page.locator('#bd-materials [data-material]').count()>0);
  await page.locator('#bd-materials [data-material]').last().click();
  const material=await page.locator('#bb-summary-material').textContent();assert((await page.locator('#sn-plain').textContent()).includes(material));
  await page.locator('#bd-materials [data-compare]').nth(0).check();await page.locator('#bd-materials [data-compare]').nth(1).check();
  await page.click('#bd-compare-open');assert(await page.locator('#bd-compare-modal').isVisible());await page.keyboard.press('Escape');
  await fits();
  await page.locator('.sn-secondary').nth(1).locator(':scope>summary').click();assert(await page.locator('#bl-cat').isVisible());
  assert.equal(await page.locator('#cat-list .cat-row').count(),52);await fits();
  await load();assert.equal(await page.locator('[data-need][aria-pressed=true]').count(),0);assert.equal(await page.locator('#sn-category').inputValue(),'');
  await load('/partner.html?sku=BT-3171');assert.equal(await page.locator('#sn-model').inputValue(),'bt-3171');
  await page.click('#sn-plan');await page.waitForURL('**/buying-tools.html');
  const focus=await page.evaluate(()=>JSON.parse(localStorage.getItem('bl_buyer_focus')));assert.equal(focus.product,'bt-3171');assert.equal(focus.category,'pruners');assert.equal(focus.priorities,undefined);
  await load('/partner.html?sku=NOT-A-PRODUCT');assert.equal(await page.locator('#sn-model').count(),0);
  await load('/partner.html#pd-builder');assert.equal(await page.locator('.sn-engineering').getAttribute('open'),'');assert(await page.locator('#pd-builder').isVisible());
  await page.evaluate(()=>{location.hash='p-mkt';});await page.waitForTimeout(200);assert(await page.locator('#p-mkt').isVisible());
  assert.equal(await page.evaluate(()=>document.body.classList.contains('studio-needs-active')),false);
  await page.goto(env.BASE+'/partner.html#p-landed2');await page.waitForURL('**/buying-tools.html#landed-cost');
  for(const language of registry.languages){
    await page.evaluate(id=>localStorage.setItem('bl_lang',id),language.id);
    await load();await fits();assert.equal(await page.locator('#studio-needs h1').textContent(),language.text.snTitle);
    assert(!/\bsn[A-Z]\w*\b/.test(await page.locator('#studio-needs').innerText()));
  }
  assert.deepEqual(errors,[]);
  await browser.close();console.log('Studio: both entry paths, 69 verified models, origins, clipboard, priorities, session privacy, reference tools, deep links, ten languages and mobile fit passed.');
})().catch(e=>{console.error(e);process.exit(1);});
