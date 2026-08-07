#!/usr/bin/env node
/**
 * Fetch trade statistics from Eurostat Comext (DE/NL/FR/ES/PL/IT) and UN
 * Comtrade (every other reporter), produce trade.json with uv_change, share
 * and price-band metrics, and fail-closed validation.
 *
 * schema 2 — full-coverage, tiered, sharded (2026-08 rewrite). The market
 * list used to be a hand-picked set of countries (US/JP/IL/AU alongside the
 * Eurostat six). That is gone. Which countries appear on trade.json now is a
 * MECHANICAL function of public trade statistics — see TIER1_MIN_USD below —
 * with no per-country exception anywhere in this file. This is a privacy
 * property, not a data-quality one: a market appearing on the shelf must
 * never read as "Birdland has a customer there," and the only way to
 * guarantee that is for the list to be something a stranger could
 * reconstruct from Comtrade's own public numbers, with the same threshold
 * applied to every reporter. Widening or narrowing coverage means editing
 * TIER1_MIN_USD (or TIER2's "any nonzero import" floor) — never adding or
 * removing a country by name.
 *
 * Two tiers per market:
 *   tier 1 — full source-country breakdown: uv_change_pct, vol_change_pct,
 *     share_tw/share_cn, and the value-weighted price band. Eurostat's six
 *     (DE/NL/FR/ES/PL/IT) are unconditionally tier 1 (a structural fact
 *     about which source covers them, not a market pick); every other
 *     reporter is tier 1 when this HS6 family's combined latest-year import
 *     value clears TIER1_MIN_USD.
 *   tier 2 — World-row only: uv_change_pct + basis + stale. No band, no
 *     share — both need partner-level detail tier 2 deliberately never
 *     fetches. Every reporter with ANY nonzero import in the family and
 *     under the tier-1 threshold.
 *
 * Sharded for CI (see --shard below and the shard_state doc comment on
 * mainShard): one day's cron run does one small piece — the season-opening
 * "global discovery" that decides the roster, one tier-1 market's full
 * detail, or a batch of tier-2 markets' World rows — never the whole file.
 * Running with no flags keeps the old "one shot, local dev" behavior,
 * scoped to tier 1 only (discovery + Eurostat + every discovered tier-1
 * Comtrade market) since tier 2 exists purely to be sharded across days.
 *
 * Eurostat API: https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/ds-045409
 * UN Comtrade API: https://comtradeapi.un.org/public/v1/preview/C/A/HS (free preview, no key)
 * UK (HMRC uktradeinfo) is not wired: the OTS API needs a CN8-to-CommodityId
 * mapping with no public lookup endpoint. sources.uk stays "unavailable" —
 * this is about the dedicated HMRC integration only, and does not stop the
 * UK from appearing as its own Comtrade-sourced market (reporter code 826,
 * iso "gb") like any other mechanically-qualifying reporter; see REPORTER_MAP.
 */
const https = require("https");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const TRADE_JSON = path.join(REPO_ROOT, "trade.json");

const EUROSTAT_BASE =
  "https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/ds-045409";
const REPORTERS = ["DE", "NL", "FR", "ES", "PL", "IT"];
const EUROSTAT_NAMES = { DE: "Germany", NL: "Netherlands", FR: "France", ES: "Spain", PL: "Poland", IT: "Italy" };
const PRODUCTS = ["82011000", "82013000", "82015000", "82016000"];
const BASIS_MAP = {
  "82011000": "piece", // has SUPPLEMENTARY_QUANTITY
  "82013000": "kg",    // no piece data
  "82015000": "piece", // has SUPPLEMENTARY_QUANTITY
  "82016000": "kg",    // no piece data
};
// UN Comtrade only resolves to HS6 (Eurostat resolves to the finer CN8), so
// every Comtrade-sourced market's cells are keyed by hs6, not cn8 — see
// marketSkeleton/buildMarketsSkeleton. One HS6 per PRODUCTS entry here, no
// collisions, so this derivation is exact.
const PRODUCTS_HS6 = PRODUCTS.map((cn8) => cn8.slice(0, 6));

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
// UN Comtrade — the "every other reporter" source feeding the same
// trade.json, reusing every function above (computeTerciles/bandOf/
// computeBand/calculateMetrics/validateMetrics) unchanged. Free preview
// endpoint, no key, one (reporter, product, year) per request for tier-1
// detail — the endpoint rejects a multi-period query ("Maximum number of
// periods for preview is 1", verified live) — plus an all-reporter World
// query used for both roster discovery and every tier-2 market.
const COMTRADE_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
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

// ---------------------------------------------------------------------------
// Tier decision. This IS the privacy design — see the module doc comment.
// TIER1_MIN_USD is the entire rule for "full detail vs rate-of-change only";
// there is no per-country list anywhere else in this file that overrides it.
const TIER1_MIN_USD = 2000000; // combined latest-year import value, all 4 HS6 families
// How many tier-2 markets one shard batch refreshes. Tier-2 cells are cheap
// (World row only, no partner breakdown — see computeComtradeTier2Cells) but
// still processed in batches, one batch per shard run, for the same "small,
// predictable daily piece" reason tier 1 does one market per run.
const TIER2_BATCH_SIZE = 10;

// Reporter roster, cached into this script from a live pull (2026-08-07) of
// https://comtradeapi.un.org/files/v1/app/reference/Reporters.json, filtered
// to isGroup===false (drops aggregates like the EU/ASEAN/"Other Asia, nes"
// pseudo-reporters — Taiwan does not report to Comtrade as a reporter, only
// appears as the partner code TW_CODE above) and to entries carrying a
// current ISO alpha-2 (drops defunct entities with no ISO2 — Rhodesia-Nyasaland,
// pre-1963 Malaysia, etc. — which report no current data anyway). Entries
// whose name carries a "(...YYYY)" end-date (Czechoslovakia, the two German
// states pre-unification, pre-1974 India, pre-2011 Sudan, ...) are also
// dropped: each is a superseded predecessor of a still-listed current
// reporter that shares its ISO2, so keeping both would double an iso key.
// Verified live: after this filter every remaining iso2 is unique (223
// reporters) and every reporterCode with 2023/2024 trade data in this HS6
// family survived the filter (i.e. nothing with real data was dropped).
// code -> [iso2 lowercase, name]
const REPORTER_MAP = {"4":["af","Afghanistan"],"8":["al","Albania"],"12":["dz","Algeria"],"20":["ad","Andorra"],"24":["ao","Angola"],"28":["ag","Antigua and Barbuda"],"31":["az","Azerbaijan"],"32":["ar","Argentina"],"36":["au","Australia"],"40":["at","Austria"],"44":["bs","Bahamas"],"48":["bh","Bahrain"],"50":["bd","Bangladesh"],"51":["am","Armenia"],"52":["bb","Barbados"],"56":["be","Belgium"],"60":["bm","Bermuda"],"64":["bt","Bhutan"],"68":["bo","Bolivia (Plurinational State of)"],"70":["ba","Bosnia Herzegovina"],"72":["bw","Botswana"],"76":["br","Brazil"],"84":["bz","Belize"],"90":["sb","Solomon Isds"],"92":["vg","Br. Virgin Isds"],"96":["bn","Brunei Darussalam"],"100":["bg","Bulgaria"],"104":["mm","Myanmar"],"108":["bi","Burundi"],"112":["by","Belarus"],"116":["kh","Cambodia"],"120":["cm","Cameroon"],"124":["ca","Canada"],"132":["cv","Cabo Verde"],"136":["ky","Cayman Isds"],"140":["cf","Central African Rep."],"144":["lk","Sri Lanka"],"148":["td","Chad"],"152":["cl","Chile"],"156":["cn","China"],"170":["co","Colombia"],"174":["km","Comoros"],"175":["yt","Mayotte (Overseas France)"],"178":["cg","Congo"],"180":["cd","Dem. Rep. of the Congo"],"184":["ck","Cook Isds"],"188":["cr","Costa Rica"],"191":["hr","Croatia"],"192":["cu","Cuba"],"196":["cy","Cyprus"],"203":["cz","Czechia"],"204":["bj","Benin"],"208":["dk","Denmark"],"212":["dm","Dominica"],"214":["do","Dominican Rep."],"218":["ec","Ecuador"],"222":["sv","El Salvador"],"226":["gq","Equatorial Guinea"],"231":["et","Ethiopia"],"232":["er","Eritrea"],"233":["ee","Estonia"],"234":["fo","Faroe Isds"],"242":["fj","Fiji"],"246":["fi","Finland"],"251":["fr","France"],"254":["gf","French Guiana (Overseas France)"],"258":["pf","French Polynesia"],"262":["dj","Djibouti"],"266":["ga","Gabon"],"268":["ge","Georgia"],"270":["gm","Gambia"],"275":["ps","State of Palestine"],"276":["de","Germany"],"288":["gh","Ghana"],"292":["gi","Gibraltar"],"296":["ki","Kiribati"],"300":["gr","Greece"],"304":["gl","Greenland"],"308":["gd","Grenada"],"312":["gp","Guadeloupe (Overseas France)"],"320":["gt","Guatemala"],"324":["gn","Guinea"],"328":["gy","Guyana"],"332":["ht","Haiti"],"336":["va","Holy See (Vatican City State)"],"340":["hn","Honduras"],"344":["hk","China, Hong Kong SAR"],"348":["hu","Hungary"],"352":["is","Iceland"],"360":["id","Indonesia"],"364":["ir","Iran"],"368":["iq","Iraq"],"372":["ie","Ireland"],"376":["il","Israel"],"380":["it","Italy"],"384":["ci","Côte d'Ivoire"],"388":["jm","Jamaica"],"392":["jp","Japan"],"398":["kz","Kazakhstan"],"400":["jo","Jordan"],"404":["ke","Kenya"],"408":["kp","Dem. People's Rep. of Korea"],"410":["kr","Rep. of Korea"],"414":["kw","Kuwait"],"417":["kg","Kyrgyzstan"],"418":["la","Lao People's Dem. Rep."],"422":["lb","Lebanon"],"426":["ls","Lesotho"],"428":["lv","Latvia"],"430":["lr","Liberia"],"434":["ly","Libya"],"440":["lt","Lithuania"],"442":["lu","Luxembourg"],"446":["mo","China, Macao SAR"],"450":["mg","Madagascar"],"454":["mw","Malawi"],"458":["my","Malaysia"],"462":["mv","Maldives"],"466":["ml","Mali"],"470":["mt","Malta"],"474":["mq","Martinique (Overseas France)"],"478":["mr","Mauritania"],"480":["mu","Mauritius"],"484":["mx","Mexico"],"496":["mn","Mongolia"],"498":["md","Rep. of Moldova"],"499":["me","Montenegro"],"500":["ms","Montserrat"],"504":["ma","Morocco"],"508":["mz","Mozambique"],"512":["om","Oman"],"516":["na","Namibia"],"520":["nr","Nauru"],"524":["np","Nepal"],"528":["nl","Netherlands"],"531":["cw","Curaçao"],"533":["aw","Aruba"],"534":["sx","Saint Maarten"],"535":["bq","Bonaire"],"540":["nc","New Caledonia"],"548":["vu","Vanuatu"],"554":["nz","New Zealand"],"558":["ni","Nicaragua"],"562":["ne","Niger"],"566":["ng","Nigeria"],"570":["nu","Niue"],"579":["no","Norway"],"580":["mp","N. Mariana Isds"],"583":["fm","FS Micronesia"],"584":["mh","Marshall Isds"],"585":["pw","Palau"],"586":["pk","Pakistan"],"591":["pa","Panama"],"598":["pg","Papua New Guinea"],"600":["py","Paraguay"],"604":["pe","Peru"],"608":["ph","Philippines"],"616":["pl","Poland"],"620":["pt","Portugal"],"624":["gw","Guinea-Bissau"],"626":["tl","Timor-Leste"],"634":["qa","Qatar"],"638":["re","Réunion (Overseas France)"],"642":["ro","Romania"],"643":["ru","Russian Federation"],"646":["rw","Rwanda"],"652":["bl","Saint Barthélemy"],"654":["sh","Saint Helena"],"659":["kn","Saint Kitts and Nevis"],"660":["ai","Anguilla"],"662":["lc","Saint Lucia"],"666":["pm","Saint Pierre and Miquelon"],"670":["vc","Saint Vincent and the Grenadines"],"674":["sm","San Marino"],"678":["st","Sao Tome and Principe"],"682":["sa","Saudi Arabia"],"686":["sn","Senegal"],"688":["rs","Serbia"],"690":["sc","Seychelles"],"694":["sl","Sierra Leone"],"699":["in","India"],"702":["sg","Singapore"],"703":["sk","Slovakia"],"704":["vn","Viet Nam"],"705":["si","Slovenia"],"706":["so","Somalia"],"710":["za","South Africa"],"716":["zw","Zimbabwe"],"724":["es","Spain"],"728":["ss","South Sudan"],"729":["sd","Sudan"],"740":["sr","Suriname"],"748":["sz","Eswatini"],"752":["se","Sweden"],"757":["ch","Switzerland"],"760":["sy","Syria"],"762":["tj","Tajikistan"],"764":["th","Thailand"],"768":["tg","Togo"],"772":["tk","Tokelau"],"776":["to","Tonga"],"780":["tt","Trinidad and Tobago"],"784":["ae","United Arab Emirates"],"788":["tn","Tunisia"],"792":["tr","Türkiye"],"795":["tm","Turkmenistan"],"796":["tc","Turks and Caicos Isds"],"798":["tv","Tuvalu"],"800":["ug","Uganda"],"804":["ua","Ukraine"],"807":["mk","North Macedonia"],"818":["eg","Egypt"],"826":["gb","United Kingdom"],"834":["tz","United Rep. of Tanzania"],"842":["us","USA"],"854":["bf","Burkina Faso"],"858":["uy","Uruguay"],"860":["uz","Uzbekistan"],"862":["ve","Venezuela"],"876":["wf","Wallis and Futuna Isds"],"882":["ws","Samoa"],"887":["ye","Yemen"],"894":["zm","Zambia"]};

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * Comtrade-specific wrapper around httpsGet: retries on the API's own 429
 * shape. Verified live (2026-08-07): a 429 response body is valid JSON,
 * `{"statusCode":429,"message":"Rate limit is exceeded. Try again in N
 * seconds."}` — so httpsGet's plain JSON.parse already succeeds on it, and
 * this wrapper only needs to recognize that shape and retry, reading N
 * straight out of the API's own message rather than guessing a backoff.
 * Up to 3 retries; if still rate-limited after that, throws — which is what
 * turns into "this request failed" for the per-unit fail-closed handling in
 * mainShard (cursor not advanced, exit 0) and a warning in legacy mode.
 */
async function comtradeGet(url) {
  for (let attempt = 0; ; attempt++) {
    const json = await httpsGet(url);
    if (!json || json.statusCode !== 429) return json;
    if (attempt >= 3) {
      throw new Error("Comtrade rate limit: exhausted 3 retries — " + (json.message || ""));
    }
    const m = /(\d+)\s*second/i.exec(json.message || "");
    const waitS = (m ? Number(m[1]) : 3) + 0.5; // small buffer past what the API itself asked for
    console.warn(`[Comtrade] 429 (attempt ${attempt + 1}/3), waiting ${waitS}s: ${json.message}`);
    await sleepMs(waitS * 1000);
  }
}

function fetchComtradeOne(reporterCode, hs6, year) {
  const params = new URLSearchParams({
    reporterCode: String(reporterCode),
    period: year,
    cmdCode: hs6,
    flowCode: "M",
  });
  return comtradeGet(COMTRADE_BASE + "?" + params.toString());
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
 * de-dup rule. (The all-reporter World discovery query below needs a
 * SECOND dedup dimension, customsCode — see discoveryRowsForYear — that
 * this single-reporter shape never triggers.)
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
 *
 * Tier 2 does NOT get this treatment: it never fetches partner rows to sum
 * (that is the entire point of tier 2's low cost), so its World value comes
 * straight from the discovery query's own World row — a disclosed,
 * deliberate trade-off of the tier-2 shape, not an oversight. See
 * computeComtradeTier2Cells.
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
 * One all-reporter World-partner query for one (HS6, year): every reporter's
 * total import value for this commodity, in a single request
 * (reporterCode left empty + partnerCode=0&partner2Code=0). This is the
 * "everyone, mechanically" step the tier design depends on (see
 * TIER1_MIN_USD) and, for tier-2 markets, the ONLY request their cells need
 * — see computeComtradeTier2Cells.
 *
 * Needs a second dedup dimension beyond comtradeRowsForYear's motCode===0:
 * verified live (2026-08-07) that at this all-reporter shape some reporters
 * (e.g. Albania, Antigua and Barbuda) return one row per customs procedure
 * (customsCode C00/C01/C20/...) even after collapsing transport mode, where
 * C00 is already their sum across procedures — e.g. Albania 820150/2024:
 * C00 and C01 both report the identical cifvalue 106784.375 (single
 * procedure, so C00 equals its own breakdown); Antigua and Barbuda
 * 820150/2024: C01 159.563 + C20 7788.57 = C00 7948.133 to the thousandth.
 * customsCode==='C00' is to this discovery shape what motCode===0 is to the
 * single-reporter shape (comtradeRowsForYear) — neither reporter triggers
 * this on the single-reporter query, which is why that function does not
 * need it.
 */
function discoveryRowsForYear(json) {
  const rows = (json && Array.isArray(json.data)) ? json.data : [];
  const totals = rows.filter((r) => r.motCode === 0 && r.customsCode === "C00" && r.reporterCode !== 0);
  const byReporter = {};
  for (const r of totals) {
    const code = String(r.reporterCode);
    const sup = (r.altQtyUnitCode === 5 && r.altQty > 0) ? r.altQty : 0;
    byReporter[code] = { VALUE: r.cifvalue || 0, QTY_100KG: (r.netWgt || 0) / 100, SUP: sup, altQtyUnitCode: r.altQtyUnitCode };
  }
  return byReporter;
}

/**
 * All 4 HS6 families' all-reporter World rows for one year: 4 requests,
 * >=1.1s apart, regardless of how many reporters end up mattering to the
 * caller — discovery and every tier-2 batch shard call this once per year
 * they need and then just read the reporters they care about out of it.
 */
async function fetchWorldDiscoveryYear(year) {
  const byHs6 = {};
  for (const hs6 of PRODUCTS_HS6) {
    await sleepMs(1100);
    const params = new URLSearchParams({ reporterCode: "", period: year, cmdCode: hs6, flowCode: "M", partnerCode: "0", partner2Code: "0" });
    const json = await comtradeGet(COMTRADE_BASE + "?" + params.toString());
    if (json && json.error) throw new Error(`discovery ${hs6}/${year}: ${json.error}`);
    byHs6[hs6] = discoveryRowsForYear(json);
    console.log(`[discovery] ${hs6}/${year}: ${Object.keys(byHs6[hs6]).length} reporters`);
  }
  return byHs6;
}

/**
 * The tier decision itself. disc24: {hs6: {reporterCode: {VALUE,...}}} for
 * the latest year only — tier is a once-a-season roster decision, not a
 * metric that needs to track both years. Eurostat's six markets are
 * excluded here by iso (Eurostat already covers them, at finer CN8 detail —
 * a source-precedence rule, not a market judgment) so they never appear
 * twice. Every other reporter with a REPORTER_MAP entry and any nonzero
 * value across the 4 families lands in tier1 or tier2 by TIER1_MIN_USD
 * alone. Reporters with literally no data in any of the 4 families are
 * absent — not excluded by choice, just nothing to publish.
 */
function buildRoster(disc24) {
  const totals = {}; // reporterCode -> summed VALUE across the 4 hs6
  for (const hs6 of PRODUCTS_HS6) {
    const byReporter = disc24[hs6] || {};
    for (const code of Object.keys(byReporter)) {
      totals[code] = (totals[code] || 0) + (byReporter[code].VALUE || 0);
    }
  }
  const eurostatIsoSet = new Set(REPORTERS.map((r) => r.toLowerCase()));
  const tier1 = [], tier2 = [];
  for (const code of Object.keys(totals)) {
    const ref = REPORTER_MAP[code];
    if (!ref) continue; // not a usable current reporter — see REPORTER_MAP note
    const [iso, name] = ref;
    if (eurostatIsoSet.has(iso)) continue; // Eurostat already publishes this market, at finer detail
    const val = totals[code];
    if (val >= TIER1_MIN_USD) tier1.push({ iso, name, reporterCode: code, val });
    else if (val > 0) tier2.push({ iso, name, reporterCode: code, val });
  }
  const byIso = (a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);
  tier1.sort(byIso);
  tier2.sort(byIso);
  return { tier1, tier2 };
}

/**
 * Fetch all 2023 & 2024 data for DE/NL/FR/ES/PL/IT × every partner Comext
 * reports × all products. No `partner` param is sent — omitting it is how
 * the full ~278-code list (individual countries, plus the aggregates/
 * pseudo-partners filtered out at use-site) was discovered in the first
 * place.
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
 * Eurostat's six markets, full detail, in one pass over fetchEurostatData()'s
 * output — the eurostat_all work unit. Returns {iso: {cn8: metrics}}; src
 * and tier live on the market object (see marketSkeleton), not per-cell.
 */
function computeEurostatCells(euData) {
  const reporterKeyOf = {}; REPORTERS.forEach((r) => { reporterKeyOf[r] = r.toLowerCase(); });
  const out = {};
  for (const [reporterCode, products] of Object.entries(euData)) {
    const iso = reporterKeyOf[reporterCode];
    if (!iso) continue;
    const cells = {};
    for (const [productCode, partners] of Object.entries(products)) {
      const basis = BASIS_MAP[productCode] || "kg";
      const tw23 = partners.TW?.["2023"] || null;
      const tw24 = partners.TW?.["2024"] || null;
      const cn23 = partners.CN?.["2023"] || null;
      const cn24 = partners.CN?.["2024"] || null;
      const world23 = partners.WORLD?.["2023"] || null;
      const world24 = partners.WORLD?.["2024"] || null;

      // Unit value and volume are MARKET-WIDE (WORLD) — the card says what the
      // market is paying, not what Taiwan-origin goods cost. TW/CN rows feed
      // the origin-share columns only.
      const metrics = calculateMetrics(reporterCode, productCode, world23, world24, basis);

      if (world24 && world24.VALUE && world24.VALUE > 0) {
        if (tw24 && tw24.VALUE) metrics.share_tw = Math.round((tw24.VALUE / world24.VALUE) * 100);
        if (cn24 && cn24.VALUE) metrics.share_cn = Math.round((cn24.VALUE / world24.VALUE) * 100);
      }
      if (world23 && world23.VALUE && world23.VALUE > 0 && tw23 && tw23.VALUE) {
        metrics.share_tw_prev = Math.round((tw23.VALUE / world23.VALUE) * 100);
      }

      // Price-band: value-weighted thirds of every source country's unit
      // value. `partners` here already carries every partner code this pull
      // returned (the `partner` param is no longer sent — see
      // fetchEurostatData), so no second fetch is needed.
      const partners24 = {}, partners23 = {};
      for (const [code, years] of Object.entries(partners)) {
        if (years["2024"]) partners24[code] = years["2024"];
        if (years["2023"]) partners23[code] = years["2023"];
      }
      metrics.band = computeBand(partners24, partners23, world24, world23, tw24, basis);

      validateMetrics(metrics);
      cells[productCode] = metrics;
      console.log(
        `[metrics] ${reporterCode}/${productCode} (eurostat): stale=${metrics.stale}, uv=${metrics.uv_change_pct}, share_tw=${metrics.share_tw}, ` +
        `band=${metrics.band ? metrics.band.market : null}, band.tw=${metrics.band ? metrics.band.tw : null}, moved=${metrics.band ? metrics.band.moved : null}`
      );
    }
    out[iso] = cells;
  }
  return out;
}

/**
 * Full-detail cells for ONE tier-1 Comtrade market: 4 products x 2 years =
 * 8 requests, >=1.1s apart, via the single-reporter endpoint (partner
 * breakdown, self-summed World, decideComtradeBasis, computeBand — all
 * unchanged from before this rewrite, just parameterized per-market instead
 * of looping a fixed 4-country list). Cell keys are hs6 (Comtrade's own
 * resolution) — see PRODUCTS_HS6.
 */
async function computeComtradeTier1Cells(iso, reporterCode) {
  const cells = {};
  for (const hs6 of PRODUCTS_HS6) {
    const perYear = {};
    for (const year of COMTRADE_YEARS) {
      await sleepMs(1100);
      const json = await fetchComtradeOne(reporterCode, hs6, year);
      if (json && json.error) throw new Error(`${iso}/${hs6}/${year}: ${json.error}`);
      perYear[year] = comtradeRowsForYear(json);
      console.log(`[Comtrade tier1] ${iso}/${hs6}/${year}: ${Object.keys(perYear[year].partners).length} source rows`);
    }
    const y24 = perYear["2024"], y23 = perYear["2023"];
    if (!y24 && !y23) {
      cells[hs6] = { basis: "kg", uv_change_pct: null, vol_change_pct: null, share_tw: null, share_tw_prev: null, share_cn: null, stale: true, band: null };
      continue;
    }
    // Basis decided from the latest year available (falls back to 2023 if
    // 2024's request failed), then applied to both years for a like-for-like uv_change_pct.
    const basisSrc = y24 || y23;
    const basis = decideComtradeBasis(basisSrc.partners, basisSrc.worldRowApi);

    const w24 = y24 ? buildComtradeWorld(y24.partners, y24.worldRowApi, basis) : null;
    const w23 = y23 ? buildComtradeWorld(y23.partners, y23.worldRowApi, basis) : null;

    const world24 = w24 ? w24.world : null;
    const world23 = w23 ? w23.world : null;
    const tw24 = y24 ? (y24.partners[TW_CODE] || null) : null;
    const tw23 = y23 ? (y23.partners[TW_CODE] || null) : null;
    const cn24 = y24 ? (y24.partners[CN_CODE] || null) : null;

    const metrics = calculateMetrics(iso, hs6, world23, world24, basis);

    if (world24 && world24.VALUE > 0) {
      if (tw24 && tw24.VALUE) metrics.share_tw = Math.round((tw24.VALUE / world24.VALUE) * 100);
      if (cn24 && cn24.VALUE) metrics.share_cn = Math.round((cn24.VALUE / world24.VALUE) * 100);
    }
    if (world23 && world23.VALUE > 0 && tw23 && tw23.VALUE) {
      metrics.share_tw_prev = Math.round((tw23.VALUE / world23.VALUE) * 100);
    }

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
    cells[hs6] = metrics;
    console.log(
      `[metrics] ${iso}/${hs6} (comtrade tier1): stale=${metrics.stale}, basis=${basis}, uv=${metrics.uv_change_pct}, share_tw=${metrics.share_tw}, ` +
      `band=${metrics.band ? metrics.band.market : null}, band.tw=${metrics.band ? metrics.band.tw : null}, moved=${metrics.band ? metrics.band.moved : null}, ` +
      `world_cross_check=${w24 ? w24.crossCheck : "n/a"}`
    );
  }
  return cells;
}

/**
 * Rate-of-change-only cells for a BATCH of tier-2 markets: 4 products x 2
 * years = 8 all-reporter World-discovery requests TOTAL for the whole batch
 * (not per market — see fetchWorldDiscoveryYear), then every market in
 * `isos` just reads its own reporter's World row out of that. No partner
 * breakdown is ever fetched for tier 2, so band and share are structurally
 * absent — the tier-2 contract is exactly {basis, uv_change_pct, stale}.
 */
async function computeComtradeTier2Cells(isos, isoToCode) {
  const disc23 = await fetchWorldDiscoveryYear("2023");
  const disc24 = await fetchWorldDiscoveryYear("2024");
  const out = {};
  for (const iso of isos) {
    const code = isoToCode[iso];
    const cells = {};
    for (const hs6 of PRODUCTS_HS6) {
      const w24row = code ? (disc24[hs6][code] || null) : null;
      const w23row = code ? (disc23[hs6][code] || null) : null;
      const basis = (w24row && w24row.altQtyUnitCode === 5 && (w24row.SUP || 0) > 0) ? "piece"
        : (w23row && w23row.altQtyUnitCode === 5 && (w23row.SUP || 0) > 0) ? "piece" : "kg";
      const metrics = calculateMetrics(iso, hs6, w23row, w24row, basis);
      validateMetrics(metrics); // same ±50% contract as tier 1 — see the module doc comment
      cells[hs6] = { basis: metrics.basis, uv_change_pct: metrics.uv_change_pct, stale: metrics.stale };
      console.log(`[metrics] ${iso}/${hs6} (comtrade tier2): stale=${metrics.stale}, basis=${metrics.basis}, uv=${metrics.uv_change_pct}`);
    }
    out[iso] = cells;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Skeleton / work-unit bookkeeping.

/** iso -> Comtrade reporterCode, the inverse of REPORTER_MAP (safe: verified
 * zero duplicate iso2 after the historical-entity filter — see REPORTER_MAP). */
function invertReporterMap() {
  const out = {};
  for (const code of Object.keys(REPORTER_MAP)) out[REPORTER_MAP[code][0]] = code;
  return out;
}

function marketSkeleton(name, tier, src, cellKeys) {
  const cells = {};
  for (const k of cellKeys) cells[k] = { stale: true }; // pending: not fetched yet this season
  return { n: name, tier, src, cells };
}

function buildMarketsSkeleton(roster) {
  const markets = {};
  for (const r of REPORTERS) markets[r.toLowerCase()] = marketSkeleton(EUROSTAT_NAMES[r] || r, 1, "eurostat", PRODUCTS);
  for (const m of roster.tier1) markets[m.iso] = marketSkeleton(m.name, 1, "comtrade", PRODUCTS_HS6);
  for (const m of roster.tier2) markets[m.iso] = marketSkeleton(m.name, 2, "comtrade", PRODUCTS_HS6);
  return markets;
}

/**
 * shard_state.cursor indexes into THIS array, rebuilt fresh every run from
 * whatever markets/tier/src trade.json's skeleton already carries — the
 * unit plan is never itself persisted, only the roster it's derived from is
 * (as the markets object), so this function must be a pure, deterministic
 * function of that roster or two runs would disagree about what "unit 7"
 * means. Order: one unit for all of Eurostat (already a single cheap
 * request for all six countries — no reason to split it), then one unit per
 * discovered tier-1 Comtrade market (alphabetical by iso), then tier-2
 * markets chunked into TIER2_BATCH_SIZE-sized batches (alphabetical by iso).
 */
function buildWorkUnits(markets) {
  const units = [{ type: "eurostat_all" }];
  const t1 = [], t2 = [];
  for (const iso of Object.keys(markets)) {
    const m = markets[iso];
    if (m.src !== "comtrade") continue; // eurostat markets are covered by the one eurostat_all unit
    if (m.tier === 1) t1.push(iso);
    else if (m.tier === 2) t2.push(iso);
  }
  t1.sort(); t2.sort();
  for (const iso of t1) units.push({ type: "comtrade_tier1", iso });
  for (let i = 0; i < t2.length; i += TIER2_BATCH_SIZE) units.push({ type: "comtrade_tier2_batch", isos: t2.slice(i, i + TIER2_BATCH_SIZE) });
  return units;
}

function computeQuarter(d) {
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

const SOURCES = {
  eu: "Eurostat Comext DS-045409",
  world: "UN Comtrade (HS6)",
  uk: "unavailable",
};

const MAX_TRADE_BYTES = 200 * 1024;

function readExistingTrade() {
  try {
    const raw = fs.readFileSync(TRADE_JSON, "utf8");
    const j = JSON.parse(raw);
    return (j && typeof j === "object") ? j : null;
  } catch (e) {
    return null; // missing, unreadable, or corrupt — treated the same as "no file yet"
  }
}

function writeTradeJSON(trade) {
  const serialized = JSON.stringify(trade, null, 2) + "\n";
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > MAX_TRADE_BYTES) {
    console.error(`[fail-closed] trade.json would be ${bytes} bytes, over the ${MAX_TRADE_BYTES}-byte contract; not writing. Trim tier2 cell fields first.`);
    process.exit(1);
  }
  fs.writeFileSync(TRADE_JSON, serialized, { encoding: "utf8", flag: "w" });
  console.log(`[write] ${TRADE_JSON} (${bytes} bytes)`);
}

/**
 * Season-opening discovery: one all-reporter World query (latest year only —
 * tier is a roster decision, not a metric) across the 4 HS6 families, then
 * the mechanical tier split (buildRoster). Writes ONLY the markets skeleton
 * (n/tier/src, cells all {stale:true}) — no numbers from this pull are ever
 * carried into a published cell; every cell gets its real value later, from
 * its own unit's turn (computeEurostatCells / computeComtradeTier1Cells /
 * computeComtradeTier2Cells), which is what keeps published figures as
 * fresh as the day they were fetched instead of the day the season opened.
 */
async function runDiscovery() {
  console.log("[discovery] all-reporter World query, latest year, 4 HS6 families (tier decision only)...");
  const disc24 = await fetchWorldDiscoveryYear("2024");
  const roster = buildRoster(disc24);
  const markets = buildMarketsSkeleton(roster);
  console.log(`[discovery] tier1: ${REPORTERS.length} eurostat + ${roster.tier1.length} comtrade = ${REPORTERS.length + roster.tier1.length}; tier2: ${roster.tier2.length}`);
  return { markets, roster };
}

/**
 * shard_state = {cursor, completed_pct, quarter}. cursor indexes into
 * buildWorkUnits(markets) (rebuilt fresh each run, never stored). Every
 * invocation of --shard does AT MOST one of:
 *   (a) no trade.json yet, or its edition != this quarter: run discovery,
 *       write the skeleton, cursor=0. This consumes the ENTIRE run — the
 *       roster is decided once per season and nothing else happens the same
 *       day, so a market's tier can never be read as "decided around
 *       today's leftover request budget."
 *   (b) cursor < units.length: process units[cursor], merge its cells into
 *       the EXISTING trade.json (every other market's cells untouched),
 *       cursor += 1.
 *   (c) cursor >= units.length: season's work is done; no-op until the
 *       quarter rolls over.
 * Any request failure inside (b) — including a Comtrade rate limit that
 * outlasts comtradeGet's 3 retries — aborts just that unit: nothing from it
 * is merged, cursor does not advance, and the process still exits 0. The
 * unit is retried in full on the next scheduled run. This is what keeps a
 * single flaky Comtrade request from ever turning the nightly news job red.
 */
async function mainShard() {
  const now = new Date();
  const edition = computeQuarter(now);
  const existing = readExistingTrade();

  if (!existing || existing.schema !== 2 || existing.edition !== edition) {
    const { markets } = await runDiscovery();
    const trade = {
      schema: 2,
      edition,
      generated: now.toISOString(),
      shard_state: { cursor: 0, completed_pct: 0, quarter: edition },
      sources: SOURCES,
      markets,
    };
    writeTradeJSON(trade);
    return;
  }

  const units = buildWorkUnits(existing.markets);
  const cursor = existing.shard_state.cursor;
  if (cursor >= units.length) {
    console.log(`[shard] season complete (${cursor}/${units.length}) — nothing to do until the edition rolls over`);
    return;
  }

  const unit = units[cursor];
  const isoToCode = invertReporterMap();
  let patch = null;
  try {
    if (unit.type === "eurostat_all") {
      const eu = await fetchEurostatData();
      if (eu.errors.length) console.warn("[Eurostat] errors:", eu.errors);
      patch = computeEurostatCells(eu.data);
    } else if (unit.type === "comtrade_tier1") {
      const code = isoToCode[unit.iso];
      if (!code) throw new Error("no reporterCode for iso " + unit.iso);
      patch = { [unit.iso]: await computeComtradeTier1Cells(unit.iso, code) };
    } else if (unit.type === "comtrade_tier2_batch") {
      patch = await computeComtradeTier2Cells(unit.isos, isoToCode);
    } else {
      throw new Error("unknown unit type: " + unit.type);
    }
  } catch (e) {
    console.error(`[shard] unit ${cursor}/${units.length} (${unit.type}) failed, cursor NOT advanced: ${e.message}`);
    return; // exit 0 — see doc comment above
  }

  // NOTE, from live testing (2026-08): an earlier version of this function
  // also refused to advance the cursor when >50% of the unit's freshly
  // computed cells came back stale, on the theory that "mostly stale" meant
  // "the request half-failed." Live data proved that theory wrong — Comtrade
  // genuinely reports incomplete quantity data for some (reporter, HS6)
  // pairs (Australia/820150 2023-2024: netWgt missing on all but a handful
  // of partner rows, each year a different handful), which
  // validateMetrics' own ±50% uv_change_pct contract correctly (and
  // separately) marks stale — that is calculateMetrics/validateMetrics
  // working as designed, not a request failure, and a market that happens
  // to have thin Comtrade data is not rare enough to gate the cursor on.
  // Blocking cursor advancement on it would have meant Australia — a
  // reporter that reappears every day discovery runs — permanently stalling
  // the season at the exact same unit. The unit-processing try/catch above
  // (thrown errors: rate-limit exhaustion, a Comtrade error field, an
  // unreachable API) is the only thing that withholds cursor advancement
  // now; a cell that computed successfully and simply came back stale is
  // published as stale, exactly like every other stale cell in this file.
  for (const iso of Object.keys(patch)) {
    if (!existing.markets[iso]) continue; // defensive; should not happen
    Object.assign(existing.markets[iso].cells, patch[iso]);
  }
  existing.generated = now.toISOString();
  existing.shard_state = { cursor: cursor + 1, completed_pct: Math.round(((cursor + 1) / units.length) * 100), quarter: edition };
  writeTradeJSON(existing);
  const label = unit.iso || (unit.isos ? unit.isos.join(",") : "");
  console.log(`[shard] processed unit ${cursor}/${units.length} (${unit.type}${label ? " " + label : ""}), cursor -> ${existing.shard_state.cursor} (${existing.shard_state.completed_pct}%)`);
}

/**
 * No --shard: the old "one shot, local dev" behavior, scoped to tier 1
 * (discovery decides the roster, then Eurostat + every discovered tier-1
 * Comtrade market are fetched in full) — tier 2 exists purely to be sharded
 * across days and is left pending (stale:true) here. shard_state is still
 * written, positioned exactly where a --shard run would be after finishing
 * all of tier 1, so a subsequent `--shard` invocation picks up at the first
 * tier-2 batch instead of redoing work this run already did.
 */
async function mainLegacy() {
  console.log("[fetch-trade] legacy mode: full tier-1 fetch (discovery + Eurostat + every discovered Comtrade tier-1 market)...");
  const now = new Date();
  const edition = computeQuarter(now);
  const { markets, roster } = await runDiscovery();

  const eu = await fetchEurostatData();
  if (eu.errors.length) console.warn("[Eurostat] errors:", eu.errors);
  const euCells = computeEurostatCells(eu.data);
  for (const iso of Object.keys(euCells)) Object.assign(markets[iso].cells, euCells[iso]);

  let staleCount = 0, totalCount = 0;
  for (const cells of Object.values(euCells)) for (const c of Object.values(cells)) { totalCount++; if (c.stale) staleCount++; }

  for (let i = 0; i < roster.tier1.length; i++) {
    const m = roster.tier1[i];
    console.log(`[legacy] comtrade tier1 ${i + 1}/${roster.tier1.length}: ${m.iso}`);
    try {
      const cells = await computeComtradeTier1Cells(m.iso, m.reporterCode);
      Object.assign(markets[m.iso].cells, cells);
      for (const c of Object.values(cells)) { totalCount++; if (c.stale) staleCount++; }
    } catch (e) {
      console.warn(`[legacy] ${m.iso} failed, left pending: ${e.message}`);
    }
  }

  if (totalCount > 0) {
    const staleRatio = staleCount / totalCount;
    if (staleRatio > 0.5) {
      console.error(`[fail-closed] ${staleCount}/${totalCount} tier-1 entries stale (${(staleRatio * 100).toFixed(1)}%) > 50% threshold — not writing`);
      process.exit(1);
    }
  }

  const units = buildWorkUnits(markets);
  const cursorAfterTier1 = 1 + roster.tier1.length; // eurostat_all + every tier1 unit, in buildWorkUnits' own order
  const trade = {
    schema: 2,
    edition,
    generated: now.toISOString(),
    shard_state: { cursor: cursorAfterTier1, completed_pct: Math.round((cursorAfterTier1 / units.length) * 100), quarter: edition },
    sources: SOURCES,
    markets,
  };
  writeTradeJSON(trade);
}

async function main() {
  const isShard = process.argv.includes("--shard");
  try {
    if (isShard) await mainShard();
    else await mainLegacy();
    process.exit(0);
  } catch (err) {
    console.error("[error]", err);
    // Shard mode must never take the nightly news job down (see the
    // shard_state doc comment on mainShard); an error escaping this far is a
    // bug in this script rather than one request's failure (those are
    // already caught per-unit inside mainShard), but it still must not turn
    // CI red — the workflow step around this script is continue-on-error as
    // a second line of defense, this is the first.
    process.exit(isShard ? 0 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  REPORTER_MAP, REPORTERS, PRODUCTS, PRODUCTS_HS6, TIER1_MIN_USD, TIER2_BATCH_SIZE,
  buildRoster, buildMarketsSkeleton, buildWorkUnits, invertReporterMap, computeQuarter,
  computeTerciles, bandOf, computeBand, calculateMetrics, validateMetrics,
  computeEurostatCells, computeComtradeTier1Cells, computeComtradeTier2Cells,
  fetchWorldDiscoveryYear,
};
