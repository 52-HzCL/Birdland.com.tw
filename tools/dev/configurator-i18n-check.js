'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),env=require('./_env');
const editions=JSON.parse(fs.readFileSync(path.join(env.REPO,'config/languages.json'),'utf8')).languages;
const {PRODUCTS}=require('./configurator-data');
const dir=path.join(env.REPO,'..','site-audit','configurator-i18n');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:env.CHROME}),results=[],errors=[];
 try {for(const width of [1440,375]){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'}),p=await context.newPage();p.setDefaultTimeout(7000);p.on('pageerror',e=>errors.push(e.message));
  async function test(name,fn){await fn();results.push({width,name,status:'passed'});console.log(width,'PASS',name);}
  async function goto(lang,query=''){const response=await p.goto(env.BASE+'/'+(lang==='en'?'':lang+'/')+'configurator.html'+query,{waitUntil:'networkidle'});assert.equal(response.status(),200);await p.locator('.bj-language').waitFor();}
  async function selectModel(id){const chooser=p.locator('.bj-config-products');if(await chooser.getAttribute('open')===null)await chooser.locator('summary').click();await p.locator('[data-pid="'+id+'"]').click();}
  for(const edition of editions)await test(edition.id+' direct URL, translated structure, shared option identifiers, all 17 models',async()=>{
   await goto(edition.id);
   assert.equal(await p.locator('html').getAttribute('lang'),edition.tag);
   assert.equal(await p.evaluate(()=>localStorage.getItem('bl_lang')),edition.id);
   const data=await p.locator('#cfg-data').evaluate(n=>JSON.parse(n.textContent));
   assert.equal(data.products.length,17);assert.equal(Object.keys(data.options).length,58);
   assert.equal(await p.locator('#sbItems').innerText(),data.ui.sheetEmpty);
   for(const product of data.products){await p.locator('[data-pid="'+product.id+'"]').evaluate(n=>n.click());
    assert.equal(await p.locator('#pName').innerText(),product.name);
    assert.equal(await p.locator('.part').count(),product.parts.length);
    await p.locator('.part-h').first().click();
    const part=product.parts[0];for(const gate of Object.keys(part.options)){const opt=p.locator('.part').first().locator('.opt[data-gate="'+gate+'"]').first();await opt.click();const key=await opt.getAttribute('data-opt');assert(PRODUCTS.find(a=>a.id===product.id).parts[0].options[gate].includes(key));}
    await p.evaluate(()=>document.fonts.ready);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+edition.id+' '+product.id);
   }
   await p.evaluate(()=>localStorage.removeItem('bl_cfg_sheet'));await p.reload({waitUntil:'networkidle'});
  });
  await test('All ten actual language links preserve current product, selected material, quantity and delivery; translated CSV',async()=>{
   await goto('en');await selectModel('pruning-shears');await p.locator('.part[data-part="blade"] .part-h').click();
   const option=p.locator('.part[data-part="blade"] .opt[data-gate="material"]').first();const canonical=await option.getAttribute('data-opt');await option.click();await p.locator('#qty').fill('1500');await p.locator('#delv').fill('2027-02');
   for(const edition of editions){await p.locator('.bj-language summary').click();await Promise.all([p.waitForNavigation({waitUntil:'networkidle'}),p.locator('.bj-language a[lang="'+edition.tag+'"]').click()]);
    assert.equal(new URL(p.url()).pathname,(edition.id==='en'?'/':'/'+edition.id+'/')+'configurator.html');
    assert.equal(new URL(p.url()).searchParams.get('product'),'pruning-shears');
    assert.equal(await p.locator('#qty').inputValue(),'1500');assert.equal(await p.locator('#delv').inputValue(),'2027-02');
    const data=await p.locator('#cfg-data').evaluate(n=>JSON.parse(n.textContent));const model=data.products.find(a=>a.id==='pruning-shears');
    assert.equal(await p.locator('#pName').innerText(),model.name);assert.equal(await p.locator('.opt.is-on').getAttribute('data-opt'),canonical);
    const expected=data.optionLabels[canonical]||canonical;assert.equal(await p.locator('.opt.is-on .o-name').innerText(),expected);
    assert((await p.locator('#sbItems').innerText()).includes(model.name));
    const download=p.waitForEvent('download');await p.locator('#csvBtn').click();const f=await download,dest=path.join(dir,'summary-'+edition.id+'-'+width+'.csv');await f.saveAs(dest);const csv=fs.readFileSync(dest,'utf8');
    for(const value of [data.ui.csvProduct,data.ui.csvPart,model.name,expected,'1500','2027-02'])assert(csv.includes(value));assert(await p.locator('#mailBtn').isEnabled());
    await p.locator('.part[data-part="blade"] .part-h').click();await p.locator('#pName').scrollIntoViewIfNeeded();await p.evaluate(()=>document.fonts.ready);
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'selected overflow '+edition.id);
    if(['en','de','fr','ja','zh-tw'].includes(edition.id))await p.screenshot({path:path.join(dir,edition.id+'-'+width+'.png')});
   }
  });
  await test('Products and Studio round trips respect the active edition; browser back/forward and reload preserve the sheet',async()=>{
   for(const edition of editions){await goto(edition.id,'?product=pruning-shears');
    await p.locator('footer a[href*="products.html"]').click();await p.waitForURL('**/products.html#bl-cat');assert.equal(await p.evaluate(()=>localStorage.getItem('bl_lang')),edition.id);
    await p.locator('.cat-scope > summary').click();await p.locator('.bj-custom-entry').click();await p.waitForURL('**/configurator.html*');assert.equal(new URL(p.url()).pathname,(edition.id==='en'?'/':'/'+edition.id+'/')+'configurator.html');
    await p.locator('footer a[href*="partner.html"]').click();await p.waitForURL('**/partner.html');
    const back=p.locator('a[href$="configurator.html"]').first();assert((await back.getAttribute('href')).includes((edition.id==='en'?'':edition.id+'/')+'configurator.html'));
    // The Studio link belongs to the retained engineering disclosure.
    const parent=back.locator('xpath=ancestor::details[1]');if(await parent.count())await parent.evaluate(n=>n.open=true);
    await back.click();await p.waitForURL('**/configurator.html*');assert.equal(new URL(p.url()).pathname,(edition.id==='en'?'/':'/'+edition.id+'/')+'configurator.html');
    await p.goBack({waitUntil:'networkidle'});assert(p.url().includes('partner.html'));await p.goForward({waitUntil:'networkidle'});assert(p.url().includes('configurator.html'));
    await p.reload({waitUntil:'networkidle'});assert(await p.locator('#csvBtn').isEnabled());
   }
  });
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({date:new Date().toISOString(),results,pageErrors:errors,scope:'Chrome 1440/375px, 10 configurator editions; mail button enabled only, no mailto navigation or real submission; translated copy not independently reviewed by native speakers.'},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
