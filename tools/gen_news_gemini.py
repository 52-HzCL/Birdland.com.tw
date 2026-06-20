#!/usr/bin/env python3
"""Refresh outlook-data.json via Google Gemini (free tier + Google Search grounding),
then rebuild news.html. Safe by design: if the API call or parsing fails, it only
bumps the 'updated' timestamp so the live site never breaks. Requires env GEMINI_API_KEY.
"""
import os,json,sys,datetime,urllib.request,subprocess

HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH=os.path.join(HERE,"outlook-data.json")
MODEL=os.environ.get("GEMINI_MODEL","gemini-2.5-flash")
KEY=os.environ.get("GEMINI_API_KEY","")
now=datetime.datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")
import traceback
def _eh(t,v,tb):
    traceback.print_exception(t,v,tb); print("[gen_news] swallowed error -> exit 0")
sys.excepthook=_eh

data=json.load(open(DATA_PATH,encoding="utf-8"))

def save_and_build(d):
    d["updated"]=now
    json.dump(d,open(DATA_PATH,"w",encoding="utf-8"),ensure_ascii=False)
    r=subprocess.run([sys.executable,os.path.join(HERE,"tools","build_news.py")],capture_output=True,text=True)
    print("[build_news]",r.stdout.strip(),r.stderr.strip())
    if r.returncode!=0: print("[build_news] FAILED rc",r.returncode)

if not KEY:
    print("No GEMINI_API_KEY; timestamp-only refresh.");save_and_build(data);sys.exit(0)

prompt=f"""You maintain the "Market & Supply Outlook" for Birdland Ind., a confidential OEM/ODM garden & field hand-tool manufacturer (Taiwan + China production). Below is the current JSON. Using up-to-date information from Google Search, update it.

RULES (strict):
- Keep the JSON structure EXACTLY: same top-level keys ("updated","order","regions"), same region keys and the same "order" array (14 markets). Do not add/remove regions.
- For each region update headline / regulation[].t / regulation[].b / supply / view ONLY where real-world facts have changed since this data; otherwise keep the existing wording.
- Lead with regulation & supply-chain RISK; treat prices/freight/oil as secondary background. Frame around volatility, lead time and supply risk — never "prices fell so cut your price". Keep the idea that Birdland's quotes reflect secured materials, compliant documentation and reliable supply, not spot prices. Conclusions are "Birdland's view (AI-assisted)".
- NEVER fabricate numbers, dates or rules. Only state what current sources support; otherwise stay qualitative. Keep each body 1-3 sentences. Use the HTML entity &amp; for ampersands inside strings.
- Themes to verify: EU EUDR, EU CBAM, EU PFAS(REACH), US Section 301/import tariffs on China & Taiwan tools, Canada surtax on China-melted steel, Australia timber biosecurity/ISPM15, Asia-Europe & transpacific container freight trend, Brent crude level/volatility.
- Top-level "indices" is a strip of buyer commodity/trade gauges; update each value (one decimal), dir (up/down/flat) and short sub-status from current data (Brent, steel HRC, container freight, polypropylene/resin, tariff pressure, Asia-EU freight). Keep the same labels/units.
- Top-level "teamAnalysis" is a 3-5 sentence desk synthesis — rewrite it to reflect the current picture (regulation/origin lead, prices secondary, Birdland keeps supply & documentation steady). Do NOT change top-level "news" (company posts) at all.
- Each region also has a "viz" object with numeric 0-100 scores: heat{regulation,tariff,freight,energy}, x (regulatory pressure), y (cost/supply volatility), size (importer exposure), px, py (previous position). Update heat and x/y/size to reflect current conditions where they have clearly shifted; keep them plausible and bounded 0-100. Do NOT set px/py yourself.
- Output ONLY the complete updated JSON object. No markdown, no commentary.

CURRENT JSON:
{json.dumps(data,ensure_ascii=False)}"""

body={"contents":[{"parts":[{"text":prompt}]}],"tools":[{"google_search":{}}],
      "generationConfig":{"temperature":0.3}}
url=f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"
try:
    req=urllib.request.Request(url,data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
    resp=json.load(urllib.request.urlopen(req,timeout=120))
    txt=resp["candidates"][0]["content"]["parts"][0]["text"]
    s=txt.find("{");e=txt.rfind("}")
    cand=json.loads(txt[s:e+1])
    # validate structure
    assert set(cand.get("regions",{}).keys())==set(data["regions"].keys()), "region keys changed"
    assert [tuple(x) for x in cand.get("order",[])]==[tuple(x) for x in data["order"]], "order changed"
    for r in cand["regions"].values():
        assert all(k in r for k in ("headline","regulation","supply","view"))
    # roll viz tails: new px,py = previous x,y; keep numbers bounded; fall back to old viz
    for code,oldr in data["regions"].items():
        ov=oldr.get("viz") or {}
        nv=(cand["regions"].get(code) or {}).get("viz") or {}
        merged=dict(ov); 
        for k in ("heat","x","y","size"):
            if k in nv: merged[k]=nv[k]
        def cl(v):
            try:return max(0,min(100,float(v)))
            except:return v
        if isinstance(merged.get("heat"),dict): merged["heat"]={k:cl(v) for k,v in merged["heat"].items()}
        for k in ("x","y","size"): 
            if k in merged: merged[k]=cl(merged[k])
        merged["px"]=ov.get("x",merged.get("x")); merged["py"]=ov.get("y",merged.get("y"))
        merged["pheat"]=ov.get("heat", ov.get("pheat", merged.get("heat")))  # tail for heatmap deltas
        cand["regions"][code]["viz"]=merged
    cand["news"]=data.get("news",[])                      # never let AI touch company news
    if not cand.get("indices"): cand["indices"]=data.get("indices",[])
    if not cand.get("teamAnalysis"): cand["teamAnalysis"]=data.get("teamAnalysis","")
    print("Gemini update parsed & validated; viz tails rolled.")
    save_and_build(cand)
except Exception as ex:
    print("Gemini refresh failed (%s); timestamp-only fallback."%ex)
    save_and_build(data)
