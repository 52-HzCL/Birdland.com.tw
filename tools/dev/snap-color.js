// Snap near-duplicate colours onto the palette.
//
//   node snap-color.js <file> [<file>…] [--write] [--max=20]
//
// Conservative on purpose: only opaque hex, only colour properties, and only
// when the value is within a tight distance of a token. Six jades that differ
// by three points of green are one jade written six times; two colours a
// reader can actually tell apart are left alone.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO: R } = require('./_env');
const WRITE = process.argv.includes('--write');
const MAX = Number((process.argv.find(a => a.startsWith('--max=')) || '--max=20').slice(6));
const FILES = process.argv.slice(2).filter(a => !a.startsWith('--'));

const TOKENS = {
  '--jade-900': '073C33', '--jade-800': '0E5140', '--jade-700': '0E6652', '--jade-100': 'E7EDEA',
  '--copper-600': 'B96032', '--copper-800': 'A64F2A', '--copper-200': 'E4C6A7',
  '--ink-900': '17362F', '--ink-700': '42675D', '--ink-500': '66736E', '--ink-300': '9AA1A9',
  '--paper': 'FBF9F3', '--paper-2': 'F3EFE5', '--card': 'FFFDF8', '--white': 'FFFFFF',
  '--up': 'A83C2E', '--flat': '8D8171',
};
const rgb = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const TOK = Object.entries(TOKENS).map(([k, v]) => ({ k, v, c: rgb(v) }));

function nearest(hex) {
  const c = rgb(hex);
  let best = null, bd = Infinity;
  TOK.forEach(t => {
    const d = Math.sqrt((c[0] - t.c[0]) ** 2 + (c[1] - t.c[1]) ** 2 + (c[2] - t.c[2]) ** 2);
    if (d < bd) { bd = d; best = t; }
  });
  return { tok: best, d: bd };
}

// Colour-carrying properties. `border`/`outline` shorthands are handled by
// scanning their value for a hex, which is safe because a shorthand can hold
// at most one colour.
const COLOUR_PROP = /^(color|background|background-color|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke|caret-color|text-decoration-color|column-rule-color)$/;

const moves = {};
let total = 0, skipped = 0;

function pass(css) {
  return css.replace(/([\w-]+)\s*:\s*([^;{}]+)/g, (whole, prop, val) => {
    prop = prop.trim();
    if (!COLOUR_PROP.test(prop)) return whole;
    return prop + ':' + val.replace(/#([0-9a-fA-F]{6})\b|#([0-9a-fA-F]{3})\b/g, (m, six, three) => {
      const hex = (six || three.split('').map(c => c + c).join('')).toUpperCase();
      const { tok, d } = nearest(hex);
      if (hex === tok.v) return m;                    // already the token's value
      if (d > MAX) { skipped++; return m; }
      const key = '#' + hex + ' -> ' + tok.k + ' (Δ' + d.toFixed(0) + ')';
      moves[key] = (moves[key] || 0) + 1; total++;
      return 'var(' + tok.k + ')';
    });
  });
}

FILES.forEach(rel => {
  const f = path.join(R, rel);
  if (!fs.existsSync(f)) { console.error('missing ' + rel); process.exit(1); }
  let s = fs.readFileSync(f, 'utf8');
  const before = total;
  if (/\.css$/.test(rel)) s = pass(s);
  else s = s.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, o, b, c) => o + pass(b) + c);
  console.log((WRITE ? 'ok  ' : '    ') + rel.padEnd(34) + (total - before) + ' colours');
  if (WRITE && total - before) fs.writeFileSync(f, s, 'utf8');
});

console.log('\n' + total + ' snapped, ' + skipped + ' left alone (further than Δ' + MAX + ')' + (WRITE ? '' : '  — dry run'));
Object.entries(moves).sort((a, b) => b[1] - a[1]).slice(0, 20)
  .forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k));
