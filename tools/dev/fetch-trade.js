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
const REPORTERS = ["DE", "NL", "FR"];
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
  const tw = bandOf(twUV24, terciles24);

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
async function buildTradeJSON(euData) {
  const now = new Date().toISOString();
  const trade = {
    schema: 1,
    generated: now,
    period: { latest: "2024", previous: "2023" },
    source: {
      eu: "Eurostat Comext DS-045409",
      uk: "HMRC uktradeinfo OTS",
    },
    markets: {},
  };

  const reporterMap = { DE: "de", NL: "nl", FR: "fr" };
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

    if (euErrors.length > 0) {
      console.warn("[Eurostat] Errors:", euErrors);
    }
    if (ukErrors.length > 0) {
      console.warn("[UK] Errors:", ukErrors);
    }

    const trade = await buildTradeJSON(euData);

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
