'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright-core');
const env=require('./_env');
const {registry}=require('../build/site');
const manifest=require('../../data/studio-illustrations.json');
(async()=>{
 const browser=await chromium.launch({executablePath:env.CHROME,headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(env.BASE+'/partner.html#pd-builder',{waitUntil:'networkidle'});await page.waitForTimeout(2200);
 for(let i=0;i<manifest.references.length;i++){
  const reference=manifest.references[i];await page.locator('#bd-family-tabs [data-family]').nth(i).click();
  const image=page.locator('#bd-anatomy-image');await image.evaluate(img=>img.decode());
  assert((await image.getAttribute('src')).endsWith(reference.asset));
  assert(await page.locator('#bd-reference-caption').isVisible());
  assert.equal(await page.locator('.sr-sources a').count(),reference.sources.length);
  for(let j=0;j<reference.sources.length;j++)assert.equal(await page.locator('.sr-sources a').nth(j).getAttribute('href'),reference.sources[j].url);
  assert((await page.locator('.sr-options').textContent()).includes('not the reference'));
  await page.locator('#bd-anatomy').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(env.SHOTS,'studio-reference-'+i+'-1440.png')});
 }
 // Models without reviewed construction must not reuse a neighbouring model's image/caption.
 await page.locator('#bd-family-tabs [data-family]').nth(0).click();await page.locator('#bd-model-tabs [data-model]').nth(1).click();
 assert.equal(await page.locator('#bd-anatomy-image').isVisible(),false);assert.equal(await page.locator('#bd-reference-caption').isVisible(),false);
 assert(!/complete and confirmed/.test(await page.locator('.bd-anatomy-empty').textContent()));
 await page.setViewportSize({width:375,height:900});
 for(const language of registry.languages){
  await page.evaluate(id=>localStorage.setItem('bl_lang',id),language.id);
  await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(2200);await page.locator('#bd-family-tabs [data-family]').nth(0).click();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#bd-reference-caption strong').textContent(),language.text.srTitle);
  assert.equal(await page.locator('.sr-scope').textContent(),language.text.srScope);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile fit '+language.id);
 }
 await page.locator('#bd-anatomy').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(env.SHOTS,'studio-reference-375.png')});
 assert.deepEqual(errors,[]);await browser.close();
 console.log('Five source-linked concepts, correct model switching, no image borrowing, ten languages and mobile fit passed.');
})().catch(e=>{console.error(e);process.exit(1);});
