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
const partner = fs.readFileSync(path.join(R, 'tools', 'partner_template.html'), 'utf8');
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
[['ABrief', "Today's steel, resin, freight and policy signals", 'executive.html'],
 ['My Market', 'Which way your import market is moving, and the markets next to it', 'my-market.html'],
 ['AsiaSource', 'Product families, materials, processes, buyer brief', 'partner.html'],
 ['CostNow', 'Landed cost, margin, sailing, duty comparison', 'cost-desk.html'],
 ['Team Desk', 'Internal dashboard', 'team.html'],
 ['Guide', 'How this site works, step by step', 'guide.html'],
 ['Factory', 'The floor, the routes, the materials, the cost structure', 'product-101.html'],
 ['About us', 'The pure-play OEM model and the commercial boundary', 'about.html'],
 ['Contact', 'Routed to your regional desk', 'contact.html'],
].forEach(r => add('PAGE', r[0], r[1], r[2]));

[['Cost workspace', 'FOB to your warehouse, per unit', 'cost-desk.html#p-landed2'],
 ['Retail margin', 'Cost to shelf price and gross profit', 'cost-desk.html#p-margin'],
 ['Reorder timing', 'When to place the next order', 'cost-desk.html#p-reorder'],
 ['Plan a sailing', 'Lane options and booking window', 'cost-desk.html#p-sail'],
 ['Taiwan vs China duty', 'Origin comparison including duty', 'cost-desk.html#p-cduty'],
].forEach(r => add('TOOL', r[0], r[1], r[2]));

// Materials and processes come out of AsiaSource's own tables by bracket
// matching, never by a regex across the whole file — this repo has been bitten
// twice by that. Zero results is a build warning, not a silent pass.
function matchBracket(src, open) {
  let d = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "'") { i++; while (i < src.length && src[i] !== "'") { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '[') d++;
    else if (c === ']') { d--; if (!d) return i; }
  }
  return -1;
}
function pairs(block) {
  const out = [];
  const re = /\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\]/g;
  let m;
  while ((m = re.exec(block))) out.push([m[1], m[2]]);
  return out;
}
function harvest(kind, key, url) {
  let n = 0, family = '', part = '';
  const famRe = /label:'((?:[^'\\]|\\.)*)'/g;
  // Track the nearest preceding family label and part name for context.
  const marks = [];
  let m;
  while ((m = famRe.exec(partner))) marks.push({ at: m.index, family: m[1] });
  const partRe = /\{name:'((?:[^'\\]|\\.)*)'/g;
  const partMarks = [];
  while ((m = partRe.exec(partner))) partMarks.push({ at: m.index, part: m[1] });

  // AsiaSource now offers several models per family (see partner_template.html's
  // families table), and a part like "Upper blade" repeats near-identically
  // across every model that carries it — same material, same route, same
  // family. Indexing each model's copy separately would print the same
  // material five or six times over for one family. The description is
  // therefore family + part, never the model: two entries collapse into one
  // whenever they share a family and a part, which is exactly the case a
  // model repeats. A process has no meaningful part context at all (it sits
  // at the model level, after the last part in the source text, which is an
  // accident of array order, not a fact about the process) so its
  // description is the family alone.
  const kre = new RegExp(key + ':\\[', 'g');
  while ((m = kre.exec(partner))) {
    const end = matchBracket(partner, m.index + key.length + 1);
    if (end < 0) continue;
    const block = partner.slice(m.index + key.length + 1, end + 1);
    const before = m.index;
    family = (marks.filter(x => x.at < before).pop() || {}).family || '';
    part = (partMarks.filter(x => x.at < before).pop() || {}).part || '';
    const desc = kind === 'MATERIAL' ? [family, part].filter(Boolean).join(' · ') : family;
    pairs(block).forEach(p => {
      add(kind, p[0], desc, url.replace('#', '?q=' + encodeURIComponent(p[0]) + '#'));
      n++;
    });
  }
  return n;
}
const nMat = harvest('MATERIAL', 'materials', 'partner.html#pd-builder');
const nProc = harvest('PROCESS', 'processes', 'partner.html#pd-builder');

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
