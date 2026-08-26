/* catalog.js — buyer-desk garden & DIY catalogue.
   Ships with partner.html only; cost-desk.html never loads it.
   Cost is shown as a movement index, never as money. No cart, no order, no login. */
(function () {
'use strict';

var C = window.BL_CATALOG;
if (!C || !C.products || (window.BL_DESK && window.BL_DESK !== 'buyer')) return;
var root = document.getElementById('bl-cat');
if (!root) return;

var LS = 'bl-cat';
var MARKETS = Object.keys(C.markets || {});
var AXES = Array.isArray(C.axes) ? C.axes : [];
var BY_ID = {};
C.products.forEach(function (p) { BY_ID[p.id] = p; });

var el = {};
['market', 'seg', 'stamp', 'mkt', 'rail', 'q', 'count', 'list', 'method',
 'detail', 'enq-list', 'enq-hint', 'enq-copy', 'enq-clear'].forEach(function (k) {
  el[k] = document.getElementById('cat-' + k);
});

/* ---- state ---------------------------------------------------------- */
function load() {
  var d = { market: MARKETS[0] || 'US', seg: 'home', axis: '', sub: '', q: '', pick: '', enq: [] };
  try {
    var s = JSON.parse(localStorage.getItem(LS) || '{}');
    Object.keys(d).forEach(function (k) { if (s[k] != null) d[k] = s[k]; });
  } catch (e) {}
  if (MARKETS.indexOf(d.market) < 0) d.market = MARKETS[0] || 'US';
  if (d.seg !== 'pro') d.seg = 'home';
  if (!Array.isArray(d.enq)) d.enq = [];
  d.enq = d.enq.filter(function (id) { return BY_ID[id]; });
  return d;
}
function save() { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} }
var st = load();

/* ---- helpers -------------------------------------------------------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function trendMark(t) {
  t = String(t || '').toLowerCase();
  if (t === 'up') return { s: '▲', c: 'cat-up' };
  if (t === 'down') return { s: '▼', c: 'cat-down' };
  return { s: '→', c: 'cat-flat' };
}
function idxCell(p, o) {
  var v = p.index && p.index[o];
  if (!v || v.value == null) return '<span class="cat-idx cat-na"><b>' + o + '</b>n/a</span>';
  var t = trendMark(v.trend);
  return '<span class="cat-idx ' + t.c + '" title="' + esc(v.reason || '') + '"><b>' + o + '</b>' +
         esc(v.value) + ' ' + t.s + '</span>';
}
function fit(p, m) {
  return (p.market_fit && p.market_fit[m || st.market]) || { score: 0, why: '' };
}
/* market_fit.why is stored as "score 3/5 — reason"; the dots already say the score. */
function fitWhy(p) { return String(fit(p).why || '').replace(/^score\s*\d\s*\/\s*5\s*[—–-]\s*/i, ''); }
function dots(n) {
  n = Math.max(0, Math.min(5, +n || 0));
  var s = '';
  for (var i = 1; i <= 5; i++) s += '<i class="' + (i <= n ? 'on' : '') + '"></i>';
  return '<span class="cat-fit" title="market fit ' + n + '/5" aria-label="market fit ' + n + ' of 5">' + s + '</span>';
}
function subLabel(p) {
  var a = axisOf(p.axis);
  if (!a || !a.subs) return '';
  for (var i = 0; i < a.subs.length; i++) if (a.subs[i].id === p.sub) return a.subs[i].label;
  return '';
}
function axisOf(id) {
  for (var i = 0; i < AXES.length; i++) if (AXES[i].id === id) return AXES[i];
  return null;
}

/* Shelf rule: a twin pair (home + pro) collapses to the one matching the shelf.
   A product with no twin is shown on both shelves, so coverage never drops. */
function inSeg(p) {
  return p.tier === st.seg || !p.alt_tier_id;
}
function inQuery(p, q) {
  if (!q) return true;
  var hay = [p.name, p.id, subLabel(p), (p.tags || []).join(' '), p.origin]
    .concat(Object.keys(p.specs || {}).map(function (k) { return k + ' ' + p.specs[k]; }))
    .join(' ').toLowerCase();
  return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
}
function pool() {
  var q = st.q.trim().toLowerCase();
  return C.products.filter(function (p) { return inSeg(p) && inQuery(p, q); });
}
function visible() {
  return pool().filter(function (p) {
    if (st.axis && p.axis !== st.axis) return false;
    if (st.sub && p.sub !== st.sub) return false;
    return true;
  }).sort(function (a, b) {
    return fit(b).score - fit(a).score || a.name.localeCompare(b.name);
  });
}

/* ---- step bar ------------------------------------------------------- */
function renderStep() {
  if (!el.market.options.length) {
    el.market.innerHTML = MARKETS.map(function (m) {
      return '<option value="' + m + '">' + esc(C.markets[m].name || m) + ' (' + m + ')</option>';
    }).join('');
  }
  el.market.value = st.market;
  [].forEach.call(el.seg.querySelectorAll('button'), function (b) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-seg') === st.seg));
  });
  el.stamp.innerHTML =
    'Cost index base <b>' + esc(C.meta.index_base) + ' = 100</b><br>' +
    'Updated <b>' + esc(C.meta.updated) + '</b><br>Indices only — no prices';

  var m = C.markets[st.market] || {};
  var bits = [
    ['Pallet', m.pallet], ['ISPM 15', m.ispm15 ? 'required' : 'not required'],
    ['Barcode', m.barcode], ['Packaging law', m.packaging_law],
    ['Label language', (m.lang || []).join(', ').toUpperCase()]
  ].filter(function (b) { return b[1]; }).map(function (b) {
    return '<span><i>' + esc(b[0]) + '</i>' + esc(b[1]) + '</span>';
  });
  if (m.marking) bits.push('<span class="cat-mkt-note"><i>Marking</i>' + esc(m.marking) + '</span>');
  if (m.notes) bits.push('<span class="cat-mkt-note"><i>Notes</i>' + esc(m.notes) + '</span>');
  el.mkt.innerHTML = bits.join('');
}

/* ---- rail ----------------------------------------------------------- */
function renderRail() {
  var p = pool(), html = '';
  html += '<button type="button" data-axis="" data-sub="" aria-current="' +
          (!st.axis ? 'true' : 'false') + '">All groups<em>' + p.length + '</em></button>';
  AXES.forEach(function (ax) {
    var n = p.filter(function (x) { return x.axis === ax.id; }).length;
    if (!ax.subs || !ax.subs.length) {
      html += '<div class="cat-soon">' + esc(ax.label) + ' · in preparation</div>';
      return;
    }
    html += '<button type="button" class="cat-axis" data-axis="' + esc(ax.id) + '" data-sub="" ' +
            'aria-current="' + (st.axis === ax.id && !st.sub ? 'true' : 'false') + '">' +
            esc(ax.label) + '<em>' + n + '</em></button>';
    if (st.axis !== ax.id) return;
    ax.subs.forEach(function (sb) {
      var k = p.filter(function (x) { return x.axis === ax.id && x.sub === sb.id; }).length;
      html += '<button type="button" class="cat-sub-btn" data-axis="' + esc(ax.id) + '" data-sub="' +
              esc(sb.id) + '" aria-current="' + (st.sub === sb.id ? 'true' : 'false') + '">' +
              esc(sb.label) + '<em>' + k + '</em></button>';
    });
  });
  el.rail.innerHTML = html;
}

/* ---- list ----------------------------------------------------------- */
function renderList() {
  var rows = visible();
  el.count.textContent = rows.length + (rows.length === 1 ? ' item' : ' items') +
                         ' · sorted by ' + st.market + ' fit';
  if (!rows.length) {
    el.list.innerHTML = '<li class="cat-empty">Nothing matches that filter. Clear the search or pick another group.</li>';
    return;
  }
  el.list.innerHTML = rows.map(function (p) {
    var on = st.enq.indexOf(p.id) >= 0;
    return '<li class="cat-row" role="option" data-id="' + esc(p.id) + '" aria-selected="' +
      (st.pick === p.id ? 'true' : 'false') + '">' +
      '<img src="' + esc(p.img) + '" alt="" loading="lazy" width="56" height="42">' +
      '<div><div class="cat-nm">' + esc(p.name) + '</div>' +
      '<div class="cat-why">' + esc(fitWhy(p)) + '</div>' +
      '<div class="cat-meta">' + dots(fit(p).score) +
      '<span class="cat-badge">' + esc(p.origin) + '</span>' +
      '<span class="cat-badge">' + (p.tier === 'pro' ? 'PRO' : 'DIY') + '</span>' +
      idxCell(p, 'TW') + idxCell(p, 'CN') + '</div></div>' +
      '<button type="button" class="cat-add" data-add="' + esc(p.id) + '" aria-pressed="' + on + '">' +
      (on ? 'On list' : '+ Add') + '</button></li>';
  }).join('');
}

/* ---- drawer --------------------------------------------------------- */
function renderDetail() {
  var p = BY_ID[st.pick];
  if (!p) {
    el.detail.innerHTML = '<h3>Pick a product</h3><p class="cat-hint">Specifications, cost index, ' +
      'packaging and close alternatives appear here.</p>';
    return;
  }
  var h = '<h3>' + esc(p.name) + '</h3>' +
    '<p class="cat-hint">' + esc(p.id) + ' · ' + esc(subLabel(p)) + ' · ' +
    (p.tier === 'pro' ? 'Professional' : 'Homeowner / DIY') + '</p>';

  h += '<h4>Specification</h4><dl>';
  Object.keys(p.specs || {}).forEach(function (k) {
    h += '<dt>' + esc(k) + '</dt><dd>' + esc(p.specs[k]) + '</dd>';
  });
  h += '</dl>';

  h += '<h4>Cost index · base ' + esc(C.meta.index_base) + ' = 100</h4>';
  ['TW', 'CN'].forEach(function (o) {
    var v = p.index && p.index[o];
    if (!v) return;
    var t = trendMark(v.trend);
    h += '<div class="' + t.c + '"><b>' + o + '</b> ' + esc(v.value) + ' ' + t.s + '</div>' +
         '<div class="cat-hint">' + esc(v.reason || '') + '</div>';
  });
  h += '<div class="cat-hint">Updated ' + esc(C.meta.updated) + '. Movement only — not a price.</div>';

  h += '<h4>Origin</h4><div>Made in ' + esc(p.origin) + '</div>' +
       '<div class="cat-hint">' + esc(p.why_origin) + '</div>';

  var vr = (p.variants || []).filter(function (v) { return v.market === st.market; });
  if (vr.length) {
    h += '<h4>' + esc(st.market) + ' shelf variant</h4><dl>';
    ['shape', 'blade', 'handle', 'length'].forEach(function (k) {
      if (vr[0][k]) h += '<dt>' + k + '</dt><dd>' + esc(vr[0][k]) + '</dd>';
    });
    h += '</dl><div class="cat-hint">' + esc(vr[0].why || '') +
         (vr[0].src ? ' (' + esc(vr[0].src) + ')' : '') + '</div>';
  }

  if (p.packaging && p.packaging.length) {
    h += '<h4>Packaging</h4><ul>' + p.packaging.map(function (x) {
      return '<li>' + esc(x) + '</li>';
    }).join('') + '</ul>';
  }

  var alts = [];
  if (p.alt_origin_id && BY_ID[p.alt_origin_id])
    alts.push([p.alt_origin_id, 'Same tool from ' + (p.alt_origin || BY_ID[p.alt_origin_id].origin)]);
  if (p.alt_tier_id && BY_ID[p.alt_tier_id])
    alts.push([p.alt_tier_id, BY_ID[p.alt_tier_id].tier === 'pro' ? 'Professional version' : 'Homeowner / DIY version']);
  if (alts.length) {
    h += '<h4>Alternatives</h4>' + alts.map(function (a) {
      return '<button type="button" class="cat-alt" data-go="' + esc(a[0]) + '">' +
             esc(a[1]) + ' — ' + esc(BY_ID[a[0]].name) + '</button>';
    }).join('');
  }
  if (p.elsewhere) h += '<h4>Where it sells</h4><div class="cat-hint">' + esc(p.elsewhere) + '</div>';

  h += '<button type="button" class="cat-alt" data-add="' + esc(p.id) + '">' +
       (st.enq.indexOf(p.id) >= 0 ? 'On the enquiry list' : 'Add to enquiry list') + '</button>';
  el.detail.innerHTML = h;
}

/* ---- enquiry list --------------------------------------------------- */
function renderEnq() {
  el['enq-list'].innerHTML = st.enq.map(function (id) {
    var p = BY_ID[id];
    return '<li><span>' + esc(p.name) + '<br><span class="cat-hint">' + esc(p.id) + ' · ' +
      esc(p.origin) + '</span></span><button type="button" data-drop="' + esc(id) +
      '" aria-label="Remove ' + esc(p.name) + '">×</button></li>';
  }).join('');
  el['enq-hint'].style.display = st.enq.length ? 'none' : '';
  el['enq-copy'].disabled = el['enq-clear'].disabled = !st.enq.length;
  if (el['enq-copy'].textContent !== 'Copy enquiry') el['enq-copy'].textContent = 'Copy enquiry';
}

function enqText() {
  var m = C.markets[st.market] || {};
  var L = [];
  L.push('BIRDLAND — ENQUIRY LIST');
  L.push('Market: ' + (m.name || st.market) + ' (' + st.market + ')   Shelf: ' +
         (st.seg === 'pro' ? 'Professional' : 'Homeowner / DIY'));
  L.push('Cost index base ' + C.meta.index_base + ' = 100, updated ' + C.meta.updated + '.');
  L.push('Indices show input-cost movement only. No prices are quoted or implied.');
  L.push('');
  L.push('SKU | PRODUCT | ORIGIN | TW IDX | CN IDX | QTY');
  st.enq.forEach(function (id) {
    var p = BY_ID[id], tw = (p.index || {}).TW || {}, cn = (p.index || {}).CN || {};
    L.push(p.id + ' | ' + p.name + ' | ' + p.origin + ' | ' +
           (tw.value != null ? tw.value + ' ' + (tw.trend || '') : 'n/a') + ' | ' +
           (cn.value != null ? cn.value + ' ' + (cn.trend || '') : 'n/a') + ' | ____');
    (p.packaging || []).forEach(function (x) { L.push('    ' + x); });
  });
  L.push('');
  L.push('Please quote the SKUs above against the packaging shown, or tell us what to change.');
  return L.join('\n');
}
function copyEnq() {
  var t = enqText(), done = function () {
    el['enq-copy'].textContent = 'Copied';
    setTimeout(renderEnq, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(done, fallback);
  } else fallback();
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { ta.style.opacity = '1'; return; }
    document.body.removeChild(ta);
  }
}

/* ---- wiring --------------------------------------------------------- */
function renderAll() { renderStep(); renderRail(); renderList(); renderDetail(); renderEnq(); }

el.market.addEventListener('change', function () {
  st.market = el.market.value; save(); renderStep(); renderList(); renderDetail();
});
el.seg.addEventListener('click', function (e) {
  var b = e.target.closest('button[data-seg]'); if (!b) return;
  st.seg = b.getAttribute('data-seg');
  if (st.pick && !inSeg(BY_ID[st.pick])) {
    var twin = BY_ID[st.pick].alt_tier_id;
    st.pick = twin && BY_ID[twin] ? twin : '';
  }
  save(); renderAll();
});
el.rail.addEventListener('click', function (e) {
  var b = e.target.closest('button[data-axis]'); if (!b) return;
  var ax = b.getAttribute('data-axis'), sb = b.getAttribute('data-sub');
  if (ax && ax === st.axis && !sb && !st.sub) { st.axis = ''; st.sub = ''; }
  else { st.axis = ax; st.sub = sb; }
  save(); renderRail(); renderList();
});
var qt;
el.q.addEventListener('input', function () {
  clearTimeout(qt);
  qt = setTimeout(function () { st.q = el.q.value; save(); renderRail(); renderList(); }, 140);
});
el.q.value = st.q;

function toggleEnq(id) {
  var i = st.enq.indexOf(id);
  if (i >= 0) st.enq.splice(i, 1); else st.enq.push(id);
  save(); renderList(); renderDetail(); renderEnq();
}
el.list.addEventListener('click', function (e) {
  var add = e.target.closest('[data-add]');
  if (add) { toggleEnq(add.getAttribute('data-add')); return; }
  var row = e.target.closest('.cat-row'); if (!row) return;
  st.pick = row.getAttribute('data-id'); save(); renderList(); renderDetail();
});
el.detail.addEventListener('click', function (e) {
  var go = e.target.closest('[data-go]');
  if (go) {
    var t = BY_ID[go.getAttribute('data-go')];
    st.pick = t.id;
    if (!inSeg(t)) st.seg = t.tier;
    if (st.axis && t.axis !== st.axis) { st.axis = ''; st.sub = ''; }
    else if (st.sub && t.sub !== st.sub) st.sub = '';
    save(); renderAll();
    return;
  }
  var add = e.target.closest('[data-add]');
  if (add) toggleEnq(add.getAttribute('data-add'));
});
el['enq-list'].addEventListener('click', function (e) {
  var d = e.target.closest('[data-drop]'); if (d) toggleEnq(d.getAttribute('data-drop'));
});
el['enq-copy'].addEventListener('click', copyEnq);
el['enq-clear'].addEventListener('click', function () {
  st.enq = []; save(); renderList(); renderDetail(); renderEnq();
});

el.method.textContent = C.meta.methodology || '';
renderAll();

/* ---- legacy buying tools, folded beneath the catalogue ---------------
   Done at runtime rather than in the template: this script only ships in
   buyer mode, so cost-desk.html keeps its original layout untouched. */
(function () {
  var main = document.querySelector('main.wrap');
  if (!main) return;
  ['#p-offers', '#p-alerts', '#p-mkt'].forEach(function (s) {
    var n = main.querySelector(s);
    if (n) n.style.display = 'none';   /* #p-mkt owns #room/#region — hide, never remove */
  });
  [].forEach.call(main.querySelectorAll('.bd-references'), function (n) { n.style.display = 'none'; });

  var det = document.createElement('details');
  det.className = 'cat-legacy';
  det.innerHTML = '<summary>Buying tools · landed cost, sailing time, duty, margin, reorder</summary>' +
    '<p class="cat-legacy-note">The original buyer desk, kept intact. Open it once you have a ' +
    'shortlist and want to model the landing side.</p><div class="cat-legacy-b"></div>';
  main.appendChild(det);
  var body = det.querySelector('.cat-legacy-b');
  [].slice.call(main.children).forEach(function (n) {
    if (n === root || n === det) return;
    body.appendChild(n);
  });
  det.addEventListener('toggle', function () {
    if (det.open) window.dispatchEvent(new Event('resize'));
  });
})();

})();
