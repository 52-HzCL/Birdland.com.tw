// One title bar for the four desk apps.
//
// The desks used to borrow the site header. Taking it away made each desk feel
// like its own app — and took its language picker, its way back and its way
// across with it, because nothing replaced the jobs that header was doing.
// This is that replacement: not a site header, an app's own chrome.
//
//   [icon] Cost Desk    <the desk's own status>    Language · A a · ⊞ · ⌂
//
// The status chips are ADOPTED, not rebuilt: each desk already renders its own
// (Source API and AI Narrative on the Buyer Desk, the source state on Daily
// Supply News, the Taipei clock everywhere), and they are already wired to
// their own scripts. Moving the nodes keeps that wiring intact; rebuilding
// them would have meant re-implementing four different feeds.
//
// Not pinned, deliberately. Daily Supply News sticks its edition index to the
// top of the viewport and the Buyer Desk sticks its rail; a second sticky bar
// would be a z-index argument with no winner.
(function () {
  'use strict';

  var APPS = [
    { key: 'news',  file: 'executive.html', name: 'Daily Supply News', desc: 'What changed' },
    { key: 'buyer', file: 'partner.html',   name: 'Buyer Desk',        desc: 'What you need' },
    { key: 'cost',  file: 'cost-desk.html', name: 'Cost Desk',         desc: 'What it costs' },
    { key: 'team',  file: 'team.html',      name: 'Team Desk',         desc: 'Internal' }
  ];

  // The launcher's icons, at title-bar size. Same drawings as the Terminal
  // tiles and the installed app icons, so the three agree.
  var ICON = {
    news: '<path d="M4 6h11v13H6a2 2 0 0 1-2-2z"/><path d="M15 9h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3"/><path d="M7 9h5M7 12h5M7 15h4"/>',
    buyer: '<path d="M9 4h6v3H9z"/><path d="M9 5.5H7a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5a2 2 0 0 0-2-2h-2"/><path d="M8.5 12.5l2 2 4.5-4.5"/>',
    cost: '<path d="M12 4.5v14M7 18.5h10"/><path d="M4.5 8h15"/><path d="M4.5 8v2M19.5 8v2"/><path d="M1.8 12.5a2.7 2.7 0 0 0 5.4 0M16.8 12.5a2.7 2.7 0 0 0 5.4 0"/>',
    team: '<path d="M6 10.5h12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18v-6A1.5 1.5 0 0 1 6 10.5z"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'
  };

  var svg = function (key, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[key] + '</svg>';
  };

  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // The preview server serves extensionless URLs, so /cost-desk has to resolve.
  var here = APPS.filter(function (a) { return a.file === file || a.file === file + '.html'; })[0];
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
        '<span class="ab-id">' + svg(here.key, 'ab-ico') + '<b>' + here.name + '</b></span>' +
        '<div class="ab-status"></div>' +
        '<div class="ab-act">' +
          '<details class="bl-language" data-language-picker><summary>Language</summary>' +
            '<div><select data-translate-select aria-label="Translate this page">' +
            '<option>Choose language&hellip;</option></select>' +
            '<small>Opens Google Translate in a new tab. No selection is stored.</small></div></details>' +
          '<details class="ab-switch"><summary aria-label="Switch desk"><i aria-hidden="true"></i>Desks</summary>' +
            '<div class="ab-apps">' +
              APPS.map(function (a) {
                return '<a href="' + a.file + '" data-app="' + a.key + '"' +
                  (a.key === here.key ? ' aria-current="page"' : '') + '>' +
                  svg(a.key, 'ab-tile') + '<b>' + a.name + '</b><small>' + a.desc + '</small></a>';
              }).join('') +
            '</div></details>' +
          '<a class="ab-home" href="index.html">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M4 11l8-6.5 8 6.5"/><path d="M6.5 10v9h11v-9"/></svg>Birdland</a>' +
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
      // The Buyer Desk's clock sits inside its office chip, which is itself a
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

    // Close either popover on an outside click, as the site header does.
    document.addEventListener('click', function (e) {
      [].forEach.call(bar.querySelectorAll('details[open]'), function (d) {
        if (!d.contains(e.target)) d.removeAttribute('open');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      [].forEach.call(bar.querySelectorAll('details[open]'), function (d) { d.removeAttribute('open'); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  // The Buyer Desk rewrites its own top strip after load; build again so the
  // bar cannot be left behind by a later script.
  window.addEventListener('load', build);
}());
