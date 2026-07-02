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

def _extract_json(t):
    """Robustly pull the outlook JSON object out of a grounded Gemini reply.
    Handles: markdown ```json fences, a small preamble object before the real one,
    trailing prose, and the reply arriving as several concatenated parts."""
    t=t.strip()
    if t.startswith("```"):
        t=t[3:]
        if t[:4].lower()=="json": t=t[4:]
        if t.endswith("```"): t=t[:-3]
    dec=json.JSONDecoder(); i=0; L=len(t); best=None
    while i<L:
        c=t.find("{",i)
        if c<0: break
        try:
            obj,end=dec.raw_decode(t,c)
        except ValueError:
            i=c+1; continue
        if isinstance(obj,dict) and "regions" in obj: return obj      # the one we want
        if isinstance(obj,dict) and (best is None or len(obj)>len(best)): best=obj
        i=end
    return best

def save_and_build(d):
    d["updated"]=now
    json.dump(d,open(DATA_PATH,"w",encoding="utf-8"),ensure_ascii=False)
    r=subprocess.run([sys.executable,os.path.join(HERE,"tools","build_news.py")],capture_output=True,text=True)
    print("[build_news]",r.stdout.strip(),r.stderr.strip())
    if r.returncode!=0: print("[build_news] FAILED rc",r.returncode)

if not KEY:
    print("No GEMINI_API_KEY; timestamp-only refresh.");save_and_build(data);sys.exit(0)

# NOTE: plain string + concatenation (NOT an f-string) — the prompt text contains many
# literal {braces}; as an f-string those raised NameError at import time and silently
# killed the daily refresh (updated stayed frozen while fetch_market kept committing).
prompt="""You maintain the "Market & Supply Outlook" for Birdland Ind., a confidential OEM/ODM garden & field hand-tool manufacturer (Taiwan + China production). Below is the current JSON. Using up-to-date information from Google Search, update it.

RULES (strict):
- Keep the JSON structure EXACTLY: same top-level keys ("updated","order","regions"), same region keys and the same "order" array (14 markets). Do not add/remove regions.
- For each region update headline / regulation[].t / regulation[].b / supply / view ONLY where real-world facts have changed since this data; otherwise keep the existing wording.
- For each region ALSO output "summary": {"changed":"...","action":"..."} — two plain-English sentences for a busy buyer, each 110 characters or less: "changed" = the single most important shift this period for that market; "action" = the one thing the buyer should do about it. Concrete, no jargon; refresh it whenever the region content changes.
- Regional distinctiveness: for the EU countries (nl, de, fr, it, pl, es) each region's regulation/supply/view MUST contain at least one country-specific element (national retail/channel structure, domestic policy, local demand pattern) supported by current sources; NEVER reuse the same sentences across countries with only the country name swapped. Shared EU rules (EUDR/CBAM/PFAS) may be referenced but must not be the only substance.
- Lead with regulation & supply-chain RISK; treat prices/freight/oil as secondary background. Frame around volatility, lead time and supply risk — never "prices fell so cut your price". Keep the idea that Birdland's quotes reflect secured materials, compliant documentation and reliable supply, not spot prices. Conclusions are "Birdland's view (AI-assisted)".
- NEVER fabricate numbers, dates or rules. Only state what current sources support; otherwise stay qualitative. Keep each body 1-3 sentences. Use the HTML entity &amp; for ampersands inside strings.
- Themes to verify: EU EUDR, EU CBAM, EU PFAS(REACH), US Section 301/import tariffs on China & Taiwan tools, Canada surtax on China-melted steel, Australia timber biosecurity/ISPM15, Asia-Europe & transpacific container freight trend, Brent crude level/volatility.
- Also refresh these market blocks from current data, KEEPING their exact structure and keys: "forward" (update each curve point value & the tip; Steel HRC, Brent, PP Resin, Container Freight), "shipping" (lane rate, chg, dir), "war" (zone impact 0-100, status = high|elevated|watch, note), "procurement" (urgency = high|med|low, dir, action, why). Keep "landed", "tariff_calc" and "timeline" EXACTLY as given — do not change them.
- Top-level "macro" is a 10-item global market ticker (USD index, EUR, Gold, Brent, S&P 500, STOXX, Nikkei, CSI 300, US 10Y, VIX): update each value and dir from current data; keep the same shorts/labels/units. Do NOT set chg/spark yourself.
- Top-level "indices" is a strip of buyer commodity/trade gauges; update each value (one decimal), dir (up/down/flat) and short sub-status from current data (Brent, steel HRC, container freight, polypropylene/resin, tariff pressure, Asia-EU freight). Keep the same labels/units.
- Top-level "teamAnalysis" is a 3-5 sentence desk synthesis — rewrite it to reflect the current picture (regulation/origin lead, prices secondary, Birdland keeps supply & documentation steady). Do NOT change top-level "news" (company posts) at all.
- Each region also has a "viz" object with numeric 0-100 scores: heat{regulation,tariff,freight,energy}, x (regulatory pressure), y (cost/supply volatility), size (importer exposure), px, py (previous position). Update heat and x/y/size to reflect current conditions where they have clearly shifted; keep them plausible and bounded 0-100. Do NOT set px/py yourself.
- "partner.birdbot" and top-level "birdbot_client" are Bird BOT explainers, one per section. Refresh each to the CURRENT picture, keeping EXACTLY this format: "simple" = ONE plain sentence with an everyday analogy a 10-year-old would instantly grasp; "expert" = an array of EXACTLY 3 concise expert sentences. Keep the same keys. For the market entries (keys "p-mkt" and "c-mkt") keep framing as Birdland’s interpretation of publicly reported BNP Paribas and Citi views; never fabricate bank quotes or numbers, stay grounded, keep the "src" disclaimer. Do NOT touch the other partner sub-objects (procurement, shipping, material, tariffmon, war).
- "teamdesk" is an internal dashboard. Refresh ONLY these sub-fields (leave fx_baseline, fx_today and usdtwd_spark untouched): "usdtwd_view"={bias:"depreciation pressure"|"appreciation pressure"|"balanced", text: 2-3 sentences grounded in Fed stance, Taiwan central bank and US-China relations, 1-4 week horizon}; "materials"=array for Lumber, Pulp, Steel HRC, PE/PP, Cotton each {name,dir:"up"|"down"|"flat",note: one short current sentence}; "regnews"={china:[],taiwan:[],ports:[],env:[]} each an array of 1-2 {date,title,summary,url} grounded items on customs/origin, tariffs, EU & US ports, and FSC/EUDR/Lacey/CBAM; "advice"={zh: a ready-to-send Traditional-Chinese supply-chain+ocean-freight weekly brief with a recommendation, en: the English equivalent}. Keep keys; set teamdesk.updated to today (e.g. "DD Mon YYYY"). Stay grounded; cite source URLs where possible.
- Output ONLY the complete updated JSON object. No markdown, no commentary.

CURRENT JSON:
"""+json.dumps(data,ensure_ascii=False)

body={"contents":[{"parts":[{"text":prompt}]}],"tools":[{"google_search":{}}],
      "generationConfig":{"temperature":0.3,"maxOutputTokens":65536}}  # full JSON is ~70KB; default cap truncated the response mid-string
url=f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"
try:
    req=urllib.request.Request(url,data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
    resp=json.load(urllib.request.urlopen(req,timeout=300))  # Gemini + Search grounding on a large JSON often needs >120s
    # grounded (google_search) replies arrive split across MULTIPLE parts — join them all;
    # reading only parts[0] truncated the JSON mid-string and forced the fallback every run
    txt="".join(p.get("text","") for p in resp["candidates"][0]["content"]["parts"])
    cand=_extract_json(txt)
    if cand is None: raise ValueError("no JSON object with 'regions' found in reply")
    # Graceful per-region merge: never throw away a whole good reply over key drift.
    # Keep OUR 14 regions + order; adopt the AI's version of a region only when it came
    # back well-formed under the same key, else keep the existing region untouched.
    _air=cand.get("regions",{}) or {}
    _fixed={}
    for code,oldr in data["regions"].items():
        nr=_air.get(code)
        _fixed[code]=nr if (isinstance(nr,dict) and all(k in nr for k in ("headline","regulation","supply","view"))) else dict(oldr)
    cand["regions"]=_fixed
    cand["order"]=data["order"]                            # order is ours, always
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
    # summary: accept AI value only if well-formed, else keep old; asof: computed here, never by AI
    today=datetime.datetime.utcnow().strftime("%d %b %Y")
    def _ok_sum(x):
        try: return isinstance(x,dict) and all(isinstance(x.get(k),str) and 0<len(x[k].strip())<=200 for k in ("changed","action"))
        except: return False
    def _sig(r): return json.dumps([r.get("headline"),r.get("regulation"),r.get("supply"),r.get("view")],ensure_ascii=False,sort_keys=True)
    for code,oldr in data["regions"].items():
        nr=cand["regions"][code]
        ns=nr.get("summary")
        if _ok_sum(ns): nr["summary"]={"changed":ns["changed"].strip(),"action":ns["action"].strip()}
        elif _ok_sum(oldr.get("summary")): nr["summary"]=oldr["summary"]
        else: nr.pop("summary",None)
        if _sig(nr)!=_sig(oldr): nr["asof"]=today
        elif oldr.get("asof"): nr["asof"]=oldr["asof"]
    cand["news"]=data.get("news",[])                      # never let AI touch company news
    # indices: roll change% + sparkline from previous values; keep labels/units/spark history
    oldidx={ (x.get("short") or x.get("label")):x for x in data.get("indices",[]) }
    ci=cand.get("indices") or data.get("indices",[])
    for x in ci:
        o=oldidx.get(x.get("short") or x.get("label"))
        if o:
            ov=o.get("value"); nv=x.get("value",ov)
            try: x["chg"]=round((float(nv)-float(ov))/float(ov)*100,1) if ov else o.get("chg",0)
            except: x["chg"]=o.get("chg",0)
            sp=list(o.get("spark",[]))+[nv]; x["spark"]=sp[-16:]
            x.setdefault("unit",o.get("unit","")); x.setdefault("label",o.get("label",""))
        else:
            x.setdefault("chg",0); x.setdefault("spark",[x.get("value",0)])
    cand["indices"]=ci
    # macro (10 global indices for ticker): roll chg + sparkline like indices
    oldm={ (x.get("short") or x.get("label")):x for x in data.get("macro",[]) }
    cm=cand.get("macro") or data.get("macro",[])
    for x in cm:
        o=oldm.get(x.get("short") or x.get("label"))
        if o:
            ov=o.get("value"); nv=x.get("value",ov)
            try: x["chg"]=round((float(nv)-float(ov))/float(ov)*100,1) if ov else o.get("chg",0)
            except: x["chg"]=o.get("chg",0)
            sp=list(o.get("spark",[]))+[nv]; x["spark"]=sp[-16:]
            x.setdefault("unit",o.get("unit","")); x.setdefault("label",o.get("label",""))
        else:
            x.setdefault("chg",0); x.setdefault("spark",[x.get("value",0)])
    cand["macro"]=cm
    # policy/structural blocks: keep exactly (high break-risk, slow-moving)
    for kk in ("landed","timeline","tariff_calc"):
        if kk in data: cand[kk]=data[kk]
    # market blocks: accept AI update only if structure validates, else keep old
    def _ok_forward(x):
        try: return isinstance(x["commodities"],list) and len(x["commodities"])>0 and all(c.get("name") and isinstance(c["points"],list) and all(isinstance(p.get("v"),(int,float)) for p in c["points"]) for c in x["commodities"])
        except: return False
    def _ok_shipping(x):
        try: return isinstance(x["lanes"],list) and len(x["lanes"])>0 and all(l.get("lane") and isinstance(l.get("rate"),(int,float)) for l in x["lanes"])
        except: return False
    def _ok_war(x):
        try: return isinstance(x["zones"],list) and len(x["zones"])>0 and all(z.get("zone") and isinstance(z.get("impact"),(int,float)) and z.get("status") in ("high","elevated","watch") for z in x["zones"])
        except: return False
    def _ok_proc(x):
        try: return isinstance(x["items"],list) and len(x["items"])>0 and all(i.get("input") and i.get("action") and i.get("urgency") in ("high","med","low") for i in x["items"])
        except: return False
    def _ok_matl(x):
        return isinstance(x,dict) and bool(x.get("note"))
    for kk,val in (("forward",_ok_forward),("shipping",_ok_shipping),("war",_ok_war),("procurement",_ok_proc),("material",_ok_matl)):
        if not (kk in cand and val(cand[kk])):
            cand[kk]=data.get(kk, cand.get(kk))
    if not cand.get("teamAnalysis"): cand["teamAnalysis"]=data.get("teamAnalysis","")
    def _fmt_bb(oldbb,newbb):
        out=dict(oldbb or {})
        for k,oldv in (oldbb or {}).items():
            nv=(newbb or {}).get(k)
            if isinstance(nv,dict) and isinstance(nv.get("simple"),str) and isinstance(nv.get("expert"),list) and len([x for x in nv["expert"] if str(x).strip()])>=3:
                m={"simple":nv["simple"].strip(),"expert":[str(x).strip() for x in nv["expert"] if str(x).strip()][:3]}
                if (oldv or {}).get("src"): m["src"]=oldv["src"]
                out[k]=m
        return out
    old_partner=data.get("partner",{}) or {}
    new_pbb=((cand.get("partner") or {}).get("birdbot")) or {}
    op=dict(old_partner); op["birdbot"]=_fmt_bb(old_partner.get("birdbot",{}),new_pbb)
    cand["partner"]=op
    cand["birdbot_client"]=_fmt_bb(data.get("birdbot_client",{}),cand.get("birdbot_client",{}))
    old_td=data.get("teamdesk",{}) or {}
    new_td=cand.get("teamdesk",{}) or {}
    mtd=dict(old_td)
    for k in ("usdtwd_view","materials","regnews","advice","updated"):
        if k in new_td and new_td[k]: mtd[k]=new_td[k]
    for k in ("fx_baseline","fx_today","usdtwd_spark"):
        if k in old_td: mtd[k]=old_td[k]   # never let AI touch live FX numbers
    cand["teamdesk"]=mtd
    print("Gemini update parsed & validated; viz tails rolled.")
    save_and_build(cand)
except Exception as ex:
    print("Gemini refresh failed (%s); timestamp-only fallback."%ex)
    save_and_build(data)
