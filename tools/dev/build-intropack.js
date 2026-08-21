// Factory intro pack: one refined capability statement, printed to PDF.
//
//   node tools/dev/build-intropack.js               build the PDF (dated + fixed name)
//   node tools/dev/build-intropack.js --emit-matrix print the full capability matrix HTML
//   node tools/dev/build-intropack.js --sync-page   rewrite the matrix inside manufacturing.html
//
// Every number and rating in the output is generated from data that already
// exists in this repo, or repeats a statement the site already publishes.
// Nothing in this script invents a fact:
//   - option ratings ............. tools/dev/ratings.js (the encyclopedia data)
//   - documented-option count .... tools/dev/rating-notes.js (76 keys; build-p101
//                                  fails the build if a rated name has no entry)
//   - "159 routes / 38 part types" the sentence product-101.html already
//                                  publishes (tools/dev/build-p101.js, s-cat)
//   - "52 years" / "180+" ........ the homepage hero and About plates
// If a claim has no source here, it does not go in the pack. Certifications
// are deliberately "available on request" until real artwork/scans exist.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO, CHROME } = require('./_env');
const ratings = require('./ratings');
const notes = require('./rating-notes');

// ---------------------------------------------------------------- numbers ---
// Pinned to the published site copy, not recomputed from the clock: the hero
// says "52 YEARS ... since 1974" and About says "fifty-two years". If the pack
// recomputed the year it would drift one ahead of every page each January.
// Update these together with the site copy.
const YEARS = '52';
const PROGRAMMES = '180+';
// Published on product-101.html ("159 material routes across 38 part types",
// tools/dev/build-p101.js s-cat close). Kept as the site-wide figure.
const ROUTES = '159';
const PART_TYPES = '38';

const N_FAMILIES = Object.keys(ratings.materials).length; // 9
const N_DOCUMENTED = Object.keys(notes).length;           // 76 unique options

// ---------------------------------------------------- matrix block layout ---
// ratings.js routes is a flat list; the block boundaries below reproduce the
// section groups of rating-notes.js (4.1 intake ... 4.7 inspection). This is
// presentation grouping only — no new data. The check after the table fails
// loudly if ratings.js gains or loses a key that is not reflected here.
const BLOCKS = [
  ['Material intake', ['Blade & spring steel', 'Stainless steel', 'Aluminium', 'Rigid plastics', 'Grip compounds', 'Timber', 'Fabric']],
  ['Forming', ['Stamping', 'Hot forging', 'Cold forging', 'Laser cutting', 'Tube drawing', 'Tube bending', 'Swaging', 'Wood turning', 'Injection moulding', 'Two-shot over-moulding', 'Dip moulding']],
  ['Heat treatment', ['Through hardening', 'Quench & temper', 'Induction (local) hardening', 'Solution annealing', 'Stress relief', 'Hardness banding by grade']],
  ['Tooling', ['Progressive dies', 'Single-station dies', 'Trim & pierce tools', 'Injection moulds', 'Welding jigs', 'Assembly fixtures', 'Gauges']],
  ['Joining & assembly', ['Riveting', 'Bolted joints', 'Snap-fit', 'Press-fit', 'Spot welding', 'MIG welding', 'Brazing', 'Over-moulded joints', 'Adhesive bonding']],
  ['Finishing & marking', ['Zinc plating', 'Nickel-chrome plating', 'Dacromet', 'Powder coating', 'Wet paint', 'E-coat', 'Anodising', 'Polishing', 'Sand-blasting', 'Lacquer or oil on wood', 'Heat transfer print', 'Laser marking']],
  ['Inspection & testing', ['Hardness sampling', 'Open/close cycle life', 'Salt-spray hours', 'Dimensional AQL', 'Edge & function check', 'Joint pull test', 'Pack drop test', 'Barcode & label check']],
];
const EXTRA_BLOCKS = [
  ['Material families', Object.keys(ratings.materials), ratings.materials],
  ['Packaging formats', Object.keys(ratings.packs), ratings.packs],
];

// Drift guard: every routes key in exactly one block, no invented names.
{
  const listed = BLOCKS.flatMap(([, keys]) => keys);
  const actual = Object.keys(ratings.routes);
  const missing = actual.filter(k => !listed.includes(k));
  const invented = listed.filter(k => !actual.includes(k));
  const dupes = listed.filter((k, i) => listed.indexOf(k) !== i);
  if (missing.length || invented.length || dupes.length) {
    throw new Error('BLOCKS out of sync with ratings.js routes.' +
      (missing.length ? ' missing: ' + missing.join(', ') : '') +
      (invented.length ? ' invented: ' + invented.join(', ') : '') +
      (dupes.length ? ' duplicated: ' + dupes.join(', ') : ''));
  }
  // Documented-option guard: the 76 unique rated names all carry notes.
  const uniq = new Set([...actual, ...Object.keys(ratings.materials), ...Object.keys(ratings.packs)]);
  if (uniq.size !== N_DOCUMENTED) {
    throw new Error('unique rated options (' + uniq.size + ') !== rating-notes keys (' + N_DOCUMENTED + ')');
  }
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const dots = n => '●'.repeat(n) + '○'.repeat(5 - n);

// Full matrix for manufacturing.html: name, both ratings, the short note.
function fullMatrix() {
  const block = ([title, keys, src]) => {
    const data = src || ratings.routes;
    const rows = keys.map(k => {
      const r = data[k];
      return `        <li><b>${esc(k)}</b><span class="cap-dots" aria-label="How common: ${r.pop} of 5"><i>${dots(r.pop)}</i></span><span class="cap-dots cap-cost" aria-label="Relative cost: ${r.cost} of 5"><i>${dots(r.cost)}</i></span><small>${esc(cap(r.note))}</small></li>`;
    }).join('\n');
    return `      <section class="cap-block">\n        <h3>${esc(title)} <span class="cap-count">${keys.length} options</span></h3>\n        <ul class="cap-rows">\n${rows}\n        </ul>\n      </section>`;
  };
  return [...BLOCKS, ...EXTRA_BLOCKS].map(block).join('\n');
}

// Condensed matrix for the PDF: names and ratings only, no notes.
function condensedMatrix() {
  const block = ([title, keys, src]) => {
    const data = src || ratings.routes;
    const rows = keys.map(k => {
      const r = data[k];
      return `<li><span>${esc(k)}</span><i>${dots(r.pop)}</i><i class="c">${dots(r.cost)}</i></li>`;
    }).join('');
    return `<section><h3>${esc(title)}</h3><ul>${rows}</ul></section>`;
  };
  return [...BLOCKS, ...EXTRA_BLOCKS].map(block).join('\n      ');
}

// ------------------------------------------------------------------ modes ---
const MODE = process.argv[2] || '--pdf';
const PAGE = path.join(REPO, 'manufacturing.html');

if (MODE === '--emit-matrix') {
  process.stdout.write(fullMatrix() + '\n');
  return;
}

if (MODE === '--sync-page') {
  const begin = '<!-- CAP-MATRIX:BEGIN generated from tools/dev/ratings.js by `node tools/dev/build-intropack.js --sync-page`; edit the data, not this block -->';
  const end = '<!-- CAP-MATRIX:END -->';
  const html = fs.readFileSync(PAGE, 'utf8');
  const a = html.indexOf(begin), b = html.indexOf(end);
  if (a === -1 || b === -1) throw new Error('CAP-MATRIX markers not found in manufacturing.html');
  const next = html.slice(0, a + begin.length) + '\n' + fullMatrix() + '\n      ' + html.slice(b);
  if (next !== html) fs.writeFileSync(PAGE, next);
  console.log('manufacturing.html matrix ' + (next === html ? 'already current' : 'rewritten') +
    ' (' + N_DOCUMENTED + ' documented options, ' + N_FAMILIES + ' material families)');
  return;
}

// --------------------------------------------------------------- PDF build --
(async () => {
  const { chromium } = require('playwright-core');
  const template = fs.readFileSync(path.join(__dirname, 'intropack-template.html'), 'utf8');
  const stamp = new Date().toISOString().slice(0, 10);
  const html = template
    .replace(/{{DATE}}/g, stamp)
    .replace(/{{YEARS}}/g, YEARS)
    .replace(/{{PROGRAMMES}}/g, PROGRAMMES)
    .replace(/{{ROUTES}}/g, ROUTES)
    .replace(/{{PART_TYPES}}/g, PART_TYPES)
    .replace(/{{N_FAMILIES}}/g, String(N_FAMILIES))
    .replace(/{{N_DOCUMENTED}}/g, String(N_DOCUMENTED))
    .replace(/{{MATRIX}}/g, condensedMatrix());
  if (/{{[A-Z_]+}}/.test(html)) throw new Error('unfilled placeholder: ' + html.match(/{{[A-Z_]+}}/)[0]);

  const dated = 'birdland-intro-pack-' + stamp.replace(/-/g, '') + '.pdf';
  const fixed = 'birdland-intro-pack.pdf';
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.pdf({
      path: path.join(REPO, dated),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
  } finally {
    await browser.close();
  }

  // One dated copy in the repo at a time; the fixed name is what pages link.
  for (const f of fs.readdirSync(REPO)) {
    if (/^birdland-intro-pack-\d{8}\.pdf$/.test(f) && f !== dated) fs.unlinkSync(path.join(REPO, f));
  }
  fs.copyFileSync(path.join(REPO, dated), path.join(REPO, fixed));
  const size = fs.statSync(path.join(REPO, fixed)).size;
  console.log(dated + ' + ' + fixed + '  ' + (size / 1024).toFixed(0) + ' KB');
  if (size > 5 * 1024 * 1024) { console.error('FAIL: intro pack over 5 MB'); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
