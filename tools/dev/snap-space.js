// Snap spacing, radius and transition duration onto the tokens.
//
//   node snap-space.js <file> [<file>…] [--write]
//
// Only the properties named below, and in HTML only inside <style> blocks: a
// var() in an SVG attribute or a JS-built inline style would not resolve.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO: R } = require('./_env');
const WRITE = process.argv.includes('--write');
const FILES = process.argv.slice(2).filter(a => !a.startsWith('--'));

// 4 / 8 / 16 / 24 / 32 / 48. Bands rather than nearest, so a value is mapped by
// the job it was doing: 9px and 13px were the two most-used paddings on the
// site and neither is a step on any scale.
const SP = [[6, '--sp-1', 4], [12, '--sp-2', 8], [20, '--sp-3', 16],
            [28, '--sp-4', 24], [40, '--sp-5', 32], [Infinity, '--sp-6', 48]];
const RA = [[8, '--r-sm', 6], [40, '--r-md', 10], [Infinity, '--r-pill', 999]];
const band = (t, px) => t.find(b => px < b[0]);

const SPACE_PROP = /^(padding|margin)(-(top|right|bottom|left))?$|^(gap|row-gap|column-gap)$/;

function snapLen(px, table) {
  const b = band(table, px);
  return b[2] === px ? null : { token: b[1], to: b[2] };
}

const moves = {};
let total = 0;

function note(k) { moves[k] = (moves[k] || 0) + 1; total++; }

function pass(css) {
  // padding / margin / gap — each length in the shorthand snapped separately.
  css = css.replace(/([\w-]+)\s*:\s*([^;{}!]+)/g, (whole, prop, val) => {
    prop = prop.trim();
    if (SPACE_PROP.test(prop)) {
      if (/var\(|calc\(|%|auto|inherit/.test(val)) return whole;
      const parts = val.trim().split(/\s+/);
      if (!parts.length || parts.length > 4) return whole;
      let touched = false;
      const out = parts.map(p => {
        const m = /^([\d.]+)px$/.exec(p);
        if (!m) return p;
        const r = snapLen(parseFloat(m[1]), SP);
        if (!r) return p;
        touched = true; note(m[1] + 'px -> ' + r.to + 'px');
        return 'var(' + r.token + ')';
      });
      return touched ? prop + ':' + out.join(' ') : whole;
    }
    if (prop === 'border-radius') {
      if (/var\(|calc\(|%/.test(val)) return whole;
      const parts = val.trim().split(/\s+/);
      let touched = false;
      const out = parts.map(p => {
        const m = /^([\d.]+)px$/.exec(p);
        if (!m) return p;
        const px = parseFloat(m[1]);
        const r = snapLen(px, RA);
        if (!r) return p;
        touched = true; note('radius ' + m[1] + ' -> ' + r.to);
        return 'var(' + r.token + ')';
      });
      return touched ? prop + ':' + out.join(' ') : whole;
    }
    if (prop === 'transition-duration' || prop === 'animation-duration') {
      const out = val.split(',').map(v => {
        const m = /^\s*([\d.]+)(ms|s)\s*$/.exec(v);
        if (!m) return v;
        const ms = m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
        if (ms === 150 || ms === 200) return v;
        note('duration ' + m[1] + m[2] + ' -> ' + (ms <= 175 ? 'fast' : 'slow'));
        return ms <= 175 ? 'var(--dur-fast)' : 'var(--dur-slow)';
      });
      return prop + ':' + out.join(',');
    }
    return whole;
  });

  // the time slot of the transition shorthand
  css = css.replace(/(transition\s*:\s*)([^;{}!]+)/g, (whole, head, val) => {
    if (val.includes('var(--dur')) return whole;
    let touched = false;
    const out = val.replace(/(^|[\s,])([\d.]+)(ms|s)(?=[\s,]|$)/g, (m, pre, n, u) => {
      const ms = u === 's' ? parseFloat(n) * 1000 : parseFloat(n);
      if (ms === 0) return m;
      if (ms === 150 || ms === 200) return m;
      touched = true; note('duration ' + n + u + ' -> ' + (ms <= 175 ? 'fast' : 'slow'));
      return pre + (ms <= 175 ? 'var(--dur-fast)' : 'var(--dur-slow)');
    });
    return touched ? head + out : whole;
  });
  return css;
}

FILES.forEach(rel => {
  const f = path.join(R, rel);
  if (!fs.existsSync(f)) { console.error('missing ' + rel); process.exit(1); }
  let s = fs.readFileSync(f, 'utf8');
  const before = total;
  if (/\.css$/.test(rel)) s = pass(s);
  else s = s.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, o, b, c) => o + pass(b) + c);
  console.log((WRITE ? 'ok  ' : '    ') + rel.padEnd(34) + (total - before) + ' values');
  if (WRITE && total - before) fs.writeFileSync(f, s, 'utf8');
});

console.log('\n' + total + ' snapped' + (WRITE ? '' : '  (dry run — pass --write)'));
Object.entries(moves).sort((a, b) => b[1] - a[1]).slice(0, 18)
  .forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k));
