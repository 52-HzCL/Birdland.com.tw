#!/usr/bin/env node
/**
 * Fetch trade statistics from Eurostat Comext (DE/NL/FR) and UK HMRC uktradeinfo,
 * produce trade.json with uv_change, share metrics, and fail-closed validation.
 *
 * Eurostat API: https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/ds-045409
 * UK API: https://api.uktradeinfo.com/OTS (OData v4) - exploration status in comments below
 */
const https = require("https");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const TRADE_JSON = path.join(REPO_ROOT, "trade.json");

const EUROSTAT_BASE =
  "https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/ds-045409";
const REPORTERS = ["DE", "NL", "FR", "ES", "PL", "IT"];
const PRODUCTS = ["82011000", "82013000", "82015000", "82016000"];
const BASIS_MAP = {
  "82011000": "piece", // has SUPPLEMENTARY_QUANTITY
  "82013000": "kg",    // no piece data
  "82015000": "piece", // has SUPPLEMENTARY_QUANTITY
  "82016000": "kg",    // no piece data
};

// Comext's partner dimension is not asked for a fixed list any more: leaving
// `partner` off the query returns every code the dataset has for these
// reporters/products/years (~278), discovered by probing the response's own
// dimension.partner.category — TW/CN/WORLD plus every other origin country,
// in one request. That superset is what the price-band tercile (below) is
// computed from; TW/CN/WORLD are just the three codes the existing headline
// metrics (uv_change_pct, shares) read out of it.
//
// The superset mixes real countries with two kinds of non-source rows that
// would corrupt a value-weighted tercile if left in:
//   - EU/euro-area aggregates (EXT_EU, INT_EA21, ...): each one re-sums value
//     already counted in its member countries' own rows, so keeping both
//     double-weights that value.
//   - Comext pseudo-partners: QP "High seas", QQ-QS "stores and provisions",
//     QU-QZ "not specified" — not a source country at all.
// Verified against a live pull (2026-08): summing every real-country row for
// one reporter/product/year reproduces the WORLD cell exactly (ratio 1.0),
// confirming WORLD is the clean total these aggregates are drawn from, not
// an independent figure — so excluding the aggregates loses no value, only
// the double count.
const BAND_EXCLUDE_PARTNERS = new Set([
  "WORLD",
  "EXT_EA", "EXT_EA21", "EXT_EU", "EXT_EU27_2020",
  "INT_EA", "INT_EA21", "INT_EU", "INT_EU27_2020",
  "QP", "QQ", "QR", "QS", "QU", "QV", "QW", "QX", "QY", "QZ",
]);
const BAND_MIN_SOURCES = 5;   // fewer valid countries than this: band is null, not guessed
const BAND_MIN_SHARE = 0.005; // <0.5% of WORLD value: re-export/rounding noise, dropped
const BAND_TOP_N = 20;        // top 15-20 sources by import value, per the brief
const BAND_MIN_TW_SHARE = 0.02; // publishing where Taiwan prices needs a real share, not a consignment

// ---------------------------------------------------------------------------
// UN Comtrade (US/JP/IL/AU) — a second source feeding the same trade.json,
// reusing every function above (computeTerciles/bandOf/computeBand/
// calculateMetrics/validateMetrics) unchanged. The only new work is getting
// Comtrade's response shape into the {VALUE, QTY_100KG, SUP} row shape those
// functions already expect from Eurostat — see comtradeRowsForYear below.
//
// Free preview endpoint, no key, one (reporter, product, year) per request —
// the endpoint rejects a multi-period query ("Maximum number of periods for
// preview is 1", verified live), so 4 reporters x 4 products x 2 years = 32
// sequential requests, >=1.1s apart.
const COMTRADE_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
const COMTRADE_REPORTERS = [
  ["us", 842], // USA
  ["jp", 392], // Japan
  ["il", 376], // Israel
  ["au", 36],  // Australia
];
const COMTRADE_YEARS = ["2023", "2024"];
const TW_CODE = "490"; // "Other Asia, nes" — see note on COMTRADE_NES_CODES
const CN_CODE = "156";

// UN Comtrade partner codes that are regional catch-alls or non-trade
// categories ("Bunkers", "Free Zones", "Special Categories, "X, nes"), not
// real source countries — the Comtrade equivalent of BAND_EXCLUDE_PARTNERS's
// Eurostat EXT_EU/INT_EA rows, and merged into that same Set so
// computeTerciles/computeBand need no changes to exclude them too. List
// pulled from https://comtradeapi.un.org/files/v1/app/reference/
// partnerAreas.json (live, 2026-08-07): every entry whose label ends ", nes"
// plus Bunkers/Free Zones/Special Categories/Neutral Zone.
//
// Deliberately does NOT include 490 "Other Asia, nes": live pulls confirm
// that is the UN's placeholder for Taiwan under One-China nomenclature (the
// UN does not carry "Taiwan" as a reporter/partner name), not a genuine
// regional aggregate — real Taiwan-origin trade lands there and must stay in
// both the source-country sum and the tercile sample. Every cell that shows
// a Taiwan-origin share sourced from Comtrade carries a reader-facing note
// saying so (see the "Other Asia, nes" i18n string wired into the shelf UI).
const COMTRADE_NES_CODES = [
  "472", "899", "837", "471", "129", "221", "697", "492",
  "838", "473", "536", "637", "290", "527", "577", "568", "636", "839", "879",
];
COMTRADE_NES_CODES.forEach((c) => BAND_EXCLUDE_PARTNERS.add(c));

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchComtradeOne(reporterCode, hs6, year) {
  const params = new URLSearchParams({
    reporterCode: String(reporterCode),
    period: year,
    cmdCode: hs6,
    flowCode: "M",
  });
  return httpsGet(COMTRADE_BASE + "?" + params.toString());
}

/**
 * Turn one Comtrade response into {partnerCodeString: {VALUE, QTY_100KG,
 * SUP}} for one (reporter, product, year) — the exact row shape
 * unitPriceFor/computeTerciles/computeBand already consume from Eurostat, so
 * they run unchanged. Also returns the API's own partnerCode=0 row, kept
 * only as a cross-check (see buildComtradeWorld) and never trusted directly.
 *
 * De-dup root cause (verified live, 2026-08-07 — this corrects the brief's
 * working theory): the preview endpoint returns one row per partner PER
 * TRANSPORT MODE (motCode), plus a motCode=0 "TOTAL - all modes" row that
 * already sums them. That is what looked like "the same partner twice with
 * different amounts" (a country split across sea+air) and "twice with the
 * same amount" (a country that shipped by only one mode, so its total
 * equals its one breakdown row) — not partner2Code, which was 0 on every
 * row seen across all four reporters. Example that pinned this down: AU
 * 2023 820150 partner 156 (China) motCode=0 cifvalue 3775794.129 equals
 * motCode=1000 (74330.889) + motCode=2100 (3701463.24) to the cent.
 * Filtering to motCode===0 keeps exactly one row per partner and IS the
 * de-dup rule.
 */
function comtradeRowsForYear(json) {
  const rows = (json && Array.isArray(json.data)) ? json.data : [];
  const totals = rows.filter((r) => r.motCode === 0);
  const partners = {};
  let worldRowApi = null;
  for (const r of totals) {
    if (r.partnerCode === 0) { worldRowApi = r; continue; } // World: rebuilt below, never trusted directly
    const code = String(r.partnerCode);
    const sup = (r.altQtyUnitCode === 5 && r.altQty > 0) ? r.altQty : 0;
    partners[code] = { VALUE: r.cifvalue || 0, QTY_100KG: (r.netWgt || 0) / 100, SUP: sup };
  }
  return { partners, worldRowApi };
}

/**
 * Basis decision, per the brief: piece when the API's own World row (its
 * altQtyUnitCode flag only — not its cifvalue, which is never trusted; a
 * unit-code flag on an aggregate row isn't the aggregation the brief warned
 * against) says piece, OR when a majority of source countries report
 * pieces. Decided once per (reporter, product) from the latest year
 * available, the same "static per product" spirit as Eurostat's BASIS_MAP
 * (which is why this function takes one year's partners, not both).
 */
function decideComtradeBasis(partners, worldRowApi) {
  const worldPiece = !!(worldRowApi && worldRowApi.altQtyUnitCode === 5 && worldRowApi.altQty > 0);
  const rows = Object.keys(partners)
    .filter((code) => !BAND_EXCLUDE_PARTNERS.has(code))
    .map((code) => partners[code]);
  const withPieces = rows.filter((r) => r.SUP > 0).length;
  const majorityPiece = rows.length > 0 && withPieces / rows.length > 0.5;
  return (worldPiece || majorityPiece) ? "piece" : "kg";
}

/**
 * World is never read from the API's partnerCode=0 row — rebuilt here by
 * summing the qualifying (non-aggregate) partner rows, per the brief's
 * fail-closed policy: AU's own recon found a case where the reported World
 * diverged wildly from this sum. Returns the self-computed WORLD row in the
 * same shape as any other partner row, plus a cross-check verdict against
 * the API's row (kept for the console report and an optional trade.json
 * note — never for the metric itself).
 */
function buildComtradeWorld(partners, worldRowApi, basis) {
  const rows = Object.keys(partners)
    .filter((code) => !BAND_EXCLUDE_PARTNERS.has(code))
    .map((code) => partners[code]);
  const VALUE = rows.reduce((s, r) => s + r.VALUE, 0);
  const QTY_100KG = rows.reduce((s, r) => s + r.QTY_100KG, 0);
  const SUP = basis === "piece" ? rows.reduce((s, r) => s + r.SUP, 0) : 0;
  const world = { VALUE, QTY_100KG, SUP };
  let crossCheck = "no-api-row";
  if (worldRowApi && worldRowApi.cifvalue > 0 && VALUE > 0) {
    const ratio = Math.abs(VALUE - worldRowApi.cifvalue) / worldRowApi.cifvalue;
    crossCheck = ratio < 0.05 ? "ok" : "diverged";
  }
  return { world, crossCheck, apiValue: worldRowApi ? worldRowApi.cifvalue : null, ownSum: VALUE };
}

/**
 * Fetch every (reporter, product, year) Comtrade cell the shelf needs.
 * Returns { data, errors, crossChecks } where data[isoLower][cn8][year] =
 * {partners (source countries only, WORLD not yet inserted), worldRowApi}
 * and crossChecks is a flat log of the buildComtradeWorld verdicts for the
 * final report.
 */
async function fetchComtradeData() {
  const data = {};
  const errors = [];
  const crossChecks = [];
  for (const [iso, reporterCode] of COMTRADE_REPORTERS) {
    for (const cn8 of PRODUCTS) {
      const hs6 = cn8.slice(0, 6);
      const perYear = {};
      for (const year of COMTRADE_YEARS) {
        await sleepMs(1100); // politeness: >=1s between requests, every request, not just after the first
        try {
          const json = await fetchComtradeOne(reporterCode, hs6, year);
          if (json && json.error) {
            errors.push(`${iso}/${cn8}/${year}: ${json.error}`);
            continue;
          }
          perYear[year] = comtradeRowsForYear(json);
          console.log(`[Comtrade] ${iso}/${hs6}/${year}: ${Object.keys(perYear[year].partners).length} source rows`);
        } catch (e) {
          errors.push(`${iso}/${cn8}/${year}: ${e.message}`);
        }
      }
      ((data[iso] ??= {})[cn8] = perYear);
    }
  }
  return { data, errors, crossChecks };
}

/**
 * Aggregate fetchComtradeData()'s output into trade.markets entries, reusing
 * calculateMetrics/computeBand/validateMetrics exactly as the Eurostat path
 * does — the only Comtrade-specific work already happened above (dedup,
 * basis, self-summed World). crossChecks is appended to for the console
 * report.
 */
function buildComtradeMarkets(comtradeData, crossChecks) {
  const markets = {};
  for (const [iso] of COMTRADE_REPORTERS) {
    markets[iso] = {};
    const byProduct = comtradeData[iso] || {};
    for (const cn8 of PRODUCTS) {
      const perYear = byProduct[cn8] || {};
      const y24 = perYear["2024"], y23 = perYear["2023"];
      if (!y24 && !y23) {
        markets[iso][cn8] = { basis: "kg", uv_change_pct: null, vol_change_pct: null, share_tw: null, share_tw_prev: null, share_cn: null, stale: true, band: null, src: "comtrade" };
        continue;
      }
      // Basis decided from the latest year available (falls back to 2023 if
      // 2024's request failed), then applied to both years for a like-for-like uv_change_pct.
      const basisSrc = y24 || y23;
      const basis = decideComtradeBasis(basisSrc.partners, basisSrc.worldRowApi);

      const w24 = y24 ? buildComtradeWorld(y24.partners, y24.worldRowApi, basis) : null;
      const w23 = y23 ? buildComtradeWorld(y23.partners, y23.worldRowApi, basis) : null;
      if (w24) crossChecks.push({ iso, cn8, year: "2024", ...w24, verdict: w24.crossCheck });
      if (w23) crossChecks.push({ iso, cn8, year: "2023", ...w23, verdict: w23.crossCheck });

      const world24 = w24 ? w24.world : null;
      const world23 = w23 ? w23.world : null;
      const tw24 = y24 ? (y24.partners[TW_CODE] || null) : null;
      const tw23 = y23 ? (y23.partners[TW_CODE] || null) : null;
      const cn24 = y24 ? (y24.partners[CN_CODE] || null) : null;

      const metrics = calculateMetrics(iso, cn8, world23, world24, basis);
      metrics.src = "comtrade";

      if (world24 && world24.VALUE > 0) {
        if (tw24 && tw24.VALUE) metrics.share_tw = Math.round((tw24.VALUE / world24.VALUE) * 100);
        if (cn24 && cn24.VALUE) metrics.share_cn = Math.round((cn24.VALUE / world24.VALUE) * 100);
      }
      if (world23 && world23.VALUE > 0 && tw23 && tw23.VALUE) {
        metrics.share_tw_prev = Math.round((tw23.VALUE / world23.VALUE) * 100);
      }

      // partners24/partners23 for the tercile need WORLD inserted under the
      // literal key "WORLD" (already in BAND_EXCLUDE_PARTNERS) so computeBand
      // can read it the same way it reads Eurostat's partners.WORLD.
      const partners24 = y24 ? { ...y24.partners, WORLD: world24 } : {};
      const partners23 = y23 ? { ...y23.partners, WORLD: world23 } : {};
      metrics.band = computeBand(partners24, partners23, world24, world23, tw24, basis);

      // Fail-closed note, not a UI string: recorded only when the self-summed
      // World diverged >5% from Comtrade's own reported World row, so the
      // discrepancy is auditable in the file without ever showing an
      // absolute price. The metric itself already used the self-sum either way.
      if (w24 && w24.crossCheck === "diverged") {
        metrics.note = "world cross-check diverged >5% from Comtrade's reported total; used summed sources";
      }

      validateMetrics(metrics);
      markets[iso][cn8] = metrics;
      console.log(
        `[metrics] ${iso}/${cn8} (comtrade): stale=${metrics.stale}, basis=${basis}, uv=${metrics.uv_change_pct}, share_tw=${metrics.share_tw}, ` +
        `band=${metrics.band ? metrics.band.market : null}, band.tw=${metrics.band ? metrics.band.tw : null}, moved=${metrics.band ? metrics.band.moved : null}, ` +
        `world_cross_check=${w24 ? w24.crossCheck : "n/a"}`
      );
    }
  }
  return markets;
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse: ${e.message}`));
        }
      });
    }).on("error", reject);
  });
}

/**
 * Convert flat value key to multidimensional indices using size array.
 * JSON-stat stores values in row-major order; we need to decode the flat index.
 */
function flatIndexToMulti(flatIdx, sizes) {
  const indices = [];
  let remaining = flatIdx;
  for (let i = sizes.length - 1; i >= 0; i--) {
    indices.unshift(remaining % sizes[i]);
    remaining = Math.floor(remaining / sizes[i]);
  }
  return indices;
}

/**
 * Fetch all 2023 & 2024 data for DE/NL/FR × every partner Comext reports ×
 * all products. No `partner` param is sent — omitting it is how the full
 * ~278-code list (individual countries, plus the aggregates/pseudo-partners
 * filtered out at use-site) was discovered in the first place.
 */
async function fetchEurostatData() {
  // One request, both years. Cells are read by composing the flat index from
  // named dimension positions — verified by hand against single-cell queries
  // (DE/82015000/WORLD/2023: VALUE 30132727, SUP 6944176).
  const data = {};
  const errors = [];
  const params = new URLSearchParams({ format: 'JSON', freq: 'A', flow: '1' });
  for (const r of REPORTERS) params.append('reporter', r);
  for (const prod of PRODUCTS) params.append('product', prod);
  params.append('time', '2023');
  params.append('time', '2024');
  const url = EUROSTAT_BASE + '?' + params.toString();
  console.log('[Eurostat] Fetching 2023+2024, all partners, in one request...');
  const j = await httpsGet(url);
  if (!j || !j.dimension || !j.id || !j.value || !j.size) {
    errors.push('No data in response');
    return { data, errors };
  }
  const pos = {}; j.id.forEach((n,i)=>pos[n]=i);
  const cat = {}; j.id.forEach(n=>cat[n]=j.dimension[n].category.index);
  const partnerCodes = Object.keys(cat.partner);
  console.log('[Eurostat] partner dimension carries ' + partnerCodes.length + ' codes this pull');
  function cell(rep,par,prod,ind,time){
    const c=[]; c[pos.freq]=0; c[pos.flow]=0;
    c[pos.reporter]=cat.reporter[rep]; c[pos.partner]=cat.partner[par];
    c[pos.product]=cat.product[prod]; c[pos.indicators]=cat.indicators[ind];
    c[pos.time]=cat.time[time];
    if (c.some(v=>v===undefined)) return undefined;
    let flat=0; for(let i=0;i<j.size.length;i++) flat=flat*j.size[i]+c[i];
    return j.value[flat];
  }
  for (const rep of REPORTERS) for (const prod of PRODUCTS) for (const par of partnerCodes) for (const year of ['2023','2024']) {
    const V=cell(rep,par,prod,'VALUE_IN_EUROS',year);
    const Q=cell(rep,par,prod,'QUANTITY_IN_100KG',year);
    const S=cell(rep,par,prod,'SUPPLEMENTARY_QUANTITY',year);
    if (V===undefined && Q===undefined && S===undefined) continue;
    ((((data[rep]??={})[prod]??={})[par]??={})[year]??={});
    if (V!==undefined) data[rep][prod][par][year].VALUE=V;
    if (Q!==undefined) data[rep][prod][par][year].QTY_100KG=Q;
    if (S!==undefined) data[rep][prod][par][year].SUP=S;
  }
  return { data, errors };
}

/**
 * Unit value for one partner-row (VALUE/quantity), or null when the row
 * can't support a price: zero/missing quantity, zero/missing value. Shared
 * by the market-wide metrics and the band tercile so a "no data" country
 * reads the same way in both.
 */
function unitPriceFor(row, basis) {
  if (!row) return null;
  const denom = basis === "piece" ? (row.SUP || 0) : (row.QTY_100KG || 0) * 100;
  if (denom <= 0) return null;
  const val = row.VALUE || 0;
  if (val <= 0) return null;
  return val / denom;
}

/**
 * Value-weighted tercile boundaries (p33/p67) of source-country unit values
 * for one reporter/product/year. Returns { p33, p67, n } or null when there
 * are fewer than BAND_MIN_SOURCES usable countries — the fail-closed case
 * the caller must turn into band:null rather than guess a boundary.
 *
 * partnersForYear: { partnerCode: {VALUE, QTY_100KG, SUP} } for one year,
 * as assembled by fetchEurostatData(). worldValue anchors the 0.5%
 * re-export-noise cutoff to the whole market, not to the trimmed sample.
 *
 * p33/p67 are absolute per-unit prices and MUST NOT be written to
 * trade.json: that file is fetched by every visitor's browser, and this
 * site's stated policy is to publish rate-of-change, never a price level a
 * counterparty could see and negotiate against. They exist only inside this
 * function call, are consumed immediately by bandOf(), and are discarded
 * when it returns.
 */
function computeTerciles(partnersForYear, worldValue, basis) {
  if (!partnersForYear || !worldValue || worldValue <= 0) return null;
  let rows = Object.keys(partnersForYear)
    .filter((code) => !BAND_EXCLUDE_PARTNERS.has(code))
    .map((code) => {
      const row = partnersForYear[code];
      return { code, value: row.VALUE || 0, uv: unitPriceFor(row, basis) };
    })
    .filter((r) => r.uv !== null && r.value > 0);
  rows.sort((a, b) => b.value - a.value);
  rows = rows.slice(0, BAND_TOP_N);
  rows = rows.filter((r) => r.value / worldValue >= BAND_MIN_SHARE);
  if (rows.length < BAND_MIN_SOURCES) return null;
  rows.sort((a, b) => a.uv - b.uv);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  let cum = 0, p33 = null, p67 = null;
  for (const r of rows) {
    cum += r.value;
    const cumShare = cum / totalValue;
    if (p33 === null && cumShare >= 1 / 3) p33 = r.uv;
    if (p67 === null && cumShare >= 2 / 3) { p67 = r.uv; break; }
  }
  return { p33, p67, n: rows.length };
}

/** Which third a unit value falls in, given tercile boundaries. null in, null out. */
function bandOf(uv, terciles) {
  if (uv === null || uv === undefined || !terciles) return null;
  if (uv <= terciles.p33) return "lower";
  if (uv <= terciles.p67) return "mid";
  return "upper";
}

/**
 * The public-facing band object for one cell: relative positions only (see
 * the no-absolute-prices note on computeTerciles). market/tw are the band
 * this year; moved compares this year's band to last year's, each computed
 * against its OWN year's tercile (a market can restructure its source mix
 * year to year, so last year's boundary is not assumed to still apply).
 * band itself is null — not a best guess — when this year's market band
 * can't be established at all.
 */
function computeBand(partners24, partners23, world24, world23, tw24, basis) {
  const terciles24 = computeTerciles(partners24, world24 && world24.VALUE, basis);
  const terciles23 = computeTerciles(partners23, world23 && world23.VALUE, basis);
  const worldUV24 = unitPriceFor(world24, basis);
  const worldUV23 = unitPriceFor(world23, basis);
  const twUV24 = unitPriceFor(tw24, basis);

  const market24 = bandOf(worldUV24, terciles24);
  if (!market24) return null; // fail-closed: no market position, no band object

  const market23 = bandOf(worldUV23, terciles23);

  // Where Taiwan-origin supply prices is a claim the site publishes in a
  // sentence, so it needs a heavier burden of proof than a metric does. A
  // source under BAND_MIN_TW_SHARE of the market may be one atypical
  // consignment — spares, samples, a mixed load — and its unit value says
  // nothing dependable about where Taiwanese supply competes. Worse, such a
  // share rounds to 0% or 1% in the line printed directly above, so the page
  // would claim a positioning for an origin it had just called invisible.
  // Below the bar the positioning is simply not published.
  const twShare = (tw24 && tw24.VALUE && world24 && world24.VALUE)
    ? tw24.VALUE / world24.VALUE : 0;
  const tw = twShare >= BAND_MIN_TW_SHARE ? bandOf(twUV24, terciles24) : null;

  let moved = null;
  if (market23) {
    const ord = { lower: 0, mid: 1, upper: 2 };
    const d = ord[market24] - ord[market23];
    moved = d > 0 ? "up" : d < 0 ? "down" : "flat";
  }

  let to_next_pct = null;
  if (terciles24 && worldUV24 !== null) {
    if (market24 === "lower") to_next_pct = Math.round(Math.abs(worldUV24 - terciles24.p33) / worldUV24 * 100);
    else if (market24 === "upper") to_next_pct = Math.round(Math.abs(worldUV24 - terciles24.p67) / worldUV24 * 100);
    else {
      const dLow = Math.abs(worldUV24 - terciles24.p33);
      const dHigh = Math.abs(terciles24.p67 - worldUV24);
      to_next_pct = Math.round(Math.min(dLow, dHigh) / worldUV24 * 100);
    }
  }

  return { market: market24, tw, moved, to_next_pct };
}

// UK (HMRC uktradeinfo) is not wired yet: the OTS API needs a CN8-to-
// CommodityId mapping that has no public lookup endpoint. Until that table
// exists the UK source reports unavailable and nothing is invented.
async function fetchUKData() {
  return { data: { status: "unavailable" }, errors: [] };
}

function calculateMetrics(reporter, product, data23, data24, basis) {
  const metrics = {
    basis,
    uv_change_pct: null,
    vol_change_pct: null,
    share_tw: null,
    share_tw_prev: null,
    share_cn: null,
    stale: false,
  };

  if (!data23 || !data24) {
    metrics.stale = true;
    return metrics;
  }

  // UV calculation
  let denom23 = 0,
    denom24 = 0;
  if (basis === "piece") {
    denom23 = data23.SUP || 0;
    denom24 = data24.SUP || 0;
  } else {
    denom23 = (data23.QTY_100KG || 0) * 100;
    denom24 = (data24.QTY_100KG || 0) * 100;
  }

  if (denom23 <= 0 || denom24 <= 0) {
    metrics.stale = true;
    return metrics;
  }

  const val23 = data23.VALUE || 0;
  const val24 = data24.VALUE || 0;

  if (val23 <= 0 || val24 <= 0) {
    metrics.stale = true;
    return metrics;
  }

  const uv23 = val23 / denom23;
  const uv24 = val24 / denom24;
  metrics.uv_change_pct = Math.round(((uv24 / uv23 - 1) * 100) * 10) / 10;

  // Vol change
  metrics.vol_change_pct = Math.round(
    ((denom24 / denom23 - 1) * 100) * 10
  ) / 10;

  // Shares (from aggregated data)
  // These are filled in by the aggregation step
  return metrics;
}

/**
 * Validate metrics against data contract.
 */
function validateMetrics(metrics) {
  if (metrics.stale) return true; // already marked

  // share_tw + share_cn <= 100 and each in [0,100]
  if (metrics.share_tw !== null && metrics.share_cn !== null) {
    if (
      metrics.share_tw + metrics.share_cn > 100 ||
      metrics.share_tw < 0 ||
      metrics.share_tw > 100 ||
      metrics.share_cn < 0 ||
      metrics.share_cn > 100
    ) {
      metrics.stale = true;
      return true;
    }
  }

  // |uv_change_pct| <= 50
  if (
    metrics.uv_change_pct !== null &&
    Math.abs(metrics.uv_change_pct) > 50
  ) {
    metrics.stale = true;
    return true;
  }

  return false;
}

/**
 * Aggregate Eurostat data into trade.json structure.
 */
async function buildTradeJSON(euData, comtradeMarkets) {
  const now = new Date().toISOString();
  const trade = {
    schema: 1,
    generated: now,
    period: { latest: "2024", previous: "2023" },
    source: {
      eu: "Eurostat Comext DS-045409",
      uk: "HMRC uktradeinfo OTS",
      comtrade: "UN Comtrade (public preview API) — Taiwan-origin reported by the UN as 'Other Asia, nes'",
    },
    markets: {},
  };

  // Market keys are the reporter code lowercased; adding a reporter above is
  // the only edit a new Eurostat market needs.
  const reporterMap = Object.fromEntries(REPORTERS.map(r => [r, r.toLowerCase()]));
  let staleCount = 0;
  let totalCount = 0;

  for (const [reporterCode, products] of Object.entries(euData)) {
    const reporterKey = reporterMap[reporterCode];
    if (!reporterKey) continue;

    trade.markets[reporterKey] = {};

    for (const [productCode, partners] of Object.entries(products)) {
      totalCount++;
      const basis = BASIS_MAP[productCode] || "kg";

      // Get TW, CN, WORLD for this product
      const tw23 = partners.TW?.["2023"] || null;
      const tw24 = partners.TW?.["2024"] || null;
      const cn23 = partners.CN?.["2023"] || null;
      const cn24 = partners.CN?.["2024"] || null;
      const world23 = partners.WORLD?.["2023"] || null;
      const world24 = partners.WORLD?.["2024"] || null;

      // Unit value and volume are MARKET-WIDE (WORLD) — the card says what the
      // market is paying, not what Taiwan-origin goods cost. TW/CN rows feed
      // the origin-share columns only.
      const metrics = calculateMetrics(
        reporterCode,
        productCode,
        world23,
        world24,
        basis
      );
      metrics.src = "eurostat";

      // Calculate shares from WORLD baseline
      if (world24 && world24.VALUE && world24.VALUE > 0) {
        if (tw24 && tw24.VALUE) {
          metrics.share_tw = Math.round((tw24.VALUE / world24.VALUE) * 100);
        }
        if (cn24 && cn24.VALUE) {
          metrics.share_cn = Math.round((cn24.VALUE / world24.VALUE) * 100);
        }
      }

      if (world23 && world23.VALUE && world23.VALUE > 0) {
        if (tw23 && tw23.VALUE) {
          metrics.share_tw_prev = Math.round((tw23.VALUE / world23.VALUE) * 100);
        }
      }

      // Price-band: value-weighted thirds of every source country's unit
      // value (see computeTerciles/computeBand above). `partners` here
      // already carries every partner code this pull returned (the
      // `partner` param is no longer sent — see fetchEurostatData), so no
      // second fetch is needed. null is the fail-closed answer, not a 0%
      // one, when fewer than BAND_MIN_SOURCES countries qualify.
      const partners24 = {}, partners23 = {};
      for (const [code, years] of Object.entries(partners)) {
        if (years["2024"]) partners24[code] = years["2024"];
        if (years["2023"]) partners23[code] = years["2023"];
      }
      metrics.band = computeBand(partners24, partners23, world24, world23, tw24, basis);

      // Validate
      validateMetrics(metrics);
      if (metrics.stale) staleCount++;

      trade.markets[reporterKey][productCode] = metrics;
      console.log(
        `[metrics] ${reporterCode}/${productCode}: stale=${metrics.stale}, uv=${metrics.uv_change_pct}, share_tw=${metrics.share_tw}, ` +
        `band=${metrics.band ? metrics.band.market : null}, band.tw=${metrics.band ? metrics.band.tw : null}, moved=${metrics.band ? metrics.band.moved : null}`
      );
    }
  }

  // Comtrade markets were already built (metrics computed, validated) by
  // buildComtradeMarkets — merged in here rather than recomputed, but still
  // counted into the same fail-closed stale ratio as one data contract
  // covering the whole file, not two.
  for (const [iso, products] of Object.entries(comtradeMarkets || {})) {
    trade.markets[iso] = products;
    for (const metrics of Object.values(products)) {
      totalCount++;
      if (metrics.stale) staleCount++;
    }
  }

  // Fail-closed: if >50% stale, don't overwrite existing file
  const staleRatio = staleCount / totalCount;
  if (staleRatio > 0.5) {
    console.error(
      `[fail-closed] ${staleCount}/${totalCount} entries stale (${(staleRatio * 100).toFixed(1)}%) > 50% threshold`
    );
    return null;
  }

  return trade;
}

/**
 * Main entrypoint.
 */
async function main() {
  try {
    console.log("[fetch-trade] Starting trade data aggregation...");

    const { data: euData, errors: euErrors } = await fetchEurostatData();
    const { data: ukData, errors: ukErrors } = await fetchUKData();

    console.log("[fetch-trade] Fetching UN Comtrade (US/JP/IL/AU) — 32 requests, >=1.1s apart...");
    const { data: comtradeData, errors: comtradeErrors, crossChecks } = await fetchComtradeData();
    const comtradeMarkets = buildComtradeMarkets(comtradeData, crossChecks);

    if (euErrors.length > 0) {
      console.warn("[Eurostat] Errors:", euErrors);
    }
    if (ukErrors.length > 0) {
      console.warn("[UK] Errors:", ukErrors);
    }
    if (comtradeErrors.length > 0) {
      console.warn("[Comtrade] Errors:", comtradeErrors);
    }

    console.log("[Comtrade] World cross-check (self-summed source countries vs Comtrade's own reported World row):");
    for (const c of crossChecks) {
      console.log(
        `  ${c.iso}/${c.cn8}/${c.year}: verdict=${c.verdict} own_sum_vs_api_ratio=${c.apiValue ? (c.ownSum / c.apiValue).toFixed(3) : "n/a"}`
      );
    }

    const trade = await buildTradeJSON(euData, comtradeMarkets);

    if (!trade) {
      console.error("[fail-closed] Trade data contract violated; keeping existing file");
      process.exit(1);
    }

    // Write trade.json (UTF-8, no BOM)
    fs.writeFileSync(TRADE_JSON, JSON.stringify(trade, null, 2) + "\n", {
      encoding: "utf8",
      flag: "w",
    });

    console.log(`[success] Wrote ${TRADE_JSON}`);
    process.exit(0);
  } catch (err) {
    console.error("[error]", err);
    process.exit(1);
  }
}

main();
