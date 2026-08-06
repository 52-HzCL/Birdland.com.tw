// The ten editions, in one place.
//
// The language list used to be written out four times: in i18n-build.js for the
// facade pages, in i18n-page.js for the Factory, and again in app-bar.js and
// desk-banner.js for the runtime pickers. Four copies of a list is four chances
// for the eleventh language to reach three of them.
//
// This is the one copy the build tools read. The two browser scripts cannot
// require() anything, so they still carry their own array — and i18n-build.js
// checks theirs against this one and goes red when they disagree.
//
// Everything here is derived from the files themselves: a language exists
// because i18n/facade.<dir>.json exists, and it is named the way that file
// names it.
'use strict';
const fs = require('fs');
const path = require('path');
const { REPO } = require('./_env');

// Display order for pickers and hreflang clusters. Missing files are skipped,
// so this works with two languages or with twenty.
const ORDER = ['nl', 'de', 'fr', 'es', 'pt-br', 'pl', 'it', 'ja', 'zh-tw'];
const HREFLANG = { nl: 'nl', de: 'de', fr: 'fr', es: 'es', 'pt-br': 'pt-BR', pl: 'pl', it: 'it', ja: 'ja', 'zh-tw': 'zh-Hant' };
const BASE = 'https://birdland.com.tw/';

const LANGS = ORDER
  .map(dir => path.join(REPO, 'i18n', 'facade.' + dir + '.json'))
  .filter(fs.existsSync)
  .map(f => JSON.parse(fs.readFileSync(f, 'utf8')));

// One hreflang cluster, indented to sit in a <head> that is indented by two.
function cluster(page) {
  const lines = ['<link rel="alternate" hreflang="en" href="' + BASE + page + '">'];
  for (const L of LANGS) lines.push('<link rel="alternate" hreflang="' + HREFLANG[L.dir] + '" href="' + BASE + L.dir + '/' + page + '">');
  lines.push('<link rel="alternate" hreflang="x-default" href="' + BASE + page + '">');
  return lines.join('\n  ');
}

// The folder picker: ten links, one per edition, relative to where the page
// sits. `current` is the language directory, or null for the English page at
// the root.
function picker(page, current) {
  const items = [current === null
    ? '<a href="' + page + '" aria-current="true">English</a>'
    : '<a href="../' + page + '" lang="en" hreflang="en">English</a>'];
  for (const L of LANGS) {
    if (L.dir === current) items.push('<a href="' + page + '" aria-current="true">' + L.name + '</a>');
    else items.push('<a href="' + (current === null ? '' : '../') + L.dir + '/' + page + '" lang="' + HREFLANG[L.dir] + '" hreflang="' + HREFLANG[L.dir] + '">' + L.name + '</a>');
  }
  return '<details class="bl-language" data-language-picker><summary>Language</summary><div>' + items.join('') + '</div></details>';
}

// Arriving on /de/ IS choosing German. Without this a reader who found the
// German page and then tapped through to a desk app got English back, because
// the desks read a stored preference and the folder was never one.
//
// Only translated pages carry it. The English pages at the root deliberately do
// not: an English page that cleared the key would undo a choice the reader made
// inside an app, and "I did not ask for anything" is not a choice.
function handoff(dir) {
  return '<script>try{localStorage.setItem("bl_lang","' + dir + '")}catch(e){}</script>';
}

module.exports = { ORDER, HREFLANG, BASE, LANGS, cluster, picker, handoff };
