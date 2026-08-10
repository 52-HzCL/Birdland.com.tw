// Do all five copies of "which apps exist and what are they called" agree?
//
// The four desk apps plus the Team Desk are named in five independent places,
// none of which can import from another: two of them are browser <script> tags
// that cannot require() a module, one is Python, and one is that Python file's
// Node twin. So the list is duplicated by necessity — the same situation the
// language list is in, and the language list has had a disagreement check since
// it caused a bug. This one did not.
//
// It should have. The commit that renamed the desks ("the three desks get
// names") had to touch nineteen files by hand, and nothing would have failed if
// it had missed one — which is exactly what happened to site-shell.js, found
// months later still offering "Buyer Desk", "Cost Desk" and "Daily Supply
// News" from the site navigation.
//
//   node tools/dev/verify-app-list.js        # exits 1 on any disagreement
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO } = require('./_env');

const read = f => fs.readFileSync(path.join(REPO, f), 'utf8');
const rows = (src, re, fileIdx, nameIdx) => {
  const out = {};
  for (const m of src.matchAll(re)) out[m[fileIdx]] = m[nameIdx];
  return out;
};

// app-bar.js is the canonical list: it is the one the reader actually operates,
// and the only one that also carries each app's icon key and one-line purpose.
const bar = read('app-bar.js');
const CANON = {};
for (const m of bar.matchAll(/\{\s*key:\s*'[a-z]+',\s*file:\s*'([a-z0-9-]+\.html)',\s*name:\s*'([^']+)'/g)) {
  CANON[m[1]] = m[2];
}
for (const m of bar.matchAll(/TEAM\s*=\s*\{\s*key:\s*'[a-z]+',\s*file:\s*'([a-z0-9-]+\.html)',\s*name:\s*'([^']+)'/g)) {
  CANON[m[1]] = m[2];
}

const SOURCES = [
  // The site navigation on the facade pages, built as an HTML string.
  ['site-shell.js', rows(read('site-shell.js'), /item\('([a-z0-9-]+\.html)',\s*'([^']+)'\)/g, 1, 2)],
  // The Terminal panel's path. STEPS is [question, name, file, iconKey, blurb];
  // the Team Desk is an aside below it rather than a step.
  // The question is double-quoted when it contains an apostrophe ("WHERE IT'S
  // GOING"), so the two quote styles have to be matched as alternatives — a
  // naive [^"']+ ends at the apostrophe and drops that step silently, which is
  // how the first version of this check passed while not looking at My Market.
  ['terminal.js', (() => {
    const s = read('terminal.js');
    const o = rows(s, /\[(?:"[^"]*"|'[^']*'),\s*'([^']+)',\s*'([a-z0-9-]+\.html)'/g, 2, 1);
    const team = /class="tm-name">([^<]+)<\/span><span class="tm-desc">[^<]*<\/span>[\s\S]{0,80}?/.exec(s);
    if (/team\.html/.test(s) && team) o['team.html'] = team[1];
    return o;
  })()],
  // The Terminal search index, and its Python original. Same mixed-quoting
  // trap as terminal.js: the blurb is double-quoted where it contains an
  // apostrophe ("Today's steel..."), so both styles must be allowed or that
  // row is skipped without a word.
  ['tools/dev/gen-terminal.js', rows(read('tools/dev/gen-terminal.js'), /\['([^']+)',\s*(?:"[^"]*"|'[^']*'),\s*'([a-z0-9-]+\.html)'\]/g, 2, 1)],
  ['tools/build_terminal.py', rows(read('tools/build_terminal.py'), /\("([^"]+)",\s*"[^"]*",\s*"([a-z0-9-]+\.html)"\)/g, 2, 1)],
];

let fail = 0;
const files = Object.keys(CANON).sort();
console.log('canonical (app-bar.js):');
for (const f of files) console.log('  ' + f.padEnd(18) + CANON[f]);

for (const [label, got] of SOURCES) {
  const problems = [];
  for (const f of files) {
    // Not every source lists every app — the Terminal search index has no Team
    // Desk row, for instance. Absence is allowed; DISAGREEMENT is not.
    if (got[f] === undefined) continue;
    if (got[f] !== CANON[f]) problems.push(f + ': "' + got[f] + '" should be "' + CANON[f] + '"');
  }
  // A source that names a desk page this repo no longer has is drift too.
  for (const f of Object.keys(got)) {
    if (!(f in CANON) && /^(executive|partner|cost-desk|my-market|team)\.html$/.test(f)) {
      problems.push(f + ': listed here but not in app-bar.js');
    }
  }
  const listed = files.filter(f => got[f] !== undefined).length;
  console.log('\n' + label + '  (' + listed + '/' + files.length + ' apps named here)');
  if (problems.length) { problems.forEach(p => console.log('  MISMATCH ' + p)); fail += problems.length; }
  else console.log('  agrees');
}

console.log('\n' + (fail ? 'FAIL: ' + fail + ' disagreement(s)' : 'all sources agree'));
process.exit(fail ? 1 : 0);
