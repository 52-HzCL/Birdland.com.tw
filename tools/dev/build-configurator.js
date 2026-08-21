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
const LANG = process.argv[2] || 'en';
const ui = JSON.parse(fs.readFileSync(path.join(REPO, 'i18n', 'configurator.' + LANG + '.json'), 'utf8'));
const gateLabels = {};
Object.keys(ui).forEach(k => { if (k.indexOf('gate_') === 0) gateLabels[k.slice(5)] = ui[k]; });

let tiers = TIERS, products = PRODUCTS, opts = options;
if (LANG !== 'en') {
  const dictPath = path.join(REPO, 'i18n', 'page.product-101.' + LANG + '.json');
  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const miss = [];
  const tr = (s, where) => { const v = dict[s]; if (!v) { miss.push(where + ': ' + s.slice(0, 60)); return s; } return v; };
  opts = {};
  Object.keys(options).forEach(n => {
    const o = options[n];
    opts[tr(n, 'option name')] = { pop: o.pop, cost: o.cost,
      buyer: tr(o.buyer, 'buyer'), production: tr(o.production, 'production') };
  });
  products = PRODUCTS.map(p => Object.assign({}, p, {
    parts: p.parts.map(part => Object.assign({}, part, {
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
const payload = { tiers, products, options: opts, ui, gateLabels };
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
// English writes the root page; a language edition rewrites only the data
// blob of the page i18n-page.js already translated into <lang>/.
if (LANG === 'en') {
  fs.writeFileSync(path.join(REPO, 'configurator.html'), out, 'utf8');
  console.log('built configurator.html', out.length, 'bytes —',
    PRODUCTS.length, 'products,', Object.keys(options).length, 'options inlined');
} else {
  const langPath = path.join(REPO, LANG, 'configurator.html');
  if (!fs.existsSync(langPath)) {
    console.error('build-configurator REFUSED: run "node tools/dev/i18n-page.js build configurator.html ' + LANG + '" first');
    process.exit(1);
  }
  const page = fs.readFileSync(langPath, 'utf8');
  const re = new RegExp('(<script id="cfg-data" type="application/json">)([\\s\\S]*?)(</script>)');
  if (!re.test(page)) { console.error('build-configurator REFUSED: no cfg-data block in ' + LANG + '/configurator.html'); process.exit(1); }
  fs.writeFileSync(langPath, page.replace(re, (m, a, _b, c) => a + json + c), 'utf8');
  console.log('localised ' + LANG + '/configurator.html —', Object.keys(opts).length, 'options,', Object.keys(ui).length, 'UI strings');
}
