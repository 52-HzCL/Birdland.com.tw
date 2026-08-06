// The apps, in the reader's language.
//
// The facade pages ship nine static editions, one folder per language, because
// their words are in the HTML and never change. The four desk apps cannot work
// that way: their words are half markup and half script, and the half that is
// script rewrites itself all day from outlook-data.json. Nine copies of
// cost-desk.html would be nine copies of a 570 KB artifact that goes stale the
// moment a panel re-renders.
//
// So the apps translate at run time instead. One dictionary per language —
// i18n/app.<lang>.json, English string in, translated string out — applied to
// the document after it is built and again every time a desk rebuilds a panel.
//
// Two rules keep this from becoming a translation layer nobody can reason about:
//
//   1. Fixed chrome only. Every key in the dictionary is a label, heading,
//      button or disclaimer that was written by hand into a template. Nothing
//      that comes out of outlook-data.json or terminal.json is in there — the
//      day's steel price, a headline, a material grade and a port name are the
//      same words in every edition, and a buyer who reads a German page still
//      needs to recognise "SK5" and "Rotterdam".
//
//   2. Exact match, or nothing. A text node is translated when its trimmed
//      contents are exactly a key. No substring replacement, no interpolation,
//      no guessing — which is why a number never gets caught in the middle of a
//      sentence, and why "Duty" the column heading cannot rewrite "Duty" inside
//      a story.
//
// With no bl_lang stored, this file reads localStorage once and returns. The
// English experience is byte-for-byte what it was before the file existed.
(function () {
  'use strict';

  var KEY = 'bl_lang';

  var lang;
  try { lang = localStorage.getItem(KEY); } catch (e) { lang = null; }
  if (!lang || lang === 'en') return;
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(lang)) return;   // never build a URL from junk

  // Pages live at the root and one folder deep in /de/, /ja/ and the rest, so
  // the dictionary is found relative to this script rather than to the page.
  // Same resolution terminal.js uses; on a root page BASE is ''.
  var BASE = (function () {
    try {
      var el = document.querySelector('script[src*="i18n.js"]');
      var u = new URL(el.getAttribute('src'), location.href).href;
      var root = u.replace(/i18n\.js[^\/]*$/, '');
      var here = location.href.replace(/[^\/]*$/, '');
      return root === here ? '' : root;
    } catch (e) { return ''; }
  })();

  var DICT = null;
  // A node is walked once. The desks re-render whole panels rather than editing
  // text in place, so the nodes that come back are new nodes; the ones that
  // stayed do not need a second look.
  var seenText = new WeakSet();
  var seenAttr = new WeakMap();

  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, TEXTAREA: 1, NOSCRIPT: 1, TITLE: 1, PRE: 1 };
  var ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];

  function translateText() {
    var walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (seenText.has(n)) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (!p || SKIP[p.nodeName]) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node, batch = [];
    while ((node = walker.nextNode())) batch.push(node);
    batch.forEach(function (n) {
      seenText.add(n);
      var raw = n.nodeValue;
      var t = raw.trim();
      if (!t) return;
      var hit = DICT[t];
      if (!hit) return;
      // Whitespace around a label is layout — "Language " next to a chevron
      // keeps its space, and a label indented in the source keeps its indent.
      var lead = raw.slice(0, raw.indexOf(t[0]));
      var tail = raw.slice(lead.length + t.length);
      n.nodeValue = lead + hit + tail;
    });
  }

  function translateAttrs() {
    var els = document.querySelectorAll('[alt],[title],[aria-label],[placeholder]');
    [].forEach.call(els, function (el) {
      var done = seenAttr.get(el);
      if (!done) { done = {}; seenAttr.set(el, done); }
      ATTRS.forEach(function (a) {
        if (done[a]) return;
        var v = el.getAttribute(a);
        if (v == null) return;
        done[a] = 1;
        var hit = DICT[v.trim()];
        if (hit) el.setAttribute(a, hit);
      });
    });
  }

  function run() {
    if (!DICT) return;
    try {
      translateText();
      translateAttrs();
    } catch (e) { /* a half-translated page beats a thrown error on a desk */ }
  }

  // A desk that rebuilds a panel does it in one burst of mutations, not one per
  // node. Debouncing turns that burst into a single pass; 150ms is long enough
  // to catch a re-render and short enough that nobody watches English become
  // German.
  var timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(function () { timer = null; run(); }, 150);
  }

  function start() {
    run();
    if (typeof MutationObserver !== 'function') return;
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }

  fetch(BASE + 'i18n/app.' + lang + '.json', { cache: 'force-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      DICT = j;
      // The document's own language is part of the answer: it is what a screen
      // reader switches voice on, and what hyphenation and quotation marks key
      // off. The dictionary carries it so the file that knows the language is
      // the file that declares it.
      var tag = j['@lang'] || lang;
      delete DICT['@lang'];
      try { document.documentElement.setAttribute('lang', tag); } catch (e) {}
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else start();
      // The desks finish drawing on load; ABrief's edition strip and the
      // AsiaSource rail are both built there.
      window.addEventListener('load', schedule);
    })
    .catch(function () { /* no dictionary, no translation, no broken page */ });
}());
