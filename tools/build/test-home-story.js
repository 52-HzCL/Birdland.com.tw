'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const names = ['drawing','die','blade','parts','assembly','packing','hanging'];
const evidence = process.env.BIRDLAND_TEST_EVIDENCE_DIR;

async function waitForFilm(page, seconds) {
  await page.waitForFunction(t => {
    const video = document.querySelector('.story-film.has-film video');
    return video && video.readyState >= 2 && !video.seeking && Math.abs(video.currentTime-t) < .07;
  },seconds);
}

async function still(page,name,width) {
  if (evidence) await page.screenshot({path:path.join(evidence,'home-'+name+'-'+width+'.png')});
}

module.exports = async function testHomeStory(browser,base) {
  for (const width of [375,1280]) {
    const context = await browser.newContext({viewport:{width,height:850},reducedMotion:'no-preference',serviceWorkers:'block'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',err=>errors.push(err.message));
    for (const lang of ['nl','de','fr','en','zh-tw']) {
      const prefix = lang === 'en' ? '' : lang+'/';
      await page.goto(base+prefix+'index.html');
      const steps=page.locator('.story-steps > li');
      const nav=page.locator('.story-progress a');
      const film=page.locator('.story-film');
      assert.deepEqual(await steps.evaluateAll(all=>all.map(s=>s.id)),names.map(n=>'story-'+n));
      assert.equal(await page.locator('.story-panel .story-project:visible').count(),0);
      const script=page.locator('#story-drawing img');
      await script.evaluate(img=>img.decode());
      assert.ok((await script.getAttribute('src')).endsWith('oem-film/drawing.webp'));
      await waitForFilm(page,0);
      const rect=await film.boundingBox();
      assert.ok(rect.y<page.viewportSize().height*.46 && rect.height>150,'Drawing is already in first viewport');
      const bar=await page.locator('.story-controls').boundingBox();
      assert.ok(bar.y+bar.height<=page.viewportSize().height+2,'Opening viewport includes the story navigation');
      const starting=await film.screenshot();
      if(lang==='zh-tw')await still(page,'sketch',width);
      await page.mouse.wheel(0,165);
      await page.waitForFunction(()=>{
        const v=document.querySelector('.story-film video');
        return !v.seeking && v.currentTime>.1 && v.currentTime<1;
      });
      assert.ok(!starting.equals(await film.screenshot()),'First scroll rotates the artwork');
      for(const i of [1,2,3,4,5,6,3]){
        await nav.nth(i).click();
        await waitForFilm(page,i);
        assert.equal(await nav.nth(i).getAttribute('aria-current'),'step');
        assert.equal(await page.locator('.story-copy h2').textContent(),await steps.nth(i).locator('h2').textContent());
        assert.equal(await page.locator('.story-copy .story-note-line:visible').count(),2);
        assert.equal(await page.locator('.story-invitation .story-project:visible').count(),i===6 ? 1 : 0);
        if(i===6)assert.equal(await page.locator('.story-invitation a').evaluate(a=>new URL(a.href).pathname),'/'+prefix+'contact.html');
        if(lang==='zh-tw' && [1,3,5,6].includes(i))await still(page,names[i],width);
      }
      const before=await film.screenshot();
      await page.mouse.wheel(0,265);
      await page.waitForFunction(()=>{
        const v=document.querySelector('.story-film video');
        return !v.seeking && v.currentTime>3.12 && v.currentTime<3.9;
      });
      assert.ok(!before.equals(await film.screenshot()),'Between chapters the back and pivot hardware must move');
      await page.mouse.wheel(0,-265);
      await waitForFilm(page,3);
      assert.equal(await page.locator('.story-film video').evaluate(v=>v.paused),true);
      await nav.nth(0).focus();
      await page.keyboard.press('Enter');
      await waitForFilm(page,0);
      assert.equal(await nav.nth(0).getAttribute('aria-current'),'step');
      await page.locator('.story-panel .story-skip').click();
      assert.ok(page.url().endsWith('#story-end'));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.goto(base+prefix+'index.html#story-handover');
      await waitForFilm(page,6);
      await page.locator('.story-invitation .story-project').click();
      assert.equal(new URL(page.url()).pathname,'/'+prefix+'contact.html');
      console.log('Homepage: seven illustrated buyer commitments, orbit, reverse, legacy link and contact',lang,width);
    }
    // Some portable static hosts ignore Range and return the whole file.
    if(width===1280){
      await page.route(/studio\.(mp4|webm)$/,async route=>{
        const response=await context.request.get(route.request().url());
        await route.fulfill({status:200,contentType:response.headers()['content-type'],body:await response.body()});
      });
      await page.goto(base+'zh-tw/index.html');
      await waitForFilm(page,0);
      await page.locator('.story-progress a').nth(3).click();
      await waitForFilm(page,3);
      await page.locator('.story-progress a').nth(1).click();
      await waitForFilm(page,1);
      console.log('Whole-file hosting: decoded, sought into assembly and returned to the die.');
    }
    // A failed video must leave real chapter posters and a usable contact path.
    if(width===375){
      await page.route(/studio\.(mp4|webm)$/,r=>r.abort());
      await page.goto(base+'fr/index.html');
      await page.waitForFunction(()=>!document.querySelector('.story-rail').classList.contains('is-interactive'));
      assert.equal(await page.locator('.story-steps .story-art:visible').count(),7);
      await page.locator('#story-hanging .story-project').click();
      assert.equal(new URL(page.url()).pathname,'/fr/contact.html');
    }
    assert.deepEqual(errors,[]);
    await context.close();
    for(const noJS of [true,false]){
      const fallback=await browser.newContext({viewport:{width,height:850},javaScriptEnabled:!noJS,reducedMotion:'reduce',serviceWorkers:'block'});
      const page=await fallback.newPage();
      const media=[];
      page.on('request',req=>{if(/studio\.(?:mp4|webm)/.test(req.url()))media.push(req.url())});
      await page.goto(base+'nl/index.html#story-handover');
      assert.equal(await page.locator('.story-panel:visible').count(),0);
      assert.equal(await page.locator('.story-steps .story-art:visible').count(),7);
      assert.equal(await page.locator('.story-steps h2:visible').count(),7);
      assert.equal(await page.locator('.story-steps .story-note-line:visible').count(),14);
      for(const image of await page.locator('.story-steps img').all()){
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(el=>el.decode());
      }
      assert.ok(await page.locator('#story-hanging .story-project').isVisible());
      assert.deepEqual(media,[]);
      await fallback.close();
    }
  }
};
