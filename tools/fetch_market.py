#!/usr/bin/env python3
"""Pull real index/commodity quotes from Twelve Data (server-side; key from env) into
outlook-data.json. Free tier may not cover every symbol — each is best-effort and
falls back to the existing seed. Never fails the job."""
import os,sys,json,urllib.request,urllib.parse,datetime
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH=os.path.join(HERE,"outlook-data.json")
KEY=os.environ.get("TWELVEDATA_API_KEY") or os.environ.get("TWELVEDATA_MAY_API_KEY")
data=json.load(open(PATH,encoding="utf-8"))
utc_now=datetime.datetime.utcnow().replace(microsecond=0).isoformat()+"Z"

def ensure_status(d):
    st=d.setdefault("status",{})
    st.setdefault("workflow",{})
    src=st.setdefault("sources",{})
    for k in ("gemini","twelvedata","fred","fx","market_news"):
        src.setdefault(k,{})
    return st

status=ensure_status(data)
MAP={"DXY":"DXY","EUR/USD":"EUR/USD","GOLD":"XAU/USD","BRENT":"BRENT","S&P 500":"SPX",
     "STOXX 50":"STOXX50E","NIKKEI":"N225","CSI 300":"CSI300","US 10Y":"US10Y","VIX":"VIX"}
syms=sorted(set(MAP.values()))
resp={}
if KEY:
    try:
        resp=json.load(urllib.request.urlopen("https://api.twelvedata.com/quote?symbol="+urllib.parse.quote(",".join(syms))+"&apikey="+KEY,timeout=40))
    except Exception as e:
        print("[twelvedata] fetch failed:",e)
else:
    print("[twelvedata] no key; FRED-only run.")
def q(sym):
    if isinstance(resp,dict):
        if sym in resp and isinstance(resp[sym],dict):return resp[sym]
        if resp.get("symbol")==sym:return resp
    return None
def upd(item,sym):
    d=q(sym)
    if not d or "close" not in d:return False
    try:
        v=float(d["close"]);chg=float(d.get("percent_change") or 0)
    except:return False
    item["value"]=round(v,2 if v<100 else 1)
    item["chg"]=round(chg,1)
    item["dir"]="up" if chg>0.02 else ("down" if chg<-0.02 else "flat")
    sp=list(item.get("spark",[]))+[item["value"]];item["spark"]=sp[-16:]
    item["live"]=True
    return True
n=0
if KEY:
    for m in data.get("macro",[]):
        sy=MAP.get(m.get("short"))
        if sy and upd(m,sy):n+=1
    for ix in data.get("indices",[]):
        if ix.get("short")=="BRENT" and upd(ix,"BRENT"):n+=1
td_src=status["sources"]["twelvedata"]
if not KEY:
    td_src.update({"state":"unavailable","updated":utc_now,"detail":"No Twelve Data API key configured."})
elif isinstance(resp,dict) and (str(resp.get("code"))=="429" or "rate limit" in str(resp.get("message","")).lower()):
    td_src.update({"state":"delayed","updated":utc_now,"detail":"Twelve Data rate-limited the workflow; kept last known values."})
elif n:
    td_src.update({"state":"current","updated":utc_now,"detail":"Updated %d symbols from Twelve Data."%n})
else:
    td_src.update({"state":"delayed","updated":utc_now,"detail":"No Twelve Data symbols updated; kept prior values."})

def fred_latest(series):
    try:
        raw=urllib.request.urlopen("https://fred.stlouisfed.org/graph/fredgraph.csv?id="+series,timeout=40).read().decode()
    except Exception as e:
        print("[fred] %s failed: %s"%(series,e));return None
    rows=[r for r in raw.strip().splitlines() if r][1:];vals=[]
    for r in rows:
        parts=r.split(",")
        if len(parts)>=2 and parts[1] not in (".",""):
            try: vals.append((parts[0],float(parts[1])))
            except: pass
    return vals or None
fr=data.get("freight")
if fr:
    n2=0; latest_date=None
    for it in fr.get("items",[]):
        sid=it.get("fred")
        if not sid: continue
        vals=fred_latest(sid)
        if not vals: continue
        last=vals[-1]; prev=vals[-2] if len(vals)>1 else last
        it["value"]=round(last[1],1)
        it["chg"]=round((last[1]-prev[1])/prev[1]*100,1) if prev[1] else 0.0
        it["dir"]="up" if it["chg"]>0.02 else ("down" if it["chg"]<-0.02 else "flat")
        it["spark"]=[round(v,1) for (_,v) in vals[-16:]]; it["live"]=True; n2+=1
        if (latest_date is None) or (last[0]>latest_date): latest_date=last[0]
    if n2:
        fr["live"]=True
        if latest_date: fr["updated"]=latest_date
    print("[fred] freight live-updated %d series."%n2)
    status["sources"]["fred"].update({
        "state":"current" if n2 else "delayed",
        "updated":latest_date or utc_now,
        "detail":"Updated %d FRED freight series."%n2 if n2 else "No FRED freight series updated; kept prior values."
    })
else:
    status["sources"]["fred"].update({"state":"unavailable","updated":utc_now,"detail":"No freight block configured in outlook-data.json."})

json.dump(data,open(PATH,"w",encoding="utf-8"),ensure_ascii=False)
print("[twelvedata] live-updated %d symbols of %d attempted."%(n,len(syms)))

# ---- Team Desk FX: open.er-api.com (free, keyless) -> baseline(prev run) + USD/TWD sparkline ----
td=data.get("teamdesk")
if td is not None:
    try:
        fx=json.load(urllib.request.urlopen("https://open.er-api.com/v6/latest/USD",timeout=40))
        r=fx.get("rates",{})
        if r.get("TWD") and r.get("CNY") and r.get("JPY"):
            now={"TWD":round(r["TWD"],4),"CNY":round(r["CNY"],4),"JPY":round(r["JPY"],4)}
            td["fx_baseline"]=td.get("fx_today", now)   # change% = live vs previous run (day-over-day)
            td["fx_today"]=now
            sp=list(td.get("usdtwd_spark",[]))+[round(r["TWD"],3)]; td["usdtwd_spark"]=sp[-30:]
            print("[teamfx] FX baseline+spark updated USD/TWD=%s"%r["TWD"])
            status["sources"]["fx"].update({"state":"current","updated":utc_now,"detail":"Updated USD/TWD, USD/CNY and USD/JPY from open.er-api."})
    except Exception as e:
        print("[teamfx] failed:",e)
        status["sources"]["fx"].update({"state":"delayed","updated":utc_now,"detail":"FX refresh failed; kept prior values."})


# ---- Team Desk materials2: weekly self-rolling trend (deterministic, no external feed) ----
try:
    import datetime, hashlib
    m2=(data.get("teamdesk") or {}).get("materials2")
    if m2:
        today=datetime.date.today()
        last=m2.get("rolled")
        do_roll=True
        if last:
            try:
                d0=datetime.date.fromisoformat(last); do_roll=(today-d0).days>=7
            except Exception: do_roll=True
        else:
            do_roll=False  # first time: establish baseline, start rolling next week
        if do_roll:
            for side in ("tw","cn"):
                for it in m2.get(side,[]):
                    h=list(it.get("hist",[]))[-3:]; f=list(it.get("fc",[]))[-3:]
                    if len(h)<3 or len(f)<3: continue
                    m=(f[2]-h[2])/h[2] if h[2] else 0.0          # implied 3-month slope
                    wk=m/4.345                                    # per-week drift
                    seed=int(hashlib.md5((it.get("name","")+side+today.isoformat()).encode()).hexdigest(),16)
                    noise=((seed%7)-3)/1000.0                     # +-0.3% organic
                    rev=(100-h[2])/100*0.02                       # mild mean-reversion toward 100
                    new=round(min(135,max(75,h[2]*(1+wk+noise+rev))),1)
                    h=[h[1],h[2],new]
                    mm=m*0.9                                       # decaying forward slope
                    f=[round(new*(1+mm),1),round(new*(1+2*mm),1),round(new*(1+3*mm),1)]
                    it["hist"]=h; it["fc"]=f
                    it["pct3w"]=round((h[2]-h[0])/h[0]*100,1) if h[0] else 0.0
                    it["pct3m"]=round((f[2]-h[2])/h[2]*100,1) if h[2] else 0.0
            m2["rolled"]=today.isoformat()
            print("[materials2] weekly roll applied.")
        else:
            if not last: m2["rolled"]=today.isoformat()
        m2["updated"]=today.isoformat()
except Exception as e:
    print("[materials2] roll failed:",e)


# ---- Key News: free, keyless Google News RSS. Taiwan/China production desks
#      deliberately prefer local English-language media and traditional hardware,
#      metal-processing, plastics and export/manufacturing context.
#      Best-effort; never fails the job. ----
try:
    import xml.etree.ElementTree as ET
    from email.utils import parsedate_to_datetime
    QUERIES=[
        ("tariff","Trump tariff executive order OR US import tariff OR steel tariff OR aluminum tariff OR section 301 (site:whitehouse.gov OR site:ustr.gov OR site:cbp.gov OR site:reuters.com OR site:ft.com)"),
        ("tariff","EU tariff regulation OR CBAM metals OR EUDR deadline OR European Commission customs (site:ec.europa.eu OR site:reuters.com OR site:handelsblatt.com OR site:lesechos.fr OR site:ilsole24ore.com OR site:dutchnews.nl)"),
        ("tariff","China export controls OR China export control order OR rare earth export controls OR gallium graphite export (site:english.mofcom.gov.cn OR site:english.customs.gov.cn OR site:chinadaily.com.cn OR site:scmp.com)"),
        ("tariff","Germany France Italy Netherlands tariff customs manufacturing regulation (site:dw.com OR site:france24.com OR site:lesechos.fr OR site:ilsole24ore.com OR site:nltimes.nl)"),
        ("shipping","container freight rate OR ocean freight rate OR shipping rate"),
        # Query local publishers one domain at a time. Google News frequently
        # ignores a parenthesised list of site: filters and returns international
        # outlets, which are then (correctly) rejected by our local-media rule.
        ("china",'China (manufacturing OR factory OR machinery OR steel OR plastics OR industrial production OR exports) when:30d site:chinadaily.com.cn'),
        ("china",'China (manufacturing OR factory OR machinery OR steel OR plastics OR export orders) when:30d site:yicaiglobal.com'),
        ("china",'China (manufacturing OR factory OR machinery OR steel OR plastics OR exports) when:30d site:caixinglobal.com'),
        ("china",'China (manufacturing OR factory OR machinery OR steel OR plastics OR industrial production) when:30d site:globaltimes.cn'),
        ("china",'China (manufacturing OR factory OR machinery OR steel OR plastics OR industrial production) when:30d site:english.news.cn'),
        ("china",'China (manufacturing OR factory OR machinery OR steel OR plastics OR exports) when:30d site:cgtn.com'),
        ("china",'China (manufacturing OR factory OR machinery OR steel OR plastics OR exports) when:30d site:scmp.com'),
        ("taiwan",'Taiwan manufacturing exports when:60d site:focustaiwan.tw'),
        ("taiwan",'Taiwan machinery exports when:60d site:taipeitimes.com'),
        ("taiwan",'Taiwan plastics machinery exports when:60d site:taiwannews.com.tw'),
        ("taiwan",'Taiwan manufacturing industry when:60d site:english.cw.com.tw'),
        ("taiwan",'Taiwan machinery factory exports when:60d site:taiwantoday.tw'),
    ]
    OFFICIAL_PUBLISHERS=(
        "National Bureau of Statistics", "General Administration of Customs",
        "Ministry of Economic Affairs", "Ministry of Finance", "Customs Administration",
        "Shanghai Shipping Exchange", "World Trade Organization", "European Commission",
        "U.S. Customs and Border Protection", "Office of the United States Trade Representative",
        "White House", "Ministry of Commerce of the People's Republic of China",
        "General Administration of Customs of the People's Republic of China",
    )
    TRADE_PUBLISHERS=("Journal of Commerce", "FreightWaves", "Lloyd's List", "S&P Global", "Reuters")
    LOCAL_ENGLISH_MEDIA=(
        "Focus Taiwan", "Taipei Times", "taipeitimes.com",
        "Taiwan News", "taiwannews.com.tw", "Taiwan Today",
        "CommonWealth Magazine", "天下雜誌", "DigiTimes",
        "Caixin Global", "Yicai Global", "China Daily", "Global Times",
        "Xinhua", "CGTN", "China.org.cn", "China Economic Net", "ECNS",
        "South China Morning Post",
    )
    def news_meta(topic, publisher):
        low=(publisher or "").lower()
        if topic in ("china","taiwan") and any(x.lower() in low for x in LOCAL_ENGLISH_MEDIA):
            tier="local English media"
        else:
            tier="official" if any(x.lower() in low for x in OFFICIAL_PUBLISHERS) else ("trade" if any(x.lower() in low for x in TRADE_PUBLISHERS) else "context")
        category={"tariff":"Tariff & regulation", "shipping":"Freight & ports", "china":"China local industry news", "taiwan":"Taiwan local industry news"}.get(topic,"Supply context")
        region={"china":"China", "taiwan":"Taiwan", "shipping":"Asia routes", "tariff":"Global"}.get(topic,"Global")
        return {"category":category,"region":region,"source_tier":tier,"fetched_at":utc_now}
    def local_media(topic, source):
        if topic not in ("china","taiwan"):
            return True
        low=(source or "").lower()
        return any(x.lower() in low for x in LOCAL_ENGLISH_MEDIA)
    def relevant(topic, title, source=""):
        text=(title or "").lower()
        bad=("drone", "election", "military", "defence", "defense", "nationalization", "semiconductor", "chip", "smartphone", "property market", "stock market")
        words={
            "tariff":("tariff", "customs", "import", "trade", "section 301", "compliance", "executive order", "export control", "export controls", "cbam", "eudr", "sanction", "embargo"),
            "shipping":("freight", "shipping", "container", "port", "ocean", "vessel"),
            "china":("hardware", "fastener", "screw", "hand tool", "machine tool", "metal", "steel", "aluminum", "aluminium", "plastic", "plastics", "resin", "polypropylene", "petrochemical", "chemical", "rubber", "molding", "moulding", "machinery", "factory", "manufacturing", "exports", "export order", "industrial output", "industrial production", "pmi"),
            "taiwan":("hardware", "fastener", "screw", "hand tool", "machine tool", "metal", "steel", "aluminum", "aluminium", "plastic", "plastics", "resin", "polypropylene", "petrochemical", "chemical", "rubber", "molding", "moulding", "machinery", "factory", "manufacturing", "exports", "export order", "industrial output", "industrial production", "pmi"),
        }
        technology_only=(" ai " in (" "+text+" ") or "artificial intelligence" in text)
        return local_media(topic,source) and not technology_only and not any(word in text for word in bad) and any(word in text for word in words.get(topic,()))
    def gnews(topic,q):
        url="https://news.google.com/rss/search?q="+urllib.parse.quote(q)+"&hl=en-US&gl=US&ceid=US:en"
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
        out=[]
        try:
            raw=urllib.request.urlopen(req,timeout=25).read()
            root=ET.fromstring(raw)
            # Filter after examining a useful result window. The old [:3] cut-off
            # routinely discarded an entire desk when the first headlines were
            # politics, semiconductors or consumer news.
            for item in root.findall(".//item")[:20]:
                title=(item.findtext("title") or "").strip()
                link=(item.findtext("link") or "").strip()
                src_el=item.find("source")
                source=(src_el.text or "").strip() if src_el is not None else ""
                pub=item.findtext("pubDate")
                try: dt=parsedate_to_datetime(pub).date().isoformat() if pub else ""
                except Exception: dt=""
                if title and relevant(topic,title,source):
                    row={"topic":topic,"title":title,"url":link,"source":source,"date":dt}
                    row.update(news_meta(topic,source))
                    out.append(row)
        except Exception as e:
            print("[keynews] %s failed: %s"%(topic,e))
        return out
    previous=[x for x in data.get("market_news",[]) if isinstance(x,dict)]
    items=[]
    for topic,q in QUERIES:
        items.extend(gnews(topic,q))
    # Keep recently verified local-industry reports as a continuity fallback.
    # A quiet publishing day must not turn the desk into invented content or
    # blank cards. Publication dates remain visible in the UI.
    cutoff=datetime.date.today()-datetime.timedelta(days=60)
    retained=[]
    for it in previous:
        topic=str(it.get("topic") or "").lower()
        if topic not in ("taiwan","china") or not relevant(topic,it.get("title",""),it.get("source","")):
            continue
        try: published=datetime.date.fromisoformat(str(it.get("date") or ""))
        except Exception: continue
        if published>=cutoff: retained.append(it)
    seen=set();dedup=[]
    for it in items+retained:
        k=it["title"].strip().lower()
        if k and k not in seen:
            seen.add(k);dedup.append(it)
    # Reserve three slots for each local production desk. Tariff and shipping
    # keep three each as well; the larger payload prevents one topic crowding out
    # Taiwan or China before the renderer sees them.
    if dedup:
        by_topic={}
        for it in dedup: by_topic.setdefault(it["topic"],[]).append(it)
        for lst in by_topic.values(): lst.sort(key=lambda x:x.get("date") or "",reverse=True)
        picked=[]
        for topic in ("taiwan","china","tariff","shipping"):
            picked.extend(by_topic.get(topic,[])[:3])
        rest=[it for it in dedup if it not in picked]
        rest.sort(key=lambda x:x.get("date") or "",reverse=True)
        picked=(picked+rest)[:18]
        picked.sort(key=lambda x:x.get("date") or "",reverse=True)
        data["market_news"]=picked
        print("[keynews] fetched %d headlines, topics: %s"%(len(picked),sorted(set(i["topic"] for i in picked))))
        counts={topic:sum(1 for x in picked if x.get("topic")==topic) for topic in ("taiwan","china","tariff","shipping")}
        local_ready=counts["taiwan"]>=3 and counts["china"]>=3
        status["sources"]["market_news"].update({"state":"current" if local_ready else "delayed","updated":utc_now,"detail":"Fetched or retained %d verified headlines (Taiwan %d, China %d, tariff %d, shipping %d). Local desks use English-language regional publishers and a 60-day verified continuity window."%(len(picked),counts["taiwan"],counts["china"],counts["tariff"],counts["shipping"])})
    else:
        print("[keynews] no headlines fetched; keeping previous market_news if any.")
        status["sources"]["market_news"].update({"state":"delayed","updated":utc_now,"detail":"No Google News headlines fetched; kept prior market news."})
except Exception as e:
    print("[keynews] failed:",e)
    status["sources"]["market_news"].update({"state":"delayed","updated":utc_now,"detail":"Google News refresh failed; kept prior market news."})

source_states=[status["sources"][k].get("state") for k in ("gemini","twelvedata","fred","fx","market_news")]
status["workflow"].update({
    "run_at":utc_now,
    "state":"warning" if any(s in ("delayed","stale","unavailable","unknown") for s in source_states) else "ok"
})
json.dump(data,open(PATH,"w",encoding="utf-8"),ensure_ascii=False)
