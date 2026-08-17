#!/usr/bin/env python3
"""Refresh outlook-data.json via Google Gemini (free tier + Google Search grounding),
then rebuild news.html. Safe by design: if the API call or parsing fails, it only
bumps the 'updated' timestamp so the live site never breaks. Requires env GEMINI_API_KEY.
"""
import os,json,re,sys,datetime,urllib.request,subprocess

HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH=os.path.join(HERE,"outlook-data.json")
MODEL=os.environ.get("GEMINI_MODEL","gemini-2.5-flash")
KEY=os.environ.get("GEMINI_API_KEY","")
utc_now=datetime.datetime.utcnow()
now=utc_now.strftime("%d %b %Y, %H:%M UTC")
iso_now=utc_now.replace(microsecond=0).isoformat()+"Z"
import traceback
def _eh(t,v,tb):
    traceback.print_exception(t,v,tb); print("[gen_news] swallowed error -> exit 0")
sys.excepthook=_eh

data=json.load(open(DATA_PATH,encoding="utf-8"))

# ---- today's front-page digest: contract + validator -----------------------
# Kept at module level, free of the network path, so --selftest can exercise it
# offline. This file has no local interpreter on the maintainer's machine, and
# the last silent breakage here (an f-string over a brace-filled prompt) froze
# the daily refresh for weeks before anyone noticed.
DIG_TAGS={"freight","energy","compliance","tariff","materials","demand"}
DIG_TOOLS={"cost-desk#p-sail","cost-desk#p-landed2","cost-desk#p-cduty",
           "partner.html#p-mkt","my-market.html",""}
DIG_LANGS=("de","es","fr","it","ja","nl","pl","pt-br","zh-tw")
_THOUSANDS=re.compile(r"(?<=\d),(?=\d{3}\b)")
_NUMRE=re.compile(r"\d+(?:\.\d+)?")

def digest_numbers(t):
    return _NUMRE.findall(_THOUSANDS.sub("",str(t)))

def digest_corpus(*objs):
    """Every numeric token the day's own data contains."""
    out=set()
    for o in objs:
        out|=set(digest_numbers(json.dumps(o,ensure_ascii=False)))
    return out

def build_digest(dg,regions,corpus,today,why=None):
    """Validate one AI-proposed digest. Returns the cleaned digest or None.

    Every figure printed on the front page must be traceable to the day's own
    data. The model is instructed to do this, but instructing is not enforcing:
    any line carrying a number absent from today's JSON is dropped here, before
    publication. Measured against the 28 summary lines the model already writes
    each run this rejects 0 of 18 real figures, while a synthetic "fell 47.3%
    to $9,912/FEU" loses both numbers and the line with them. A front page that
    quietly drops a line is a smaller failure than one that quietly invents a
    freight rate."""
    def line(t,limit):
        t=str(t or "").strip()
        if not t or len(t)>limit: return None
        # unbalanced or excessive markers would leak "==" onto the page
        if t.count("==")%2 or t.count("@@")%2: return None
        if t.count("==")>2 or t.count("@@")>4: return None
        return t if all(n in corpus for n in digest_numbers(t)) else None
    def note(m):
        if why is not None: why.append(m)
    if not isinstance(dg,dict):
        note("no today_digest object in the reply"); return None
    # The lead is one sentence per production base. A side may be empty when
    # that desk genuinely had no production story — the page prints its own
    # line for it, which is honest; an invented sentence would not be. The
    # digest still needs at least one of the two to be worth a front page.
    og=dg.get("origin") if isinstance(dg.get("origin"),dict) else {}
    origin={"china":line(og.get("china"),110) or "","taiwan":line(og.get("taiwan"),110) or ""}
    if not (origin["china"] or origin["taiwan"]):
        note("origin rejected on both sides: %r"%(og,)); return None
    themes=[]
    for it in (dg.get("themes") or [])[:6]:
        if not isinstance(it,dict): continue
        txt=line(it.get("text"),130)
        if txt and it.get("tag") in DIG_TAGS:
            # No jump field: the page derives the target section from the tag.
            # An AI-chosen anchor is an AI-chosen chance of a dead link.
            themes.append({"tag":it["tag"],"text":txt})
    if len(themes)<2:
        note("only %d usable theme(s) of %d offered"%(len(themes),len(dg.get("themes") or []))); return None
    markets=[]
    for it in (dg.get("markets") or [])[:6]:
        if not isinstance(it,dict): continue
        txt=line(it.get("text"),120)
        if txt and it.get("code") in regions:
            markets.append({"code":it["code"],"text":txt})
    act=dg.get("action") if isinstance(dg.get("action"),dict) else {}
    atxt=line(act.get("text"),110)
    action={"text":atxt,"tool":act.get("tool") if act.get("tool") in DIG_TOOLS else ""} if atxt else None
    out={"date":today,"origin":origin,"themes":themes,"markets":markets}
    if action: out["action"]=action
    # Translations must line up item-for-item, or the page would print a German
    # theme beside an English figure. A language that does not line up is
    # dropped whole and that language falls back to English.
    tr={}
    src=dg.get("i18n") or {}
    for lg in DIG_LANGS:
        v=src.get(lg)
        if not isinstance(v,dict):
            note("lang %s: not offered"%lg); continue
        vog=v.get("origin") if isinstance(v.get("origin"),dict) else {}
        h={"china":line(vog.get("china"),140) or "","taiwan":line(vog.get("taiwan"),140) or ""}
        vt=[line((x or {}).get("text"),160) for x in (v.get("themes") or [])]
        vm=[line((x or {}).get("text"),150) for x in (v.get("markets") or [])]
        if (bool(origin["china"])!=bool(h["china"])) or (bool(origin["taiwan"])!=bool(h["taiwan"])):
            note("lang %s: origin sides do not match (%r)"%(lg,vog)); continue
        if len(vt)<len(themes) or any(x is None for x in vt[:len(themes)]):
            note("lang %s: %d of %d themes usable"%(lg,len([x for x in vt[:len(themes)] if x]),len(themes))); continue
        if len(vm)<len(markets) or any(x is None for x in vm[:len(markets)]):
            note("lang %s: %d of %d markets usable"%(lg,len([x for x in vm[:len(markets)] if x]),len(markets))); continue
        e={"origin":h,"themes":vt[:len(themes)],"markets":vm[:len(markets)]}
        if action:
            a=line((v.get("action") or {}).get("text") if isinstance(v.get("action"),dict) else None,130)
            if not a:
                note("lang %s: action rejected"%lg); continue
            e["action"]=a
        tr[lg]=e
    out["i18n"]=tr
    return out

_MARKS=re.compile(r"==([^=]{1,120}?)==|@@([^@]{1,60}?)@@")

def strip_marks(o,skip=()):
    """Unwrap ==...== and @@...@@ anywhere outside the digest.

    Those marks are the digest's private markup, drawn as a highlighter stroke
    and a ring. Every other field on the site is printed literally, so a stray
    mark reaches the reader as "==structural shift==". They leaked the first
    time the main prompt carried the digest instructions: the model learned the
    syntax and applied it to region text and war-zone notes, which publish
    straight onto the front page. The instructions have moved out of that
    prompt; this stays as the guard, because a model that has seen the syntax
    once may reach for it again."""
    if isinstance(o,str):
        prev=None
        while prev!=o:                      # nested marks unwrap in one pass each
            prev=o
            o=_MARKS.sub(lambda m:(m.group(1) or m.group(2) or ""),o)
        return o
    if isinstance(o,list): return [strip_marks(v) for v in o]
    if isinstance(o,dict):
        return {k:(v if k in skip else strip_marks(v)) for k,v in o.items()}
    return o

def digest_context(d):
    """The slice of the edition the brief is actually written from.

    Asking for the digest inside the main call meant asking the model to echo
    a 97KB document and remember to bolt a new structure onto it; the first
    live run came back with no digest at all. This is a few KB instead, so the
    second call has one job and its whole context is the evidence for it."""
    out={"indices":d.get("indices",[]),"macro":d.get("macro",[]),
         "shipping":d.get("shipping",{}),"forward":d.get("forward",{}),
         "procurement":d.get("procurement",{}),"war":d.get("war",{}),
         "material":d.get("material",{})}
    out["regions"]={c:{"headline":r.get("headline"),"summary":r.get("summary")}
                    for c,r in (d.get("regions") or {}).items()}
    # The two production desks the lead is written from. Same rows the reader
    # sees under "Local News: Taiwan and China", so the lead can be checked
    # against the stories printed below it.
    news={"taiwan":[],"china":[]}
    for n in (d.get("market_news") or []):
        t=n.get("topic")
        if t in news and len(news[t])<4:
            news[t].append({"date":n.get("date"),"title":n.get("title"),"source":n.get("source")})
    out["local_news"]=news
    return out

DIGEST_PROMPT="""You write the front page of Birdland's daily supply brief for an import buyer of garden and field hand tools. Below is today's market data. Write today's brief from it and output NOTHING but one JSON object in exactly this shape:

{"origin":{"china":"...","taiwan":"..."},"themes":[{"tag":"freight","text":"..."}],"markets":[{"code":"de","text":"..."}],"action":{"text":"...","tool":"cost-desk#p-sail"},"i18n":{"de":{"origin":{"china":"...","taiwan":"..."},"themes":[{"text":"..."}],"markets":[{"text":"..."}],"action":{"text":"..."}}}}

RULES (a broken rule costs you the line, or the whole brief):
- "origin" is the lead, and it is the whole headline. Birdland produces in Taiwan and in China, so the reader's first question every morning is what happened at each of those two production bases. Write ONE sentence for each, 95 characters or fewer, each drawn from that desk's own stories in "local_news" below — the same reports the reader can see further down the page.
- "origin.china": what changed for production in China. "origin.taiwan": what changed for production in Taiwan. Each must be traceable to a story in the matching "local_news" list; do not swap a China story into the Taiwan line or the reverse, and do not write a freight or currency line here — this is about making things.
- If a desk genuinely has no relevant production story, write an empty string for that side. An empty string is honest and the page prints its own line for it; an invented sentence is not.
- "themes": 3 to 6 items, most important first. "tag" MUST be one of: freight, energy, compliance, tariff, materials, demand. "text" is 110 characters or fewer.
- "markets": 0 to 6 items, ONLY for regions where something genuinely changed. "code" MUST be one of the region codes in the data. "text" is 100 characters or fewer. Omit a quiet market — the page says so itself. Do not pad this list.
- A market line must be ABOUT that market. The reader sees only the market's own name beside it, so a line filed under "uk" that talks about Rotterdam and Genoa reads as a claim about the United Kingdom. If a movement belongs to a lane or a region rather than one market, put it in "themes" instead.
- Write plainly. No filler adverbs ("strategically", "proactively", "carefully"), no throat-clearing. Say the thing to do.
- "action": the one thing to do this week, 90 characters or fewer. "tool" MUST be one of: cost-desk#p-sail, cost-desk#p-landed2, cost-desk#p-cduty, partner.html#p-mkt, my-market.html, or "".
- MARK WHAT MATTERS: wrap the single most important phrase of each line in ==double equals== and each figure in @@double at-signs@@. At most one ==...== and two @@...@@ per line. These drive the page's highlighter and its circled figures.
- EVERY figure you write must already appear in the data below. A validator drops any line containing a number that is not in the data, so an invented figure costs you the line. If you cannot support a point with a figure from the data, write it without a number.
- "i18n": keys de, es, fr, it, ja, nl, pl, pt-br, zh-tw. Each repeats the SAME structure — including "origin" with both sides — with the SAME number of themes and markets in the SAME order, translated. Never translate tag/code/tool. Keep the ==...== and @@...@@ marks around the equivalent words. Traditional Chinese for zh-tw. Never abbreviate Taiwan or China.
- Lead with regulation, origin and supply risk; treat prices and freight as background. Never tell the buyer to push for a lower price.
- No markdown, no commentary, no code fence. One JSON object.

TODAY'S DATA:
"""

def request_digest(ctx,model,key):
    body={"contents":[{"parts":[{"text":DIGEST_PROMPT+json.dumps(ctx,ensure_ascii=False)}]}],
          "generationConfig":{"temperature":0.4,"maxOutputTokens":24576,
                              "responseMimeType":"application/json"}}
    u="https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent?key="+key
    req=urllib.request.Request(u,data=json.dumps(body).encode(),
                               headers={"Content-Type":"application/json"})
    resp=json.load(urllib.request.urlopen(req,timeout=120))
    txt="".join(p.get("text","") for p in resp["candidates"][0]["content"]["parts"])
    return _extract_digest_json(txt)

def _extract_digest_json(t):
    t=(t or "").strip()
    if t.startswith("```"):
        t=t[3:]
        if t[:4].lower()=="json": t=t[4:]
        if t.endswith("```"): t=t[:-3]
    dec=json.JSONDecoder(); i=0; L=len(t)
    while i<L:
        c=t.find("{",i)
        if c<0: break
        try: obj,end=dec.raw_decode(t,c)
        except ValueError:
            i=c+1; continue
        if isinstance(obj,dict) and "themes" in obj: return obj
        i=end
    return None

def roll_digest_archive(newdig,olddig):
    """The lead pair only. Enough to tell a buyer who was away three days what
    they missed at each production base, without a tenfold copy of every
    edition riding inside the page — the data file is inlined into
    executive.html."""
    arch=list((olddig or {}).get("archive") or [])
    if olddig and olddig.get("origin") and olddig.get("date")!=newdig["date"]:
        entry={"date":olddig.get("date"),"origin":olddig["origin"],
               "i18n":{k:v.get("origin") for k,v in (olddig.get("i18n") or {}).items()
                       if isinstance(v,dict) and v.get("origin")}}
        arch=[entry]+[a for a in arch if a.get("date")!=entry["date"]]
    newdig["archive"]=arch[:5]
    return newdig

if "--selftest" in sys.argv:
    # Explicit checks, not bare asserts: this module installs an excepthook and
    # assertions vanish under -O, so a silent pass would be the one outcome
    # worse than a failure.
    _fails=[]
    def check(cond,msg):
        if not cond: _fails.append(msg)
    _corp={"88","3","9","2026","1.4"}
    _reg={"eu":1,"us":1}
    _base={"origin":{"china":"Jinshi steps up ==bio-manufacturing==","taiwan":"Machinery exports grew @@3@@ months running"},
           "themes":[{"tag":"freight","text":"Transpacific ==down== a @@3@@rd week"},
                     {"tag":"energy","text":"Brent holds near @@88@@"}],
           "markets":[{"code":"eu","text":"Filing rules bite from @@9@@ September"}],
           "action":{"text":"Book ==early== this week","tool":"cost-desk#p-sail"}}
    def _cp(o): return json.loads(json.dumps(o))
    ok=build_digest(_cp(_base),_reg,_corp,"14 Aug 2026")
    check(ok and len(ok["themes"])==2 and len(ok["markets"])==1, "clean digest must pass")
    check(ok and ok["origin"]["china"] and ok["origin"]["taiwan"], "both origin sides survive")
    check(ok["action"]["tool"]=="cost-desk#p-sail", "ok[\"action\"][\"tool\"]==\"cost-desk#p-sail\"")
    bad=_cp(_base); bad["themes"][0]["text"]="Transpacific fell @@47.3@@% to @@9912@@"
    r=build_digest(bad,_reg,_corp,"14 Aug 2026")
    check(r and len(r["themes"])==1, "invented figures must drop that line only")
    bad=_cp(_base); bad["origin"]={"china":"Output fell @@12.5@@%","taiwan":"Orders fell @@47.3@@%"}
    check(build_digest(bad,_reg,_corp,"14 Aug 2026") is None, "both origin sides unsupported kills the digest")
    bad=_cp(_base); bad["origin"]["taiwan"]=""
    r=build_digest(bad,_reg,_corp,"14 Aug 2026")
    check(r and r["origin"]["china"] and r["origin"]["taiwan"]=="", "one quiet desk is allowed and stays empty")
    bad=_cp(_base); bad["themes"][0]["text"]="Unbalanced ==marker"
    r=build_digest(bad,_reg,_corp,"14 Aug 2026")
    check(r and len(r["themes"])==1, "unbalanced markers must drop the line")
    bad=_cp(_base); bad["themes"][0]["tag"]="nonsense"
    r=build_digest(bad,_reg,_corp,"14 Aug 2026")
    check(r and len(r["themes"])==1, "unknown tag must drop the line")
    bad=_cp(_base); bad["markets"][0]["code"]="zz"
    r=build_digest(bad,_reg,_corp,"14 Aug 2026")
    check(r and r["markets"]==[], "unknown region code must drop the market line")
    bad=_cp(_base); bad["themes"]=[bad["themes"][0]]
    check(build_digest(bad,_reg,_corp,"14 Aug 2026") is None, "fewer than 2 themes is not a digest")
    tr=_cp(_base)
    tr["i18n"]={"de":{"origin":{"china":"Jinshi baut ==Biofertigung== aus","taiwan":"Maschinenexporte seit @@3@@ Monaten im Plus"},
                      "themes":[{"text":"Transpazifik ==faellt== dritte Woche"},{"text":"Brent nahe @@88@@"}],
                      "markets":[{"text":"Meldepflicht ab @@9@@. September"}],
                      "action":{"text":"Frueh ==buchen=="}},
                "ja":{"origin":{"china":"金石市が==バイオ製造==を強化","taiwan":"機械輸出が@@3@@カ月連続で増加"},"themes":[{"text":"太平洋 @@3@@週連続"}],
                      "markets":[{"text":"欧州の申告規制"}],"action":{"text":"早めに手配"}}}
    r=build_digest(tr,_reg,_corp,"14 Aug 2026")
    check("de" in r["i18n"], "aligned translation must survive")
    check("ja" not in r["i18n"], "short theme list must drop that language whole")
    _o={"china":"c","taiwan":"t"}
    a=roll_digest_archive({"date":"14 Aug 2026","origin":_o},
                          {"date":"13 Aug 2026","origin":_o,"i18n":{"de":{"origin":{"china":"cd","taiwan":"td"}}}})
    check(a["archive"][0]["date"]=="13 Aug 2026" and a["archive"][0]["i18n"]["de"]["china"]=="cd",
          "archive keeps the lead pair per language")
    a=roll_digest_archive({"date":"14 Aug 2026","origin":_o},
                          {"date":"14 Aug 2026","origin":_o,"archive":[{"date":"13 Aug 2026","origin":_o}]})
    check(len(a["archive"])==1 and a["archive"][0]["date"]=="13 Aug 2026", "same-day rerun must not archive itself")
    # The main reply echoes the document back, so the digest that went in comes
    # out again. It must never be the published one: it would be re-stamped
    # with today's date and yesterday's brief would read as today's.
    import inspect as _inspect
    _src=_inspect.getsource(sys.modules[__name__])
    _i=_src.find("_corpus=digest_corpus(")
    _j=_src.find("cand[\"news\"]=data.get(\"news\"",_i)
    _block=_src[_i:_j] if _i>=0 and _j>_i else ""
    check(bool(_block),"digest publish block must be findable")
    check("build_digest(cand.get(\"today_digest\")" not in _block,
          "the echoed digest must never be validated for publication")
    check("request_digest(" in _block,"the digest must come from its own call")
    _dirty={"regions":{"us":{"supply":"Rates ==surged== to @@10%@@ this week"}},
            "war":{"zones":[{"note":"Transit is ==effectively closed=="}]},
            "today_digest":{"headline":"Freight ==up== @@3@@"}}
    _clean=strip_marks(_dirty,skip=("today_digest",))
    check(_clean["regions"]["us"]["supply"]=="Rates surged to 10% this week","region text must lose the marks")
    check(_clean["war"]["zones"][0]["note"]=="Transit is effectively closed","war notes must lose the marks")
    check(_clean["today_digest"]["headline"]=="Freight ==up== @@3@@","the digest must keep its own marks")
    check(strip_marks("plain text, 10% and a == b")=="plain text, 10% and a == b","lone marks are left alone")
    print("gen_news selftest: all digest assertions passed")
    sys.exit(0)

def ensure_status(d):
    st=d.setdefault("status",{})
    st.setdefault("workflow",{})
    src=st.setdefault("sources",{})
    src.setdefault("gemini",{})
    src.setdefault("twelvedata",{})
    src.setdefault("fred",{})
    src.setdefault("fx",{})
    src.setdefault("market_news",{})
    return st

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

def save_and_build(d, gemini_state, gemini_detail):
    d["updated"]=now
    st=ensure_status(d)
    st["workflow"]["narrative_refreshed_at"]=iso_now
    st["sources"]["gemini"]={
        "state":gemini_state,
        "updated":iso_now,
        "detail":gemini_detail
    }
    json.dump(d,open(DATA_PATH,"w",encoding="utf-8"),ensure_ascii=False)
    r=subprocess.run([sys.executable,os.path.join(HERE,"tools","build_news.py")],capture_output=True,text=True)
    print("[build_news]",r.stdout.strip(),r.stderr.strip())
    if r.returncode!=0: print("[build_news] FAILED rc",r.returncode)

if not KEY:
    print("No GEMINI_API_KEY; timestamp-only refresh.");save_and_build(data,"unavailable","No GEMINI_API_KEY; kept previous narrative blocks.");sys.exit(0)

# NOTE: plain string + concatenation (NOT an f-string) — the prompt text contains many
# literal {braces}; as an f-string those raised NameError at import time and silently
# killed the daily refresh (updated stayed frozen while fetch_market kept committing).
prompt="""You maintain the "Market & Supply Outlook" for Birdland Ind., a confidential OEM/ODM garden & field hand-tool manufacturer (Taiwan + China production). Below is the current JSON. Using up-to-date information from Google Search, update it.

RULES (strict):
- Keep the JSON structure EXACTLY: same top-level keys ("updated","order","regions"), same region keys and the same "order" array (14 markets). Do not add/remove regions.
- For each region update headline / regulation[].t / regulation[].b / supply / view ONLY where real-world facts have changed since this data; otherwise keep the existing wording.
- For each region ALSO output "summary": {"changed":"...","action":"..."} — two plain-English sentences for a busy buyer, each 110 characters or less: "changed" = the single most important shift this period for that market; "action" = the one thing the buyer should do about it. Concrete, no jargon. Output this "summary" for EVERY one of the 14 regions on EVERY run — it is a standing digest of the current picture, so include it even when the longer regulation/supply/view text is unchanged.
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
    # A date stamp may only speak for the text printed next to it. asof covers the
    # whole region, which is right for a page that shows the whole region and wrong
    # for ABrief's front page, which prints the headline and the two summary lines
    # and nothing else. Measured over 120 editions: asof moved on days when all
    # three of those lines were byte-identical to the day before (15, 17 and 25 Jul),
    # because supply and view had moved underneath them. So the lead block gets its
    # own stamp, and the headline — 2 distinct values in 4 months, a deliberately
    # slow structural read — gets a second one, because a 32-day-old headline above
    # a same-day summary is two ages that one date cannot honestly report.
    def _lead_sig(r):
        s=r.get("summary") or {}
        return json.dumps([r.get("headline"),s.get("changed"),s.get("action")],ensure_ascii=False,sort_keys=True)
    def _head_sig(r): return json.dumps(r.get("headline"),ensure_ascii=False)
    for code,oldr in data["regions"].items():
        nr=cand["regions"][code]
        ns=nr.get("summary")
        if _ok_sum(ns): nr["summary"]={"changed":ns["changed"].strip(),"action":ns["action"].strip()}
        elif _ok_sum(oldr.get("summary")): nr["summary"]=oldr["summary"]
        else: nr.pop("summary",None)
        if _sig(nr)!=_sig(oldr): nr["asof"]=today
        elif oldr.get("asof"): nr["asof"]=oldr["asof"]
        # Same carry-forward shape as asof: stamp today only on a real change,
        # otherwise inherit. Seeded in outlook-data.json from git history, so the
        # first run after this lands does not reset every region to "today".
        for field,sig in (("lead_asof",_lead_sig),("head_asof",_head_sig)):
            if sig(nr)!=sig(oldr): nr[field]=today
            elif oldr.get(field): nr[field]=oldr[field]
    # ---- today's front-page digest -------------------------------------
    # Everything except the digest is printed literally somewhere on the site.
    cand=strip_marks(cand,skip=("today_digest",))
    _corpus=digest_corpus(data,{k:v for k,v in cand.items() if k!="today_digest"})
    _olddig=data.get("today_digest") or {}
    # The digest is ALWAYS written by its own call. The main reply is an echo
    # of the whole document, so whatever digest went in comes back out — and
    # once that echo is shaped correctly it passes this validator and gets
    # re-stamped with today's date. Yesterday's brief published as today's is
    # the exact dishonesty the rest of this file exists to prevent, and it is
    # invisible: the log said "5 themes, 1 markets" either way.
    _why=[]
    _newdig=None
    if True:
        # Never allowed to break the edition: any failure here leaves the rest
        # of the update intact and the previous digest carried forward under
        # its own date.
        try:
            _dg2=request_digest(digest_context(cand),MODEL,KEY)
            _why2=[]
            _newdig=build_digest(_dg2,data["regions"],_corpus,today,_why2)
            if not _newdig: print("digest: dedicated call also unusable (%s)"%("; ".join(_why2) or "no object"))
            elif len(_newdig["i18n"])<len(DIG_LANGS):
                print("digest: %d/%d languages kept — %s"%(len(_newdig["i18n"]),len(DIG_LANGS),"; ".join(_why2) or "no reason recorded"))
        except Exception as _ex:
            print("digest: dedicated call failed (%s)"%_ex)
    if _newdig:
        cand["today_digest"]=roll_digest_archive(_newdig,_olddig)
        print("digest: %d themes, %d markets, %d languages, %d archived"%(
            len(_newdig["themes"]),len(_newdig["markets"]),len(_newdig["i18n"]),len(_newdig["archive"])))
    elif _olddig:
        # Keep yesterday's rather than blank the front page, but leave its own
        # date on it so the page can say it is carried forward instead of
        # presenting stale lines as today's.
        cand["today_digest"]=_olddig
        print("digest: rejected today's, carried forward %s"%_olddig.get("date"))
    else:
        cand.pop("today_digest",None)
        print("digest: none available")
    cand["news"]=data.get("news",[])                      # never let AI touch company news
    # indices: roll change% + sparkline from previous values; keep labels/units/spark history
    oldidx={ (x.get("short") or x.get("label")):x for x in data.get("indices",[]) }
    ci=cand.get("indices") or data.get("indices",[])
    for x in ci:
        o=oldidx.get(x.get("short") or x.get("label"))
        if o:
            ov=o.get("value"); nv=x.get("value",ov)
            try:
                ratio=abs(float(nv)/float(ov)) if ov else 1
                same_scale=0.05 <= ratio <= 20
                x["chg"]=round((float(nv)-float(ov))/float(ov)*100,1) if ov and same_scale else 0
            except:
                same_scale=True
                x["chg"]=o.get("chg",0)
            sp=(list(o.get("spark",[])) if same_scale else [])+[nv]; x["spark"]=sp[-16:]
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
            try:
                ratio=abs(float(nv)/float(ov)) if ov else 1
                same_scale=0.05 <= ratio <= 20
                x["chg"]=round((float(nv)-float(ov))/float(ov)*100,1) if ov and same_scale else 0
            except:
                same_scale=True
                x["chg"]=o.get("chg",0)
            sp=(list(o.get("spark",[])) if same_scale else [])+[nv]; x["spark"]=sp[-16:]
            x.setdefault("unit",o.get("unit","")); x.setdefault("label",o.get("label",""))
        else:
            x.setdefault("chg",0); x.setdefault("spark",[x.get("value",0)])
    cand["macro"]=cm
    # policy/structural blocks: keep exactly (high break-risk, slow-moving)
    for kk in ("landed","timeline","tariff_calc","market_news","status"):
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
    save_and_build(cand,"current","Narrative blocks refreshed from Gemini.")
except Exception as ex:
    print("Gemini refresh failed (%s); timestamp-only fallback."%ex)
    save_and_build(data,"delayed","Gemini refresh failed; carried forward previous narrative blocks.")
