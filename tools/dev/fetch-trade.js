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
const PRODUCTS = ["82015000", "82013000", "82015000", "82016000"];
const PARTNERS = ["TW", "CN", "WORLD"];
const BASIS_MAP = {
  "82015000": "piece", // has SUPPLEMENTARY_QUANTITY
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
  const data = {};
  const errors = [];

  // Build URL with multiple reporters, partners, products
  const params = new URLSearchParams({
    format: "JSON",
    freq: "A",
    flow: "1", // import
  });

  // Add all combinations
  for (const r of REPORTERS) params.append("reporter", r);
  for (const p of PARTNERS) params.append("partner", p);
  for (const prod of PRODUCTS) params.append("product", prod);

  // Fetch both years
  for (const year of ["2023", "2024"]) {
    const yearParams = new URLSearchParams(params);
    yearParams.append("time", year);
    const url = `${EUROSTAT_BASE}?${yearParams}`;

    try {
      console.log(`[Eurostat] Fetching ${year}...`);
      const response = await httpsGet(url);

      const { dimension, id, size, value } = response;

      if (!dimension || !id || !value || !size) {
        errors.push(`${year}: No data in response`);
        continue;
      }

      // Map dimension positions
      const posMap = {};
      for (let i = 0; i < id.length; i++) {
        posMap[id[i]] = i;
      }

      // Reverse index maps: name -> position
      const dimMaps = {};
      for (const dimName of id) {
        dimMaps[dimName] = {};
        if (dimension[dimName]?.category?.index) {
          for (const [name, pos] of Object.entries(
            dimension[dimName].category.index
          )) {
            dimMaps[dimName][pos] = name;
          }
        }
      }

      // Decode each value (flat index -> multidimensional)
      for (const [flatKey, val] of Object.entries(value)) {
        const flatIdx = parseInt(flatKey);
        const indices = flatIndexToMulti(flatIdx, size);

        // Map indices to dimension names
        const reporter = dimMaps.reporter[indices[posMap.reporter]];
        const partner = dimMaps.partner[indices[posMap.partner]];
        const product = dimMaps.product[indices[posMap.product]];
        const indicator = dimMaps.indicators[indices[posMap.indicators]];

        if (!reporter || !partner || !product || !indicator) continue;

        // Build hierarchical structure
        if (!data[reporter]) data[reporter] = {};
        if (!data[reporter][product]) data[reporter][product] = {};
        if (!data[reporter][product][partner])
          data[reporter][product][partner] = {};
        if (!data[reporter][product][partner][year])
          data[reporter][product][partner][year] = {};

        if (indicator === "VALUE_IN_EUROS") {
          data[reporter][product][partner][year].VALUE = val;
        } else if (indicator === "QUANTITY_IN_100KG") {
          data[reporter][product][partner][year].QTY_100KG = val;
        } else if (indicator === "SUPPLEMENTARY_QUANTITY") {
          data[reporter][product][partner][year].SUP = val;
        }
      }

      console.log(`[Eurostat] ${year} parsed`);
    } catch (e) {
      errors.push(`${year}: ${e.message}`);
    }

    // Add 1s delay between requests (politeness)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { data, errors };
}

/**
 * UK API exploration: tried to filter OTS by MonthId, CommodityId, CountryId.
 * Status: API returns data but:
 *  - CommodityId in OTS is an internal ID, not CN8 code
 *  - Commodity entity exists but no direct CN8→ID mapping endpoint
 *  - CountryId mapping unclear (no working Countries endpoint)
 *  - MonthId format YYYYMM but no recent 2024 data in OTS
 * Conclusion: insufficient metadata to reliably extract trade flows by commodity.
 * Marking UK as unavailable; would need deeper exploration of Commodity.CommodityId
 * and Country.CountryId values to proceed.
 */
async function fetchUKData() {
  console.log("[UK] API exploration: insufficient metadata to map CN8 to internal IDs");
  return { data: {}, errors: ["UK: API metadata mismatch - no reliable CN8→CommodityId mapping"] };
}

/**
 * Calculate UV (unit value) change and shares.
 * basis: "piece" | "kg"
 */
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

      const metrics = calculateMetrics(
        reporterCode,
        productCode,
        tw23, // 2023 (data23 parameter)
        tw24, // 2024 (data24 parameter)
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
