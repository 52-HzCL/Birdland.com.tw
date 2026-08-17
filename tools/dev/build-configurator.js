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

const payload = { tiers: TIERS, products: PRODUCTS, options };
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
const outPath = path.join(REPO, 'configurator.html');
fs.writeFileSync(outPath, out, 'utf8');
console.log('built configurator.html', out.length, 'bytes —',
  PRODUCTS.length, 'products,', Object.keys(options).length, 'options inlined');
