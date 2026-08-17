// Refuses the configurator data if any referenced option name is not an exact
// key of ratings.js, or lacks a buyer/production pair in rating-notes.js.
// Same anti-drift discipline build-p101.js applies via rateRow().
'use strict';
const ratings = require('./ratings.js');
const notes = require('./rating-notes.js');
const { TIERS, PRODUCTS } = require('./configurator-data.js');

const GATE_POOL = {
  material:   { ...ratings.routes, ...ratings.materials },
  forming:    ratings.routes, heat: ratings.routes, tooling: ratings.routes,
  joining:    ratings.routes, finish: ratings.routes, inspection: ratings.routes,
  pack:       ratings.packs,
};
const errs = [];
const tierIds = new Set(TIERS.map(t => t.id));
const seen = new Set();
PRODUCTS.forEach(p => {
  if (seen.has(p.id)) errs.push(`duplicate product id ${p.id}`);
  seen.add(p.id);
  if (!tierIds.has(p.tier)) errs.push(`${p.id}: unknown tier ${p.tier}`);
  if (!(p.metal >= 1 && p.metal <= 5)) errs.push(`${p.id}: metal out of range`);
  if (!p.draw) errs.push(`${p.id}: missing draw key`);
  if (!p.parts.length) errs.push(`${p.id}: no parts`);
  p.parts.forEach(part => {
    Object.entries(part.options || {}).forEach(([gate, names]) => {
      const pool = GATE_POOL[gate];
      if (!pool) { errs.push(`${p.id}.${part.id}: unknown gate "${gate}"`); return; }
      names.forEach(n => {
        if (!pool[n]) errs.push(`${p.id}.${part.id}.${gate}: "${n}" is not a ratings key`);
        else if (!notes[n]) errs.push(`${p.id}.${part.id}.${gate}: "${n}" has no rating-notes pair`);
      });
    });
  });
});
// the menu must lead with metal: first product of the list is full-metal forge
if (!(PRODUCTS[0].tier === 'forge' && PRODUCTS[0].metal === 5))
  errs.push('menu must open with a full-metal forged product');
if (errs.length) { console.error('configurator data INVALID:'); errs.forEach(e => console.error(' - ' + e)); process.exit(1); }
console.log(`configurator data ok: ${PRODUCTS.length} products, ${TIERS.length} tiers, all option names verified`);
