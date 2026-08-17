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
// Ordering IS the positioning (owner's directive): the menu opens full-metal
// forge, tiers appear in fixed order, and metal content never increases
// within a tier. The whole sequence is asserted, not just the first row.
if (!(PRODUCTS[0].tier === 'forge' && PRODUCTS[0].metal === 5))
  errs.push('menu must open with a full-metal forged product');
const tierOrder = TIERS.map(t => t.id);
if (tierOrder.join(',') !== 'forge,form,source') errs.push('tier order changed');
let ti = 0, lastMetal = Infinity;
PRODUCTS.forEach(p => {
  const i = tierOrder.indexOf(p.tier);
  if (i < ti) errs.push(`${p.id}: tier out of order`);
  if (i > ti) { ti = i; lastMetal = Infinity; }
  if (p.metal > lastMetal) errs.push(`${p.id}: metal increases within its tier`);
  lastMetal = p.metal;
});
if (errs.length) { console.error('configurator data INVALID:'); errs.forEach(e => console.error(' - ' + e)); process.exit(1); }
console.log(`configurator data ok: ${PRODUCTS.length} products, ${TIERS.length} tiers, all option names verified`);
