// Builds every translated facade page from the English source + a pairs file,
// and keeps the English pages' own language picker and hreflang cluster in
// step. Adding a language = dropping i18n/facade.<dir>.json in place and
// running this; nothing else is hand-maintained.
//
// A pairs file: { lang, dir, name, note, pairs: [[english, translation], ...] }
// Keys are verbatim substrings of the EN pages (markup-bounded where a bare
// word would be ambiguous). A key that matches nowhere across all four pages
// fails the build — that is the drift alarm at translation-data level.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO } = require('./_env');

const PAGES = ['index.html', 'about.html', 'contact.html', 'privacy.html'];
// Display order for pickers/clusters. Missing files are skipped, so this
// works with two languages today and ten later.
const ORDER = ['nl', 'de', 'fr', 'es', 'pt-br', 'pl', 'it', 'ja', 'zh-tw'];
const HREFLANG = { nl: 'nl', de: 'de', fr: 'fr', es: 'es', 'pt-br': 'pt-BR', pl: 'pl', it: 'it', ja: 'ja', 'zh-tw': 'zh-Hant' };
const BASE = 'https://birdland.com.tw/';

const LANGS = ORDER
  .map(dir => path.join(REPO, 'i18n', 'facade.' + dir + '.json'))
  .filter(fs.existsSync)
  .map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
if (!LANGS.length) { console.error('no facade.<dir>.json files'); process.exit(1); }

function cluster(page) {
  const lines = ['<link rel="alternate" hreflang="en" href="' + BASE + page + '">'];
  for (const L of LANGS) lines.push('<link rel="alternate" hreflang="' + HREFLANG[L.dir] + '" href="' + BASE + L.dir + '/' + page + '">');
  lines.push('<link rel="alternate" hreflang="x-default" href="' + BASE + page + '">');
  return lines.join('\n  ');
}
function picker(page, current) { // current: null for EN
  const items = [current === null
    ? '<a href="' + page + '" aria-current="true">English</a>'
    : '<a href="../' + page + '" lang="en" hreflang="en">English</a>'];
  for (const L of LANGS) {
    if (L.dir === current) items.push('<a href="' + page + '" aria-current="true">' + L.name + '</a>');
    else items.push('<a href="' + (current === null ? '' : '../') + L.dir + '/' + page + '" lang="' + HREFLANG[L.dir] + '" hreflang="' + HREFLANG[L.dir] + '">' + L.name + '</a>');
  }
  return '<details class="bl-language" data-language-picker><summary>Language</summary><div>' + items.join('') + '</div></details>';
}
// ---- English pages: refresh their own picker + cluster ----------------------
for (const page of PAGES) {
  const F = path.join(REPO, page);
  let s = fs.readFileSync(F, 'utf8');
  const before = s;
  s = s.replace(/<details class="bl-language"[\s\S]*?<\/details>/, picker(page, null));
  s = s.replace(/[ \t]*<link rel="alternate" hreflang=[^\n]*\r?\n/g, '');
  s = s.replace(/(  <link rel="icon")/, '  ' + cluster(page) + '\n$1');
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
    s = s.replace(/^<!doctype html>\r?\n/, m => m + '<!-- i18n-src:PENDING -->\n');
    // language + chrome
    s = s.replace('<html lang="en">', '<html lang="' + L.lang + '">');
    s = s.replace(/<details class="bl-language"[\s\S]*?<\/details>/, picker(page, L.dir));
    // one folder deep: assets and EN-only pages step up
    s = s.replace(/(href="|src=")(tokens\.css|text-size\.js|terminal\.css|terminal\.js|birdland-visual\.css|terminal-status\.js|context\.js|mail-routing\.js|favicon\.svg|images\/|product-101\.html|guide\.html|executive\.html)/g, '$1../$2');
    s = s.replace("navigator.serviceWorker.register('service-worker.js')", "navigator.serviceWorker.register('../service-worker.js')");
    // hreflang cluster: EN pages already carry the full set; keep it as-is.
    // translated-from note
    s = s.replace('  <link rel="icon"', '  ' + NOTE_CSS + '\n  <link rel="icon"');
    s = s.replace(/<\/footer>/, '<span class="bl-i18n-note">' + L.note + '</span></footer>');
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
if (misses.length) { console.error('FAIL — keys that matched nothing:\n' + misses.join('\n')); process.exit(1); }
console.log('ok — run: node tools/dev/i18n-drift.js --stamp');
