#!/usr/bin/env python3
"""Fetch trade statistics from Eurostat Comext (DE/NL/FR) and UK HMRC uktradeinfo,
produce trade.json with uv_change, share metrics, and fail-closed validation.

Eurostat API: https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/ds-045409
UK API: https://api.uktradeinfo.com/OTS (OData v4) - exploration status in comments below
"""
import os,json,sys,datetime,urllib.request,urllib.parse,time

HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRADE_PATH=os.path.join(HERE,"trade.json")

EUROSTAT_BASE="https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/ds-045409"
REPORTERS=["DE","NL","FR","ES","PL","IT"]
PRODUCTS=["82011000","82013000","82015000","82016000"]
BASIS_MAP={"82011000":"piece","82013000":"kg","82015000":"piece","82016000":"kg"}

# Comext's partner dimension is not asked for a fixed list any more: leaving
# `partner` off the query returns every code the dataset has for these
# reporters/products/years (~278), discovered by probing the response's own
# dimension.partner.category — TW/CN/WORLD plus every other origin country,
# in the same two requests this already made. That superset is what the
# price-band tercile (below) is computed from; TW/CN/WORLD are just the
# three codes the existing headline metrics (uv_change_pct, shares) read
# out of it.
#
# The superset mixes real countries with two kinds of non-source rows that
# would corrupt a value-weighted tercile if left in:
#   - EU/euro-area aggregates (EXT_EU, INT_EA21, ...): each one re-sums value
#     already counted in its member countries' own rows, so keeping both
#     double-weights that value.
#   - Comext pseudo-partners: QP "High seas", QQ-QS "stores and provisions",
#     QU-QZ "not specified" — not a source country at all.
# Verified against a live pull (2026-08): summing every real-country row for
# one reporter/product/year reproduces the WORLD cell exactly (ratio 1.0),
# confirming WORLD is the clean total these aggregates are drawn from, not
# an independent figure — so excluding the aggregates loses no value, only
# the double count.
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
# UN Comtrade (US/JP/IL/AU) — mirrors tools/dev/fetch-trade.js's Comtrade
# section line for line. See that file for the full commentary; kept short
# here per this file's own style.
COMTRADE_BASE="https://comtradeapi.un.org/public/v1/preview/C/A/HS"
COMTRADE_REPORTERS=[("us",842),("jp",392),("il",376),("au",36)]
COMTRADE_YEARS=["2023","2024"]
TW_CODE="490"  # "Other Asia, nes" — the UN's placeholder for Taiwan (One-China nomenclature)
CN_CODE="156"

# Regional catch-alls / non-trade categories to exclude from the source-country
# sum and the tercile sample — the Comtrade equivalent of BAND_EXCLUDE_PARTNERS's
# Eurostat EXT_EU/INT_EA rows. Pulled from https://comtradeapi.un.org/files/v1/
# app/reference/partnerAreas.json (live, 2026-08-07): every entry whose label
# ends ", nes" plus Bunkers/Free Zones/Special Categories/Neutral Zone.
# Deliberately excludes 490 "Other Asia, nes" from this list — see fetch-trade.js.
COMTRADE_NES_CODES=["472","899","837","471","129","221","697","492","838","473","536","637","290","527","577","568","636","839","879"]
for _c in COMTRADE_NES_CODES:
    BAND_EXCLUDE_PARTNERS.add(_c)

def flat_index_to_multi(flat_idx,sizes):
    """Convert flat value key to multidimensional indices using size array."""
    indices=[]
    remaining=flat_idx
    for i in range(len(sizes)-1,-1,-1):
        indices.insert(0,remaining%sizes[i])
        remaining=remaining//sizes[i]
    return indices

def https_get(url):
    """Fetch and parse JSON from HTTPS endpoint."""
    try:
        with urllib.request.urlopen(url,timeout=30) as resp:
            data=resp.read().decode("utf-8")
            return json.loads(data)
    except Exception as e:
        raise Exception(f"Fetch failed: {e}")

def fetch_eurostat_data():
    """Fetch 2023 & 2024 trade data for all reporters/partners/products."""
    data={}
    errors=[]

    for year in ["2023","2024"]:
        params=urllib.parse.urlencode([
            ("format","JSON"),
            ("freq","A"),
            ("flow","1"),
            ("time",year)
        ],doseq=False)
        for r in REPORTERS:
            params+="&reporter="+r
        for prod in PRODUCTS:
            params+="&product="+prod

        url=EUROSTAT_BASE+"?"+params
        try:
            print(f"[Eurostat] Fetching {year}, all partners...")
            response=https_get(url)
            partner_idx=response.get("dimension",{}).get("partner",{}).get("category",{}).get("index",{})
            if partner_idx:
                print(f"[Eurostat] partner dimension carries {len(partner_idx)} codes this pull")

            dimension=response.get("dimension",{})
            id_array=response.get("id",[])
            value=response.get("value",{})
            size=response.get("size",[])

            if not dimension or not id_array or not value or not size:
                errors.append(f"{year}: No data in response")
                continue

            # Build position map
            pos_map={}
            for i,dim_name in enumerate(id_array):
                pos_map[dim_name]=i

            # Build reverse index maps: pos -> name for each dimension
            dim_maps={}
            for dim_name in id_array:
                dim_maps[dim_name]={}
                if dimension.get(dim_name,{}).get("category",{}).get("index"):
                    for name,pos in dimension[dim_name]["category"]["index"].items():
                        dim_maps[dim_name][pos]=name

            # Decode each value (flat index -> multidimensional)
            for flat_key,val in value.items():
                flat_idx=int(flat_key)
                indices=flat_index_to_multi(flat_idx,size)

                # Map indices to dimension names
                reporter=dim_maps.get("reporter",{}).get(indices[pos_map.get("reporter")])
                partner=dim_maps.get("partner",{}).get(indices[pos_map.get("partner")])
                product=dim_maps.get("product",{}).get(indices[pos_map.get("product")])
                indicator=dim_maps.get("indicators",{}).get(indices[pos_map.get("indicators")])

                if not all([reporter,partner,product,indicator]):
                    continue

                # Build hierarchical structure
                if reporter not in data:
                    data[reporter]={}
                if product not in data[reporter]:
                    data[reporter][product]={}
                if partner not in data[reporter][product]:
                    data[reporter][product][partner]={}
                if year not in data[reporter][product][partner]:
                    data[reporter][product][partner][year]={}

                if indicator=="VALUE_IN_EUROS":
                    data[reporter][product][partner][year]["VALUE"]=val
                elif indicator=="QUANTITY_IN_100KG":
                    data[reporter][product][partner][year]["QTY_100KG"]=val
                elif indicator=="SUPPLEMENTARY_QUANTITY":
                    data[reporter][product][partner][year]["SUP"]=val

            print(f"[Eurostat] {year} parsed")
        except Exception as e:
            errors.append(f"{year}: {e}")

        time.sleep(1)  # Politeness: 1s between requests

    return data,errors

def fetch_uk_data():
    """UK API exploration: attempted to query OTS by MonthId/CommodityId/CountryId.
    Status: API returns data but lacks reliable CN8 to internal ID mapping.
    - CommodityId in OTS is an internal ID, not CN8 code
    - Commodity entity exists but no endpoint to map CN8 → internal ID
    - CountryId mapping unclear (Countries endpoint not found)
    - MonthId format YYYYMM but no recent data
    Conclusion: marking as unavailable; would need deeper Commodity.CommodityId
    and Country.CountryId exploration.
    """
    print("[UK] API exploration: insufficient metadata to map CN8 to internal IDs")
    return {},["UK: API metadata mismatch - no reliable CN8→CommodityId mapping"]

def fetch_comtrade_one(reporter_code,hs6,year):
    """One (reporter, product, year) request. The preview endpoint rejects a
    multi-period query ("Maximum number of periods for preview is 1",
    verified live), so this is called once per year, not once per reporter."""
    params=urllib.parse.urlencode([("reporterCode",str(reporter_code)),("period",year),("cmdCode",hs6),("flowCode","M")])
    return https_get(COMTRADE_BASE+"?"+params)

def comtrade_rows_for_year(json_resp):
    """One Comtrade response -> {partner_code_str: {VALUE,QTY_100KG,SUP}} for
    one year, in the exact row shape unit_price_for/compute_terciles/
    compute_band already consume from Eurostat.

    De-dup root cause (verified live, 2026-08-07 — corrects the brief's
    working theory): the preview endpoint returns one row per partner PER
    TRANSPORT MODE (motCode), plus a motCode=0 "TOTAL - all modes" row that
    already sums them. Not partner2Code, which was 0 on every row seen
    across all four reporters. Filtering to motCode==0 keeps exactly one row
    per partner and IS the de-dup rule. See fetch-trade.js for the AU
    820150/2023 worked example that pinned this down."""
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
    """piece when the API's own World row's altQtyUnitCode flag (only the
    flag — never its cifvalue, which is never trusted) says piece, OR when a
    majority of source countries report pieces. Decided once per
    (reporter, product) from the latest year available."""
    world_piece=bool(world_row_api and world_row_api.get("altQtyUnitCode")==5 and (world_row_api.get("altQty") or 0)>0)
    rows=[r for code,r in partners.items() if code not in BAND_EXCLUDE_PARTNERS]
    with_pieces=len([r for r in rows if r["SUP"]>0])
    majority_piece=len(rows)>0 and with_pieces/len(rows)>0.5
    return "piece" if (world_piece or majority_piece) else "kg"

def build_comtrade_world(partners,world_row_api,basis):
    """World is never read from the API's partnerCode=0 row — rebuilt here by
    summing the qualifying (non-aggregate) partner rows, per the brief's
    fail-closed policy. Returns the self-computed WORLD row plus a
    cross-check verdict against the API's row (report/note only, never the
    metric itself)."""
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

def fetch_comtrade_data():
    """Every (reporter, product, year) Comtrade cell the shelf needs. Returns
    (data, errors, cross_checks): data[iso][cn8][year] = {partners, world_row_api}."""
    data={}
    errors=[]
    cross_checks=[]
    for iso,reporter_code in COMTRADE_REPORTERS:
        data[iso]={}
        for cn8 in PRODUCTS:
            hs6=cn8[:6]
            per_year={}
            for year in COMTRADE_YEARS:
                time.sleep(1.1)  # politeness: >=1s between requests, every request
                try:
                    j=fetch_comtrade_one(reporter_code,hs6,year)
                    if j and j.get("error"):
                        errors.append(f"{iso}/{cn8}/{year}: {j['error']}")
                        continue
                    partners,world_row_api=comtrade_rows_for_year(j)
                    per_year[year]={"partners":partners,"world_row_api":world_row_api}
                    print(f"[Comtrade] {iso}/{hs6}/{year}: {len(partners)} source rows")
                except Exception as e:
                    errors.append(f"{iso}/{cn8}/{year}: {e}")
            data[iso][cn8]=per_year
    return data,errors,cross_checks

def build_comtrade_markets(comtrade_data,cross_checks):
    """Aggregate fetch_comtrade_data()'s output into trade.markets entries,
    reusing compute_band/calculate_metrics/validate_metrics exactly as the
    Eurostat path does."""
    markets={}
    for iso,_ in COMTRADE_REPORTERS:
        markets[iso]={}
        by_product=comtrade_data.get(iso,{})
        for cn8 in PRODUCTS:
            per_year=by_product.get(cn8,{})
            y24=per_year.get("2024")
            y23=per_year.get("2023")
            if not y24 and not y23:
                markets[iso][cn8]={"basis":"kg","uv_change_pct":None,"vol_change_pct":None,"share_tw":None,"share_tw_prev":None,"share_cn":None,"stale":True,"band":None,"src":"comtrade"}
                continue

            basis_src=y24 or y23
            basis=decide_comtrade_basis(basis_src["partners"],basis_src["world_row_api"])

            w24=build_comtrade_world(y24["partners"],y24["world_row_api"],basis) if y24 else None
            w23=build_comtrade_world(y23["partners"],y23["world_row_api"],basis) if y23 else None
            if w24: cross_checks.append({"iso":iso,"cn8":cn8,"year":"2024",**w24,"verdict":w24["crossCheck"]})
            if w23: cross_checks.append({"iso":iso,"cn8":cn8,"year":"2023",**w23,"verdict":w23["crossCheck"]})

            world24=w24["world"] if w24 else None
            world23=w23["world"] if w23 else None
            tw24=y24["partners"].get(TW_CODE) if y24 else None
            tw23=y23["partners"].get(TW_CODE) if y23 else None
            cn24=y24["partners"].get(CN_CODE) if y24 else None

            metrics=calculate_metrics(iso,cn8,world23,world24,basis)
            metrics["src"]="comtrade"

            if world24 and world24["VALUE"]>0:
                if tw24 and tw24["VALUE"]:
                    metrics["share_tw"]=round((tw24["VALUE"]/world24["VALUE"])*100)
                if cn24 and cn24["VALUE"]:
                    metrics["share_cn"]=round((cn24["VALUE"]/world24["VALUE"])*100)
            if world23 and world23["VALUE"]>0 and tw23 and tw23["VALUE"]:
                metrics["share_tw_prev"]=round((tw23["VALUE"]/world23["VALUE"])*100)

            partners24=dict(y24["partners"]) if y24 else {}
            if y24: partners24["WORLD"]=world24
            partners23=dict(y23["partners"]) if y23 else {}
            if y23: partners23["WORLD"]=world23
            metrics["band"]=compute_band(partners24,partners23,world24,world23,tw24,basis)

            if w24 and w24["crossCheck"]=="diverged":
                metrics["note"]="world cross-check diverged >5% from Comtrade's reported total; used summed sources"

            validate_metrics(metrics)
            markets[iso][cn8]=metrics
            band=metrics["band"]
            print(f"[metrics] {iso}/{cn8} (comtrade): stale={metrics['stale']}, basis={basis}, uv={metrics['uv_change_pct']}, share_tw={metrics['share_tw']}, "
                  f"band={band['market'] if band else None}, band.tw={band['tw'] if band else None}, moved={band['moved'] if band else None}, "
                  f"world_cross_check={w24['crossCheck'] if w24 else 'n/a'}")
    return markets

def calculate_metrics(reporter,product,data23,data24,basis):
    """Calculate UV change and shares."""
    metrics={
        "basis":basis,
        "uv_change_pct":None,
        "vol_change_pct":None,
        "share_tw":None,
        "share_tw_prev":None,
        "share_cn":None,
        "stale":False
    }

    if not data23 or not data24:
        metrics["stale"]=True
        return metrics

    # UV calculation
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
    metrics["uv_change_pct"]=round(((uv24/uv23-1)*100)*10)/10

    # Vol change
    metrics["vol_change_pct"]=round(((denom24/denom23-1)*100)*10)/10

    return metrics

def unit_price_for(row,basis):
    """Unit value for one partner-row (VALUE/quantity), or None when the row
    can't support a price: zero/missing quantity, zero/missing value. Shared
    by the market-wide metrics and the band tercile so a "no data" country
    reads the same way in both."""
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
    values for one reporter/product/year. Returns {p33,p67,n} or None when
    there are fewer than BAND_MIN_SOURCES usable countries — the
    fail-closed case the caller must turn into band=None rather than guess
    a boundary.

    partners_for_year: {partner_code: {VALUE, QTY_100KG, SUP}} for one
    year. world_value anchors the 0.5% re-export-noise cutoff to the whole
    market, not to the trimmed sample.

    p33/p67 are absolute per-unit prices and MUST NOT be written to
    trade.json: that file is fetched by every visitor's browser, and this
    site's stated policy is to publish rate-of-change, never a price level
    a counterparty could see and negotiate against. They exist only inside
    this function call, are consumed immediately by band_of(), and are
    discarded when it returns."""
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
    """The public-facing band object for one cell: relative positions only
    (see the no-absolute-prices note on compute_terciles). market/tw are
    the band this year; moved compares this year's band to last year's,
    each computed against its OWN year's tercile (a market can restructure
    its source mix year to year, so last year's boundary is not assumed to
    still apply). band itself is None — not a best guess — when this
    year's market band can't be established at all."""
    terciles24=compute_terciles(partners24,world24.get("VALUE") if world24 else None,basis)
    terciles23=compute_terciles(partners23,world23.get("VALUE") if world23 else None,basis)
    world_uv24=unit_price_for(world24,basis)
    world_uv23=unit_price_for(world23,basis)
    tw_uv24=unit_price_for(tw24,basis)

    market24=band_of(world_uv24,terciles24)
    if not market24:
        return None  # fail-closed: no market position, no band object

    market23=band_of(world_uv23,terciles23)

    # Where Taiwan-origin supply prices is a claim the site publishes in a
    # sentence, so it needs a heavier burden of proof than a metric does. A
    # source under BAND_MIN_TW_SHARE of the market may be one atypical
    # consignment, and its unit value says nothing dependable about where
    # Taiwanese supply competes. Such a share also rounds to 0% or 1% in the
    # line printed directly above, so the page would claim a positioning for
    # an origin it had just called invisible. Below the bar: not published.
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
            to_next_pct=round(abs(world_uv24-terciles24["p33"])/world_uv24*100)
        elif market24=="upper":
            to_next_pct=round(abs(world_uv24-terciles24["p67"])/world_uv24*100)
        else:
            d_low=abs(world_uv24-terciles24["p33"])
            d_high=abs(terciles24["p67"]-world_uv24)
            to_next_pct=round(min(d_low,d_high)/world_uv24*100)

    return {"market":market24,"tw":tw,"moved":moved,"to_next_pct":to_next_pct}

def validate_metrics(metrics):
    """Validate against data contract."""
    if metrics["stale"]:
        return True

    # share_tw + share_cn <= 100 and each in [0,100]
    if metrics["share_tw"] is not None and metrics["share_cn"] is not None:
        if(metrics["share_tw"]+metrics["share_cn"]>100 or
           metrics["share_tw"]<0 or metrics["share_tw"]>100 or
           metrics["share_cn"]<0 or metrics["share_cn"]>100):
            metrics["stale"]=True
            return True

    # |uv_change_pct| <= 50
    if metrics["uv_change_pct"] is not None:
        if abs(metrics["uv_change_pct"])>50:
            metrics["stale"]=True
            return True

    return False

def build_trade_json(eu_data,comtrade_markets):
    """Aggregate Eurostat data into trade.json structure."""
    utc_now=datetime.datetime.utcnow().replace(microsecond=0).isoformat()+"Z"
    trade={
        "schema":1,
        "generated":utc_now,
        "period":{"latest":"2024","previous":"2023"},
        "source":{
            "eu":"Eurostat Comext DS-045409",
            "uk":"HMRC uktradeinfo OTS",
            "comtrade":"UN Comtrade (public preview API) — Taiwan-origin reported by the UN as 'Other Asia, nes'"
        },
        "markets":{}
    }

    reporter_map={r:r.lower() for r in REPORTERS}
    stale_count=0
    total_count=0

    for reporter_code,products in eu_data.items():
        reporter_key=reporter_map.get(reporter_code)
        if not reporter_key:
            continue

        trade["markets"][reporter_key]={}

        for product_code,partners in products.items():
            total_count+=1
            basis=BASIS_MAP.get(product_code,"kg")

            # Get TW, CN, WORLD for this product
            tw23=partners.get("TW",{}).get("2023")
            tw24=partners.get("TW",{}).get("2024")
            cn23=partners.get("CN",{}).get("2023")
            cn24=partners.get("CN",{}).get("2024")
            world23=partners.get("WORLD",{}).get("2023")
            world24=partners.get("WORLD",{}).get("2024")

            # Market-wide (WORLD) unit value and volume; TW/CN feed shares only.
            metrics=calculate_metrics(reporter_code,product_code,world23,world24,basis)
            metrics["src"]="eurostat"

            # Calculate shares from WORLD baseline
            if world24 and world24.get("VALUE") and world24["VALUE"]>0:
                if tw24 and tw24.get("VALUE"):
                    metrics["share_tw"]=round((tw24["VALUE"]/world24["VALUE"])*100)
                if cn24 and cn24.get("VALUE"):
                    metrics["share_cn"]=round((cn24["VALUE"]/world24["VALUE"])*100)

            if world23 and world23.get("VALUE") and world23["VALUE"]>0:
                if tw23 and tw23.get("VALUE"):
                    metrics["share_tw_prev"]=round((tw23["VALUE"]/world23["VALUE"])*100)

            # Price-band: value-weighted thirds of every source country's
            # unit value (see compute_terciles/compute_band above).
            # `partners` here already carries every partner code this pull
            # returned (the `partner` param is no longer sent — see
            # fetch_eurostat_data), so no second fetch is needed. None is
            # the fail-closed answer, not a 0% one, when fewer than
            # BAND_MIN_SOURCES countries qualify.
            partners24={code:years["2024"] for code,years in partners.items() if "2024" in years}
            partners23={code:years["2023"] for code,years in partners.items() if "2023" in years}
            metrics["band"]=compute_band(partners24,partners23,world24,world23,tw24,basis)

            # Validate
            validate_metrics(metrics)
            if metrics["stale"]:
                stale_count+=1

            trade["markets"][reporter_key][product_code]=metrics
            band=metrics["band"]
            print(f"[metrics] {reporter_code}/{product_code}: stale={metrics['stale']}, uv={metrics['uv_change_pct']}, share_tw={metrics['share_tw']}, "
                  f"band={band['market'] if band else None}, band.tw={band['tw'] if band else None}, moved={band['moved'] if band else None}")

    # Comtrade markets were already built (metrics computed, validated) by
    # build_comtrade_markets — merged in here rather than recomputed, but
    # still counted into the same fail-closed stale ratio as one data
    # contract covering the whole file, not two.
    for iso,products in (comtrade_markets or {}).items():
        trade["markets"][iso]=products
        for metrics in products.values():
            total_count+=1
            if metrics["stale"]:
                stale_count+=1

    # Fail-closed: if >50% stale, don't overwrite
    if total_count>0:
        stale_ratio=stale_count/total_count
        if stale_ratio>0.5:
            print(f"[fail-closed] {stale_count}/{total_count} entries stale ({stale_ratio*100:.1f}%) > 50% threshold")
            return None

    return trade

def main():
    try:
        print("[fetch_trade] Starting trade data aggregation...")

        eu_data,eu_errors=fetch_eurostat_data()
        uk_data,uk_errors=fetch_uk_data()

        print("[fetch_trade] Fetching UN Comtrade (US/JP/IL/AU) — 32 requests, >=1.1s apart...")
        comtrade_data,comtrade_errors,cross_checks=fetch_comtrade_data()
        comtrade_markets=build_comtrade_markets(comtrade_data,cross_checks)

        if eu_errors:
            print("[Eurostat] Errors:",eu_errors)
        if uk_errors:
            print("[UK] Errors:",uk_errors)
        if comtrade_errors:
            print("[Comtrade] Errors:",comtrade_errors)

        print("[Comtrade] World cross-check (self-summed source countries vs Comtrade's own reported World row):")
        for c in cross_checks:
            ratio="n/a" if not c.get("apiValue") else f"{c['ownSum']/c['apiValue']:.3f}"
            print(f"  {c['iso']}/{c['cn8']}/{c['year']}: verdict={c['verdict']} own_sum_vs_api_ratio={ratio}")

        trade=build_trade_json(eu_data,comtrade_markets)

        if not trade:
            print("[fail-closed] Trade data contract violated; keeping existing file")
            sys.exit(1)

        # Write trade.json (UTF-8, no BOM)
        with open(TRADE_PATH,"w",encoding="utf-8") as f:
            json.dump(trade,f,ensure_ascii=False,indent=2)
            f.write("\n")

        print(f"[success] Wrote {TRADE_PATH}")
        sys.exit(0)
    except Exception as e:
        print("[error]",e)
        sys.exit(1)

if __name__=="__main__":
    main()
