// One title bar for the four desk apps.
//
// The desks used to borrow the site header. Taking it away made each desk feel
// like its own app — and took its language picker, its way back and its way
// across with it, because nothing replaced the jobs that header was doing.
// This is that replacement: not a site header, an app's own chrome.
//
//   [icon] CostNow    <the desk's own status>    Language · A a · ⊞ · ⌂
//
// The status chips are ADOPTED, not rebuilt: each desk already renders its own
// (Source API and AI Narrative on AsiaSource, the source state on Daily
// Supply News, the Taipei clock everywhere), and they are already wired to
// their own scripts. Moving the nodes keeps that wiring intact; rebuilding
// them would have meant re-implementing four different feeds.
//
// Not pinned, deliberately. ABrief sticks its edition index to the
// top of the viewport and AsiaSource sticks its rail; a second sticky bar
// would be a z-index argument with no winner.
(function () {
  'use strict';

  // The three public desks carry their own drawn icon — the same picture the
  // browser puts on the home screen when one is installed, so the switch in
  // the bar and the icon on the phone are the same object. The Team Desk is
  // internal, has no icon of its own, and stays off the switch; it is reached
  // from the Terminal, which is where the internal doors live.
  var APPS = [
    { key: 'news',  file: 'executive.html', name: 'ABrief', desc: 'supply news, every morning' },
    { key: 'buyer', file: 'partner.html',   name: 'AsiaSource',        desc: "the buyer's handbook" },
    { key: 'cost',  file: 'cost-desk.html', name: 'CostNow',         desc: 'landed cost & margin' }
  ];
  var TEAM = { key: 'team', file: 'team.html', name: 'Team Desk', desc: 'Internal' };

  // One number for the whole suite. It is on the launch screen, on the chip in
  // the bar, and on the card the chip opens — three places, one source.
  var VERSION = '3.0';

  var ICON_V = '20260805a';
  function tile(key, cls) {
    return '<img class="' + cls + '" src="images/app-' + key + '-tile.png?v=' + ICON_V +
      '" width="36" height="36" alt="" decoding="async">';
  }
  // Team has no drawing, so it keeps the launcher's line glyph.
  function lock(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M6 10.5h12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18v-6A1.5 1.5 0 0 1 6 10.5z"/>' +
      '<path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
  }

  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // The preview server serves extensionless URLs, so /cost-desk has to resolve.
  var match = function (a) { return a.file === file || a.file === file + '.html'; };
  var here = APPS.filter(match)[0] || (match(TEAM) ? TEAM : null);
  if (!here) return;

  // Whatever the desk used as a top strip before it was an app. Hidden rather
  // than removed: their contents are adopted below, and a node that is still
  // in the document is a node whose script has not lost its element.
  // The Team Desk's strip is an unclassed <header>; this bar is a <header>
  // too, hence the :not().
  var OLD_BARS = '.topbar,header.top,.terminal-strip,body>header:not(#app-bar)';
  // Everything in those strips that this bar now owns. The Team Desk's dark
  // toggle and its "AI updated" stamp are real controls, so they move here
  // rather than going dark with the row they were sitting in — both are
  // styled by class, so they arrive dressed.
  var ADOPT = '.sysgrp,#source-state,[data-hq-status],[data-taipei-time],#tstamp';
  var ADOPT_ACT = '.thm';
  // The dead Google Translate shell goes: nothing on this site ever loaded
  // the Google script, so that control has never done anything. The loose
  // back-links go too — this bar is the way back now.
  var DROP = '.language-box,.tpk-hol,a.back,[data-language-picker]';

  // ---- the launch screen ----------------------------------------------------
  // An app you tap should answer immediately, even before it has anything to
  // show. This is that answer: the same icon the home screen holds, the app's
  // name, and the build — held for a beat after load, then gone.
  //
  // Three rules keep it from becoming a nuisance. Once per session per app, so
  // moving between desks does not replay it. Never under reduced motion, where
  // a fade is the thing the reader asked not to see. And a hard 1.5s ceiling:
  // if the page is slow, the splash is the first thing to give way, never a
  // sheet the reader has to wait out.
  function splash() {
    if (!document.body || document.getElementById('ab-splash')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    var seenKey = 'ab-splash-' + here.key;
    try {
      if (sessionStorage.getItem(seenKey)) return;
      sessionStorage.setItem(seenKey, '1');
    } catch (e) { /* private mode: show it, do not track it */ }

    var el = document.createElement('div');
    el.id = 'ab-splash';
    el.className = 'ab-splash';
    el.dataset.app = here.key;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="ab-splash-in">' +
        (here === TEAM ? lock('ab-splash-ico ab-splash-ico-line') : tile(here.key, 'ab-splash-ico')) +
        '<b>' + here.name + '</b>' +
        '<small>v' + VERSION + ' &middot; Birdland</small>' +
      '</div>';
    document.body.appendChild(el);

    var done = false;
    function drop() {
      if (done) return;
      done = true;
      el.className += ' is-out';
      setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 420);
    }
    setTimeout(drop, 1500);                      // the ceiling, always armed
    if (document.readyState === 'complete') setTimeout(drop, 600);
    else window.addEventListener('load', function () { setTimeout(drop, 600); });
  }
  splash();

  // ---- data freshness -------------------------------------------------------
  // Every desk reads from the same nightly terminal file. Saying when that file
  // was written is the difference between a page and an edition — and when the
  // fetch cannot be made, saying so plainly beats showing a stale time as if it
  // were live.
  var freshState = 'wait';   // wait | ok | off
  var freshText = '';

  // "04 Aug 2026, 04:17 UTC" -> "04 Aug 04:17 UTC". The year is the one part a
  // reader checking freshness never needs.
  function shortStamp(s) {
    var m = /^\s*(\d{1,2}\s+[A-Za-z]{3})\s+\d{4},\s*(.+?)\s*$/.exec(s || '');
    return m ? m[1] + ' ' + m[2] : (s || '').trim();
  }

  function paintFresh() {
    var chip = document.querySelector('#app-bar .ab-fresh');
    if (!chip) return;
    var t = chip.querySelector('.ab-fresh-t');
    chip.setAttribute('data-state', freshState);
    if (freshState === 'ok') {
      t.textContent = 'Data · ' + freshText;
      chip.title = 'Data edition of ' + freshText;
    } else if (freshState === 'off') {
      t.textContent = 'Offline · cached edition';
      chip.title = 'No connection to the data feed; showing the cached edition.';
    } else {
      t.textContent = 'Data · …';
      chip.title = 'Checking the data edition…';
    }
  }

  // Fired once, off to the side. The bar is built whether or not this ever
  // resolves; the chip starts as a placeholder and is filled in later.
  function loadFresh() {
    function fail() { freshState = 'off'; paintFresh(); }
    if (navigator.onLine === false || typeof fetch !== 'function') return fail();
    try {
      fetch('terminal.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) {
          var s = shortStamp(j && j.updated);
          if (!s) throw new Error('no stamp');
          freshState = 'ok';
          freshText = s;
          paintFresh();
        })
        .catch(fail);
    } catch (e) { fail(); }
  }
  loadFresh();

  // ---- what's new -----------------------------------------------------------
  // Short enough to read standing up. Three lines is a release note; ten is a
  // changelog, and a changelog belongs on a page, not in a popover.
  var NOTES = [
    'New names: ABrief, AsiaSource, CostNow',
    'One workspace on CostNow — enter your shipment once',
    'Faster start: instant app launch screens'
  ];

  function chips() {
    return '<div class="ab-chips">' +
      '<span class="ab-chip ab-fresh" data-state="wait" title="Checking the data edition&hellip;">' +
        '<i class="ab-dot" aria-hidden="true"></i>' +
        '<span class="ab-fresh-t">Data &middot; &hellip;</span>' +
      '</span>' +
      '<span class="ab-verwrap">' +
        '<button type="button" class="ab-chip ab-ver" aria-expanded="false" ' +
          'aria-haspopup="dialog" aria-controls="ab-whatsnew" title="What\'s new in v' + VERSION + '">' +
          'v' + VERSION + '</button>' +
        '<div class="ab-whats" id="ab-whatsnew" role="dialog" aria-label="What\'s new" hidden>' +
          '<h2>What\'s new</h2><ul>' +
          NOTES.map(function (n) { return '<li>' + n + '</li>'; }).join('') +
          '</ul><p class="ab-whats-v">v' + VERSION + ' &middot; Birdland</p>' +
        '</div>' +
      '</span>' +
    '</div>';
  }

  function wireVersion(bar) {
    var btn = bar.querySelector('.ab-ver');
    var pop = bar.querySelector('.ab-whats');
    if (!btn || !pop) return;
    function open(on) {
      pop.hidden = !on;
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      open(pop.hidden);
    });
    document.addEventListener('click', function (e) {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) open(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) { open(false); btn.focus(); }
    });
  }

  function build() {
    if (document.getElementById('app-bar')) return;

    var bar = document.createElement('header');
    bar.id = 'app-bar';
    bar.className = 'ab';
    bar.setAttribute('role', 'banner');
    bar.dataset.app = here.key;
    bar.innerHTML =
      '<div class="ab-in">' +
        '<span class="ab-id">' +
          (here === TEAM ? lock('ab-ico ab-ico-line') : tile(here.key, 'ab-ico')) +
          '<b>' + here.name + '</b></span>' +
        '<div class="ab-status"></div>' +
        // The bar's own two chips. They sit outside .ab-status because that
        // slot holds the desks' adopted chips and is dropped below 900px;
        // these two are the app's own vitals and stay at every width.
        chips() +
        '<div class="ab-act">' +
          '<details class="bl-language" data-language-picker><summary>Language</summary>' +
            '<div><select data-translate-select aria-label="Translate this page">' +
            '<option>Choose language&hellip;</option></select>' +
            '<small>Opens Google Translate in a new tab. No selection is stored.</small></div></details>' +
          // The switch: the apps themselves, sitting in a well. No menu to
          // open — three icons are shorter to read than the word "Desks" and
          // one click closer than a dropdown.
          '<nav class="ab-dock" aria-label="Desk apps">' +
            APPS.map(function (a) {
              var on = a.key === here.key;
              return '<a class="ab-app" href="' + a.file + '" data-app="' + a.key + '"' +
                (on ? ' aria-current="page"' : '') +
                ' title="' + a.name + ' · ' + a.desc + '">' +
                tile(a.key, 'ab-app-ico') +
                '<span class="ab-app-name">' + a.name + '</span></a>';
            }).join('') +
          '</nav>' +
          '<a class="ab-home" href="index.html">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M4 11l8-6.5 8 6.5"/><path d="M6.5 10v9h11v-9"/></svg>' +
            '<span>Birdland</span></a>' +
        '</div>' +
      '</div>';

    document.documentElement.className += ' ab-ready';
    document.body.insertBefore(bar, document.body.firstChild);

    // Drop before adopting. The Team Desk keeps its language picker INSIDE its
    // office-status span, so adopting that span first carried the old picker
    // into this bar — two pickers, and text-size.js anchored itself to the
    // wrong one.
    [].forEach.call(document.querySelectorAll(DROP), function (n) {
      if (bar.contains(n)) return;
      n.parentNode && n.parentNode.removeChild(n);
    });

    // Then adopt, and only then hide: a chip still inside the old strip when
    // it goes dark goes dark with it.
    var slot = bar.querySelector('.ab-status');
    var found = [].filter.call(document.querySelectorAll(ADOPT), function (n) { return !bar.contains(n); });
    found
      // AsiaSource's clock sits inside its office chip, which is itself a
      // match. Move the outermost node only, or the inner one is torn out of
      // the chip it belongs to.
      .filter(function (n) { return !found.some(function (o) { return o !== n && o.contains(n); }); })
      .forEach(function (n) { slot.appendChild(n); });
    var act = bar.querySelector('.ab-act');
    [].forEach.call(document.querySelectorAll(ADOPT_ACT), function (n) {
      if (!bar.contains(n)) act.insertBefore(n, act.firstChild);
    });
    [].forEach.call(document.querySelectorAll(OLD_BARS), function (n) {
      if (bar.contains(n)) return;
      n.style.display = 'none';
    });

    // The chips are built with the bar, so they are wired with it — and if the
    // freshness fetch already resolved while the DOM was still parsing, the
    // placeholder is replaced on the spot rather than waiting for a second
    // answer that is never coming.
    wireVersion(bar);
    paintFresh();

    // The language picker is the only thing left that opens.
    document.addEventListener('click', function (e) {
      var d = bar.querySelector('details[open]');
      if (d && !d.contains(e.target)) d.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      [].forEach.call(bar.querySelectorAll('details[open]'), function (d) { d.removeAttribute('open'); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  // AsiaSource rewrites its own top strip after load; build again so the
  // bar cannot be left behind by a later script.
  window.addEventListener('load', build);
}());
