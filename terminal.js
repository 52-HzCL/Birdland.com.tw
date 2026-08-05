// The Terminal — the four desks, as a path rather than a list.
//
// Bound to any [data-terminal] trigger, so the hand-written header and the one
// desk-banner.js injects share a single panel. Everything it shows comes from
// terminal.json, which the daily build regenerates from outlook-data.json and
// the desk templates — so the numbers here cannot disagree with the numbers on
// the desks.
//
// Nothing is fetched until it is needed: the index arrives when the panel first
// opens, and a single idle fetch sets the staleness dot. If terminal.json is
// missing or stale-shaped, the panel still opens and still navigates; it just
// has no live values and no search. A navigation aid must not depend on a data
// pipeline being healthy.
(function () {
  'use strict';
  var DATA = null, LOADING = null, dim, panel, input, results, chip;
  // The apps' own icons — the same drawings the browser installs to a home
  // screen and the same ones each desk shows in its title bar, so the tile you
  // tap and the app you arrive in are one object. Team is internal, has no
  // drawing of its own, and keeps the blueprint lock.
  var ICON = {
    news: '<img src="images/app-news-tile.png?v=20260805a" width="96" height="96" alt="" decoding="async">',
    buyer: '<img src="images/app-buyer-tile.png?v=20260805a" width="96" height="96" alt="" decoding="async">',
    cost: '<img src="images/app-cost-tile.png?v=20260805a" width="96" height="96" alt="" decoding="async">',
    team: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="14" width="18" height="13" rx="2"/><path d="M11 14v-4a5 5 0 0 1 10 0v4"/><path d="M16 19v4"/></svg>',
  };
  var STEPS = [
    ['WHAT CHANGED', 'ABrief', 'executive.html', 'news',
      'Steel, resin, freight and policy — what moved since your last order.'],
    ['WHAT YOU NEED', 'AsiaSource', 'partner.html', 'buyer',
      'Product family, part, material and process route, and the brief that comes out of it.'],
    ['WHAT IT COSTS', 'CostNow', 'cost-desk.html', 'cost',
      'Landed cost, retail margin, reorder timing, sailing and duty by origin.'],
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // "30 Jul 2026, 04:10 UTC" -> days since. Returns null when unparseable, and
  // null means "do not claim anything", not "assume fresh".
  function daysOld(updated) {
    if (!updated) return null;
    var t = Date.parse(String(updated).replace(' UTC', ' GMT'));
    if (!t || isNaN(t)) return null;
    return Math.floor((Date.now() - t) / 86400000);
  }

  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (LOADING) return LOADING;
    LOADING = fetch('terminal.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { DATA = j; return j; })
      .catch(function () { DATA = { updated: '', steps: {}, index: [] }; return DATA; });
    return LOADING;
  }

  function markStale() {
    var d = daysOld(DATA && DATA.updated);
    var stale = d != null && d >= 2;
    [].forEach.call(document.querySelectorAll('.tm-chip'), function (c) {
      c.classList.toggle('is-stale', stale);
      c.title = stale
        ? 'Terminal — edition ' + (DATA.updated || '') + ', ' + d + ' days old'
        : 'Terminal';
    });
    return { days: d, stale: stale };
  }

  function stepHTML() {
    return STEPS.map(function (st, i) {
      var cell =
        '<a class="tm-step" href="' + st[2] + '">' +
          '<span class="tm-ico' + (/^<img/.test(ICON[st[3]]) ? ' tm-ico-art' : '') + '">' + ICON[st[3]] + '</span>' +
          '<span class="tm-k">' + st[0] + '</span>' +
          '<span class="tm-name">' + esc(st[1]) + '</span>' +
          '<span class="tm-desc">' + esc(st[4]) + '</span>' +
        '</a>';
      if (i === STEPS.length - 1) return cell;
      return cell +
        '<span class="tm-arrow" aria-hidden="true"><svg width="26" height="9" viewBox="0 0 26 9" fill="none" stroke="#8FC7E8" stroke-width="1">' +
        '<path d="M0 4.5h22"/><path d="M18 1.2 25 4.5 18 7.8z" fill="#8FC7E8" stroke="none"/></svg></span>';
    }).join('');
  }

  function titleBlock() {
    var st = markStale();
    var ed = (DATA && DATA.updated) || 'unavailable';
    var note = st.stale ? esc(ed) + ' · ' + st.days + ' DAYS OLD' : esc(ed);
    return '<div class="tm-tb">' +
      '<div><small>DRAWING</small><b>BIRDLAND TERMINAL</b></div>' +
      '<div><small>ACCESS</small><b>NO ACCOUNT · NOTHING STORED</b></div>' +
      '<div><small>EDITION</small><b class="' + (st.stale ? 'stale' : '') + '">' + note + '</b></div>' +
      '</div>';
  }

  function build() {
    dim = document.createElement('div');
    dim.className = 'tm-dim';
    panel = document.createElement('div');
    panel.className = 'tm-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Birdland Terminal');
    panel.innerHTML =
      '<div class="tm-frame">' +
        '<div class="tm-srch">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(143,199,232,.6)" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>' +
          '<input type="search" autocomplete="off" spellcheck="false" aria-label="Search Birdland" placeholder="Search a material, a process, a section…">' +
          '<em>ESC</em>' +
        '</div>' +
        '<div class="tm-path">' + stepHTML() + '</div>' +
        '<a class="tm-aside" href="team.html">' +
          '<span class="tm-ico tm-ico-sm">' + ICON.team + '</span>' +
          '<span><span class="tm-name">Team Desk</span><span class="tm-desc">Internal dashboard — not on the buyer\'s path.</span></span>' +
          '<span class="fn">INTERNAL</span>' +
        '</a>' +
        '<div class="tm-results"></div>' +
        titleBlock() +
      '</div>';
    document.body.appendChild(dim);
    document.body.appendChild(panel);
    input = panel.querySelector('input');
    results = panel.querySelector('.tm-results');
    dim.addEventListener('click', close);
    input.addEventListener('input', function () { search(input.value); });
    panel.addEventListener('keydown', keys);
  }

  function place() {
    var head = document.getElementById('desk-banner') || document.querySelector('.bl-header');
    var top = head ? head.getBoundingClientRect().bottom : 80;
    panel.style.top = Math.max(12, Math.round(top) + 14) + 'px';
  }

  function open(trigger) {
    load().then(function () {
      if (!panel) build();
      else { panel.querySelector('.tm-path').innerHTML = stepHTML(); refreshTitleBlock(); }
      chip = trigger;
      document.documentElement.classList.add('tm-open');
      place();
      requestAnimationFrame(function () { dim.classList.add('on'); panel.classList.add('on'); });
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      input.value = ''; search('');
      setTimeout(function () { input.focus(); }, 30);
    });
  }

  function refreshTitleBlock() {
    var old = panel.querySelector('.tm-tb');
    if (!old) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = titleBlock();
    old.parentNode.replaceChild(wrap.firstChild, old);
  }

  function close() {
    if (!panel) return;
    dim.classList.remove('on'); panel.classList.remove('on');
    document.documentElement.classList.remove('tm-open');
    if (chip) { chip.setAttribute('aria-expanded', 'false'); chip.focus(); }
  }

  // ── search ───────────────────────────────────────────────────────────
  // Substring, ranked: a name that starts with the query beats one that merely
  // contains it, and a name beats a description. No fuzzy matching — a buyer
  // typing a steel grade wants that grade, not something that looks like it.
  function score(entry, q) {
    var n = entry.n.toLowerCase(), d = (entry.d || '').toLowerCase();
    if (n === q) return 0;
    if (n.indexOf(q) === 0) return 1;
    if (n.indexOf(q) > 0) return 2;
    if (d.indexOf(q) >= 0) return 3;
    return -1;
  }
  var ORDER = ['MATERIAL', 'PROCESS', 'TOOL', 'SECTION', 'PAGE', 'SIGNAL'];

  function search(q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) {
      panel.classList.remove('searching');
      results.innerHTML = '';
      return;
    }
    panel.classList.add('searching');
    var hits = ((DATA && DATA.index) || [])
      .map(function (e) { return { e: e, s: score(e, q) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return a.s - b.s || ORDER.indexOf(a.e.t) - ORDER.indexOf(b.e.t); })
      .slice(0, 24);

    if (!hits.length) {
      results.innerHTML = '<div class="tm-none">No match for “' + esc(q) + '”. ' +
        'Try a material grade, a process name, or a Factory section.</div>';
      return;
    }
    var out = '', group = '';
    hits.forEach(function (x, i) {
      if (x.e.t !== group) { group = x.e.t; out += '<div class="tm-sec">' + esc(group) + '</div>'; }
      out += '<a class="tm-hit' + (i === 0 ? ' on' : '') + '" href="' + esc(x.e.u) + '">' +
        '<span class="tm-tag">' + esc(x.e.t) + '</span>' +
        '<span><b>' + hi(x.e.n, q) + '</b><span class="tm-desc">' + esc(x.e.d) + '</span></span>' +
        '<span class="go">↵ ' + esc(dest(x.e.u)) + '</span></a>';
    });
    results.innerHTML = out;
  }
  function hi(name, q) {
    var i = name.toLowerCase().indexOf(q);
    if (i < 0) return esc(name);
    return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length));
  }
  function dest(u) {
    var f = String(u).split('?')[0].split('#')[0];
    return ({
      'executive.html': 'ABRIEF', 'partner.html': 'ASIASOURCE', 'cost-desk.html': 'COSTNOW',
      'team.html': 'TEAM DESK', 'guide.html': 'GUIDE', 'product-101.html': 'FACTORY',
      'about.html': 'ABOUT', 'contact.html': 'CONTACT',
    })[f] || f.replace('.html', '').toUpperCase();
  }

  function keys(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
    var hits = [].slice.call(panel.querySelectorAll('.tm-hit'));
    if (!hits.length) return;
    var at = hits.findIndex(function (h) { return h.classList.contains('on'); });
    if (e.key === 'Enter') { e.preventDefault(); (hits[at] || hits[0]).click(); return; }
    e.preventDefault();
    hits.forEach(function (h) { h.classList.remove('on'); });
    var next = e.key === 'ArrowDown' ? (at + 1) % hits.length : (at - 1 + hits.length) % hits.length;
    hits[next].classList.add('on');
    hits[next].scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-terminal]');
    if (!t) return;
    e.preventDefault();
    if (document.documentElement.classList.contains('tm-open')) close(); else open(t);
  });
  window.addEventListener('resize', function () { if (panel && panel.classList.contains('on')) place(); });

  // One idle fetch so the dot can tell the truth before anyone opens anything.
  function idle(fn) {
    if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 4000 });
    else setTimeout(fn, 1800);
  }
  window.addEventListener('load', function () {
    if (!document.querySelector('[data-terminal]')) return;
    idle(function () { load().then(markStale); });
  });
}());
