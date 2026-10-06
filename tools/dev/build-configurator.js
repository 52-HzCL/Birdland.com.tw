// Builds configurator.html from tools/configurator_template.html by inlining
// one JSON blob into the __CFGDATA__ token — the same token-inline pattern
// build.js uses for __DATA__. The blob is configurator-data.js plus, for every
// option name actually referenced, the pop/cost rating and the two
// rating-notes sentences, copied verbatim (the page invents no copy).
//
// Refuses to ship on any mismatch, same discipline as verify-config-data.js:
// a referenced name with no rating or no notes pair is a build failure here,
// not a blank spot on the page.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO } = require('./_env');
const ratings = require('./ratings.js');
const notes = require('./rating-notes.js');
const { TIERS, PRODUCTS } = require('./configurator-data.js');
const { JSDOM } = require('jsdom');
const { ORDER, HREFLANG, handoff, cluster } = require('./_langs');
const crypto = require('crypto');

// Same pool mapping as verify-config-data.js: material may come from either
// list (e.g. "Packaging board" lives only in materials), pack from packs.
const GATE_POOL = {
  material:   Object.assign({}, ratings.routes, ratings.materials),
  forming:    ratings.routes, heat: ratings.routes, tooling: ratings.routes,
  joining:    ratings.routes, finish: ratings.routes, inspection: ratings.routes,
  pack:       ratings.packs,
};

const options = {};
const errs = [];
PRODUCTS.forEach(p => p.parts.forEach(part => {
  Object.entries(part.options || {}).forEach(([gate, names]) => {
    const pool = GATE_POOL[gate];
    if (!pool) { errs.push(`${p.id}.${part.id}: unknown gate "${gate}"`); return; }
    names.forEach(n => {
      const r = pool[n], t = notes[n];
      if (!r) { errs.push(`${p.id}.${part.id}.${gate}: "${n}" has no rating`); return; }
      if (!t) { errs.push(`${p.id}.${part.id}.${gate}: "${n}" has no rating-notes pair`); return; }
      if (!options[n]) options[n] = { pop: r.pop, cost: r.cost, buyer: t.buyer, production: t.production };
    });
  });
}));
if (errs.length) {
  console.error('build-configurator REFUSED:');
  errs.forEach(e => console.error(' - ' + e));
  process.exit(1);
}

// A language edition swaps the words, never the structure: option names and
// their two sentences are looked up in the page dictionary product-101 already
// ships (the same sentences, already translated and reviewed), and the UI
// strings come from i18n/configurator.<lang>.json. Any miss is a build
// failure — a half-translated edition must not ship.
function buildEdition(LANG) {
const ui = JSON.parse(fs.readFileSync(path.join(REPO, 'i18n', 'configurator.' + LANG + '.json'), 'utf8'));
const gateLabels = {};
Object.keys(ui).forEach(k => { if (k.indexOf('gate_') === 0) gateLabels[k.slice(5)] = ui[k]; });

let tiers = TIERS, products = PRODUCTS, opts = options, pageDict = {};
const optionIds = {}, optionLabels = {};
if (LANG !== 'en') {
  const dictPath = path.join(REPO, 'i18n', 'page.product-101.' + LANG + '.json');
  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  pageDict = JSON.parse(fs.readFileSync(path.join(REPO, 'i18n', 'page.configurator.' + LANG + '.json'), 'utf8'));
  const miss = [];
  const tr = (s, where) => { const v = dict[s]; if (!v) { miss.push(where + ': ' + s.slice(0, 60)); return s; } return v; };
  opts = {};
  Object.keys(options).forEach(n => {
    const o = options[n];
    const name = tr(n, 'option name');
    optionIds[name] = n; optionLabels[n] = name;
    opts[name] = { pop: o.pop, cost: o.cost,
      buyer: tr(o.buyer, 'buyer'), production: tr(o.production, 'production') };
  });
  const copy = s => { if (!pageDict[s]) miss.push('page/structure: ' + s); return pageDict[s]; };
  tiers = TIERS.map(t => Object.assign({}, t, { name: copy(t.name), body: copy(t.body) }));
  products = PRODUCTS.map(p => Object.assign({}, p, {
    name: copy(p.name),
    parts: p.parts.map(part => Object.assign({}, part, {
      name: copy(p.id === 'forged-trowel' && part.id === 'blade' ? 'Trowel blade' : part.name),
      options: Object.fromEntries(Object.entries(part.options || {}).map(([g, names]) =>
        [g, names.map(n => (dict[n] || n))]))
    }))
  }));
  if (miss.length) {
    console.error('build-configurator REFUSED (' + LANG + '): ' + miss.length + ' untranslated segments');
    miss.slice(0, 12).forEach(m => console.error(' - ' + m));
    process.exit(1);
  }
}
const payload = { tiers, products, options: opts, optionIds, optionLabels, ui, gateLabels };
// < so the inlined JSON can never terminate the <script> that holds it.
const json = JSON.stringify(payload).split('<').join('\\u003c');

const tplPath = path.join(REPO, 'tools', 'configurator_template.html');
const tpl = fs.readFileSync(tplPath, 'utf8');
if (!tpl.includes('__CFGDATA__')) {
  console.error('build-configurator REFUSED: template has no __CFGDATA__ token');
  process.exit(1);
}
const out = tpl.split('__CFGDATA__').join(json);
if (out.includes('__CFGDATA__')) {
  console.error('build-configurator REFUSED: unsubstituted __CFGDATA__ left in output');
  process.exit(1);
}
// The shared page dictionaries and Wiki option dictionaries are authoritative.
// Generate each shell directly: the legacy i18n-page builder requires an old
// language picker that this page no longer uses. Shared navigation owns it now.
if (LANG === 'en') {
  fs.writeFileSync(path.join(REPO, 'configurator.html'), require('../build/site').enhancePage(out.replace('<head>', '<head>\n' + handoff('en') + cluster('configurator.html'))), 'utf8');
  console.log('built configurator.html', out.length, 'bytes —',
    PRODUCTS.length, 'products,', Object.keys(options).length, 'options inlined');
} else {
  const langPath = path.join(REPO, LANG, 'configurator.html');
  const dom = new JSDOM(out), doc = dom.window.document, missing = new Set();
  const translate = raw => { const key = raw.trim().replace(/\s+/g, ' '); if (!key || /^[\W\d]+$/u.test(key)) return raw;
    if (pageDict[key] == null) { missing.add(key); return raw; }
    return raw.replace(raw.trim(), pageDict[key]); };
  const walker = doc.createTreeWalker(doc.body, dom.window.NodeFilter.SHOW_TEXT);let node;
  while ((node = walker.nextNode())) if (!node.parentElement.closest('script,style,noscript,svg')) node.nodeValue = translate(node.nodeValue);
  for (const el of doc.querySelectorAll('[alt],[title],[aria-label]')) for (const attr of ['alt','title','aria-label']) if (el.hasAttribute(attr)) el.setAttribute(attr, translate(el.getAttribute(attr)));
  doc.querySelector('title').textContent = translate(doc.querySelector('title').textContent);
  const desc = doc.querySelector('meta[name="description"]');desc.content = translate(desc.content);
  if (missing.size) throw Error('configurator ' + LANG + ': missing shell translations: ' + [...missing].join(' / '));
  doc.documentElement.lang = HREFLANG[LANG];
  doc.head.insertAdjacentHTML('afterbegin', handoff(LANG) + cluster('configurator.html'));
  for (const el of doc.querySelectorAll('[href],[src]')) for (const attr of ['href','src']) { const value = el.getAttribute(attr);if (value && /^(?:[a-z0-9_-]+\.(?:css|js|html|svg|webmanifest)|images\/)/i.test(value)) el.setAttribute(attr,'../'+value); }
  let page = require('../build/site').enhancePage(dom.serialize(), '../');
  const hash = crypto.createHash('sha1').update(fs.readFileSync(path.join(REPO,'configurator.html'))).digest('hex');
  page = page.replace(/<!doctype html>/i, '<!doctype html>\n<!-- i18n-src:' + hash + ' -->');
  fs.mkdirSync(path.dirname(langPath), {recursive:true});
  fs.writeFileSync(langPath, page, 'utf8');
  console.log('localised ' + LANG + '/configurator.html —', Object.keys(opts).length, 'options,', Object.keys(ui).length, 'UI strings');
}
}
const requested = process.argv[2] || 'all';
if (requested === 'all' || requested === '--all') ['en', ...ORDER].forEach(buildEdition);
else if (['en', ...ORDER].includes(requested)) buildEdition(requested);
else throw Error('Unknown configurator edition: ' + requested);
