/* costnow-harness.js
 *
 * PURE EXTRACTION — no logic changes, no refactors, no bug fixes.
 *
 * Source of truth: tools/partner_template.html (do not edit that file from
 * here; if the calculator logic changes there, re-copy it into this file).
 *
 * Everything inside computeLanded() / computeTariffCompare() below is copied
 * VERBATIM (character-for-character, including the original variable names,
 * comments removed only where they referenced DOM ids that are now function
 * params) from these line ranges in tools/partner_template.html as read on
 * 2026-08-18:
 *
 *   - CO table (destination duty/VAT defaults + notes)........ lines 2521-2531
 *   - applyCo()  (duty/tax field prefill from CO) .............. line  2555
 *   - landed()   (the CostNow / landed-cost calculator) ........ lines 2556-2585
 *   - money()/n() helper functions .............................. line  2518-2519
 *   - tariff_calc pct()/keyFor() duty-compare helpers .......... lines 2642-2656
 *     (note: these depend on T.destinations, which comes from data.json's
 *     `tariff_calc` block at runtime, NOT from a constant in the template —
 *     there is nothing to snapshot for it here besides the pure functions;
 *     they are included because they participate in the same "landed cost /
 *     duty" calculation surface asked for in the task)
 *
 * SHIM NOTES (the only non-verbatim lines in this file, all marked SHIM):
 *   - In the template, landed()/applyCo() read directly from DOM elements
 *     via $('bc_fob') etc. and write results back into the DOM (bc_total,
 *     bc_out, ws_retail, ...). Here computeLanded(inputs) instead takes a
 *     plain object of the same field values as parameters, and returns a
 *     plain result object instead of writing to bc_bar/bc_leg/bc_out/etc.
 *     The arithmetic itself (every line that produces a number) is untouched
 *     copy-paste from landed() in the template.
 *   - Retail-card math (ws_retail/ws_gp block, template lines 2574-2583) is
 *     kept but takes marginPct as a parameter instead of reading #ws_mg.
 *   - HTML-building lines (bc_bar innerHTML, bc_leg innerHTML, bc_out
 *     innerHTML, ws_mg_out innerHTML) are omitted since they are pure
 *     string/DOM rendering with no computational content; the underlying
 *     numeric values they would have rendered (segs, cif, custVal, dutyAmt,
 *     taxAmt, fees, total, per, up) are all returned instead.
 */

'use strict';

// ===== Verbatim from tools/partner_template.html line 2519 =====
function money(x) { return 'US$' + Math.round(x).toLocaleString(); }

// ===== Verbatim from tools/partner_template.html lines 2521-2531 =====
// CO={iso: [displayName, dutyPct, taxPct, taxLabel, customsValueBasis('fob'|'cif'), note]}
var CO = {
  us: ['USA', 0, 0, '', 'fob', 'US customs value = FOB; no VAT. Instead MPF 0.3464% (US$33.58–651.50, FY2026) + HMF 0.125%. Rates vary by HS/FTA — verify with customs.'],
  de: ['Germany', 1.7, 19, 'VAT', 'cif', 'EU customs value = CIF; VAT on CIF + duty. Hand-tool duty ~0–2.7% by HS — verify with customs.'],
  nl: ['Netherlands', 1.7, 21, 'VAT', 'cif', 'EU customs value = CIF; VAT on CIF + duty.'],
  it: ['Italy', 1.7, 22, 'VAT', 'cif', 'EU customs value = CIF; VAT on CIF + duty.'],
  fr: ['France', 1.7, 20, 'VAT', 'cif', 'EU customs value = CIF; VAT on CIF + duty.'],
  es: ['Spain', 1.7, 21, 'VAT', 'cif', 'EU customs value = CIF; VAT on CIF + duty.'],
  pl: ['Poland', 1.7, 23, 'VAT', 'cif', 'EU customs value = CIF; VAT on CIF + duty.'],
  uk: ['United Kingdom', 0, 20, 'VAT', 'cif', 'UK customs value = CIF; VAT on CIF + duty.'],
  au: ['Australia', 5, 10, 'GST', 'cif', 'GST on CIF + duty; often reduced under FTA — verify with customs.'],
  nz: ['New Zealand', 0, 15, 'GST', 'cif', 'GST on CIF + duty.'],
  jp: ['Japan', 0, 10, 'Consumption tax', 'cif', 'Consumption tax on CIF + duty.']
};

// ===== Verbatim from tools/partner_template.html line 2555 (applyCo) =====
// SHIM: original reads sel.value from DOM (#bc_co) and writes #bc_duty/#bc_tax/
// #bc_taxL/#bc_note. Here it takes iso directly and returns the prefill values
// instead of writing them to elements. The lookup itself (`var c=CO[sel.value]`)
// is unchanged logic, just renamed input.
function applyCo(iso) {
  var c = CO[iso];
  return {
    bc_duty: c[1],
    bc_tax: c[2],
    bc_taxL: (c[3] || 'Import tax') + ' %',
    bc_note: c[5]
  };
}

// ===== Verbatim from tools/partner_template.html lines 2556-2585 (landed) =====
// SHIM: original is `function landed(){if(!sel)return;var c=CO[sel.value],
// fob=n('bc_fob'),qty=n('bc_qty'),frt=n('bc_frt'),insR=n('bc_ins')/100,
// duty=n('bc_duty')/100,tax=n('bc_tax')/100; ...}` reading 10 DOM inputs
// (#bc_co selection + #bc_fob/#bc_qty/#bc_frt/#bc_ins/#bc_duty/#bc_tax/
// #bc_brk/#bc_inl/#bc_oth/#ws_mg) and writing DOM output (#bc_bar/#bc_leg/
// #bc_total/#bc_unit/#bc_uplift/#bc_out/#ws_retail/#ws_gp/#ws_mgnote/
// #ws_mg_out). Here computeLanded(inputs) takes those same field values as
// object properties and returns a result object instead. Every arithmetic
// expression below (ins, cif, custVal, dutyAmt, taxAmt, mpf, hmf, fees,
// total, per, up, segs, retail/gp math) is copied unchanged from the
// template — only the source of the numbers (params vs DOM) and the sink of
// the results (return object vs innerHTML) differ.
function computeLanded(inputs) {
  var isoValue = inputs.bc_co; // SHIM: was sel.value
  var c = CO[isoValue];
  if (!c) return null; // SHIM: was `if(!sel)return;`

  var fob = Number(inputs.bc_fob) || 0;
  var qty = Number(inputs.bc_qty) || 0;
  var frt = Number(inputs.bc_frt) || 0;
  var insR = (Number(inputs.bc_ins) || 0) / 100;
  var duty = (Number(inputs.bc_duty) || 0) / 100;
  var tax = (Number(inputs.bc_tax) || 0) / 100;

  var ins = (fob + frt) * insR, cif = fob + frt + ins, custVal = c[4] === 'fob' ? fob : cif, dutyAmt = custVal * duty, taxAmt;
  if (isoValue === 'us') { var mpf = Math.min(651.50, Math.max(33.58, fob * 0.003464)), hmf = fob * 0.00125; taxAmt = mpf + hmf; } else { taxAmt = (cif + dutyAmt) * tax; }
  var fees = (Number(inputs.bc_brk) || 0) + (Number(inputs.bc_inl) || 0) + (Number(inputs.bc_oth) || 0);
  var total = fob + frt + ins + dutyAmt + taxAmt + fees, per = qty > 0 ? total / qty : 0, up = fob > 0 ? (total - fob) / fob * 100 : 0;
  var segs = [['FOB value', fob, '#0E6652'], ['Freight', frt, '#B95B12'], ['Insurance', ins, '#A6372D'], ['Duty', dutyAmt, '#B95B12'], [(c[3] || 'Import tax'), taxAmt, '#1F6B49'], ['Fees', fees, '#858B88']];

  var result = {
    cif: cif,
    custVal: custVal,
    custValBasis: c[4] === 'fob' ? 'FOB' : 'CIF',
    dutyAmt: dutyAmt,
    dutyPct: duty * 100,
    taxAmt: taxAmt,
    taxPct: tax * 100,
    taxLabel: isoValue === 'us' ? 'MPF + HMF' : (c[3] || 'Import tax'),
    fees: fees,
    total: total,
    totalMoney: money(total),
    per: per,
    perMoney: qty > 0 ? 'US$' + per.toFixed(3) : '—',
    upliftPct: up,
    segs: segs
  };

  // Retail card: same shipment, priced at the buyer's target margin.
  // SHIM: original reads #ws_mg via n('ws_mg'); here it's inputs.ws_mg.
  var mgP = Math.min(95, Math.max(0, Number(inputs.ws_mg) || 0)), retail = per > 0 ? per / (1 - mgP / 100) : 0, gpU = retail - per, orderGP = gpU * qty;
  result.retail = {
    marginPct: mgP,
    retailPerUnit: per > 0 ? retail : null,
    retailMoney: per > 0 ? 'US$' + retail.toFixed(2) : '—',
    gpPerUnit: gpU,
    orderGP: orderGP,
    orderGPMoney: per > 0 ? money(orderGP) : '—',
    markupOnCostPct: per > 0 ? (gpU / per * 100) : 0
  };

  return result;
}

// ===== Verbatim from tools/partner_template.html lines 2646 & 2642-2645 =====
// (pct/keyFor helpers for the Taiwan-vs-China origin duty compare card)
// SHIM: `dd` (a destination entry from T.destinations, i.e. data.json's
// tariff_calc block) and `o` (origin code 'TW'|'CN') are passed straight
// through unchanged — no shimming needed for pct(). keyFor() is unchanged
// except `T` is now a parameter instead of a closure variable.
function pct(dd, o) {
  var p = dd.mfn || 0;
  (dd.addons || []).forEach(function (a) { if (a.optional) return; if (a.origin === 'ANY' || a.origin === o) p += a.pct; });
  return p;
}

function keyFor(T, code) {
  var MAP = { us: 'United States', ca: 'Canada', de: 'European Union', fr: 'European Union', nl: 'European Union', es: 'European Union', pl: 'European Union', uk: 'United Kingdom', au: 'Australia' };
  var want = (MAP[code] || code || '').toLowerCase(), ks = Object.keys(T.destinations), i;
  for (i = 0; i < ks.length; i++) if (ks[i].toLowerCase() === want) return ks[i];
  for (i = 0; i < ks.length; i++) if (want && ks[i].toLowerCase().indexOf(want.split(' ')[0]) === 0) return ks[i];
  return null;
}

module.exports = { money: money, CO: CO, applyCo: applyCo, computeLanded: computeLanded, pct: pct, keyFor: keyFor };

// ===================== --run behavior snapshot mode =====================
if (require.main === module && process.argv.indexOf('--run') !== -1) {
  var FIXED_INPUTS = [
    {
      label: 'Germany / EU VAT / typical order',
      inputs: { bc_co: 'de', bc_fob: 10000, bc_qty: 500, bc_frt: 1200, bc_ins: 0.5, bc_duty: 1.7, bc_tax: 19, bc_brk: 150, bc_inl: 300, bc_oth: 0, ws_mg: 45 }
    },
    {
      label: 'USA / MPF+HMF / small order',
      inputs: { bc_co: 'us', bc_fob: 3000, bc_qty: 120, bc_frt: 400, bc_ins: 0.5, bc_duty: 0, bc_tax: 0, bc_brk: 80, bc_inl: 100, bc_oth: 20, ws_mg: 50 }
    },
    {
      label: 'Australia / GST / large order',
      inputs: { bc_co: 'au', bc_fob: 50000, bc_qty: 4000, bc_frt: 5000, bc_ins: 0.6, bc_duty: 5, bc_tax: 10, bc_brk: 500, bc_inl: 900, bc_oth: 100, ws_mg: 40 }
    }
  ];

  var out = { applyCo: [], computeLanded: [] };

  FIXED_INPUTS.forEach(function (fx) {
    out.applyCo.push({ label: fx.label, iso: fx.inputs.bc_co, result: applyCo(fx.inputs.bc_co) });
    out.computeLanded.push({ label: fx.label, inputs: fx.inputs, result: computeLanded(fx.inputs) });
  });

  // pct()/keyFor() need a T.destinations shape; snapshot with a small
  // synthetic fixture so the run mode still exercises them without needing
  // the real data.json (that file lives outside this harness's scope).
  var T_FIXTURE = {
    destinations: {
      Germany: { mfn: 1.7, addons: [{ label: 'EU safeguard', pct: 2.5, origin: 'CN' }, { label: 'FTA relief', pct: -1.7, origin: 'TW', optional: true }] }
    }
  };
  out.dutyCompare = ['de', 'us', 'unknown'].map(function (code) {
    var k = keyFor(T_FIXTURE, code);
    if (!k) return { code: code, key: null };
    var dd = T_FIXTURE.destinations[k];
    return { code: code, key: k, pctTW: pct(dd, 'TW'), pctCN: pct(dd, 'CN') };
  });

  console.log(JSON.stringify(out, null, 2));
}

// --selftest: invariants only, never pinned market numbers (those drift yearly
// and would turn every constants refresh into a false red).
if (require.main === module && process.argv.indexOf('--selftest') !== -1) {
  var errs = [];
  var ok = function (cond, msg) { if (!cond) errs.push(msg); };
  var near = function (a, b) { return Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)); };
  // computeLanded exposes fob/frt/ins only through segs; pull them out by position.
  var seg = function (r, i) { return r.segs[i][1]; };

  Object.keys(CO).forEach(function (k) {
    var c = CO[k];
    ok(c.length === 6, k + ': CO row must have 6 fields');
    ok(typeof c[1] === 'number' && c[1] >= 0, k + ': dutyPct must be a non-negative number');
    ok(typeof c[2] === 'number' && c[2] >= 0, k + ': taxPct must be a non-negative number');
    ok(c[4] === 'fob' || c[4] === 'cif', k + ': basis must be fob or cif');
  });

  var base = { bc_fob: 10000, bc_qty: 500, bc_frt: 1000, bc_ins: 0.5, bc_duty: 2, bc_tax: 20, bc_brk: 100, bc_inl: 200, bc_oth: 0, ws_mg: 40 };
  var mk = function (over) { var o = {}; Object.keys(base).forEach(function (k) { o[k] = base[k]; }); Object.keys(over || {}).forEach(function (k) { o[k] = over[k]; }); return o; };

  // Accounting identity: total is the sum of its own segments; per-unit * qty = total.
  ['de', 'us', 'au', 'jp'].forEach(function (iso) {
    var r = computeLanded(mk({ bc_co: iso }));
    var sum = seg(r, 0) + seg(r, 1) + seg(r, 2) + r.dutyAmt + r.taxAmt + r.fees;
    ok(near(r.total, sum), iso + ': total must equal sum of segments');
    ok(near(r.per * 500, r.total), iso + ': per-unit * qty must equal total');
  });

  // US: MPF+HMF replace VAT, computed on FOB only — freight must not move them.
  var usA = computeLanded(mk({ bc_co: 'us' }));
  var usB = computeLanded(mk({ bc_co: 'us', bc_frt: 9000 }));
  ok(near(usA.taxAmt, usB.taxAmt), 'us: MPF+HMF must be independent of freight');
  // MPF clamps to min on tiny shipments and max on huge ones; scales in between.
  var tiny = computeLanded(mk({ bc_co: 'us', bc_fob: 100 }));
  var huge = computeLanded(mk({ bc_co: 'us', bc_fob: 1000000 }));
  ok(tiny.taxAmt > usA.taxAmt / 100, 'us: tiny shipment must hit the MPF floor, not scale to ~0');
  ok(huge.taxAmt < 1000000 * 0.003464, 'us: huge shipment must hit the MPF ceiling');
  // Duty basis: US on FOB (freight must not move dutyAmt when duty > 0); EU on CIF.
  var usD = computeLanded(mk({ bc_co: 'us', bc_duty: 5 }));
  var usD2 = computeLanded(mk({ bc_co: 'us', bc_duty: 5, bc_frt: 9000 }));
  ok(near(usD.dutyAmt, usD2.dutyAmt), 'us: duty must be computed on FOB, not moved by freight');
  var deA = computeLanded(mk({ bc_co: 'de' }));
  var deB = computeLanded(mk({ bc_co: 'de', bc_frt: 9000 }));
  ok(deB.dutyAmt > deA.dutyAmt, 'de: duty must be computed on CIF, so freight raises it');
  // EU tax base is CIF + duty, not CIF alone.
  ok(near(deA.taxAmt, (deA.cif + deA.dutyAmt) * 0.20), 'de: tax must apply to CIF + duty');

  // Drift guard: this file is a verbatim copy of the template's math. If the
  // template's MPF clamp line changes without this harness following, the
  // selftest is testing dead code — fail loudly instead.
  var tpl = require('fs').readFileSync(require('path').join(__dirname, '..', 'partner_template.html'), 'utf8');
  ok(tpl.indexOf('Math.min(651.50,Math.max(33.58,fob*0.003464))') !== -1,
    'template MPF clamp line drifted from harness copy — update both together');

  if (errs.length) { console.error('costnow selftest FAILED:'); errs.forEach(function (e) { console.error(' - ' + e); }); process.exit(1); }
  console.log('costnow selftest ok: CO table shape, accounting identity, MPF clamp/independence, duty basis fob-vs-cif, EU tax base');
}
