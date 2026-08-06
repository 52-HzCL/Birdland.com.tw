// Whole-page translation pipeline for big built artifacts (Factory first).
// Facade pages use hand-picked string pairs; a 9,000-word page cannot. Here
// the DOM itself is the segment list:
//
//   extract  node tools/dev/i18n-page.js extract product-101.html
//            -> i18n/page.product-101.en.json   (every translatable text node
//               + alt/title/aria-label, deduped, in document order)
//   build    node tools/dev/i18n-page.js build product-101.html de
//            -> de/product-101.html  (same DOM, text swapped, paths stepped
//               up, lang set, hreflang cluster, translated-from note, PENDING
//               fingerprint for i18n-drift --stamp)
//
// A translation file i18n/page.<name>.<dir>.json is {english: translation}.
// build fails loudly listing untranslated segments, so a regenerated English
// page can never silently ship half-translated.
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { REPO } = require('./_env');
// The picker and the hreflang cluster are chrome, not content: they are
// rebuilt per edition from the shared list rather than translated, so the
// language names never enter the segment file and a new language reaches all
// ten pages by rebuilding rather than by nine hand edits.
const { picker, cluster, handoff } = require('./_langs');

const [, , MODE, PAGE, DIR] = process.argv;
if (!MODE || !PAGE) { console.error('usage: i18n-page.js extract|build <page.html> [langdir]'); process.exit(1); }
const NAME = PAGE.replace(/\.html$/, '');

// Language metadata mirrors i18n-build.js.
const META = {
  nl: ['nl', 'Vertaald uit het Engelse origineel — voor specificaties en compliance is de Engelse versie leidend.'],
  de: ['de', 'Übersetzung des englischen Originals — für Spezifikationen und Compliance-Inhalte ist die englische Fassung maßgeblich.'],
  fr: ['fr', "Traduit de l'original anglais — la version anglaise fait foi pour les spécifications et la conformité."],
  es: ['es', 'Traducido del original en inglés — la versión inglesa prevalece para especificaciones y cumplimiento.'],
  'pt-br': ['pt-BR', 'Traduzido do original em inglês — a versão em inglês prevalece para especificações e conformidade.'],
  pl: ['pl', 'Tłumaczenie z angielskiego oryginału — dla specyfikacji i zgodności wiążąca jest wersja angielska.'],
  it: ['it', "Tradotto dall'originale inglese — per specifiche e conformità fa fede la versione inglese."],
  ja: ['ja', '英語原文からの翻訳です。仕様および法令遵守に関する内容は英語版が正となります。'],
  'zh-tw': ['zh-Hant', '本頁譯自英文原文;規格與法遵內容以英文版為準。'],
};
const { ORDER } = require('./_langs');

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'SVG']);
const ATTRS = ['alt', 'title', 'aria-label'];
// Pure numbers, prices, ranges, glyphs — not language.
const NOT_TEXT = /^[\s\d.,%×x+\-–—·:;/()"'#&≈~↑↓▲▼■°*€$£¥]+$/u;

// The language picker is generated per edition, so nothing inside it is a
// segment. Left in, the ten language names would have become ten translation
// keys — and "Nederlands" is Nederlands in every one of them.
const CHROME = '[data-language-picker]';

function segments(dom) {
  const doc = dom.window.document;
  const out = [];
  const walker = doc.createTreeWalker(doc.body, dom.window.NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    let p = n.parentElement, skip = false;
    for (; p; p = p.parentElement) if (SKIP_TAGS.has(p.tagName)) { skip = true; break; }
    if (skip) continue;
    if (n.parentElement && n.parentElement.closest(CHROME)) continue;
    const t = n.nodeValue.trim();
    if (t.length < 2 || NOT_TEXT.test(t)) continue;
    out.push({ kind: 'text', node: n, key: t.replace(/\s+/g, ' ') });
  }
  for (const el of doc.querySelectorAll('*')) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest(CHROME)) continue;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && v.trim().length >= 2 && !NOT_TEXT.test(v.trim()))
        out.push({ kind: a, node: el, key: v.trim().replace(/\s+/g, ' ') });
    }
  }
  // <title> lives outside body
  const title = doc.querySelector('title');
  if (title) out.push({ kind: 'text', node: title.firstChild, key: title.textContent.trim() });
  const desc = doc.querySelector('meta[name="description"]');
  if (desc) out.push({ kind: 'content', node: desc, key: desc.getAttribute('content').trim() });
  return out;
}

const src = fs.readFileSync(path.join(REPO, PAGE), 'utf8');

if (MODE === 'extract') {
  const dom = new JSDOM(src);
  const seen = new Map();
  for (const s of segments(dom)) if (!seen.has(s.key)) seen.set(s.key, 0);
  const keys = [...seen.keys()];
  fs.writeFileSync(path.join(REPO, 'i18n', 'page.' + NAME + '.en.json'),
    JSON.stringify(keys, null, 1), 'utf8');
  const words = keys.join(' ').split(/\s+/).length;
  console.log('extracted ' + keys.length + ' unique segments (~' + words + ' words) -> i18n/page.' + NAME + '.en.json');
  process.exit(0);
}

if (MODE === 'build') {
  const dirs = DIR ? [DIR] : ORDER.filter(d => fs.existsSync(path.join(REPO, 'i18n', 'page.' + NAME + '.' + d + '.json')));
  if (!dirs.length) { console.error('no translation files for ' + NAME); process.exit(1); }
  for (const dir of dirs) {
    const [langAttr, note] = META[dir];
    const map = JSON.parse(fs.readFileSync(path.join(REPO, 'i18n', 'page.' + NAME + '.' + dir + '.json'), 'utf8'));
    const dom = new JSDOM(src);
    const doc = dom.window.document;
    const missing = new Set();
    for (const s of segments(dom)) {
      const tr = map[s.key];
      if (tr == null) { missing.add(s.key); continue; }
      if (s.kind === 'text') s.node.nodeValue = s.node.nodeValue.replace(s.node.nodeValue.trim(), tr);
      else if (s.kind === 'content') s.node.setAttribute('content', tr);
      else s.node.setAttribute(s.kind, tr);
    }
    if (missing.size) {
      console.error('FAIL ' + dir + ': ' + missing.size + ' untranslated segment(s); first few:');
      [...missing].slice(0, 5).forEach(k => console.error('   ' + JSON.stringify(k.slice(0, 90))));
      process.exit(1);
    }
    doc.documentElement.setAttribute('lang', langAttr);
    let out = dom.serialize();
    // Every substitution below says how many hits it expects: a silent miss
    // here ships a page that looks translated and links nowhere.
    const sub = (re, to, want, what) => {
      const n = (out.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length;
      if (n !== want) { console.error('FAIL ' + dir + ': ' + what + ' — expected ' + want + ' match(es), found ' + n); process.exit(1); }
      out = out.replace(re, to);
    };
    // one folder deep: every root-relative asset and page steps up
    out = out.replace(/(href="|src=")(?!https?:|\/\/|#|\.\.|mailto:)([a-z0-9_-]+\.(?:css|js|html|svg|webmanifest)|images\/|calendars\/)/g, '$1../$2');
    out = out.replace(/(url\()(images\/)/g, '$1../$2');
    // The picker is rebuilt rather than translated, and its links are written
    // from this folder's point of view, so they step up on their own.
    sub(/<details class="bl-language"[\s\S]*?<\/details>/, picker(PAGE, dir), 1, 'language picker');
    // The English page carries the full hreflang cluster and it came along in
    // the clone; drop it and write the one that belongs to this edition.
    out = out.replace(/[ \t]*<link rel="alternate" hreflang=[^\n]*\r?\n/g, '');
    sub(/  <link rel="icon"/, '  ' + cluster(PAGE) + '\n  <link rel="icon"', 1, 'hreflang cluster');
    // Arriving on /de/ is choosing German; the desk apps read it from there.
    sub(/<head>/, '<head>\n  ' + handoff(dir), 1, 'language handoff');
    sub(/<\/head>/, '<style>.bl-i18n-note{display:block;padding:10px 16px;font-size:11px;opacity:.7}</style></head>', 1, 'note css');
    sub(/<\/body>/, '<div class="bl-i18n-note">' + note + '</div></body>', 1, 'translated-from note');
    sub(/^<!DOCTYPE html>/i, '<!doctype html>\n<!-- i18n-src:PENDING -->', 1, 'fingerprint');
    fs.mkdirSync(path.join(REPO, dir), { recursive: true });
    fs.writeFileSync(path.join(REPO, dir, PAGE), out, 'utf8');
    console.log('  ok  ' + dir + '/' + PAGE);
  }
  console.log('run: node tools/dev/i18n-drift.js --stamp');
  process.exit(0);
}
console.error('unknown mode ' + MODE); process.exit(1);
