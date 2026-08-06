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
REPORTERS=["DE","NL","FR"]
PRODUCTS=["82015000","82013000","82015000","82016000"]
PARTNERS=["TW","CN","WORLD"]
BASIS_MAP={"82015000":"piece","82013000":"kg","82015000":"piece","82016000":"kg"}

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
        for p in PARTNERS:
            params+="&partner="+p
        for prod in PRODUCTS:
            params+="&product="+prod

        url=EUROSTAT_BASE+"?"+params
        try:
            print(f"[Eurostat] Fetching {year}...")
            response=https_get(url)

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

    reporter_map={"DE":"de","NL":"nl","FR":"fr"}
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

            metrics=calculate_metrics(reporter_code,product_code,tw23,tw24,basis)

            # Calculate shares from WORLD baseline
            if world24 and world24.get("VALUE") and world24["VALUE"]>0:
                if tw24 and tw24.get("VALUE"):
                    metrics["share_tw"]=round((tw24["VALUE"]/world24["VALUE"])*100)
                if cn24 and cn24.get("VALUE"):
                    metrics["share_cn"]=round((cn24["VALUE"]/world24["VALUE"])*100)

            if world23 and world23.get("VALUE") and world23["VALUE"]>0:
                if tw23 and tw23.get("VALUE"):
                    metrics["share_tw_prev"]=round((tw23["VALUE"]/world23["VALUE"])*100)

            # Validate
            validate_metrics(metrics)
            if metrics["stale"]:
                stale_count+=1

            trade["markets"][reporter_key][product_code]=metrics
            print(f"[metrics] {reporter_code}/{product_code}: stale={metrics['stale']}, uv={metrics['uv_change_pct']}, share_tw={metrics['share_tw']}")

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
