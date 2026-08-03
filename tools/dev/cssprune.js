// A CSS pruner that cuts by structure, not by regex.
//
// Regex has eaten working code in this repo twice: `.bd-head-route[^{]*{[^}]*}`
// ran straight through a minified media query and took three unrelated rules
// with it. So this walks the stylesheet character by character — respecting
// comments, strings and nested at-rules — builds a tree with byte offsets, and
// deletes only whole nodes.
'use strict';
const fs = require('fs');

// --- parse ---------------------------------------------------------------
// Returns a list of nodes: {type:'rule'|'at', prelude, preludeStart, start, end,
// bodyStart, bodyEnd, children}
function parse(css, base) {
  base = base || 0;
  let i = 0, out = [], preludeStart = 0;
  const n = css.length;
  function skipTo(end) { i = end; }
  while (i < n) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); skipTo(e < 0 ? n : e + 2); continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < n && css[j] !== c) { if (css[j] === '\\') j++; j++; } skipTo(j + 1); continue; }
    if (c === ';') { // at-rule with no block (@import, @charset)
      const prelude = css.slice(preludeStart, i).trim();
      if (prelude) out.push({ type: 'stmt', prelude, start: base + preludeStart, end: base + i + 1, children: [] });
      i++; preludeStart = i; continue;
    }
    if (c === '{') {
      // find matching close
      let depth = 1, j = i + 1;
      while (j < n && depth > 0) {
        const d = css[j];
        if (d === '/' && css[j + 1] === '*') { const e = css.indexOf('*/', j + 2); j = e < 0 ? n : e + 2; continue; }
        if (d === '"' || d === "'") { let k = j + 1; while (k < n && css[k] !== d) { if (css[k] === '\\') k++; k++; } j = k + 1; continue; }
        if (d === '{') depth++;
        else if (d === '}') depth--;
        j++;
      }
      const bodyStart = i + 1, bodyEnd = j - 1;           // exclusive of braces
      // A rule's prelude carries whatever whitespace and comments followed the
      // previous `}`. Section headers live there, so cuts start after them:
      // deleting the last rule of a section should not silently delete the
      // comment that documents the section.
      const raw = css.slice(preludeStart, i);
      let k = 0;
      for (;;) {
        const m = /^\s*\/\*[\s\S]*?\*\//.exec(raw.slice(k));
        if (!m) break; k += m[0].length;
      }
      k += (/^\s*/.exec(raw.slice(k)) || [''])[0].length;
      const prelude = raw.slice(k).trim();
      const isAt = prelude.startsWith('@');
      const nested = isAt && /^@(media|supports|layer|container|document|scope)\b/i.test(prelude);
      const node = {
        type: isAt ? 'at' : 'rule',
        prelude,
        lead: raw.slice(0, k),
        preludeStart: base + preludeStart + k,
        start: base + preludeStart + k,
        end: base + j,
        bodyStart: base + bodyStart,
        bodyEnd: base + bodyEnd,
        children: nested ? parse(css.slice(bodyStart, bodyEnd), base + bodyStart) : [],
      };
      out.push(node);
      i = j; preludeStart = i; continue;
    }
    i++;
  }
  return out;
}

// --- prune ---------------------------------------------------------------
// isDead(selector) -> bool. Cuts are returned as [start,end) ranges plus
// selector rewrites for rules that are only partly dead.
function plan(nodes, isDead, cuts, kept) {
  nodes.forEach(node => {
    if (node.type === 'at' && node.children.length) {
      const before = cuts.length;
      plan(node.children, isDead, cuts, kept);
      // If every child of this at-rule got cut, cut the at-rule instead.
      const allGone = node.children.length > 0 && node.children.every(ch =>
        cuts.slice(before).some(c => c.start <= ch.start && c.end >= ch.end));
      if (allGone) { cuts.length = before; cuts.push({ start: node.start, end: node.end, why: node.prelude + ' (emptied)' }); }
      return;
    }
    if (node.type !== 'rule') { kept.push(node); return; }
    const sels = splitSelectors(node.prelude);
    const dead = sels.filter(isDead), live = sels.filter(s => !isDead(s));
    if (!dead.length) { kept.push(node); return; }
    if (!live.length) { cuts.push({ start: node.start, end: node.end, why: node.prelude }); return; }
    cuts.push({ start: node.preludeStart, end: node.bodyStart - 1, replace: live.join(','), why: 'trim: ' + dead.join(',') });
    kept.push(node);
  });
}

function splitSelectors(prelude) {
  const out = []; let depth = 0, cur = '';
  for (let i = 0; i < prelude.length; i++) {
    const c = prelude[i];
    // A comma inside a comment is not a selector boundary.
    if (c === '/' && prelude[i + 1] === '*') {
      const e = prelude.indexOf('*/', i + 2), stop = e < 0 ? prelude.length : e + 2;
      cur += prelude.slice(i, stop); i = stop - 1; continue;
    }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function applyCuts(src, cuts) {
  cuts = cuts.slice().sort((a, b) => b.start - a.start);
  let out = src;
  cuts.forEach(c => { out = out.slice(0, c.start) + (c.replace != null ? c.replace : '') + out.slice(c.end); });
  return out;
}

module.exports = { parse, plan, applyCuts, splitSelectors };
