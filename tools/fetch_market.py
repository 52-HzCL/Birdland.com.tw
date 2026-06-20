#!/usr/bin/env python3
"""Pull real index/commodity quotes from Twelve Data (server-side; key from env) into
outlook-data.json. Free tier may not cover every symbol — each is best-effort and
falls back to the existing seed. Never fails the job."""
import os,sys,json,urllib.request,urllib.parse
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH=os.path.join(HERE,"outlook-data.json")
KEY=os.environ.get("TWELVEDATA_API_KEY") or os.environ.get("TWELVEDATA_MAY_API_KEY")
data=json.load(open(PATH,encoding="utf-8"))
if not KEY:
    print("[twelvedata] no API key in env; leaving seeds.");sys.exit(0)
MAP={"DXY":"DXY","EUR/USD":"EUR/USD","GOLD":"XAU/USD","BRENT":"BRENT","S&P 500":"SPX",
     "STOXX 50":"STOXX50E","NIKKEI":"N225","CSI 300":"CSI300","US 10Y":"US10Y","VIX":"VIX"}
syms=sorted(set(MAP.values()))
url="https://api.twelvedata.com/quote?symbol="+urllib.parse.quote(",".join(syms))+"&apikey="+KEY
try:
    resp=json.load(urllib.request.urlopen(url,timeout=40))
except Exception as e:
    print("[twelvedata] fetch failed:",e);sys.exit(0)
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
for m in data.get("macro",[]):
    s=MAP.get(m.get("short"))
    if s and upd(m,s):n+=1
for ix in data.get("indices",[]):
    if ix.get("short")=="BRENT" and upd(ix,"BRENT"):n+=1
json.dump(data,open(PATH,"w",encoding="utf-8"),ensure_ascii=False)
print("[twelvedata] live-updated %d symbols of %d attempted."%(n,len(syms)))
