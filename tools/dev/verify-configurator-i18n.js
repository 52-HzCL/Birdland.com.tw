// The configurator's language editions reuse two dictionaries that already
// exist: the option names and their two sentences come from the product-101
// page dictionary, the UI strings from i18n/configurator.<lang>.json. This
// gate refuses a state where an edition COULD NOT be built — a missing UI key
// or an option sentence the page dictionary has never seen — so the failure
// lands on the pull request instead of on a half-English page.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO } = require('./_env');
const notes = require('./rating-notes.js');
const { PRODUCTS } = require('./configurator-data.js');

const LANGS = ['de', 'fr', 'es', 'it', 'nl', 'pl', 'pt-br', 'ja', 'zh-tw'];
const en = JSON.parse(fs.readFileSync(path.join(REPO, 'i18n', 'configurator.en.json'), 'utf8'));
const used = new Set();
PRODUCTS.forEach(p => p.parts.forEach(pt =>
  Object.values(pt.options || {}).forEach(a => a.forEach(n => used.add(n)))));

const errs = [];
LANGS.forEach(L => {
  const uiPath = path.join(REPO, 'i18n', 'configurator.' + L + '.json');
  if (!fs.existsSync(uiPath)) { errs.push(L + ': no UI dictionary'); return; }
  const ui = JSON.parse(fs.readFileSync(uiPath, 'utf8'));
  Object.keys(en).forEach(k => { if (!ui[k]) errs.push(L + ': UI key missing — ' + k); });
  Object.keys(ui).forEach(k => { if (!(k in en)) errs.push(L + ': UI key not in English source — ' + k); });

  const dictPath = path.join(REPO, 'i18n', 'page.product-101.' + L + '.json');
  if (!fs.existsSync(dictPath)) { errs.push(L + ': no product-101 page dictionary'); return; }
  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  let missing = 0;
  used.forEach(n => {
    if (!dict[n]) missing++;
    const t = notes[n];
    if (t && !dict[t.buyer]) missing++;
    if (t && !dict[t.production]) missing++;
  });
  if (missing) errs.push(L + ': ' + missing + ' configurator strings absent from the product-101 dictionary');
});

if (errs.length) {
  console.error('configurator i18n INVALID:');
  errs.slice(0, 30).forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('configurator i18n ok: ' + LANGS.length + ' languages, ' +
  Object.keys(en).length + ' UI keys, ' + used.size + ' options with both sentences');
