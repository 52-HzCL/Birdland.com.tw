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
const ORDER = ['nl', 'de', 'fr', 'es', 'pt-br', 'pl', 'it', 'ja', 'zh-tw'];
const HREFLANG = { nl: 'nl', de: 'de', fr: 'fr', es: 'es', 'pt-br': 'pt-BR', pl: 'pl', it: 'it', ja: 'ja', 'zh-tw': 'zh-Hant' };

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'SVG']);
const ATTRS = ['alt', 'title', 'aria-label'];
// Pure numbers, prices, ranges, glyphs — not language.
const NOT_TEXT = /^[\s\d.,%×x+\-–—·:;/()"'#&≈~↑↓▲▼■°*€$£¥]+$/u;

function segments(dom) {
  const doc = dom.window.document;
  const out = [];
  const walker = doc.createTreeWalker(doc.body, dom.window.NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    let p = n.parentElement, skip = false;
    for (; p; p = p.parentElement) if (SKIP_TAGS.has(p.tagName)) { skip = true; break; }
    if (skip) continue;
    const t = n.nodeValue.trim();
    if (t.length < 2 || NOT_TEXT.test(t)) continue;
    out.push({ kind: 'text', node: n, key: t.replace(/\s+/g, ' ') });
  }
  for (const el of doc.querySelectorAll('*')) {
    if (SKIP_TAGS.has(el.tagName)) continue;
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
    // one folder deep: every root-relative asset and page steps up
    out = out.replace(/(href="|src=")(?!https?:|\/\/|#|\.\.|mailto:)([a-z0-9_-]+\.(?:css|js|html|svg|webmanifest)|images\/|calendars\/)/g, '$1../$2');
    out = out.replace(/(url\()(images\/)/g, '$1../$2');
    // hreflang cluster + note css before the icon link
    const cluster = ['<link rel="alternate" hreflang="en" href="https://birdland.com.tw/' + PAGE + '">']
      .concat(ORDER.filter(d => d === dir || fs.existsSync(path.join(REPO, d, PAGE)) || fs.existsSync(path.join(REPO, 'i18n', 'page.' + NAME + '.' + d + '.json')))
        .map(d => '<link rel="alternate" hreflang="' + HREFLANG[d] + '" href="https://birdland.com.tw/' + d + '/' + PAGE + '">'))
      .concat(['<link rel="alternate" hreflang="x-default" href="https://birdland.com.tw/' + PAGE + '">']).join('');
    out = out.replace('</head>', cluster + '<style>.bl-i18n-note{display:block;padding:10px 16px;font-size:11px;opacity:.7}</style></head>');
    out = out.replace(/<\/body>/, '<div class="bl-i18n-note">' + note + '</div></body>');
    out = out.replace(/^<!DOCTYPE html>/i, '<!doctype html>\n<!-- i18n-src:PENDING -->');
    fs.mkdirSync(path.join(REPO, dir), { recursive: true });
    fs.writeFileSync(path.join(REPO, dir, PAGE), out, 'utf8');
    console.log('  ok  ' + dir + '/' + PAGE);
  }
  console.log('run: node tools/dev/i18n-drift.js --stamp');
  process.exit(0);
}
console.error('unknown mode ' + MODE); process.exit(1);
