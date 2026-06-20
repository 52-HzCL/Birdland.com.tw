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

data=json.load(open(DATA_PATH,encoding="utf-8"))

def save_and_build(d):
    d["updated"]=now
    json.dump(d,open(DATA_PATH,"w",encoding="utf-8"),ensure_ascii=False)
    subprocess.run([sys.executable,os.path.join(HERE,"tools","build_news.py")],check=True)

if not KEY:
    print("No GEMINI_API_KEY; timestamp-only refresh.");save_and_build(data);sys.exit(0)

prompt=f"""You maintain the "Market & Supply Outlook" for Birdland Ind., a confidential OEM/ODM garden & field hand-tool manufacturer (Taiwan + China production). Below is the current JSON. Using up-to-date information from Google Search, update it.

RULES (strict):
- Keep the JSON structure EXACTLY: same top-level keys ("updated","order","regions"), same region keys and the same "order" array (14 markets). Do not add/remove regions.
- For each region update headline / regulation[].t / regulation[].b / supply / view ONLY where real-world facts have changed since this data; otherwise keep the existing wording.
- Lead with regulation & supply-chain RISK; treat prices/freight/oil as secondary background. Frame around volatility, lead time and supply risk — never "prices fell so cut your price". Keep the idea that Birdland's quotes reflect secured materials, compliant documentation and reliable supply, not spot prices. Conclusions are "Birdland's view (AI-assisted)".
- NEVER fabricate numbers, dates or rules. Only state what current sources support; otherwise stay qualitative. Keep each body 1-3 sentences. Use the HTML entity &amp; for ampersands inside strings.
- Themes to verify: EU EUDR, EU CBAM, EU PFAS(REACH), US Section 301/import tariffs on China & Taiwan tools, Canada surtax on China-melted steel, Australia timber biosecurity/ISPM15, Asia-Europe & transpacific container freight trend, Brent crude level/volatility.
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
    print("Gemini update parsed & validated.")
    save_and_build(cand)
except Exception as ex:
    print("Gemini refresh failed (%s); timestamp-only fallback."%ex)
    save_and_build(data)
