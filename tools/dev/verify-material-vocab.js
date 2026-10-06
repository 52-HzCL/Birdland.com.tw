// AsiaSource's buyer brief promises that every material route has already
// been checked — the catalogue only ever draws from a fixed, verified
// vocabulary (see the batch-5 spec: "材質只能取自檔案現有的詞彙"). That
// promise is only as good as this check: every material NAME reachable from
// window.BL_FAMILIES in the working tree must already have existed, as a
// material name, at the given git ref. Route/description text is free to be
// reworded per model — only the name itself is load-bearing, because
// gen-terminal.js's index and every claim downstream key off that string.
//
//   node tools/dev/verify-material-vocab.js [ref]      # ref defaults to HEAD
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { REPO } = require('./_env');

const ref = process.argv[2] || 'HEAD';

function extractMaterialNames(src) {
  const names = new Set();
  function matchBracket(s, open) {
    let d = 0;
    for (let i = open; i < s.length; i++) {
      const c = s[i];
      if (c === "'") { i++; while (i < s.length && s[i] !== "'") { if (s[i] === '\\') i++; i++; } continue; }
      if (c === '[') d++;
      else if (c === ']') { d--; if (!d) return i; }
    }
    return -1;
  }
  const re = /materials:\[/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + 'materials:['.length - 1;
    const end = matchBracket(src, open);
    if (end < 0) continue;
    const block = src.slice(open, end + 1);
    const pairRe = /\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\]/g;
    let p;
    while ((p = pairRe.exec(block))) names.add(p[1]);
  }
  return names;
}

const current = fs.readFileSync(path.join(REPO, 'tools', 'partner_template.html'), 'utf8');
let before;
try {
  before = execFileSync('git',['show',ref + ':tools/partner_template.html'], { cwd: REPO, maxBuffer: 1024 * 1024 * 20 }).toString('utf8');
} catch (e) {
  console.error('could not read tools/partner_template.html at ' + ref + ' — is this a git repo with that ref?');
  process.exit(2);
}

const currentNames = new Set(JSON.parse(fs.readFileSync(path.join(REPO,'data/manufacturing-options.json'),'utf8')).flatMap(f=>f.models.flatMap(m=>m.parts.flatMap(p=>p.materials.map(v=>v[0])))));
let beforeNames = extractMaterialNames(before);
if (before.includes('__FAMILIES__')) {
  const oldOptions = JSON.parse(execFileSync('git',['show',ref + ':data/manufacturing-options.json'],{cwd:REPO}).toString('utf8'));
  beforeNames = new Set(oldOptions.flatMap(f=>f.models.flatMap(m=>m.parts.flatMap(p=>p.materials.map(v=>v[0])))));
}
const newNames = [...currentNames].filter(n => !beforeNames.has(n));

console.log('material names at ' + ref + ': ' + beforeNames.size);
console.log('material names now:     ' + currentNames.size);
console.log('new (uncoined) names:    ' + newNames.length);
if (newNames.length) {
  newNames.forEach(n => console.log('  ' + JSON.stringify(n)));
  process.exit(1);
}
console.log('OK — every material name in the working tree already existed at ' + ref + '.');
