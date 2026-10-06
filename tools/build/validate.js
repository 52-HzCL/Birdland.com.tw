'use strict';
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const {ROOT, registry, renderSite} = require('./site');
const read = f => fs.readFileSync(path.join(ROOT,f),'utf8');
const json = f => JSON.parse(read(f));
const unique = (items,label) => assert.equal(new Set(items).size,items.length,label + ' must be unique');
unique(registry.routes.map(r=>r.id),'Route ids'); unique(registry.routes.map(r=>r.file),'Route files');
unique(registry.featureOwnership.map(f=>f.feature),'Each feature has one owner');
for(const f of registry.featureOwnership)for(const id of [f.owner,f.implementation])assert.ok(registry.routes.some(r=>r.id===id),'Unknown feature owner '+id);
assert.deepEqual(registry.tools.map(t=>t.route),['news','market','studio'],'Original three apps are retained');
for(const r of registry.routes.filter(r=>r.icon))assert.ok(fs.existsSync(path.join(ROOT,r.icon)),'Missing app icon '+r.icon);
unique(registry.languages.map(l=>l.id),'Language ids');
assert.equal(registry.languages.length,10);
for(const l of registry.languages) for(const key of Object.keys(registry.languages[0].text)) assert.ok(typeof l.text[key]==='string' && l.text[key].trim(),l.id+':'+key);
for(const id of registry.navigation) assert.ok(registry.routes.some(r=>r.id===id && r.public),'Unknown public nav '+id);
for(const r of registry.routes) assert.ok(fs.existsSync(path.join(ROOT,r.file)),'Missing route '+r.file);
const options = json('data/manufacturing-options.json');
unique(options.map(f=>f.key),'Family keys');
for(const f of options) {
  assert.ok(f.key && f.label && f.models.length);
  unique(f.models.map(m=>m.name),f.key+' models');
  for(const m of f.models) {
    assert.ok(m.name && m.parts.length && m.processes.length,f.key+':'+m.name);
    if(m.cn !== undefined) assert.match(m.cn,/^\d{8}$/);
    for(const p of m.parts) { assert.ok(p.name && p.materials.length); for(const v of p.materials) assert.ok(v.length===2 && v.every(s=>typeof s==='string'&&s.trim())); }
    for(const v of m.processes) assert.ok(v.length===2 && v.every(s=>typeof s==='string'&&s.trim()));
  }
}
const data = json('outlook-data.json');
const trade=json('trade.json');assert.deepEqual(trade.periods,{previous:2023,current:2024,frequency:'annual'});
assert.ok(read('tools/fetch_trade.py').includes('COMTRADE_YEARS=["2023","2024"]'),'Update validation with the source statistical years');
assert.ok(data.updated); assert.equal(Object.keys(data.regions).length,14);
assert.deepEqual(data.order.map(x=>x[0]).sort(),Object.keys(data.regions).sort());
for(const [file,expected] of renderSite()) assert.equal(read(file),expected,'Generated output drift: '+file+'; run npm run build');
const catalog = json('catalog.json'); assert.ok(catalog);
const intelligence=json('buyer-intelligence.json');assert.equal(intelligence.version,1);
assert.equal(new Set(intelligence.stories.map(s=>s.id)).size,intelligence.stories.length);
assert.ok(!('shipping' in intelligence)&&!('indices' in intelligence),'Do not republish unverified freight or commodity prices');
assert.equal(catalog.version,2);
assert.equal(new Set(catalog.products.map(p=>p.sku)).size,catalog.products.length);
for(const p of catalog.products){
 assert.match(p.sku,/^B[TC]-[A-Z0-9-]+$/);
 assert.equal(p.origin,p.sku.startsWith('BT-')?'TW':'CN');
 assert.ok(catalog.categories.some(c=>c.id===p.axis));
 assert.ok(catalog.sources.some(s=>s.id===p.source));
 assert.ok(p.page>0&&p.sizes.length>0);
 assert.ok(fs.existsSync(path.join(ROOT,p.img)),'Missing official product photo: '+p.sku);
 assert.ok(!('index' in p)&&!('market_fit' in p)&&!('price' in p)&&!('moq' in p),'Capability catalogue must not invent commercial terms');
}
assert.ok(!read('products.html').includes('window.BL_DATA'),'Products must not embed the market workspace');
const materials=json('data/buyer-materials.json');
assert.equal(materials.cadence,'monthly');assert.match(materials.source_url,/^https:\/\/www.worldbank.org\//);
for(const s of materials.series){assert.ok(['aluminum','nickel'].includes(s.id));assert.equal(s.points.length,12);assert.equal(s.points.at(-1).month,materials.observed_month);assert.ok(s.points.every(p=>Number.isFinite(p.value)&&p.value>0));}
assert.ok(read('products.html').includes('window.BL_CATALOG=')); assert.ok(!read('cost-desk.html').includes('window.BL_CATALOG='));
const index = json('terminal.json');
assert.ok(!JSON.stringify(index).includes('team.html'),'Internal team route leaked into public search');
// Check all maintained text files without touching dependencies or credentials.
function walk(dir) {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if(entry.name.startsWith('.') || entry.name==='node_modules') continue;
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(p);
    else if(/\.(html|css|js|json|py|md|yml)$/.test(entry.name)) {
      const b=fs.readFileSync(p); assert.ok(!(b[0]===239&&b[1]===187&&b[2]===191),'BOM: '+p);
      assert.ok(!b.some(v=>v<=8 || (v>=14&&v<=31)),'Control character: '+p);
    }
  }
}
walk(ROOT);
console.log('Validated routes, ten language dictionaries, manufacturing options, data and exact generated outputs.');
