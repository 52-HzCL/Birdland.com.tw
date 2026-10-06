// Build terminal.json — the Terminal panel's live values and its search index.
//
// The panel must not cost the page anything at load, so nothing here is
// inlined: it is one small file fetched when the panel first opens (and once
// at idle, for the staleness dot). Everything in it is derived from files that
// already exist, so it cannot drift from what the desks show.
//
// This is the Node version, used for local verification. tools/build_terminal.py
// is the one CI runs; keep them in step.
'use strict';
const fs = require('fs');
const path = require('path');
const R = process.argv[2] || require('./_env').REPO;

const data = JSON.parse(fs.readFileSync(path.join(R, 'outlook-data.json'), 'utf8'));
const families = JSON.parse(fs.readFileSync(path.join(R, 'data/manufacturing-options.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(R, 'config/routes.json'), 'utf8'));
const factory = fs.readFileSync(path.join(R, 'product-101.html'), 'utf8');

// ── live values ──────────────────────────────────────────────────────────
// Same derivation the desks use: walk back through spark until the value
// actually changes, so a flat repeat does not read as 0.00%.
function realChg(ix) {
  if (ix && ix.spark && ix.spark.length >= 2) {
    const a0 = ix.spark[ix.spark.length - 1];
    let i = ix.spark.length - 2, a = ix.spark[i];
    while (i > 0 && a === a0) { i--; a = ix.spark[i]; }
    if (a) return (a0 - a) / Math.abs(a) * 100;
  }
  return (ix && ix.chg) || 0;
}
const byShort = {};
(data.indices || []).forEach(x => { if (x && x.short) byShort[x.short] = x; });
const num = v => Number(v).toLocaleString('en-US');
function cell(short, label) {
  const ix = byShort[short];
  if (!ix) return null;
  const c = realChg(ix);
  const dir = c > 0.05 ? 'up' : (c < -0.05 ? 'down' : 'flat');
  return { text: (label || short) + ' ' + num(ix.value) + (dir === 'up' ? ' ▲' : dir === 'down' ? ' ▼' : ' —'), dir };
}
// AsiaSource has no daily price of its own, so it carries the input that
// moved most today — the same proxies its material cards already show.
function biggestMove() {
  const pool = ['STEEL HRC', 'PP RESIN', 'BRENT'].map(s => byShort[s]).filter(Boolean);
  if (!pool.length) return null;
  const top = pool.map(ix => ({ ix, c: realChg(ix) })).sort((a, b) => Math.abs(b.c) - Math.abs(a.c))[0];
  if (!top || !isFinite(top.c)) return null;
  const dir = top.c > 0.05 ? 'up' : (top.c < -0.05 ? 'down' : 'flat');
  return { text: 'BIGGEST MOVE · ' + top.ix.short + ' ' + (top.c > 0 ? '+' : '') + top.c.toFixed(1) + '%', dir };
}

const steps = {
  news: cell('STEEL HRC'),
  buyer: biggestMove(),
  cost: cell('FREIGHT WCI'),
};

// ── search index ─────────────────────────────────────────────────────────
const index = [];
const seen = new Set();
function add(t, n, d, u) {
  const k = t + '|' + n + '|' + d;
  if (!n || seen.has(k)) return;
  seen.add(k);
  index.push({ t, n, d, u });
}

// The surfaces and the tools, by hand: they are the destinations, not data,
// and a wrong one here is worse than a missing one.
routes.routes.filter(r => r.public && r.purpose).forEach(r => add('PAGE', r.name, r.purpose, r.file + (r.hash ? '#' + r.hash : '')));
const catalogue=JSON.parse(fs.readFileSync(path.join(R,'catalog.json'),'utf8'));
catalogue.products.forEach(p=>add('PRODUCT',p.sku,p.name+' · '+p.specs.length+' · '+(p.origin==='TW'?'Taiwan':'China'),'products.html?sku='+encodeURIComponent(p.sku)+'#bl-cat'));

[['Cost workspace', 'FOB to your warehouse, per unit', 'cost-desk.html#p-landed2'],
 ['Retail margin', 'Cost to shelf price and gross profit', 'cost-desk.html#p-margin'],
 ['Reorder timing', 'When to place the next order', 'cost-desk.html#p-reorder'],
 ['Plan a sailing', 'Lane options and booking window', 'cost-desk.html#p-sail'],
 ['Taiwan vs China duty', 'Origin comparison including duty', 'cost-desk.html#p-cduty'],
].forEach(r => add('TOOL', r[0], r[1], r[2]));

// Materials and processes come out of AsiaSource's own tables by bracket
// matching, never by a regex across the whole file — this repo has been bitten
// twice by that. Zero results is a build warning, not a silent pass.
let nMat = 0, nProc = 0;
for (const family of families) for (const model of family.models) {
  for (const part of model.parts) for (const material of part.materials) {
    add('MATERIAL', material[0], family.label + ' · ' + part.name, 'partner.html?q=' + encodeURIComponent(material[0]) + '#pd-builder'); nMat++;
  }
  for (const process of model.processes) {
    add('PROCESS', process[0], family.label, 'partner.html?q=' + encodeURIComponent(process[0]) + '#pd-builder'); nProc++;
  }
}

// Factory sections, taken from the page's own table of contents rather than
// from its headings: the TOC is what the page itself considers navigable, and
// it is already correct.
let nSec = 0;
{
  const i = factory.indexOf('class="wk-toc"'), j = factory.indexOf('</nav>', i);
  const block = i < 0 ? '' : factory.slice(i, j);
  const re = /<a href="#([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(block))) {
    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title) continue;
    // "5.2 Stainless steel" -> name "Stainless steel", context "Factory · 5.2"
    add('SECTION', title.replace(/^[\d.]+\s*/, ''), 'Factory · ' + title.split(' ')[0], 'product-101.html#' + m[1]);
    nSec++;
  }
}
// Today's headlines, so a policy code finds the edition that carries it.
let nSig = 0;
((data.news || []).concat(data.market_news || [])).slice(0, 40).forEach(x => {
  const title = (x && (x.title || x.headline || x.h)) || '';
  if (!title) return;
  add('SIGNAL', String(title).slice(0, 90), 'Today’s edition', 'executive.html#news');
  nSig++;
});

const out = { updated: data.updated || '', steps, index };
fs.writeFileSync(path.join(R, 'terminal.json'), JSON.stringify(out), 'utf8');
const bytes = fs.statSync(path.join(R, 'terminal.json')).size;
console.log('built terminal.json ' + bytes + ' bytes — ' + index.length + ' entries (' +
  nMat + ' materials, ' + nProc + ' processes, ' + nSec + ' sections, ' + nSig + ' signals)');
if (!nMat || !nProc) console.log('WARNING: material/process harvest came back empty — AsiaSource tables moved');
if (!nSec) console.log('WARNING: no Factory sections indexed');
