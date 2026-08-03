// Snap declared font sizes onto the seven-step scale in tokens.css.
//
//   node snap-type.js <file> [<file>…] [--write]
//
// Only the size slot of `font-size:` and the `font:` shorthand is touched, and
// in HTML only inside <style> blocks — a var() in an SVG attribute or a
// JS-built inline style would not resolve.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO: R } = require('./_env');
const WRITE = process.argv.includes('--write');
// The desks set html{font-size:125%} and the Team Desk 115%, so a rem there is
// 20px or 18.4px, not 16. That is where 11.776px and 12.144px came from: no one
// picked them, they are 0.8rem and 0.66rem against a scaled root.
const ROOT = parseFloat((process.argv.find(a => a.startsWith('--root=')) || '--root=16').slice(7));
const FILES = process.argv.slice(2).filter(a => !a.startsWith('--'));

// Bands, not nearest-neighbour: a band says which role a size was playing.
// Anything under 12px was a caption or an eyebrow label, and 8px shipped on
// eight of eleven pages — the floor is the point of the exercise.
const BANDS = [
  [12, '--fs-micro', 11],
  [14, '--fs-small', 13],
  [16, '--fs-body', 15],
  [19.5, '--fs-h3', 16],
  [27.5, '--fs-h2', 22],
  [40, '--fs-h1', 32],
  [Infinity, '--fs-display', 48],
];
const tokenFor = px => BANDS.find(b => px < b[0])[1];
const pxFor = px => BANDS.find(b => px < b[0])[2];

function snapValue(v) {
  v = v.trim();
  if (/^var\(/.test(v) || /^(inherit|initial|unset|0)$/.test(v)) return null;
  const m = /^([\d.]+)px$/.exec(v);
  if (m) {
    const px = parseFloat(m[1]);
    if (pxFor(px) === px) return null;                 // already on the scale
    return { out: 'var(' + tokenFor(px) + ')', from: px, to: pxFor(px) };
  }
  const r = /^([\d.]+)rem$/.exec(v);
  if (r) {
    const px = Math.round(parseFloat(r[1]) * ROOT * 100) / 100;
    return { out: 'var(' + tokenFor(px) + ')', from: r[1] + 'rem=' + px, to: pxFor(px) };
  }
  // clamp(min, fluid, max): snap the two ends, leave the fluid middle.
  const c = /^clamp\(\s*([\d.]+)px\s*,([^,]+),\s*([\d.]+)px\s*\)$/.exec(v);
  if (c) {
    const lo = parseFloat(c[1]), hi = parseFloat(c[3]);
    const nlo = pxFor(lo), nhi = pxFor(hi);
    if (nlo === lo && nhi === hi) return null;
    return { out: 'clamp(' + nlo + 'px,' + c[2].trim() + ',' + nhi + 'px)', from: lo + '→' + hi, to: nlo + '→' + nhi };
  }
  return null;
}

const moves = {};
let total = 0;

FILES.forEach(rel => {
  const f = path.join(R, rel);
  if (!fs.existsSync(f)) { console.error('missing ' + rel); process.exit(1); }
  let s = fs.readFileSync(f, 'utf8');
  const isCss = /\.css$/.test(rel);
  let n = 0;

  function pass(css) {
    // font-size: <value>
    css = css.replace(/(font-size\s*:\s*)([^;}!]+)/g, (m, head, val) => {
      const r = snapValue(val);
      if (!r) return m;
      n++; moves[r.from + ' -> ' + r.to] = (moves[r.from + ' -> ' + r.to] || 0) + 1;
      return head + r.out;
    });
    // font: [style] [weight] <size>[/lh] <family>
    css = css.replace(/(font\s*:\s*(?:(?:normal|italic|oblique|small-caps|bold|bolder|lighter|[1-9]00)\s+)*)(clamp\([^)]*\)|[\d.]+(?:px|rem))(\s*(?:\/[^\s;}]+)?\s)/g,
      (m, head, size, tail) => {
        const r = snapValue(size);
        if (!r) return m;
        n++; moves[r.from + ' -> ' + r.to] = (moves[r.from + ' -> ' + r.to] || 0) + 1;
        return head + r.out + tail;
      });
    return css;
  }

  if (isCss) s = pass(s);
  else s = s.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, o, b, c) => o + pass(b) + c);

  total += n;
  console.log((WRITE ? 'ok  ' : '    ') + rel.padEnd(34) + n + ' declarations');
  if (WRITE && n) fs.writeFileSync(f, s, 'utf8');
});

console.log('\n' + total + ' snapped' + (WRITE ? '' : '  (dry run — pass --write)'));
console.log(Object.entries(moves).sort((a, b) => b[1] - a[1]).map(([k, v]) => '  ' + String(v).padStart(4) + '  ' + k).join('\n'));
