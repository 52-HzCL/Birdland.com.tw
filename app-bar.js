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
