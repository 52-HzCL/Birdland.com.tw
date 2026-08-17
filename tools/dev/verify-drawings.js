// Refuses the configurator drawings if they drift from configurator-data.js:
// every product's draw key must have a drawing, every drawable part must have
// a polygon, every named drawing part must exist on the product, and all
// coordinates must stay inside the 0..100 authoring square. The screenshot
// gate (tools/dev/sketch-harness.html) remains the judge of whether a drawing
// LOOKS right — this only proves the data cannot crash or mislabel.
'use strict';
const fs = require('fs');
const path = require('path');
const w = {};
new Function('window', fs.readFileSync(path.join(__dirname, '..', '..', 'configurator-drawings.js'), 'utf8'))(w);
const { PRODUCTS } = require('./configurator-data.js');
const errs = [];
PRODUCTS.forEach(p => {
  const d = w.BL_DRAWINGS[p.draw];
  if (!d) { errs.push(`missing drawing ${p.draw}`); return; }
  const ids = new Set(p.parts.map(x => x.id));
  d.parts.forEach(pt => {
    if (pt.name !== '' && !ids.has(pt.id)) errs.push(`${p.draw}: part ${pt.id} not in product parts`);
    const pts = pt.ellipse
      ? [[pt.ellipse[0] - pt.ellipse[2], pt.ellipse[1] - pt.ellipse[3]],
         [pt.ellipse[0] + pt.ellipse[2], pt.ellipse[1] + pt.ellipse[3]]]
      : pt.poly;
    pts.forEach(([x, y]) => {
      if (x < 0 || x > 100 || y < 0 || y > 100) errs.push(`${p.draw}.${pt.id} point out of the 0..100 square`);
    });
  });
  p.parts.filter(x => x.id !== 'pack').forEach(x => {
    if (!d.parts.some(pt => pt.id === x.id)) errs.push(`${p.draw}: product part ${x.id} has no polygon`);
  });
});
Object.keys(w.BL_DRAWINGS).forEach(k => {
  if (!PRODUCTS.some(p => p.draw === k)) errs.push(`orphan drawing ${k}`);
});
if (errs.length) { console.error('drawings INVALID:'); errs.forEach(e => console.error(' - ' + e)); process.exit(1); }
console.log(`drawings ok: ${Object.keys(w.BL_DRAWINGS).length} drawings cover every product`);
