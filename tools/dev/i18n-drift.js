// Translations rot silently: nobody reads the German page the day after the
// English one changes. Every translated page therefore carries the SHA-1 of
// the English source it was translated from, and this gate goes red the
// moment the two disagree. Run with --stamp to (re)write the fingerprints
// after a retranslation.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { REPO } = require('./_env');

const STAMP = process.argv.includes('--stamp');
const MARK = /<!-- i18n-src:([0-9a-f]{40}|PENDING) -->/;

const sha1 = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');

// Language folders are discovered, not listed: any top-level directory whose
// .html files carry the fingerprint mark is a translation set.
const dirs = fs.readdirSync(REPO, { withFileTypes: true })
  .filter(d => d.isDirectory() && !/^(\.|node_modules|tools|images|calendars|i18n)/.test(d.name))
  .map(d => d.name)
  .filter(dir => fs.readdirSync(path.join(REPO, dir)).some(f =>
    f.endsWith('.html') && MARK.test(fs.readFileSync(path.join(REPO, dir, f), 'utf8'))));

let stale = 0, ok = 0;
for (const dir of dirs) {
  for (const f of fs.readdirSync(path.join(REPO, dir)).filter(f => f.endsWith('.html'))) {
    const T = path.join(REPO, dir, f);
    const src = path.join(REPO, f);
    let t = fs.readFileSync(T, 'utf8');
    const m = t.match(MARK);
    if (!m) continue;
    if (!fs.existsSync(src)) { console.log('  ??  ' + dir + '/' + f + ' — no English source ' + f); stale++; continue; }
    const now = sha1(src);
    if (STAMP) {
      fs.writeFileSync(T, t.replace(MARK, '<!-- i18n-src:' + now + ' -->'), 'utf8');
      console.log('  st  ' + dir + '/' + f + '  ' + now.slice(0, 10));
      ok++;
    } else if (m[1] === now) {
      console.log('  ok  ' + dir + '/' + f);
      ok++;
    } else {
      console.log('  STALE  ' + dir + '/' + f + ' — English changed since this translation (have ' +
        m[1].slice(0, 10) + ', source is ' + now.slice(0, 10) + ')');
      stale++;
    }
  }
}
console.log((STAMP ? 'stamped ' : 'checked ') + ok + ' page(s) across ' + dirs.length + ' language(s)' +
  (stale ? ' — ' + stale + ' STALE' : ''));
process.exit(stale ? 1 : 0);
