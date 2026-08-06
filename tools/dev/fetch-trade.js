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
const PARTNERS = ["TW", "CN", "WORLD"];
const BASIS_MAP = {
  "82011000": "piece", // has SUPPLEMENTARY_QUANTITY
  "82013000": "kg",    // no piece data
  "82015000": "piece", // has SUPPLEMENTARY_QUANTITY
  "82016000": "kg",    // no piece data
};

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
 * Fetch all 2023 & 2024 data for DE/NL/FR × TW/CN/WORLD × all products.
 */
async function fetchEurostatData() {
  // One request, both years. Cells are read by composing the flat index from
  // named dimension positions — verified by hand against single-cell queries
  // (DE/82015000/WORLD/2023: VALUE 30132727, SUP 6944176).
  const data = {};
  const errors = [];
  const params = new URLSearchParams({ format: 'JSON', freq: 'A', flow: '1' });
  for (const r of REPORTERS) params.append('reporter', r);
  for (const p of PARTNERS) params.append('partner', p);
  for (const prod of PRODUCTS) params.append('product', prod);
  params.append('time', '2023');
  params.append('time', '2024');
  const url = EUROSTAT_BASE + '?' + params.toString();
  console.log('[Eurostat] Fetching 2023+2024 in one request...');
  const j = await httpsGet(url);
  if (!j || !j.dimension || !j.id || !j.value || !j.size) {
    errors.push('No data in response');
    return { data, errors };
  }
  const pos = {}; j.id.forEach((n,i)=>pos[n]=i);
  const cat = {}; j.id.forEach(n=>cat[n]=j.dimension[n].category.index);
  function cell(rep,par,prod,ind,time){
    const c=[]; c[pos.freq]=0; c[pos.flow]=0;
    c[pos.reporter]=cat.reporter[rep]; c[pos.partner]=cat.partner[par];
    c[pos.product]=cat.product[prod]; c[pos.indicators]=cat.indicators[ind];
    c[pos.time]=cat.time[time];
    if (c.some(v=>v===undefined)) return undefined;
    let flat=0; for(let i=0;i<j.size.length;i++) flat=flat*j.size[i]+c[i];
    return j.value[flat];
  }
  for (const rep of REPORTERS) for (const prod of PRODUCTS) for (const par of PARTNERS) for (const year of ['2023','2024']) {
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

      // Validate
      validateMetrics(metrics);
      if (metrics.stale) staleCount++;

      trade.markets[reporterKey][productCode] = metrics;
      console.log(
        `[metrics] ${reporterCode}/${productCode}: stale=${metrics.stale}, uv=${metrics.uv_change_pct}, share_tw=${metrics.share_tw}`
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
