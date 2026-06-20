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
