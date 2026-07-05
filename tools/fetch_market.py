#!/usr/bin/env python3
"""Pull real index/commodity quotes from Twelve Data (server-side; key from env) into
outlook-data.json. Free tier may not cover every symbol — each is best-effort and
falls back to the existing seed. Never fails the job."""
import os,sys,json,urllib.request,urllib.parse
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH=os.path.join(HERE,"outlook-data.json")
KEY=os.environ.get("TWELVEDATA_API_KEY") or os.environ.get("TWELVEDATA_MAY_API_KEY")
data=json.load(open(PATH,encoding="utf-8"))
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
    except Exception as e:
        print("[teamfx] failed:",e)


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


# ---- Key News: free, keyless Google News RSS -> tariffs/shipping/China & Taiwan
#      production & raw-materials headlines. Best-effort; never fails the job. ----
try:
    import xml.etree.ElementTree as ET
    from email.utils import parsedate_to_datetime
    QUERIES=[
        ("tariff","steel tariff OR aluminum tariff OR import tariff OR section 301"),
        ("shipping","container freight rate OR ocean freight rate OR shipping rate"),
        ("china","China manufacturing PMI OR China factory output OR China steel production"),
        ("taiwan","Taiwan exports OR Taiwan manufacturing OR Taiwan supply chain"),
    ]
    def gnews(topic,q):
        url="https://news.google.com/rss/search?q="+urllib.parse.quote(q)+"&hl=en-US&gl=US&ceid=US:en"
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
        out=[]
        try:
            raw=urllib.request.urlopen(req,timeout=25).read()
            root=ET.fromstring(raw)
            for item in root.findall(".//item")[:3]:
                title=(item.findtext("title") or "").strip()
                link=(item.findtext("link") or "").strip()
                src_el=item.find("source")
                source=(src_el.text or "").strip() if src_el is not None else ""
                pub=item.findtext("pubDate")
                try: dt=parsedate_to_datetime(pub).date().isoformat() if pub else ""
                except Exception: dt=""
                if title: out.append({"topic":topic,"title":title,"url":link,"source":source,"date":dt})
        except Exception as e:
            print("[keynews] %s failed: %s"%(topic,e))
        return out
    items=[]
    for topic,q in QUERIES:
        items.extend(gnews(topic,q))
    seen=set();dedup=[]
    for it in items:
        k=it["title"].strip().lower()
        if k and k not in seen:
            seen.add(k);dedup.append(it)
    dedup.sort(key=lambda x:x.get("date") or "",reverse=True)
    if dedup:
        data["market_news"]=dedup[:8]
        print("[keynews] fetched %d headlines across %d topics."%(len(dedup[:8]),len(QUERIES)))
    else:
        print("[keynews] no headlines fetched; keeping previous market_news if any.")
except Exception as e:
    print("[keynews] failed:",e)

json.dump(data,open(PATH,"w",encoding="utf-8"),ensure_ascii=False)
