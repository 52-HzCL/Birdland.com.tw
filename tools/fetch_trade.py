#!/usr/bin/env python3
"""Fetch trade statistics from Eurostat Comext (DE/NL/FR/ES/PL/IT) and UN
Comtrade (every other reporter), produce trade.json with uv_change, share
and price-band metrics, and fail-closed validation.

schema 2 -- full-coverage, tiered, sharded (2026-08 rewrite). The market
list used to be a hand-picked set of countries (US/JP/IL/AU alongside the
Eurostat six). That is gone. Which countries appear on trade.json now is a
MECHANICAL function of public trade statistics -- see TIER1_MIN_USD below --
with no per-country exception anywhere in this file. This is a privacy
property, not a data-quality one: a market appearing on the shelf must never
read as "Birdland has a customer there," and the only way to guarantee that
is for the list to be something a stranger could reconstruct from Comtrade's
own public numbers, with the same threshold applied to every reporter.
Widening or narrowing coverage means editing TIER1_MIN_USD (or tier 2's "any
nonzero import" floor) -- never adding or removing a country by name.

Two tiers per market:
  tier 1 -- full source-country breakdown: uv_change_pct, vol_change_pct,
    share_tw/share_cn, and the value-weighted price band. Eurostat's six
    (DE/NL/FR/ES/PL/IT) are unconditionally tier 1 (a structural fact about
    which source covers them, not a market pick); every other reporter is
    tier 1 when this HS6 family's combined latest-year import value clears
    TIER1_MIN_USD.
  tier 2 -- World-row only: uv_change_pct + basis + stale. No band, no
    share -- both need partner-level detail tier 2 deliberately never
    fetches. Every reporter with ANY nonzero import in the family and under
    the tier-1 threshold.

Sharded for CI (see --shard below and the docstring on main_shard): one
day's cron run does one small piece -- the season-opening "global discovery"
that decides the roster, one tier-1 market's full detail, or a batch of
tier-2 markets' World rows -- never the whole file. Running with no flags
keeps the old "one shot, local dev" behavior, scoped to tier 1 only
(discovery + Eurostat + every discovered tier-1 Comtrade market) since tier
2 exists purely to be sharded across days.

Eurostat API: https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/ds-045409
UN Comtrade API: https://comtradeapi.un.org/public/v1/preview/C/A/HS (free preview, no key)
UK (HMRC uktradeinfo) is not wired: the OTS API needs a CN8-to-CommodityId
mapping with no public lookup endpoint. sources["uk"] stays "unavailable" --
this is about the dedicated HMRC integration only, and does not stop the UK
from appearing as its own Comtrade-sourced market (reporter code 826, iso
"gb") like any other mechanically-qualifying reporter; see REPORTER_MAP.

This is a line-for-line port of tools/dev/fetch-trade.js -- see that file
for the fuller commentary on any function whose docstring here is short.
"""
import os,sys,json,datetime,urllib.request,urllib.parse,urllib.error,time,re,math

HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRADE_PATH=os.path.join(HERE,"trade.json")

EUROSTAT_BASE="https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/ds-045409"
REPORTERS=["DE","NL","FR","ES","PL","IT"]
EUROSTAT_NAMES={"DE":"Germany","NL":"Netherlands","FR":"France","ES":"Spain","PL":"Poland","IT":"Italy"}
PRODUCTS=["82011000","82013000","82015000","82016000","82130000","82021000"]
BASIS_MAP={"82011000":"piece","82013000":"kg","82015000":"piece","82016000":"kg","82130000":"kg","82021000":"kg"}  # 82130000/82021000: no piece data (verified live, 2026-08 -- see tools/dev/_tmp-probe.js run)
# Comtrade only resolves to HS6 (Eurostat resolves to the finer CN8), so every
# Comtrade-sourced market's cells are keyed by hs6 -- see marketSkeleton.
PRODUCTS_HS6=[cn8[:6] for cn8 in PRODUCTS]

BAND_EXCLUDE_PARTNERS={
    "WORLD",
    "EXT_EA","EXT_EA21","EXT_EU","EXT_EU27_2020",
    "INT_EA","INT_EA21","INT_EU","INT_EU27_2020",
    "QP","QQ","QR","QS","QU","QV","QW","QX","QY","QZ",
}
BAND_MIN_SOURCES=5    # fewer valid countries than this: band is null, not guessed
BAND_MIN_SHARE=0.005  # <0.5% of WORLD value: re-export/rounding noise, dropped
BAND_MIN_TW_SHARE=0.02  # see fetch-trade.js: a positioning claim needs a real share
BAND_TOP_N=20         # top 15-20 sources by import value, per the brief

# ---------------------------------------------------------------------------
# UN Comtrade -- the "every other reporter" source feeding the same
# trade.json, reusing every function above (compute_terciles/band_of/
# compute_band/calculate_metrics/validate_metrics) unchanged.
COMTRADE_BASE="https://comtradeapi.un.org/public/v1/preview/C/A/HS"
COMTRADE_YEARS=["2023","2024"]
TW_CODE="490"  # "Other Asia, nes" -- the UN's placeholder for Taiwan (One-China nomenclature)
CN_CODE="156"

# Regional catch-alls / non-trade categories to exclude from the source-country
# sum and the tercile sample -- pulled from https://comtradeapi.un.org/files/v1/
# app/reference/partnerAreas.json (live, 2026-08-07): every entry whose label
# ends ", nes" plus Bunkers/Free Zones/Special Categories/Neutral Zone.
# Deliberately excludes 490 "Other Asia, nes" from this list -- see above.
COMTRADE_NES_CODES=["472","899","837","471","129","221","697","492","838","473","536","637","290","527","577","568","636","839","879"]
for _c in COMTRADE_NES_CODES:
    BAND_EXCLUDE_PARTNERS.add(_c)

# ---------------------------------------------------------------------------
# Tier decision. This IS the privacy design -- see the module docstring.
TIER1_MIN_USD=2000000  # combined latest-year import value, all 6 HS6 families
TIER2_BATCH_SIZE=10    # tier-2 markets refreshed per shard batch

# Reporter roster, cached into this script from a live pull (2026-08-07) of
# https://comtradeapi.un.org/files/v1/app/reference/Reporters.json -- see the
# matching comment in tools/dev/fetch-trade.js for the exact filter (drops
# isGroup aggregates, defunct entities with no ISO2, and any entry whose name
# carries a "(...YYYY)" end-date, which is always a superseded predecessor of
# a still-listed current reporter sharing its ISO2). 223 reporters, unique
# iso2 verified, nothing with real 2023/2024 data in this HS6 family dropped.
# code -> (iso2 lowercase, name)
REPORTER_MAP={"4":("af","Afghanistan"),"8":("al","Albania"),"12":("dz","Algeria"),"20":("ad","Andorra"),"24":("ao","Angola"),"28":("ag","Antigua and Barbuda"),"31":("az","Azerbaijan"),"32":("ar","Argentina"),"36":("au","Australia"),"40":("at","Austria"),"44":("bs","Bahamas"),"48":("bh","Bahrain"),"50":("bd","Bangladesh"),"51":("am","Armenia"),"52":("bb","Barbados"),"56":("be","Belgium"),"60":("bm","Bermuda"),"64":("bt","Bhutan"),"68":("bo","Bolivia (Plurinational State of)"),"70":("ba","Bosnia Herzegovina"),"72":("bw","Botswana"),"76":("br","Brazil"),"84":("bz","Belize"),"90":("sb","Solomon Isds"),"92":("vg","Br. Virgin Isds"),"96":("bn","Brunei Darussalam"),"100":("bg","Bulgaria"),"104":("mm","Myanmar"),"108":("bi","Burundi"),"112":("by","Belarus"),"116":("kh","Cambodia"),"120":("cm","Cameroon"),"124":("ca","Canada"),"132":("cv","Cabo Verde"),"136":("ky","Cayman Isds"),"140":("cf","Central African Rep."),"144":("lk","Sri Lanka"),"148":("td","Chad"),"152":("cl","Chile"),"156":("cn","China"),"170":("co","Colombia"),"174":("km","Comoros"),"175":("yt","Mayotte (Overseas France)"),"178":("cg","Congo"),"180":("cd","Dem. Rep. of the Congo"),"184":("ck","Cook Isds"),"188":("cr","Costa Rica"),"191":("hr","Croatia"),"192":("cu","Cuba"),"196":("cy","Cyprus"),"203":("cz","Czechia"),"204":("bj","Benin"),"208":("dk","Denmark"),"212":("dm","Dominica"),"214":("do","Dominican Rep."),"218":("ec","Ecuador"),"222":("sv","El Salvador"),"226":("gq","Equatorial Guinea"),"231":("et","Ethiopia"),"232":("er","Eritrea"),"233":("ee","Estonia"),"234":("fo","Faroe Isds"),"242":("fj","Fiji"),"246":("fi","Finland"),"251":("fr","France"),"254":("gf","French Guiana (Overseas France)"),"258":("pf","French Polynesia"),"262":("dj","Djibouti"),"266":("ga","Gabon"),"268":("ge","Georgia"),"270":("gm","Gambia"),"275":("ps","State of Palestine"),"276":("de","Germany"),"288":("gh","Ghana"),"292":("gi","Gibraltar"),"296":("ki","Kiribati"),"300":("gr","Greece"),"304":("gl","Greenland"),"308":("gd","Grenada"),"312":("gp","Guadeloupe (Overseas France)"),"320":("gt","Guatemala"),"324":("gn","Guinea"),"328":("gy","Guyana"),"332":("ht","Haiti"),"336":("va","Holy See (Vatican City State)"),"340":("hn","Honduras"),"344":("hk","China, Hong Kong SAR"),"348":("hu","Hungary"),"352":("is","Iceland"),"360":("id","Indonesia"),"364":("ir","Iran"),"368":("iq","Iraq"),"372":("ie","Ireland"),"376":("il","Israel"),"380":("it","Italy"),"384":("ci","Côte d'Ivoire"),"388":("jm","Jamaica"),"392":("jp","Japan"),"398":("kz","Kazakhstan"),"400":("jo","Jordan"),"404":("ke","Kenya"),"408":("kp","Dem. People's Rep. of Korea"),"410":("kr","Rep. of Korea"),"414":("kw","Kuwait"),"417":("kg","Kyrgyzstan"),"418":("la","Lao People's Dem. Rep."),"422":("lb","Lebanon"),"426":("ls","Lesotho"),"428":("lv","Latvia"),"430":("lr","Liberia"),"434":("ly","Libya"),"440":("lt","Lithuania"),"442":("lu","Luxembourg"),"446":("mo","China, Macao SAR"),"450":("mg","Madagascar"),"454":("mw","Malawi"),"458":("my","Malaysia"),"462":("mv","Maldives"),"466":("ml","Mali"),"470":("mt","Malta"),"474":("mq","Martinique (Overseas France)"),"478":("mr","Mauritania"),"480":("mu","Mauritius"),"484":("mx","Mexico"),"496":("mn","Mongolia"),"498":("md","Rep. of Moldova"),"499":("me","Montenegro"),"500":("ms","Montserrat"),"504":("ma","Morocco"),"508":("mz","Mozambique"),"512":("om","Oman"),"516":("na","Namibia"),"520":("nr","Nauru"),"524":("np","Nepal"),"528":("nl","Netherlands"),"531":("cw","Curaçao"),"533":("aw","Aruba"),"534":("sx","Saint Maarten"),"535":("bq","Bonaire"),"540":("nc","New Caledonia"),"548":("vu","Vanuatu"),"554":("nz","New Zealand"),"558":("ni","Nicaragua"),"562":("ne","Niger"),"566":("ng","Nigeria"),"570":("nu","Niue"),"579":("no","Norway"),"580":("mp","N. Mariana Isds"),"583":("fm","FS Micronesia"),"584":("mh","Marshall Isds"),"585":("pw","Palau"),"586":("pk","Pakistan"),"591":("pa","Panama"),"598":("pg","Papua New Guinea"),"600":("py","Paraguay"),"604":("pe","Peru"),"608":("ph","Philippines"),"616":("pl","Poland"),"620":("pt","Portugal"),"624":("gw","Guinea-Bissau"),"626":("tl","Timor-Leste"),"634":("qa","Qatar"),"638":("re","Réunion (Overseas France)"),"642":("ro","Romania"),"643":("ru","Russian Federation"),"646":("rw","Rwanda"),"652":("bl","Saint Barthélemy"),"654":("sh","Saint Helena"),"659":("kn","Saint Kitts and Nevis"),"660":("ai","Anguilla"),"662":("lc","Saint Lucia"),"666":("pm","Saint Pierre and Miquelon"),"670":("vc","Saint Vincent and the Grenadines"),"674":("sm","San Marino"),"678":("st","Sao Tome and Principe"),"682":("sa","Saudi Arabia"),"686":("sn","Senegal"),"688":("rs","Serbia"),"690":("sc","Seychelles"),"694":("sl","Sierra Leone"),"699":("in","India"),"702":("sg","Singapore"),"703":("sk","Slovakia"),"704":("vn","Viet Nam"),"705":("si","Slovenia"),"706":("so","Somalia"),"710":("za","South Africa"),"716":("zw","Zimbabwe"),"724":("es","Spain"),"728":("ss","South Sudan"),"729":("sd","Sudan"),"740":("sr","Suriname"),"748":("sz","Eswatini"),"752":("se","Sweden"),"757":("ch","Switzerland"),"760":("sy","Syria"),"762":("tj","Tajikistan"),"764":("th","Thailand"),"768":("tg","Togo"),"772":("tk","Tokelau"),"776":("to","Tonga"),"780":("tt","Trinidad and Tobago"),"784":("ae","United Arab Emirates"),"788":("tn","Tunisia"),"792":("tr","Türkiye"),"795":("tm","Turkmenistan"),"796":("tc","Turks and Caicos Isds"),"798":("tv","Tuvalu"),"800":("ug","Uganda"),"804":("ua","Ukraine"),"807":("mk","North Macedonia"),"818":("eg","Egypt"),"826":("gb","United Kingdom"),"834":("tz","United Rep. of Tanzania"),"842":("us","USA"),"854":("bf","Burkina Faso"),"858":("uy","Uruguay"),"860":("uz","Uzbekistan"),"862":("ve","Venezuela"),"876":("wf","Wallis and Futuna Isds"),"882":("ws","Samoa"),"887":("ye","Yemen"),"894":("zm","Zambia")}

def js_round(x):
    """Python's built-in round() ties to even (banker's rounding);
    JavaScript's Math.round() ties up (toward +Infinity) -- e.g. round(2.5)
    is 2 in Python, 3 in JS; round(-2.5) is -2 in both, but for a different
    reason (Python rounds to nearest even 2*(-1)=-2; JS's -2.5+0.5=-2.0
    floors to -2). Every round() in this file stands in for a Math.round()
    in fetch-trade.js and must match it exactly -- share_tw/share_cn/
    share_tw_prev, to_next_pct, completed_pct, and (via round1 below)
    uv_change_pct/vol_change_pct. Math.round(x) === Math.floor(x + 0.5) for
    every finite x this file ever computes with, which is the identity used
    here. Always returns int, matching Math.round()'s integer-valued result
    (Python's own round(x) with no ndigits arg also returns int -- this
    function keeps that contract, only changing which integer ties resolve
    to)."""
    return math.floor(x + 0.5)

def round1(x):
    """js_round(x*10)/10, i.e. Math.round(x*10)/10 -- used for
    uv_change_pct/vol_change_pct, which are rounded to one decimal place.
    Plain Python division always returns a float, so round(50)/10 would
    serialize as 5.0 where JS's Math.round(500)/10 serializes as bare 5
    (JS has no separate int/float numeric type). Converting a whole-valued
    result back to int here keeps json.dumps' output byte-identical to
    JSON.stringify's for every value this metric can take, not just the
    non-whole ones."""
    v = js_round(x * 10) / 10
    return int(v) if v == int(v) else v

def https_get(url):
    """Fetch and parse JSON from HTTPS endpoint."""
    try:
        with urllib.request.urlopen(url,timeout=30) as resp:
            data=resp.read().decode("utf-8")
            return json.loads(data)
    except urllib.error.HTTPError as e:
        # Comtrade's 429 body is valid JSON ({"statusCode":429,"message":...})
        # but urllib raises HTTPError for non-2xx before we get to read() the
        # body the normal way -- read it off the error object instead so
        # comtrade_get() can see the same shape Node's https.get() hands back
        # on a 429 (which does not raise there).
        try:
            body=e.read().decode("utf-8")
            return json.loads(body)
        except Exception:
            raise Exception(f"Fetch failed: {e}")
    except Exception as e:
        raise Exception(f"Fetch failed: {e}")

def comtrade_get(url):
    """Comtrade-specific wrapper: retries on the API's own 429 shape, reading
    the wait time straight out of its own message ("Try again in N
    seconds."). Up to 3 retries; raises after that -- see fetch-trade.js's
    comtradeGet for the full commentary (this is a line-for-line port)."""
    attempt=0
    while True:
        j=https_get(url)
        if not (isinstance(j,dict) and j.get("statusCode")==429):
            return j
        if attempt>=3:
            raise Exception("Comtrade rate limit: exhausted 3 retries — "+str(j.get("message") or ""))
        m=re.search(r"(\d+)\s*second",j.get("message") or "",re.I)
        wait_s=(int(m.group(1)) if m else 3)+0.5
        print(f"[Comtrade] 429 (attempt {attempt+1}/3), waiting {wait_s}s: {j.get('message')}")
        time.sleep(wait_s)
        attempt+=1

def _value_at(value,flat):
    """value[flat], tolerant of JSON-stat's "value" coming back as either a
    sparse object (string keys) or a dense array -- mirrors fetch-trade.js's
    `j.value[flat]`, which works for either shape because JS bracket access
    coerces a numeric index to a string property name on a plain object.
    Python's dict/list access is not polymorphic that way, so this picks the
    right lookup explicitly."""
    if isinstance(value,list):
        return value[flat] if 0<=flat<len(value) else None
    return value.get(str(flat))

def fetch_eurostat_data():
    """Fetch 2023 & 2024 trade data for all reporters/partners/products, in
    ONE request covering both years -- a line-for-line port of
    fetch-trade.js's fetchEurostatData: compose the flat JSON-stat array
    index from named dimension positions and read straight out of
    response["value"], rather than iterating value.items() and reverse-
    mapping indices to names (an earlier version of this function did the
    latter, with a separate request per year and a sleep between them; that
    was a materially different fetch shape from the JS reference and has
    been dropped so the two versions make identical requests)."""
    data={}
    errors=[]
    params=urllib.parse.urlencode([("format","JSON"),("freq","A"),("flow","1")])
    for r in REPORTERS:
        params+="&reporter="+r
    for prod in PRODUCTS:
        params+="&product="+prod
    params+="&time=2023&time=2024"
    url=EUROSTAT_BASE+"?"+params
    print("[Eurostat] Fetching 2023+2024, all partners, in one request...")
    j=https_get(url)
    if not j or not j.get("dimension") or not j.get("id") or not j.get("value") or not j.get("size"):
        errors.append("No data in response")
        return data,errors
    pos={}
    for i,n in enumerate(j["id"]):
        pos[n]=i
    cat={n:j["dimension"][n]["category"]["index"] for n in j["id"]}
    partner_codes=list(cat["partner"].keys())
    print(f"[Eurostat] partner dimension carries {len(partner_codes)} codes this pull")
    size=j["size"]
    value=j["value"]

    def cell(rep,par,prod,ind,year):
        c=[None]*len(size)
        c[pos["freq"]]=0
        c[pos["flow"]]=0
        c[pos["reporter"]]=cat["reporter"].get(rep)
        c[pos["partner"]]=cat["partner"].get(par)
        c[pos["product"]]=cat["product"].get(prod)
        c[pos["indicators"]]=cat["indicators"].get(ind)
        c[pos["time"]]=cat["time"].get(year)
        if any(v is None for v in c):
            return None
        flat=0
        for i in range(len(size)):
            flat=flat*size[i]+c[i]
        return _value_at(value,flat)

    for rep in REPORTERS:
        for prod in PRODUCTS:
            for par in partner_codes:
                for year in ["2023","2024"]:
                    V=cell(rep,par,prod,"VALUE_IN_EUROS",year)
                    Q=cell(rep,par,prod,"QUANTITY_IN_100KG",year)
                    S=cell(rep,par,prod,"SUPPLEMENTARY_QUANTITY",year)
                    if V is None and Q is None and S is None:
                        continue
                    data.setdefault(rep,{}).setdefault(prod,{}).setdefault(par,{}).setdefault(year,{})
                    if V is not None: data[rep][prod][par][year]["VALUE"]=V
                    if Q is not None: data[rep][prod][par][year]["QTY_100KG"]=Q
                    if S is not None: data[rep][prod][par][year]["SUP"]=S

    return data,errors

def fetch_comtrade_one(reporter_code,hs6,year):
    """One (reporter, product, year) request via the single-reporter
    endpoint (full partner breakdown). The preview endpoint rejects a
    multi-period query, so this is called once per year."""
    params=urllib.parse.urlencode([("reporterCode",str(reporter_code)),("period",year),("cmdCode",hs6),("flowCode","M")])
    return comtrade_get(COMTRADE_BASE+"?"+params)

# The UN Comtrade preview API silently caps a response at 500 rows -- no
# truncated flag anywhere in the payload, so "did this response come back
# with (near) exactly the cap" is the only signal available. Every
# single-request Comtrade fetch in this file (one HS6 code per request --
# see fetch_comtrade_one and fetch_world_discovery_year, neither of which
# ever combines multiple HS6 codes into one cmdCode) is checked against this
# before its rows are trusted for metrics -- see the call sites, which mark
# every cell the response feeds as stale=True with null metrics rather than
# publish a number derived from a partial row set.
COMTRADE_ROW_CAP=500
def comtrade_hit_row_cap(json_resp):
    return bool(json_resp and isinstance(json_resp.get("data"),list) and len(json_resp["data"])>=COMTRADE_ROW_CAP)

def comtrade_rows_for_year(json_resp):
    """One Comtrade response -> {partner_code_str: {VALUE,QTY_100KG,SUP}} for
    one year -- see fetch-trade.js's comtradeRowsForYear for the full
    de-dup commentary (motCode===0 collapses the per-transport-mode rows)."""
    rows=(json_resp or {}).get("data") or []
    totals=[r for r in rows if r.get("motCode")==0]
    partners={}
    world_row_api=None
    for r in totals:
        if r.get("partnerCode")==0:
            world_row_api=r
            continue
        code=str(r.get("partnerCode"))
        alt_qty=r.get("altQty") or 0
        sup=alt_qty if (r.get("altQtyUnitCode")==5 and alt_qty>0) else 0
        partners[code]={"VALUE":r.get("cifvalue") or 0,"QTY_100KG":(r.get("netWgt") or 0)/100,"SUP":sup}
    return partners,world_row_api

def decide_comtrade_basis(partners,world_row_api):
    """piece when the API's own World row's altQtyUnitCode flag says piece,
    OR when a majority of source countries report pieces."""
    world_piece=bool(world_row_api and world_row_api.get("altQtyUnitCode")==5 and (world_row_api.get("altQty") or 0)>0)
    rows=[r for code,r in partners.items() if code not in BAND_EXCLUDE_PARTNERS]
    with_pieces=len([r for r in rows if r["SUP"]>0])
    majority_piece=len(rows)>0 and with_pieces/len(rows)>0.5
    return "piece" if (world_piece or majority_piece) else "kg"

def build_comtrade_world(partners,world_row_api,basis):
    """World is never read from the API's partnerCode=0 row -- rebuilt here
    by summing the qualifying (non-aggregate) partner rows. Tier 2 does NOT
    get this treatment (see compute_comtrade_tier2_cells) -- it never
    fetches partner rows to sum, by design."""
    rows=[r for code,r in partners.items() if code not in BAND_EXCLUDE_PARTNERS]
    value=sum(r["VALUE"] for r in rows)
    qty_100kg=sum(r["QTY_100KG"] for r in rows)
    sup=sum(r["SUP"] for r in rows) if basis=="piece" else 0
    world={"VALUE":value,"QTY_100KG":qty_100kg,"SUP":sup}
    api_value=world_row_api.get("cifvalue") if world_row_api else None
    cross_check="no-api-row"
    if api_value and api_value>0 and value>0:
        ratio=abs(value-api_value)/api_value
        cross_check="ok" if ratio<0.05 else "diverged"
    return {"world":world,"crossCheck":cross_check,"apiValue":api_value,"ownSum":value}

def discovery_rows_for_year(json_resp):
    """One all-reporter World-partner query -> {reporter_code_str:
    {VALUE,QTY_100KG,SUP,altQtyUnitCode}} for one (hs6, year). Needs a SECOND
    dedup dimension beyond motCode===0: some reporters return one row per
    customs procedure even at World level, where customsCode=='C00' is
    already their sum across procedures -- see fetch-trade.js's
    discoveryRowsForYear for the live-verified worked examples (Albania,
    Antigua and Barbuda)."""
    rows=(json_resp or {}).get("data") or []
    totals=[r for r in rows if r.get("motCode")==0 and r.get("customsCode")=="C00" and r.get("reporterCode")!=0]
    by_reporter={}
    for r in totals:
        code=str(r.get("reporterCode"))
        alt_qty=r.get("altQty") or 0
        sup=alt_qty if (r.get("altQtyUnitCode")==5 and alt_qty>0) else 0
        by_reporter[code]={"VALUE":r.get("cifvalue") or 0,"QTY_100KG":(r.get("netWgt") or 0)/100,"SUP":sup,"altQtyUnitCode":r.get("altQtyUnitCode")}
    return by_reporter

def fetch_world_discovery_year(year):
    """All 6 HS6 families' all-reporter World rows for one year: 6 requests,
    >=1.1s apart, regardless of how many reporters the caller ends up
    needing -- discovery and every tier-2 batch shard call this once per
    year they need. Each request is already scoped to exactly one HS6 code
    (cmdCode never carries more than one) -- going from 4 to 6 families only
    adds more requests, it does not change any single request's row count --
    but each request still covers every reporter worldwide (up to 223), so
    the 500-row cap (see comtrade_hit_row_cap) is checked per request
    regardless. A capped (hs6, year) is recorded in capped_hs6 and its
    by_hs6[hs6] entry is left empty rather than populated from a response
    that can't be trusted -- callers (build_roster, compute_comtrade_tier2_cells)
    must consult capped_hs6 before treating an empty/absent reporter as a
    genuinely zero import."""
    by_hs6={}
    capped_hs6=set()
    for hs6 in PRODUCTS_HS6:
        time.sleep(1.1)
        params=urllib.parse.urlencode([("reporterCode",""),("period",year),("cmdCode",hs6),("flowCode","M"),("partnerCode","0"),("partner2Code","0")])
        j=comtrade_get(COMTRADE_BASE+"?"+params)
        if j and j.get("error"):
            raise Exception(f"discovery {hs6}/{year}: {j['error']}")
        if comtrade_hit_row_cap(j):
            print(f"[comtrade] 500-row cap hit for {hs6}/{year} discovery (all-reporter World query) — treating as no data this year")
            capped_hs6.add(hs6)
            by_hs6[hs6]={}
            continue
        by_hs6[hs6]=discovery_rows_for_year(j)
        print(f"[discovery] {hs6}/{year}: {len(by_hs6[hs6])} reporters")
    return by_hs6,capped_hs6

def build_roster(disc24):
    """The tier decision itself -- see the module docstring. disc24:
    {hs6: {reporter_code: {VALUE,...}}} for the latest year only. (A family
    whose discovery response hit the 500-row cap contributes nothing to
    `totals` either -- see fetch_world_discovery_year's capped_hs6 -- which
    understates rather than fabricates a reporter's combined value.)"""
    totals={}
    for hs6 in PRODUCTS_HS6:
        by_reporter=disc24.get(hs6,{})
        for code,row in by_reporter.items():
            totals[code]=totals.get(code,0)+(row.get("VALUE") or 0)
    eurostat_iso_set={r.lower() for r in REPORTERS}
    tier1=[]
    tier2=[]
    for code,val in totals.items():
        ref=REPORTER_MAP.get(code)
        if not ref:
            continue
        iso,name=ref
        if iso in eurostat_iso_set:
            continue
        if val>=TIER1_MIN_USD:
            tier1.append({"iso":iso,"name":name,"reporterCode":code,"val":val})
        elif val>0:
            tier2.append({"iso":iso,"name":name,"reporterCode":code,"val":val})
    tier1.sort(key=lambda m:m["iso"])
    tier2.sort(key=lambda m:m["iso"])
    return {"tier1":tier1,"tier2":tier2}

def unit_price_for(row,basis):
    """Unit value for one partner-row (VALUE/quantity), or None when the row
    can't support a price."""
    if not row:
        return None
    denom=(row.get("SUP") or 0) if basis=="piece" else (row.get("QTY_100KG") or 0)*100
    if denom<=0:
        return None
    val=row.get("VALUE") or 0
    if val<=0:
        return None
    return val/denom

def compute_terciles(partners_for_year,world_value,basis):
    """Value-weighted tercile boundaries (p33/p67) of source-country unit
    values. Returns {p33,p67,n} or None below BAND_MIN_SOURCES usable
    countries -- the fail-closed case the caller must turn into band=None.
    p33/p67 are absolute per-unit prices and MUST NOT be written to
    trade.json -- see fetch-trade.js's computeTerciles for the full policy
    note (this function only ever returns these values to band_of(), which
    discards them immediately)."""
    if not partners_for_year or not world_value or world_value<=0:
        return None
    rows=[]
    for code,row in partners_for_year.items():
        if code in BAND_EXCLUDE_PARTNERS:
            continue
        uv=unit_price_for(row,basis)
        if uv is None:
            continue
        value=row.get("VALUE") or 0
        if value<=0:
            continue
        rows.append({"code":code,"value":value,"uv":uv})
    rows.sort(key=lambda r:r["value"],reverse=True)
    rows=rows[:BAND_TOP_N]
    rows=[r for r in rows if r["value"]/world_value>=BAND_MIN_SHARE]
    if len(rows)<BAND_MIN_SOURCES:
        return None
    rows.sort(key=lambda r:r["uv"])
    total_value=sum(r["value"] for r in rows)
    cum=0
    p33=None
    p67=None
    for r in rows:
        cum+=r["value"]
        cum_share=cum/total_value
        if p33 is None and cum_share>=1/3:
            p33=r["uv"]
        if p67 is None and cum_share>=2/3:
            p67=r["uv"]
            break
    return {"p33":p33,"p67":p67,"n":len(rows)}

def band_of(uv,terciles):
    """Which third a unit value falls in, given tercile boundaries. None in, None out."""
    if uv is None or not terciles:
        return None
    if uv<=terciles["p33"]:
        return "lower"
    if uv<=terciles["p67"]:
        return "mid"
    return "upper"

def compute_band(partners24,partners23,world24,world23,tw24,basis):
    """The public-facing band object for one cell -- see fetch-trade.js's
    computeBand for the full commentary (this is a line-for-line port)."""
    terciles24=compute_terciles(partners24,world24.get("VALUE") if world24 else None,basis)
    terciles23=compute_terciles(partners23,world23.get("VALUE") if world23 else None,basis)
    world_uv24=unit_price_for(world24,basis)
    world_uv23=unit_price_for(world23,basis)
    tw_uv24=unit_price_for(tw24,basis)

    market24=band_of(world_uv24,terciles24)
    if not market24:
        return None  # fail-closed: no market position, no band object

    market23=band_of(world_uv23,terciles23)

    tw_share=0.0
    if tw24 and tw24.get("VALUE") and world24 and world24.get("VALUE"):
        tw_share=tw24["VALUE"]/world24["VALUE"]
    tw=band_of(tw_uv24,terciles24) if tw_share>=BAND_MIN_TW_SHARE else None

    moved=None
    if market23:
        ord_map={"lower":0,"mid":1,"upper":2}
        d=ord_map[market24]-ord_map[market23]
        moved="up" if d>0 else "down" if d<0 else "flat"

    to_next_pct=None
    if terciles24 and world_uv24 is not None:
        if market24=="lower":
            to_next_pct=js_round(abs(world_uv24-terciles24["p33"])/world_uv24*100)
        elif market24=="upper":
            to_next_pct=js_round(abs(world_uv24-terciles24["p67"])/world_uv24*100)
        else:
            d_low=abs(world_uv24-terciles24["p33"])
            d_high=abs(terciles24["p67"]-world_uv24)
            to_next_pct=js_round(min(d_low,d_high)/world_uv24*100)

    return {"market":market24,"tw":tw,"moved":moved,"to_next_pct":to_next_pct}

def calculate_metrics(reporter,product,data23,data24,basis):
    """Calculate UV change and shares."""
    metrics={
        "basis":basis,
        "uv_change_pct":None,
        "vol_change_pct":None,
        "share_tw":None,
        "share_tw_prev":None,
        "share_cn":None,
        "share_cn_prev":None,
        "stale":False
    }

    if not data23 or not data24:
        metrics["stale"]=True
        return metrics

    if basis=="piece":
        denom23=data23.get("SUP") or 0
        denom24=data24.get("SUP") or 0
    else:
        denom23=(data23.get("QTY_100KG") or 0)*100
        denom24=(data24.get("QTY_100KG") or 0)*100

    if denom23<=0 or denom24<=0:
        metrics["stale"]=True
        return metrics

    val23=data23.get("VALUE") or 0
    val24=data24.get("VALUE") or 0

    if val23<=0 or val24<=0:
        metrics["stale"]=True
        return metrics

    uv23=val23/denom23
    uv24=val24/denom24
    metrics["uv_change_pct"]=round1(((uv24/uv23-1)*100))
    metrics["vol_change_pct"]=round1(((denom24/denom23-1)*100))

    return metrics

def validate_metrics(metrics):
    """Validate against data contract."""
    if metrics["stale"]:
        return True

    if metrics["share_tw"] is not None and metrics["share_cn"] is not None:
        if(metrics["share_tw"]+metrics["share_cn"]>100 or
           metrics["share_tw"]<0 or metrics["share_tw"]>100 or
           metrics["share_cn"]<0 or metrics["share_cn"]>100):
            metrics["stale"]=True
            return True

    # share_tw_prev + share_cn_prev <= 100 and each in [0,100] -- exactly
    # parallel to the share_tw/share_cn check above, for the prior year.
    if metrics["share_tw_prev"] is not None and metrics["share_cn_prev"] is not None:
        if(metrics["share_tw_prev"]+metrics["share_cn_prev"]>100 or
           metrics["share_tw_prev"]<0 or metrics["share_tw_prev"]>100 or
           metrics["share_cn_prev"]<0 or metrics["share_cn_prev"]>100):
            metrics["stale"]=True
            return True

    if metrics["uv_change_pct"] is not None:
        if abs(metrics["uv_change_pct"])>50:
            metrics["stale"]=True
            return True

    return False

def compute_eurostat_cells(eu_data):
    """Eurostat's six markets, full detail -- the eurostat_all work unit.
    Returns {iso: {cn8: metrics}}."""
    reporter_key_of={r:r.lower() for r in REPORTERS}
    out={}
    for reporter_code,products in eu_data.items():
        iso=reporter_key_of.get(reporter_code)
        if not iso:
            continue
        cells={}
        for product_code,partners in products.items():
            basis=BASIS_MAP.get(product_code,"kg")
            tw23=partners.get("TW",{}).get("2023")
            tw24=partners.get("TW",{}).get("2024")
            cn23=partners.get("CN",{}).get("2023")
            cn24=partners.get("CN",{}).get("2024")
            world23=partners.get("WORLD",{}).get("2023")
            world24=partners.get("WORLD",{}).get("2024")

            metrics=calculate_metrics(reporter_code,product_code,world23,world24,basis)

            if world24 and world24.get("VALUE") and world24["VALUE"]>0:
                if tw24 and tw24.get("VALUE"):
                    metrics["share_tw"]=js_round((tw24["VALUE"]/world24["VALUE"])*100)
                if cn24 and cn24.get("VALUE"):
                    metrics["share_cn"]=js_round((cn24["VALUE"]/world24["VALUE"])*100)
            if world23 and world23.get("VALUE") and world23["VALUE"]>0:
                if tw23 and tw23.get("VALUE"):
                    metrics["share_tw_prev"]=js_round((tw23["VALUE"]/world23["VALUE"])*100)
                if cn23 and cn23.get("VALUE"):
                    metrics["share_cn_prev"]=js_round((cn23["VALUE"]/world23["VALUE"])*100)

            partners24={code:years["2024"] for code,years in partners.items() if "2024" in years}
            partners23={code:years["2023"] for code,years in partners.items() if "2023" in years}
            metrics["band"]=compute_band(partners24,partners23,world24,world23,tw24,basis)

            validate_metrics(metrics)
            cells[product_code]=metrics
            band=metrics["band"]
            print(f"[metrics] {reporter_code}/{product_code} (eurostat): stale={metrics['stale']}, uv={metrics['uv_change_pct']}, share_tw={metrics['share_tw']}, "
                  f"band={band['market'] if band else None}, band.tw={band['tw'] if band else None}, moved={band['moved'] if band else None}")
        out[iso]=cells
    return out

def compute_comtrade_tier1_cells(iso,reporter_code):
    """Full-detail cells for ONE tier-1 Comtrade market: 6 products x 2
    years = 12 requests, >=1.1s apart. Cell keys are hs6. Each request is
    already scoped to one HS6 code, but a single reporter can still return
    >=500 partner rows (see comtrade_hit_row_cap) -- a hit on either year
    discards the whole cell rather than compute a uv_change_pct that mixes
    one trustworthy year with one truncated one."""
    cells={}
    for hs6 in PRODUCTS_HS6:
        per_year={}
        capped=False
        for year in COMTRADE_YEARS:
            time.sleep(1.1)
            j=fetch_comtrade_one(reporter_code,hs6,year)
            if j and j.get("error"):
                raise Exception(f"{iso}/{hs6}/{year}: {j['error']}")
            if comtrade_hit_row_cap(j):
                print(f"[comtrade] 500-row cap hit for {hs6} batch {iso}/{year} — cells marked stale")
                capped=True
                continue
            partners,world_row_api=comtrade_rows_for_year(j)
            per_year[year]={"partners":partners,"world_row_api":world_row_api}
            print(f"[Comtrade tier1] {iso}/{hs6}/{year}: {len(partners)} source rows")

        y24=per_year.get("2024")
        y23=per_year.get("2023")
        if capped or (not y24 and not y23):
            cells[hs6]={"basis":"kg","uv_change_pct":None,"vol_change_pct":None,"share_tw":None,"share_tw_prev":None,"share_cn":None,"share_cn_prev":None,"stale":True,"band":None}
            continue

        basis_src=y24 or y23
        basis=decide_comtrade_basis(basis_src["partners"],basis_src["world_row_api"])

        w24=build_comtrade_world(y24["partners"],y24["world_row_api"],basis) if y24 else None
        w23=build_comtrade_world(y23["partners"],y23["world_row_api"],basis) if y23 else None

        world24=w24["world"] if w24 else None
        world23=w23["world"] if w23 else None
        tw24=y24["partners"].get(TW_CODE) if y24 else None
        tw23=y23["partners"].get(TW_CODE) if y23 else None
        cn24=y24["partners"].get(CN_CODE) if y24 else None
        cn23=y23["partners"].get(CN_CODE) if y23 else None

        metrics=calculate_metrics(iso,hs6,world23,world24,basis)

        if world24 and world24["VALUE"]>0:
            if tw24 and tw24["VALUE"]:
                metrics["share_tw"]=js_round((tw24["VALUE"]/world24["VALUE"])*100)
            if cn24 and cn24["VALUE"]:
                metrics["share_cn"]=js_round((cn24["VALUE"]/world24["VALUE"])*100)
        if world23 and world23["VALUE"]>0 and tw23 and tw23["VALUE"]:
            metrics["share_tw_prev"]=js_round((tw23["VALUE"]/world23["VALUE"])*100)
        if world23 and world23["VALUE"]>0 and cn23 and cn23["VALUE"]:
            metrics["share_cn_prev"]=js_round((cn23["VALUE"]/world23["VALUE"])*100)

        partners24=dict(y24["partners"]) if y24 else {}
        if y24: partners24["WORLD"]=world24
        partners23=dict(y23["partners"]) if y23 else {}
        if y23: partners23["WORLD"]=world23
        metrics["band"]=compute_band(partners24,partners23,world24,world23,tw24,basis)

        if w24 and w24["crossCheck"]=="diverged":
            metrics["note"]="world cross-check diverged >5% from Comtrade's reported total; used summed sources"

        validate_metrics(metrics)
        cells[hs6]=metrics
        band=metrics["band"]
        print(f"[metrics] {iso}/{hs6} (comtrade tier1): stale={metrics['stale']}, basis={basis}, uv={metrics['uv_change_pct']}, share_tw={metrics['share_tw']}, "
              f"band={band['market'] if band else None}, band.tw={band['tw'] if band else None}, moved={band['moved'] if band else None}, "
              f"world_cross_check={w24['crossCheck'] if w24 else 'n/a'}")
    return cells

def compute_comtrade_tier2_cells(isos,iso_to_code):
    """Rate-of-change-only cells for a BATCH of tier-2 markets: 6x2=12
    all-reporter World-discovery requests TOTAL for the whole batch, then
    every market in isos just reads its own reporter's World row. No
    partner breakdown is ever fetched for tier 2 -- band and share are
    structurally absent. If a given hs6's discovery response hit the
    500-row cap in either year (fetch_world_discovery_year's capped_hs6),
    every market in this batch gets a stale null cell for that hs6 instead
    of a rate computed from a response that might be missing this very
    reporter's row."""
    disc23,capped23=fetch_world_discovery_year("2023")
    disc24,capped24=fetch_world_discovery_year("2024")
    capped_any=capped23|capped24
    for hs6 in capped_any:
        print(f"[comtrade] 500-row cap hit for {hs6} batch {','.join(isos)} — cells marked stale")
    out={}
    for iso in isos:
        code=iso_to_code.get(iso)
        cells={}
        for hs6 in PRODUCTS_HS6:
            if hs6 in capped_any:
                cells[hs6]={"basis":"kg","uv_change_pct":None,"stale":True}
                continue
            w24row=disc24[hs6].get(code) if code else None
            w23row=disc23[hs6].get(code) if code else None
            if w24row and w24row.get("altQtyUnitCode")==5 and (w24row.get("SUP") or 0)>0:
                basis="piece"
            elif w23row and w23row.get("altQtyUnitCode")==5 and (w23row.get("SUP") or 0)>0:
                basis="piece"
            else:
                basis="kg"
            metrics=calculate_metrics(iso,hs6,w23row,w24row,basis)
            validate_metrics(metrics)  # same ±50% contract as tier 1
            cells[hs6]={"basis":metrics["basis"],"uv_change_pct":metrics["uv_change_pct"],"stale":metrics["stale"]}
            print(f"[metrics] {iso}/{hs6} (comtrade tier2): stale={metrics['stale']}, basis={metrics['basis']}, uv={metrics['uv_change_pct']}")
        out[iso]=cells
    return out

# ---------------------------------------------------------------------------
# Skeleton / work-unit bookkeeping.

def invert_reporter_map():
    """iso -> Comtrade reporter code, the inverse of REPORTER_MAP (safe:
    verified zero duplicate iso2 after the historical-entity filter)."""
    return {v[0]:k for k,v in REPORTER_MAP.items()}

def market_skeleton(name,tier,src,cell_keys):
    return {"n":name,"tier":tier,"src":src,"cells":{k:{"stale":True} for k in cell_keys}}

def build_markets_skeleton(roster):
    markets={}
    for r in REPORTERS:
        markets[r.lower()]=market_skeleton(EUROSTAT_NAMES.get(r,r),1,"eurostat",PRODUCTS)
    for m in roster["tier1"]:
        markets[m["iso"]]=market_skeleton(m["name"],1,"comtrade",PRODUCTS_HS6)
    for m in roster["tier2"]:
        markets[m["iso"]]=market_skeleton(m["name"],2,"comtrade",PRODUCTS_HS6)
    return markets

# Tier-1 Comtrade markets are fetched in roughly-commercial-importance
# order rather than alphabetically, so if a season only gets partway through
# tier 1 before the quarter rolls over, the markets that matter most have
# already been refreshed this cycle. Missing-from-list isos sort after
# every ranked one (ties among themselves broken alphabetically, same as
# ranked ties) -- see importance_key in build_work_units. Because
# shard_state["cursor"] is just an index into build_work_units' output,
# rebuilt fresh every run and never itself persisted, changing this order
# mid-season simply reshuffles which markets land at which cursor position:
# some get re-fetched sooner than their last run, none are permanently
# skipped. That is an acceptable, intended side effect of editing IMPORTANCE.
IMPORTANCE=["us","jp","gb","ca","ch","au","kr","il","mx","za","no","se","tr","sa","ae","sg","nz","cl","br","ar","co","pe"]

def build_work_units(markets):
    """shard_state["cursor"] indexes into this list, rebuilt fresh every run
    from whatever markets/tier/src trade.json's skeleton already carries --
    see fetch-trade.js's buildWorkUnits for the full ordering rationale
    (one eurostat_all unit, then tier-1 Comtrade markets in
    commercial-importance order -- see IMPORTANCE above -- ties broken
    alphabetically by iso, then tier-2 markets chunked into
    TIER2_BATCH_SIZE-sized batches, alphabetical by iso, unchanged)."""
    units=[{"type":"eurostat_all"}]
    t1=[]
    t2=[]
    for iso,m in markets.items():
        if m.get("src")!="comtrade":
            continue
        if m.get("tier")==1:
            t1.append(iso)
        elif m.get("tier")==2:
            t2.append(iso)
    def importance_key(iso):
        try:
            rank=IMPORTANCE.index(iso)
        except ValueError:
            rank=len(IMPORTANCE)  # missing from IMPORTANCE sorts after every ranked iso
        return (rank,iso)
    t1.sort(key=importance_key)
    t2.sort()
    for iso in t1:
        units.append({"type":"comtrade_tier1","iso":iso})
    for i in range(0,len(t2),TIER2_BATCH_SIZE):
        units.append({"type":"comtrade_tier2_batch","isos":t2[i:i+TIER2_BATCH_SIZE]})
    return units

def compute_quarter(d):
    q=(d.month-1)//3+1
    return f"{d.year}-Q{q}"

SOURCES={
    "eu":"Eurostat Comext DS-045409",
    "world":"UN Comtrade (HS6)",
    "uk":"unavailable",
}

MAX_TRADE_BYTES=200*1024

def read_existing_trade():
    try:
        with open(TRADE_PATH,"r",encoding="utf-8") as f:
            j=json.load(f)
        return j if isinstance(j,dict) else None
    except Exception:
        return None  # missing, unreadable, or corrupt -- treated as "no file yet"

def write_trade_json(trade):
    serialized=json.dumps(trade,ensure_ascii=False,indent=2)+"\n"
    b=serialized.encode("utf-8")
    if len(b)>MAX_TRADE_BYTES:
        print(f"[fail-closed] trade.json would be {len(b)} bytes, over the {MAX_TRADE_BYTES}-byte contract; not writing. Trim tier2 cell fields first.")
        sys.exit(1)
    with open(TRADE_PATH,"w",encoding="utf-8",newline="\n") as f:
        f.write(serialized)
    print(f"[write] {TRADE_PATH} ({len(b)} bytes)")

def run_discovery():
    """Season-opening discovery -- see fetch-trade.js's runDiscovery for the
    full commentary on why only a skeleton (no numbers) is written here."""
    print("[discovery] all-reporter World query, latest year, 6 HS6 families (tier decision only)...")
    disc24,_=fetch_world_discovery_year("2024")
    roster=build_roster(disc24)
    markets=build_markets_skeleton(roster)
    print(f"[discovery] tier1: {len(REPORTERS)} eurostat + {len(roster['tier1'])} comtrade = {len(REPORTERS)+len(roster['tier1'])}; tier2: {len(roster['tier2'])}")
    return markets,roster

def main_shard():
    """See fetch-trade.js's mainShard docstring for the full shard_state
    contract -- this is a line-for-line port of that logic."""
    now=datetime.datetime.now(datetime.timezone.utc)
    edition=compute_quarter(now)
    existing=read_existing_trade()

    if not existing or existing.get("schema")!=2 or existing.get("edition")!=edition:
        markets,_=run_discovery()
        trade={
            "schema":2,
            "edition":edition,
            "generated":now.replace(microsecond=0).isoformat().replace("+00:00","Z"),
            "shard_state":{"cursor":0,"completed_pct":0,"quarter":edition},
            "sources":SOURCES,
            "markets":markets,
        }
        write_trade_json(trade)
        return

    # A family added to PRODUCTS mid-season would otherwise not appear until the
    # NEXT quarter, because the cell keys are only laid down by discovery and
    # discovery only runs when the edition changes. Scissors and hand saws were
    # added in August and would have sat invisible until October.
    # Adding the missing keys as pending cells costs nothing -- each market fills
    # them on its own next turn through the shard rota, exactly as it fills the
    # families it already had. Nothing is overwritten: only absent keys are added.
    for m in existing["markets"].values():
        if not m or not m.get("cells"):
            continue
        for k in (PRODUCTS if m.get("src")=="eurostat" else PRODUCTS_HS6):
            if k not in m["cells"]:
                m["cells"][k]={"stale":True}

    units=build_work_units(existing["markets"])
    cursor=existing["shard_state"]["cursor"]
    if cursor>=len(units):
        print(f"[shard] season complete ({cursor}/{len(units)}) — nothing to do until the edition rolls over")
        return

    unit=units[cursor]
    iso_to_code=invert_reporter_map()
    patch=None
    try:
        if unit["type"]=="eurostat_all":
            eu_data,eu_errors=fetch_eurostat_data()
            if eu_errors:
                print("[Eurostat] errors:",eu_errors)
            patch=compute_eurostat_cells(eu_data)
        elif unit["type"]=="comtrade_tier1":
            code=iso_to_code.get(unit["iso"])
            if not code:
                raise Exception("no reporterCode for iso "+unit["iso"])
            patch={unit["iso"]:compute_comtrade_tier1_cells(unit["iso"],code)}
        elif unit["type"]=="comtrade_tier2_batch":
            patch=compute_comtrade_tier2_cells(unit["isos"],iso_to_code)
        else:
            raise Exception("unknown unit type: "+unit["type"])
    except Exception as e:
        print(f"[shard] unit {cursor}/{len(units)} ({unit['type']}) failed, cursor NOT advanced: {e}")
        return  # exit 0

    # NOTE, from live testing (2026-08): an earlier version of this function
    # also refused to advance the cursor when >50% of the unit's freshly
    # computed cells came back stale, on the theory that "mostly stale" meant
    # "the request half-failed." Live data proved that theory wrong --
    # Comtrade genuinely reports incomplete quantity data for some (reporter,
    # HS6) pairs (Australia/820150 2023-2024: netWgt missing on all but a
    # handful of partner rows, each year a different handful), which
    # validate_metrics' own +/-50% uv_change_pct contract correctly (and
    # separately) marks stale -- that is calculate_metrics/validate_metrics
    # working as designed, not a request failure, and a market that happens
    # to have thin Comtrade data is not rare enough to gate the cursor on.
    # Blocking cursor advancement on it would have meant Australia -- a
    # reporter that reappears every day discovery runs -- permanently
    # stalling the season at the exact same unit. The try/except above
    # (thrown errors: rate-limit exhaustion, a Comtrade error field, an
    # unreachable API) is the only thing that withholds cursor advancement
    # now; a cell that computed successfully and simply came back stale is
    # published as stale, exactly like every other stale cell in this file.
    for iso,cells in patch.items():
        if iso not in existing["markets"]:
            continue  # defensive; should not happen
        existing["markets"][iso]["cells"].update(cells)
    existing["generated"]=now.replace(microsecond=0).isoformat().replace("+00:00","Z")
    new_cursor=cursor+1
    existing["shard_state"]={"cursor":new_cursor,"completed_pct":js_round((new_cursor/len(units))*100),"quarter":edition}
    write_trade_json(existing)
    label=unit.get("iso") or ",".join(unit.get("isos") or [])
    print(f"[shard] processed unit {cursor}/{len(units)} ({unit['type']}{(' '+label) if label else ''}), cursor -> {new_cursor} ({existing['shard_state']['completed_pct']}%)")

def main_legacy():
    """No --shard: full tier-1 fetch (discovery + Eurostat + every
    discovered Comtrade tier-1 market); tier 2 left pending. See
    fetch-trade.js's mainLegacy for the full commentary."""
    print("[fetch_trade] legacy mode: full tier-1 fetch (discovery + Eurostat + every discovered Comtrade tier-1 market)...")
    now=datetime.datetime.now(datetime.timezone.utc)
    edition=compute_quarter(now)
    markets,roster=run_discovery()

    eu_data,eu_errors=fetch_eurostat_data()
    if eu_errors:
        print("[Eurostat] errors:",eu_errors)
    eu_cells=compute_eurostat_cells(eu_data)
    for iso,cells in eu_cells.items():
        markets[iso]["cells"].update(cells)

    stale_count=0
    total_count=0
    for cells in eu_cells.values():
        for c in cells.values():
            total_count+=1
            if c["stale"]:
                stale_count+=1

    for i,m in enumerate(roster["tier1"]):
        print(f"[legacy] comtrade tier1 {i+1}/{len(roster['tier1'])}: {m['iso']}")
        try:
            cells=compute_comtrade_tier1_cells(m["iso"],m["reporterCode"])
            markets[m["iso"]]["cells"].update(cells)
            for c in cells.values():
                total_count+=1
                if c["stale"]:
                    stale_count+=1
        except Exception as e:
            print(f"[legacy] {m['iso']} failed, left pending: {e}")

    if total_count>0:
        stale_ratio=stale_count/total_count
        if stale_ratio>0.5:
            print(f"[fail-closed] {stale_count}/{total_count} tier-1 entries stale ({stale_ratio*100:.1f}%) > 50% threshold — not writing")
            sys.exit(1)

    units=build_work_units(markets)
    cursor_after_tier1=1+len(roster["tier1"])  # eurostat_all + every tier1 unit, in build_work_units' own order
    trade={
        "schema":2,
        "edition":edition,
        "generated":now.replace(microsecond=0).isoformat().replace("+00:00","Z"),
        "shard_state":{"cursor":cursor_after_tier1,"completed_pct":js_round((cursor_after_tier1/len(units))*100),"quarter":edition},
        "sources":SOURCES,
        "markets":markets,
    }
    write_trade_json(trade)

def main():
    is_shard="--shard" in sys.argv
    try:
        if is_shard:
            main_shard()
        else:
            main_legacy()
        sys.exit(0)
    except SystemExit:
        raise
    except Exception as e:
        print("[error]",e)
        # Shard mode must never take the nightly news job down -- see
        # main_shard's docstring; the workflow step around this script is
        # also continue-on-error as a second line of defense.
        sys.exit(0 if is_shard else 1)

if __name__=="__main__":
    main()
