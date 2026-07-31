// One buying context, asked once.
//
// The same question used to be asked in three places, and the three answers
// were stored in three keys that could disagree with each other:
//
//   Buyer Desk        bd_p_room / bd_p_region   commercial region + focus market
//   Landed cost       bd_bc_co                  destination country
//   Contact routing   bl_mr_region / bl_mr_line which desk the enquiry reaches
//
// So a buyer could set Europe on the desk, be quoted German duty by the
// calculator, and still have their enquiry routed to the Americas — three
// answers to one question, none of them wrong on its own.
//
// blCtx holds that answer once and everything else derives from it. The legacy
// keys are still written on every change, so any code that has not been rewired
// to read blCtx keeps working and keeps agreeing.
(function () {
  var KEY = 'bl_ctx';
  var DEF = { room: 'global', market: 'global', line: '' };

  // Commercial region -> the vocabulary contact routing speaks.
  var MAIL_REGION = { global: 'global', na: 'americas', latam: 'americas', europe: 'europe',
    mea: 'europe', asia: 'global', oceania: 'uk' };

  // Focus market -> landed-cost destination. Exact matches only. A market that
  // has no destination of its own (eu, me, sa, global) deliberately falls
  // through: quoting a buyer in "Europe" under some neighbour's VAT rate would
  // be a wrong number presented as a right one.
  var DEST = { us: 'us', de: 'de', nl: 'nl', it: 'it', uk: 'uk', au: 'au', fr: 'fr', pl: 'pl', es: 'es' };
  var MARKET_OF = {};
  Object.keys(DEST).forEach(function (m) { MARKET_OF[DEST[m]] = m; });

  var subs = [];
  var state = null;

  function clone(o) { return { room: o.room, market: o.market, line: o.line }; }

  function readStored() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var v = JSON.parse(raw);
        if (v && typeof v === 'object') return { room: v.room || DEF.room, market: v.market || DEF.market, line: v.line || '' };
      }
    } catch (e) { }
    return null;
  }

  // First run after this file ships: a returning buyer already has a workspace
  // in the old keys, so seed from them rather than resetting them to Global.
  function seedFromLegacy() {
    var s = clone(DEF);
    try {
      var r = localStorage.getItem('bd_p_room'); if (r) s.room = r;
      var m = localStorage.getItem('bd_p_region'); if (m) s.market = m;
      var l = localStorage.getItem('bl_mr_line'); if (l) s.line = l;
    } catch (e) { }
    return s;
  }

  function persist(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      localStorage.setItem('bd_p_room', s.room);
      localStorage.setItem('bd_p_region', s.market);
      localStorage.setItem('bl_mr_region', MAIL_REGION[s.room] || 'global');
      localStorage.setItem('bl_mr_line', s.line);
      var d = DEST[s.market];
      if (d) localStorage.setItem('bd_bc_co', d);
    } catch (e) { }
  }

  // Each subscriber is handed the state as it stands when its turn comes, not a
  // snapshot taken before the loop started. A subscriber is allowed to correct
  // the context from inside its own callback — the desk does exactly that when
  // a new region makes the current market impossible — and every subscriber
  // after it must see the correction, not the value that provoked it.
  function notify() {
    subs.slice().forEach(function (fn) { try { fn(clone(state)); } catch (e) { } });
  }

  state = readStored() || seedFromLegacy();
  // Write the mirror out at load, not only on change. A buyer who opens the
  // desk and changes nothing has still answered the question — the contact page
  // and the calculator should see that answer without waiting for an edit.
  persist(state);

  window.blCtx = {
    get: function () { return clone(state); },

    // Merge and announce. Subscribers must be idempotent: they are called for
    // their own writes too, which is what keeps two controls bound to the same
    // field from fighting each other.
    set: function (patch) {
      if (!patch) return clone(state);
      var next = clone(state), changed = false;
      ['room', 'market', 'line'].forEach(function (k) {
        if (patch[k] != null && patch[k] !== next[k]) { next[k] = patch[k]; changed = true; }
      });
      if (!changed) return clone(state);
      state = next;
      persist(state);
      notify();
      return clone(state);
    },

    on: function (fn) {
      if (typeof fn !== 'function') return function () { };
      subs.push(fn);
      try { fn(clone(state)); } catch (e) { }
      return function () { var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
    },

    // Destination country for the landed-cost calculator, or null when the
    // focus market does not name one country.
    destCountry: function () { return DEST[state.market] || null; },
    // The reverse: which focus market a destination country implies, if any.
    marketOf: function (country) { return MARKET_OF[country] || null; },
    mailRegion: function () { return MAIL_REGION[state.room] || 'global'; }
  };

  // A buyer with the desk open in one tab and the calculator in another should
  // not be working against two different contexts.
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    var v = readStored();
    if (!v) return;
    if (v.room === state.room && v.market === state.market && v.line === state.line) return;
    state = v;
    notify();
  });
}());
