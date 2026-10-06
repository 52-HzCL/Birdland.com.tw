'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),env=require('./_env');
const out=path.join(env.REPO,'..','site-audit');
(async()=>{
 const browser=await chromium.launch({executablePath:env.CHROME});const results=[],errors=[];
 try{
 for(const width of [1440,375]){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
  async function check(name,fn){await fn();results.push({width,name,status:'passed'});console.log(width,'PASS',name);}
  async function goto(route){await page.goto(env.BASE+'/'+route,{waitUntil:'networkidle'});}
  async function shot(name){await page.screenshot({path:path.join(out,'repairs-'+name+'-'+width+'.png')});}
  await check('Configurator returns to formal Products; browser back and forward',async()=>{
   await goto('configurator.html');assert.equal(await page.locator('.tb-back').getAttribute('href'),'products.html#bl-cat');
   await page.locator('a[href="products.html#bl-cat"]').last().click();await page.waitForURL('**/products.html#bl-cat');await page.goBack();assert(page.url().includes('configurator.html'));
   await page.goForward();assert(page.url().includes('products.html'));});
  await check('Both None stay empty, second slot stays second, reload and category changes preserve choices',async()=>{
   await goto('my-market.html');await page.locator('#mc-peer-0').waitFor();
   await page.selectOption('#mc-peer-0','');await page.selectOption('#mc-peer-1','');
   assert.deepEqual(await page.locator('#mc-peer-0,#mc-peer-1').evaluateAll(ns=>ns.map(n=>n.value)),['','']);
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#mc-peer-1').inputValue(),'');
   const peer=await page.locator('#mc-peer-1 option').evaluateAll(ns=>ns.find(n=>n.value)?.value);
   await page.selectOption('#mc-peer-1',peer);assert.equal(await page.locator('#mc-peer-0').inputValue(),'');assert.equal(await page.locator('#mc-peer-1').inputValue(),peer);
   await page.selectOption('#mc-peer-1','');await page.selectOption('#mc-category','820210');await page.selectOption('#mc-market','au');
   assert.deepEqual(await page.locator('#mc-peer-0,#mc-peer-1').evaluateAll(ns=>ns.map(n=>n.value)),['','']);
   assert.equal(await page.locator('#mc-market option[value=au]').getAttribute('data-available'),'false');await shot('market-none');});
  await check('Retain quote inputs; selection changes hide results and copy until explicit confirmation',async()=>{
   await goto('buying-tools.html#landed-cost');await page.locator('#bi-product option').nth(1).waitFor({state:'attached'});
   await page.locator('#bt-estimate-inputs > summary').click();
   for(const [id,v] of [['fob','10000'],['quantity','1000'],['freight','1000']])await page.locator('#bt-'+id).fill(v);
   assert.equal(await page.locator('#bt-unit').innerText(),'US$11.00');
   const old=await page.locator('#bi-market').inputValue();await page.selectOption('#bi-market',old==='us'?'de':'us');
   assert(await page.locator('#bt-context-review').isVisible());assert(await page.locator('#bt-cost-copy').isDisabled());assert.equal(await page.locator('#bt-unit').innerText(),'—');
   assert.equal(await page.locator('#bt-fob').inputValue(),'10000');await page.locator('#bt-freight').fill('2000');assert(await page.locator('#bt-cost-copy').isDisabled());
   await page.locator('#bt-context-review').scrollIntoViewIfNeeded();await shot('context-review');await page.locator('#bt-confirm-context').click();assert.equal(await page.locator('#bt-unit').innerText(),'US$12.00');
   const sku=await page.locator('#bi-product option').nth(1).getAttribute('value');await page.selectOption('#bi-product',sku);assert(await page.locator('#bt-cost-copy').isDisabled());
   await page.selectOption('#bi-category','hoes');assert(await page.locator('#bt-context-review').isVisible());await page.locator('#bt-confirm-context').click();assert(await page.locator('#bt-cost-copy').isEnabled());
   await page.locator('#bt-quantity').fill('1.5');assert(await page.locator('#bt-cost-copy').isDisabled());await page.locator('#bt-quantity').fill('1000');
   await page.locator('[data-tool-link][href="#reorder-planning"]').click();await page.goBack();assert(page.url().endsWith('#landed-cost'));
   await page.locator('#bi-clear').click();assert(await page.locator('#bt-context-review').isVisible());
   await page.locator('#bt-cost-form').evaluate(f=>f.reset());await page.waitForTimeout(100);assert.equal(await page.locator('#bt-fob').inputValue(),'');assert(await page.locator('#bt-context-review').isHidden());assert(await page.locator('#bt-cost-copy').isDisabled());});
  await check('All ten language labels and planning availability render without overflow',async()=>{
   for(const lang of ['en','nl','de','fr','es','pt-br','pl','it','ja','zh-tw']){
    await page.evaluate(id=>localStorage.setItem('bl_lang',id),lang);await goto('buying-tools.html');
    await page.locator('#bi-market optgroup').first().waitFor({state:'attached'});await page.selectOption('#bi-category','watering');
    assert.equal(await page.locator('#bi-market option[data-available=true]').count(),0);
    assert(!(await page.locator('#bi-availability-note').innerText()).includes('fxMarketsNote'));
    await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+lang);
   }
   await shot('planning-zh');});
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'buyer-repairs-results.json'),JSON.stringify({results,pageErrors:errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
