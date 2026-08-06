// Builds every translated facade page from the English source + a pairs file,
// and keeps the English pages' own language picker and hreflang cluster in
// step. Adding a language = dropping i18n/facade.<dir>.json in place and
// running this; nothing else is hand-maintained.
//
// A pairs file: { lang, dir, name, note, pairs: [[english, translation], ...] }
// Keys are verbatim substrings of the EN pages (markup-bounded where a bare
// word would be ambiguous). A key that matches nowhere across all four pages
// fails the build — that is the drift alarm at translation-data level.
//
// Three kinds of page carry a language control, and this script knows all
// three:
//
//   PAGES        the facade — one static folder per language. Built here.
//   BUILT_PAGES  the Factory — one static folder per language too, but the
//                English page comes out of build-p101.js and the translations
//                out of i18n-page.js. Only its picker and cluster are kept in
//                step here, and build-p101.js emits byte-identical markup, so
//                whichever runs last the file is the same.
//   RUNTIME      the Guide and the four desk apps — one artifact, rebuilt
//                nightly by CI, that switches language from a stored
//                preference. Nothing to write; their pickers are checked
//                against this same language list instead.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO } = require('./_env');
const { ORDER, HREFLANG, LANGS, cluster, picker, handoff } = require('./_langs');

const PAGES = ['index.html', 'about.html', 'contact.html', 'privacy.html'];
const BUILT_PAGES = ['product-101.html'];
// Built nightly from tools/*_template.html; their pickers are JS.
const RUNTIME_PAGES = ['guide.html', 'executive.html', 'partner.html', 'cost-desk.html', 'team.html'];
const RUNTIME_PICKERS = ['app-bar.js', 'desk-banner.js'];

if (!LANGS.length) { console.error('no facade.<dir>.json files'); process.exit(1); }

// A replace that matches nothing returns the input unchanged and exits zero.
// Every substitution below says how many hits it expects.
let subFails = 0;
function sub(s, re, to, want, what) {
  const n = (s.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length;
  if (n !== want) { console.error('  !!  ' + what + ': expected ' + want + ' match(es), found ' + n); subFails++; }
  return s.replace(re, to);
}

// ---- English pages: refresh their own picker + cluster ----------------------
for (const page of PAGES.concat(BUILT_PAGES)) {
  const F = path.join(REPO, page);
  if (!fs.existsSync(F)) { console.error('  !!  missing ' + page); subFails++; continue; }
  let s = fs.readFileSync(F, 'utf8');
  const before = s;
  s = sub(s, /<details class="bl-language"[\s\S]*?<\/details>/, picker(page, null), 1, page + ' picker');
  s = s.replace(/[ \t]*<link rel="alternate" hreflang=[^\n]*\r?\n/g, '');
  s = sub(s, /(  <link rel="icon")/, '  ' + cluster(page) + '\n$1', 1, page + ' hreflang cluster');
  fs.writeFileSync(F, s, 'utf8');
  console.log((s === before ? '  =   ' : '  en  ') + page);
}

// ---- Translated pages -------------------------------------------------------
const NOTE_CSS = '<style>.bl-footer{flex-wrap:wrap}.bl-i18n-note{flex:1 0 100%;margin-top:4px;font-size:11px;opacity:.7}</style>';
const misses = [];
for (const L of LANGS) {
  const hits = new Map(L.pairs.map(p => [p[0], 0]));
  fs.mkdirSync(path.join(REPO, L.dir), { recursive: true });
  for (const page of PAGES) {
    let s = fs.readFileSync(path.join(REPO, page), 'utf8');
    // fingerprint marker (stamped by i18n-drift --stamp afterwards)
    s = sub(s, /^<!doctype html>\r?\n/, m => m + '<!-- i18n-src:PENDING -->\n', 1, L.dir + '/' + page + ' fingerprint');
    // language + chrome
    s = sub(s, /<html lang="en">/, '<html lang="' + L.lang + '">', 1, L.dir + '/' + page + ' html lang');
    // Arriving here is choosing this language; the desks read it from there.
    s = sub(s, /<head>/, '<head>\n  ' + handoff(L.dir), 1, L.dir + '/' + page + ' language handoff');
    s = sub(s, /<details class="bl-language"[\s\S]*?<\/details>/, picker(page, L.dir), 1, L.dir + '/' + page + ' picker');
    // contact.html writes its desk name straight into the page at runtime
    // (mail-routing.js's deskName), so only the translated copies need
    // i18n.js there to translate that one word through the desk-phrase:
    // dictionary. The English root deliberately never loads it, for the
    // same reason it never gets a language handoff above: an English page
    // has no business reading a stored language preference.
    if (page === 'contact.html') {
      s = sub(s, /(<script defer src="mail-routing\.js[^"]*"><\/script>)/,
        '<script defer src="i18n.js?v=20260806a"></script>$1', 1, L.dir + '/' + page + ' i18n.js injection');
    }
    // one folder deep: assets and EN-only pages step up
    s = s.replace(/(href="|src=")(tokens\.css|text-size\.js|terminal\.css|terminal\.js|birdland-visual\.css|terminal-status\.js|context\.js|mail-routing\.js|i18n\.js|favicon\.svg|images\/|product-101\.html|guide\.html|executive\.html)/g, '$1../$2');
    s = s.replace("navigator.serviceWorker.register('service-worker.js')", "navigator.serviceWorker.register('../service-worker.js')");
    // hreflang cluster: EN pages already carry the full set; keep it as-is.
    // translated-from note
    s = sub(s, /  <link rel="icon"/, '  ' + NOTE_CSS + '\n  <link rel="icon"', 1, L.dir + '/' + page + ' note css');
    s = sub(s, /<\/footer>/, '<span class="bl-i18n-note">' + L.note + '</span></footer>', 1, L.dir + '/' + page + ' note');
    // the translation itself
    for (const [en, tr] of L.pairs) {
      let parts = s.split(en);
      if (parts.length === 1 && en.includes('\n')) parts = s.split(en.split('\n').join('\r\n'));
      if (parts.length > 1) { hits.set(en, hits.get(en) + parts.length - 1); s = parts.join(tr); }
    }
    fs.writeFileSync(path.join(REPO, L.dir, page), s, 'utf8');
  }
  const missed = [...hits.entries()].filter(([, n]) => n === 0).map(([k]) => k);
  if (missed.length) misses.push(L.dir + ': ' + missed.map(k => JSON.stringify(k.slice(0, 60))).join(', '));
  console.log('  ' + L.dir.padEnd(6) + PAGES.length + ' pages, ' + (L.pairs.length - missed.length) + '/' + L.pairs.length + ' keys hit');
}

// ---- The pages that switch language at run time -----------------------------
// Nothing to write, two things to check: that no page still carries the dead
// Google Translate control, and that the two browser scripts offer the same
// ten editions the folders do. Both are the kind of drift that ships silently.
let checkFails = 0;
const DEAD = /data-translate-select|google_translate_element|class="language-box"|translate\.google\.com/;
const shipped = fs.readdirSync(REPO).filter(f => /\.(html|js)$/.test(f))
  .concat(ORDER.flatMap(d => fs.existsSync(path.join(REPO, d))
    ? fs.readdirSync(path.join(REPO, d)).filter(f => f.endsWith('.html')).map(f => d + '/' + f) : []))
  .concat(fs.readdirSync(path.join(REPO, 'tools')).filter(f => f.endsWith('.html')).map(f => 'tools/' + f));
for (const f of shipped) {
  if (DEAD.test(fs.readFileSync(path.join(REPO, f), 'utf8'))) {
    console.error('  !!  ' + f + ' still carries a Google Translate control');
    checkFails++;
  }
}

// ---- the desks' run-time dictionaries ---------------------------------------
// app.en.json is the canonical key list; the other nine are {english: local}.
// A key added to the English list and to eight of the nine is the failure this
// catches: the ninth language silently keeps the English word, and nobody who
// does not read that language will ever notice.
{
  const en = JSON.parse(fs.readFileSync(path.join(REPO, 'i18n', 'app.en.json'), 'utf8'));
  if (!Array.isArray(en)) { console.error('  !!  app.en.json is not an array'); checkFails++; }
  const dupes = en.filter((k, i) => en.indexOf(k) !== i);
  if (dupes.length) { console.error('  !!  app.en.json has ' + dupes.length + ' duplicate key(s): ' + JSON.stringify(dupes.slice(0, 3))); checkFails++; }
  for (const L of LANGS) {
    const f = path.join(REPO, 'i18n', 'app.' + L.dir + '.json');
    if (!fs.existsSync(f)) { console.error('  !!  missing i18n/app.' + L.dir + '.json'); checkFails++; continue; }
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!d['@lang']) { console.error('  !!  app.' + L.dir + '.json has no "@lang"'); checkFails++; }
    const missing = en.filter(k => typeof d[k] !== 'string' || !d[k].trim());
    const extra = Object.keys(d).filter(k => k !== '@lang' && !en.includes(k));
    if (missing.length || extra.length) {
      console.error('  !!  app.' + L.dir + '.json: ' + missing.length + ' missing/empty, ' + extra.length + ' not in app.en.json');
      if (missing.length) console.error('        missing ' + JSON.stringify(missing.slice(0, 3)));
      if (extra.length) console.error('        extra   ' + JSON.stringify(extra.slice(0, 3)));
      checkFails++;
    } else console.log('  dict  app.' + L.dir + '.json  ' + en.length + '/' + en.length + ' keys');
  }
}

const want = [['en', 'en', 'English']].concat(LANGS.map(L => [L.dir, HREFLANG[L.dir], L.name]));
for (const f of RUNTIME_PICKERS) {
  const src = fs.readFileSync(path.join(REPO, f), 'utf8');
  const block = src.match(/var LANGS = \[([\s\S]*?)\n {2}\];/);
  if (!block) { console.error('  !!  ' + f + ': no LANGS array found'); checkFails++; continue; }
  const got = [...block[1].matchAll(/\['([^']+)', *'([^']+)', *'([^']*)'\]/g)].map(m => [m[1], m[2], m[3]]);
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    console.error('  !!  ' + f + ': its language list is not the facade set');
    console.error('        has  ' + JSON.stringify(got.map(g => g[0])));
    console.error('        want ' + JSON.stringify(want.map(g => g[0])));
    checkFails++;
  } else console.log('  rt  ' + f + '  ' + got.length + ' editions');
}
for (const page of RUNTIME_PAGES) console.log('  rt  ' + page + '  (picker built at run time)');

if (misses.length) { console.error('FAIL — keys that matched nothing:\n' + misses.join('\n')); process.exit(1); }
if (subFails || checkFails) { console.error('FAIL — ' + subFails + ' substitution miss(es), ' + checkFails + ' check failure(s)'); process.exit(1); }
console.log('ok — run: node tools/dev/i18n-drift.js --stamp');
