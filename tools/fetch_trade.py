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

def build_trade_json(eu_data):
    """Aggregate Eurostat data into trade.json structure."""
    utc_now=datetime.datetime.utcnow().replace(microsecond=0).isoformat()+"Z"
    trade={
        "schema":1,
        "generated":utc_now,
        "period":{"latest":"2024","previous":"2023"},
        "source":{
            "eu":"Eurostat Comext DS-045409",
            "uk":"HMRC uktradeinfo OTS"
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

        if eu_errors:
            print("[Eurostat] Errors:",eu_errors)
        if uk_errors:
            print("[UK] Errors:",uk_errors)

        trade=build_trade_json(eu_data)

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
