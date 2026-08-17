#!/usr/bin/env python3
# Birdland promotion pipeline: a salesperson drops a product/quote document into
# the SharePoint folder; this script extracts the products with Gemini, writes a
# customer-facing promotion page under p/<slug>.html, and records it in p/index.json
# for the Team Desk workbench.
#
# HARD RULES (learned the hard way elsewhere in this repo):
# - Prompt strings are NEVER f-strings. JSON braces inside an f-string raise
#   NameError at call time and silently kill the whole pipeline.
# - One API call does one job: extract, then appeal, then image check, then
#   translation. Never ask one call to do two of these.
# - PRICES NEVER LAND. The extraction contract has no price field, and
#   price_scan() rejects the whole promotion if any currency/price marker
#   survives into the generated data. This runs BEFORE anything is written,
#   so no price ever reaches the public git history.
import json,os,re,sys,base64,hashlib,datetime,time,urllib.request,urllib.parse,urllib.error

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL=os.environ.get("GEMINI_MODEL","gemini-2.5-flash")
KEY=os.environ.get("GEMINI_API_KEY","")

def note(m):
    print("promo: %s"%m)

# ---------------------------------------------------------------- Gemini
def gem_call(parts,maxtok=16384,temp=0.3,timeout=240):
    body={"contents":[{"parts":parts}],
          "generationConfig":{"temperature":temp,"maxOutputTokens":maxtok,
                              "responseMimeType":"application/json"}}
    u="https://generativelanguage.googleapis.com/v1beta/models/"+MODEL+":generateContent?key="+KEY
    req=urllib.request.Request(u,data=json.dumps(body).encode(),
                               headers={"Content-Type":"application/json"})
    last=None
    for attempt in range(4):
        try:
            resp=json.load(urllib.request.urlopen(req,timeout=timeout))
            t=resp["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(_strip_fence(t))
        except urllib.error.HTTPError as e:
            last=e; note("gemini attempt %d failed: HTTP %d"%(attempt+1,e.code))
            if e.code in (429,500,503):
                ra=(e.headers.get("Retry-After") or "")
                wait=int(ra) if ra.isdigit() else 12*(attempt+1)
                time.sleep(min(wait,90))
        except Exception as e:
            last=e; note("gemini attempt %d failed: %s"%(attempt+1,e))
    raise RuntimeError("gemini call failed after retries: %s"%last)

def _strip_fence(t):
    t=t.strip()
    if t.startswith("```"):
        t=re.sub(r"^```[a-z]*\s*","",t); t=re.sub(r"\s*```$","",t)
    return t

def file_part(data,mime):
    return {"inline_data":{"mime_type":mime,"data":base64.b64encode(data).decode()}}

MIMES={".pdf":"application/pdf",".png":"image/png",".jpg":"image/jpeg",
       ".jpeg":"image/jpeg",".webp":"image/webp",
       ".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
       ".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

# ---------------------------------------------------------------- price firewall
# The uploaded document IS a quote; prices are expected in the input and must
# never survive into the output. This scans every AI/extracted string (the
# template's own static copy is code, reviewed by humans, and is exempt).
PRICE_PAT=re.compile(
    r"[$€£¥₩]"                       # $ € £ ¥ ₩
    r"|\b(?:USD|EUR|GBP|JPY|CNY|RMB|TWD|NTD|NT\$|US\$)\b"
    r"|\b(?:FOB|CIF|EXW|DDP|DDU|CFR|CNF)\b"
    r"|\b(?:price|prices|pricing|quotation|MSRP|per\s+(?:pc|pcs|piece|unit))\b"
    r"|\bPreis\w*|\bprix\b|\bprecio\w*|\bprezz\w*|\bprijs\w*|\bcen[ay]\b|\bpreço\w*"
    r"|價格|報價|售價|單價|定價|価格|単価",
    re.IGNORECASE)

def price_scan(obj,path="$"):
    """Return list of (path, excerpt) for every price marker in any string."""
    hits=[]
    if isinstance(obj,dict):
        for k,v in obj.items(): hits+=price_scan(v,path+"."+str(k))
    elif isinstance(obj,list):
        for i,v in enumerate(obj): hits+=price_scan(v,path+"[%d]"%i)
    elif isinstance(obj,str):
        m=PRICE_PAT.search(obj)
        if m:
            s=max(0,m.start()-20)
            hits.append((path,obj[s:m.end()+20]))
    return hits

# ---------------------------------------------------------------- number firewall
# why_now lines may cite figures only if those figures exist in the current
# outlook-data.json (same rule as the daily digest, incl. decimal commas).
_THOUSANDS=re.compile(r"(?<=\d),(?=\d{3}\b)")
_NUMRE=re.compile(r"\d+(?:\.\d+)?")
_DECCOMMA=re.compile(r"(?<=\d),(?=\d)")
def _nums(t):
    s=_THOUSANDS.sub("",str(t))
    return _NUMRE.findall(_DECCOMMA.sub(".",s))
def outlook_corpus():
    try:
        raw=open(os.path.join(ROOT,"outlook-data.json"),encoding="utf-8").read()
    except OSError:
        return set()
    return set(_nums(raw))

# ---------------------------------------------------------------- prompts (NO f-strings)
EXTRACT_PROMPT=(
 "You are extracting product information from a manufacturer's internal document "
 "(a quote sheet, catalogue page or spec sheet) for Birdland, a Taiwanese OEM/ODM "
 "maker of garden and field hand tools. Return STRICT JSON only:\n"
 '{"title":"short promotion title in English",'
 '"intro":"2-3 sentence introduction of this product group in English",'
 '"items":[{"code":"model/item number as written","name":"product name",'
 '"specs":["3-6 short spec lines: size, material, finish, packing"],'
 '"moq":"minimum order quantity if stated, else empty string"}]}\n'
 "RULES:\n"
 "- NEVER include any price, cost, amount of money, currency symbol or currency "
 "code anywhere in any field. Not even ranges or approximations. If a spec line "
 "contains a price, drop that part of the line and keep the rest.\n"
 "- NEVER include Incoterms (FOB, CIF, EXW and similar).\n"
 "- Do not invent products or specs that are not in the document.\n"
 "- Keep item codes exactly as written; they are how the customer orders.\n"
 "- 1 to 12 items. If the document has no identifiable products, return "
 '{"items":[]}.')

APPEAL_PROMPT=(
 "You write short, factual selling points for an OEM buyer audience. Input JSON has "
 '"items" (products of a Taiwanese garden/field hand-tool maker) and "market_context" '
 "(today's freight/compliance/materials outlook lines from our own published data).\n"
 "Return STRICT JSON only:\n"
 '{"appeal":{"<item code>":"one sentence, why this item is worth ordering now"},'
 '"why_now":["1-3 short lines connecting this product group to the current market '
 'context"]}\n'
 "RULES:\n"
 "- No prices, no currency, no Incoterms, no discounts, no percentages that are "
 "not present verbatim in market_context.\n"
 "- Any figure you cite MUST appear verbatim in the input; otherwise write the "
 "line without figures.\n"
 "- Plain trade English, no hype words (revolutionary, best, amazing).")

IMGCHECK_PROMPT=(
 "Each attached image is a candidate product photo. Return STRICT JSON only:\n"
 '{"drop":[0-based indexes of images that contain ANY visible price, currency '
 'symbol, money amount, or quotation table text],"keep":[all other indexes]}\n'
 "When unsure whether text in an image is a price, DROP it.")

TRANSLATE_PROMPT=(
 "Translate the JSON promotion content into the target language given in "
 '"lang". Translate values of title, intro, specs, appeal, why_now and item '
 "names; NEVER translate or alter item codes or moq. Keep every number exactly "
 "as in the source. Return ONLY the translated object itself (top-level keys "
 "title, intro, items, why_now) — do NOT wrap it in any envelope key.")

# ---------------------------------------------------------------- pipeline steps
def extract(data,mime):
    return gem_call([{"text":EXTRACT_PROMPT},file_part(data,mime)],temp=0.2)

def market_context():
    """Compact, price-free lines from today's outlook data for why_now grounding."""
    try:
        d=json.load(open(os.path.join(ROOT,"outlook-data.json"),encoding="utf-8"))
    except OSError:
        return []
    regs=d.get("regions") or {}
    pairs=list(regs.items()) if isinstance(regs,dict) else [(str(i),r) for i,r in enumerate(regs)]
    ctx=[]
    for code,r in pairs[:14]:
        if not isinstance(r,dict): continue
        summ=r.get("summary")
        cand=[r.get("headline"),r.get("regulation"),r.get("supply"),
              summ.get("changed") if isinstance(summ,dict) else summ]
        for v in cand:
            # lines carrying prices are simply not offered to the appeal call
            if isinstance(v,str) and v and not PRICE_PAT.search(v):
                ctx.append(code+": "+v)
    return ctx[:20]

def appeal(items):
    ctx={"items":items,"market_context":market_context()}
    return gem_call([{"text":APPEAL_PROMPT+"\n"+json.dumps(ctx,ensure_ascii=False)}],temp=0.4)

LANG_BY_MARKET={"de":"de","at":"de","ch":"de","fr":"fr","es":"es","mx":"es","cl":"es",
 "it":"it","nl":"nl","be":"nl","pl":"pl","br":"pt-br","pt":"pt-br","jp":"ja",
 "tw":"zh-tw","us":"en","uk":"en","gb":"en","au":"en","ca":"en","ie":"en"}
def market_lang(market):
    return LANG_BY_MARKET.get((market or "").lower(),"en")

def translate(content,lang):
    if lang=="en": return None
    ctx={"lang":lang,"content":content}
    return gem_call([{"text":TRANSLATE_PROMPT+"\n"+json.dumps(ctx,ensure_ascii=False)}],temp=0.2)

# ---------------------------------------------------------------- validation
def clean_str(v,limit=400):
    v=str(v or "").strip()
    return v[:limit]

def build_promo(ext,ap,src_bytes,sales_name,sales_email,market,expires_days,today):
    items=[]
    for it in (ext.get("items") or [])[:12]:
        code=clean_str(it.get("code"),60)
        name=clean_str(it.get("name"),120)
        if not code or not name: continue
        items.append({"code":code,"name":name,
                      "specs":[clean_str(s,160) for s in (it.get("specs") or [])[:6] if clean_str(s)],
                      "moq":clean_str(it.get("moq"),60),
                      "appeal":clean_str((ap.get("appeal") or {}).get(code),240)})
    if not items:
        note("no items extracted"); return None
    corpus=outlook_corpus()
    why=[]
    for ln in (ap.get("why_now") or [])[:3]:
        ln=clean_str(ln,240)
        if ln and all(n in corpus for n in _nums(ln)): why.append(ln)
        elif ln: note("why_now line dropped by number firewall: %r"%ln[:60])
    slug=hashlib.sha256(src_bytes+(sales_email or "").encode()).hexdigest()[:12]
    exp=(datetime.date.fromisoformat(today)+datetime.timedelta(days=expires_days)).isoformat()
    promo={"slug":slug,"created":today,"expires":exp,
           "market":clean_str(market,20),"lang":market_lang(market),
           "sales":{"name":clean_str(sales_name,80),"email":clean_str(sales_email,120)},
           "title":clean_str(ext.get("title"),120) or "Product promotion",
           "intro":clean_str(ext.get("intro"),600),
           "items":items,"why_now":why,"images":[]}
    hits=price_scan(promo)
    if hits:
        for p,x in hits[:10]: note("PRICE BLOCK %s: ...%s..."%(p,x))
        note("promotion rejected: %d price marker(s) — nothing written"%len(hits))
        return None
    return promo

def attach_lang(promo):
    lang=promo["lang"]
    if lang=="en": return
    content={"title":promo["title"],"intro":promo["intro"],
             "items":promo["items"],"why_now":promo["why_now"]}
    try:
        tr=translate(content,lang)
    except Exception as e:
        note("translation failed, English only: %s"%e); return
    # tolerate the one wrapper shape models keep producing anyway
    if isinstance(tr,dict) and "items" not in tr and isinstance(tr.get("content"),dict):
        tr=tr["content"]
    if not isinstance(tr,dict) or len(tr.get("items") or [])!=len(promo["items"]):
        note("translation misaligned, English only"); return
    for i,it in enumerate(tr["items"]):
        if clean_str(it.get("code"),60)!=promo["items"][i]["code"]:
            note("translation altered an item code, English only"); return
    hits=price_scan(tr)
    if hits:
        note("translation dropped by price firewall (%s)"%hits[0][0]); return
    promo["tr"]={"title":clean_str(tr.get("title"),120),
                 "intro":clean_str(tr.get("intro"),600),
                 "items":[{"name":clean_str(it.get("name"),120),
                           "specs":[clean_str(s,160) for s in (it.get("specs") or [])[:6]],
                           "appeal":clean_str(it.get("appeal"),240)} for it in tr["items"]],
                 "why_now":[clean_str(w,240) for w in (tr.get("why_now") or [])[:3]]}

# ---------------------------------------------------------------- images
def extract_images(data,ext_name,slug):
    """Pull embedded photos (PDF only, CI has pymupdf+pillow), beautify onto a
    square white canvas, Gemini-check for visible prices, save webp. Best effort:
    a promotion without photos is still valid."""
    if ext_name!=".pdf": return []
    try:
        import fitz  # pymupdf
        from PIL import Image
        import io
    except ImportError:
        note("pymupdf/pillow not installed; skipping images"); return []
    try:
        doc=fitz.open(stream=data,filetype="pdf")
    except Exception as e:
        note("pdf open failed: %s"%e); return []
    raws=[];seen=set()
    for page in doc:
        for xref,*_ in page.get_images(full=True):
            if xref in seen: continue
            seen.add(xref)
            try:
                pix=fitz.Pixmap(doc,xref)
                if pix.n>4: pix=fitz.Pixmap(fitz.csRGB,pix)
                if pix.width<200 or pix.height<200: continue  # icons/logos
                raws.append(pix.tobytes("png"))
            except Exception: continue
            if len(raws)>=12: break
    if not raws: return []
    parts=[{"text":IMGCHECK_PROMPT}]+[file_part(r,"image/png") for r in raws]
    try:
        keep=set(gem_call(parts,temp=0).get("keep") or [])
    except Exception as e:
        note("image price-check failed; dropping ALL images to stay safe: %s"%e)
        return []
    out=[];outdir=os.path.join(ROOT,"p","img")
    os.makedirs(outdir,exist_ok=True)
    for i,r in enumerate(raws):
        if i not in keep: note("image %d dropped by price check"%i); continue
        try:
            im=Image.open(io.BytesIO(r)).convert("RGB")
            im.thumbnail((760,760))
            side=max(im.size)+40
            canvas=Image.new("RGB",(side,side),(255,255,255))
            canvas.paste(im,((side-im.width)//2,(side-im.height)//2))
            name="%s-%d.webp"%(slug,len(out)+1)
            canvas.save(os.path.join(outdir,name),"WEBP",quality=82)
            out.append("img/"+name)
        except Exception as e:
            note("image %d convert failed: %s"%(i,e))
    return out[:8]

# ---------------------------------------------------------------- render + index
def render_page(promo):
    tpl=open(os.path.join(ROOT,"tools","promo_template.html"),encoding="utf-8").read()
    if tpl.count("__PROMO__")!=1:
        raise RuntimeError("promo_template.html must contain exactly one __PROMO__")
    return tpl.replace("__PROMO__",json.dumps(promo,ensure_ascii=False))

def load_index():
    p=os.path.join(ROOT,"p","index.json")
    try: return json.load(open(p,encoding="utf-8"))
    except OSError: return {"promos":[],"processed":[]}

def save_outputs(promo,src_hash):
    idx=load_index()
    os.makedirs(os.path.join(ROOT,"p"),exist_ok=True)
    html=render_page(promo)
    open(os.path.join(ROOT,"p",promo["slug"]+".html"),"w",encoding="utf-8").write(html)
    idx["promos"]=[x for x in idx["promos"] if x["slug"]!=promo["slug"]]
    idx["promos"].insert(0,{k:promo[k] for k in
        ("slug","created","expires","market","lang","title")}|{"sales":promo["sales"],
        "items":len(promo["items"]),"images":len(promo["images"])})
    if src_hash and src_hash not in idx["processed"]:
        idx["processed"]=([src_hash]+idx["processed"])[:500]
    open(os.path.join(ROOT,"p","index.json"),"w",encoding="utf-8").write(
        json.dumps(idx,ensure_ascii=False,indent=1))
    note("written p/%s.html (%d items, %d images, lang %s)"%(
        promo["slug"],len(promo["items"]),len(promo["images"]),promo["lang"]))

# ---------------------------------------------------------------- expiry
# An expired promotion is truly removed, not just hidden by page JS: the html
# is overwritten with a minimal contact-only page (search caches and forwarded
# links then show nothing customer-specific), and its images are deleted.
EXPIRED_MSG={
 "en":"This promotion has ended. Please contact your Birdland representative for the current offer.",
 "zh-tw":"本檔推廣已結束,請聯繫您的 Birdland 業務窗口取得最新資訊。",
 "de":"Diese Aktion ist beendet. Bitte kontaktieren Sie Ihren Birdland-Ansprechpartner.",
 "fr":"Cette promotion est terminée. Veuillez contacter votre représentant Birdland.",
 "es":"Esta promoción ha finalizado. Contacte con su representante de Birdland.",
 "it":"Questa promozione è terminata. Contatti il suo referente Birdland.",
 "nl":"Deze promotie is afgelopen. Neem contact op met uw Birdland-vertegenwoordiger.",
 "pl":"Ta promocja dobiegła końca. Skontaktuj się ze swoim przedstawicielem Birdland.",
 "pt-br":"Esta promoção foi encerrada. Fale com seu representante Birdland.",
 "ja":"本プロモーションは終了しました。Birdland 担当者までお問い合わせください。"}

def expired_page(x):
    email=(x.get("sales") or {}).get("email","")
    msg=EXPIRED_MSG.get(x.get("lang","en"),EXPIRED_MSG["en"])
    both=msg if x.get("lang","en")=="en" else msg+"<br>"+EXPIRED_MSG["en"]
    link=('<p><a href="mailto:'+email+'">'+email+'</a></p>') if email else ""
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
     '<meta name="viewport" content="width=device-width,initial-scale=1">'
     '<meta name="robots" content="noindex,nofollow">'
     '<meta name="referrer" content="no-referrer">'
     '<title>Birdland</title></head><body style="font:17px/1.6 Georgia,serif;'
     'max-width:560px;margin:80px auto;padding:0 16px;text-align:center">'
     '<p><b>BIRDLAND</b></p><p>'+both+'</p>'+link+'</body></html>')

def prune_expired(today=None):
    today=today or datetime.date.today().isoformat()
    idx=load_index(); removed=0
    for x in idx["promos"]:
        if x.get("expires") and x["expires"]<today and not x.get("expired"):
            open(os.path.join(ROOT,"p",x["slug"]+".html"),"w",encoding="utf-8").write(expired_page(x))
            for n in range(1,13):
                try: os.remove(os.path.join(ROOT,"p","img","%s-%d.webp"%(x["slug"],n)))
                except OSError: pass
            x["expired"]=True; removed+=1
    if removed:
        open(os.path.join(ROOT,"p","index.json"),"w",encoding="utf-8").write(
            json.dumps(idx,ensure_ascii=False,indent=1))
        note("pruned %d expired promotion(s)"%removed)

# ---------------------------------------------------------------- entry
def process_file(data,fname,sales_name,sales_email,market,expires_days,force=False):
    ext_name=os.path.splitext(fname)[1].lower()
    mime=MIMES.get(ext_name)
    if not mime:
        note("unsupported file type %s"%ext_name); return False
    src_hash=hashlib.sha256(data).hexdigest()
    if not force and src_hash in load_index()["processed"]:
        note("already processed %s"%fname); return False
    today=datetime.date.today().isoformat()
    ext=extract(data,mime)
    ap=appeal(ext.get("items") or [])
    promo=build_promo(ext,ap,data,sales_name,sales_email,market,expires_days,today)
    if not promo: return False
    promo["images"]=extract_images(data,ext_name,promo["slug"])
    attach_lang(promo)
    hits=price_scan(promo)  # final gate over everything incl. translation
    if hits:
        note("FINAL PRICE BLOCK %s — nothing written"%hits[0][0]); return False
    save_outputs(promo,src_hash)
    return True

# ---------------------------------------------------------------- SharePoint poll
# The salesperson's only job is saving the document into the folder. Uploader
# identity comes from the file's createdBy metadata; an optional two-letter
# filename prefix chooses the target market ("de_trowels.pdf" -> market de).
def graph_token():
    tid=os.environ.get("MSGRAPH_TENANT_ID","");cid=os.environ.get("MSGRAPH_CLIENT_ID","")
    sec=os.environ.get("MSGRAPH_CLIENT_SECRET","")
    if not (tid and cid and sec): return None
    body=urllib.parse.urlencode({"client_id":cid,"client_secret":sec,
        "scope":"https://graph.microsoft.com/.default",
        "grant_type":"client_credentials"}).encode()
    r=json.load(urllib.request.urlopen(urllib.request.Request(
        "https://login.microsoftonline.com/"+tid+"/oauth2/v2.0/token",data=body),timeout=60))
    return r.get("access_token")

def graph_get(tok,url):
    return json.load(urllib.request.urlopen(
        urllib.request.Request(url,headers={"Authorization":"Bearer "+tok}),timeout=120))

def market_from_name(fname):
    m=re.match(r"^([a-z]{2})[-_]",fname.lower())
    return m.group(1) if m else ""

def poll():
    prune_expired()  # runs hourly even before SharePoint is wired up
    tok=graph_token()
    if not tok:
        note("MSGRAPH secrets not configured; poll skipped"); return 0
    site=os.environ.get("PROMO_SP_SITE","").rstrip("/")
    folder=os.environ.get("PROMO_SP_FOLDER","Promotion上傳")
    m=re.match(r"https://([^/]+)(/(?:sites|teams)/[^/?#]+)",site)
    if not m:
        note("PROMO_SP_SITE malformed: %r"%site); return 1
    s=graph_get(tok,"https://graph.microsoft.com/v1.0/sites/"+m.group(1)+":"+m.group(2))
    kids=graph_get(tok,"https://graph.microsoft.com/v1.0/sites/"+s["id"]
        +"/drive/root:/"+urllib.parse.quote(folder)+":/children")
    done=0
    for it in kids.get("value",[]):
        if "file" not in it: continue
        if int(it.get("size") or 0)>20_000_000:
            note("skip %s: over 20MB"%it["name"]); continue
        dl=it.get("@microsoft.graph.downloadUrl")
        if not dl: continue
        try:
            data=urllib.request.urlopen(dl,timeout=300).read()
        except Exception as e:
            note("download failed %s: %s"%(it["name"],e)); continue
        u=(it.get("createdBy") or {}).get("user") or {}
        try:
            if process_file(data,it["name"],u.get("displayName",""),
                            u.get("email",""),market_from_name(it["name"]),30):
                done+=1
        except Exception as e:
            note("processing failed %s: %s"%(it["name"],e))
    note("poll complete, %d new promotion(s)"%done)
    return 0

def main(argv):
    if "--poll" in argv: return poll()
    args={}
    it=iter(argv)
    for a in it:
        if a.startswith("--"): args[a[2:]]=next(it,"")
    f=args.get("file")
    if not f:
        note("usage: --file <path> [--sales-name N --sales-email E --market cc --expires-days 30]")
        return 2
    prune_expired()
    data=open(f,"rb").read()
    # a manual --file run is always intentional; only the poll deduplicates
    ok=process_file(data,os.path.basename(f),args.get("sales-name",""),
        args.get("sales-email",""),args.get("market",""),
        int(args.get("expires-days","30") or 30),force=True)
    return 0 if ok else 1

# ---------------------------------------------------------------- selftest
def selftest():
    fails=[]
    def check(cond,msg):
        if not cond: fails.append(msg)
        print(("ok  " if cond else "FAIL")+" "+msg)
    # price firewall catches every disguise we have met
    bad=["FOB Keelung USD 3.20/pc","unit price $2.10","Preisliste 2026",
         "prix indicatif","報價單","単価 120円/本".replace("円/本",""),
         "NT$85","EXW Taichung","precio unitario","cena za sztuke",
         "preço por peça","€ 1,05","attractive pricing"]
    for b in bad: check(price_scan({"x":b}),"blocks %r"%b[:24])
    # ...and stays quiet on legitimate product content (incl. the word inquiry)
    good=["28.5 cm forged carbon steel blade","MOQ 3,000 pcs","S45C steel, HRC 48-52",
          "ash wood handle 120 cm","歡迎勾選品項向業務詢價","zinc plated, 250 g",
          "PP+TPR grip, EU compliant packaging"]
    for g in good: check(not price_scan({"x":g}),"allows %r"%g[:24])
    # number firewall on why_now
    corpus=set(_nums("rates rose 12.5 this week; 2,300 TEU"))
    check(all(n in corpus for n in _nums("capacity 2300 TEU up 12.5")),"digits pass corpus")
    check(not all(n in corpus for n in _nums("up 47.3 since May")),"foreign digit rejected")
    check(_nums("87,18")==["87.18"],"decimal comma normalised")
    # prompts must not be f-strings and must forbid prices
    src=open(os.path.abspath(__file__),encoding="utf-8").read()
    for pname in ("EXTRACT_PROMPT","APPEAL_PROMPT","IMGCHECK_PROMPT","TRANSLATE_PROMPT"):
        i=src.find(pname+"=(")
        check(i>=0 and not re.search(r"f['\"]",src[i:src.find(")\n",i)]),
              pname+" is not an f-string")
    check("price" in EXTRACT_PROMPT and "price" in APPEAL_PROMPT,"prompts forbid prices")
    # build_promo end-to-end with a fake extraction (no network)
    ext={"title":"Forged trowels","intro":"Three forged trowels for EU garden retail.",
         "items":[{"code":"BT-101","name":"Forged trowel","specs":["28.5 cm","S45C steel"],"moq":"3,000 pcs"}]}
    ap={"appeal":{"BT-101":"Forged in one piece for a longer service life."},"why_now":[]}
    p=build_promo(ext,ap,b"src",b"a".decode(),"e@x","de",30,"2026-08-17")
    check(p is not None and p["items"][0]["code"]=="BT-101","build_promo accepts clean input")
    check(p and p["lang"]=="de","market de maps to lang de")
    ext2=json.loads(json.dumps(ext)); ext2["items"][0]["specs"].append("USD 3.20 FOB")
    check(build_promo(ext2,ap,b"s","","","de",30,"2026-08-17") is None,
          "a smuggled price rejects the whole promotion")
    # expiry truly removes content: the page is overwritten contact-only
    import tempfile
    g=globals();_oldroot=g["ROOT"];td=tempfile.mkdtemp()
    try:
        os.makedirs(os.path.join(td,"p","img"))
        open(os.path.join(td,"p","xx.html"),"w",encoding="utf-8").write("SECRET PRODUCT DATA")
        open(os.path.join(td,"p","img","xx-1.webp"),"wb").write(b"x")
        open(os.path.join(td,"p","index.json"),"w",encoding="utf-8").write(json.dumps(
            {"promos":[{"slug":"xx","expires":"2000-01-01","lang":"de","title":"T",
                        "sales":{"email":"a@b.tw"}}],"processed":[]}))
        g["ROOT"]=td
        prune_expired("2026-01-01")
        html=open(os.path.join(td,"p","xx.html"),encoding="utf-8").read()
        check("SECRET" not in html and "a@b.tw" in html,"expired page keeps only the contact")
        check(not os.path.exists(os.path.join(td,"p","img","xx-1.webp")),"expired images deleted")
        check(load_index()["promos"][0].get("expired") is True,"index marks the expiry")
    finally:
        g["ROOT"]=_oldroot
    # the real data file must never crash context building, and the context
    # itself must already be price-free
    if os.path.exists(os.path.join(ROOT,"outlook-data.json")):
        mc=market_context()
        check(isinstance(mc,list),"market_context tolerates the real data shape")
        check(not any(PRICE_PAT.search(x) for x in mc),
              "market_context lines are price-free")
    # template contract (only if the template already exists)
    tp=os.path.join(ROOT,"tools","promo_template.html")
    if os.path.exists(tp):
        tpl=open(tp,encoding="utf-8").read()
        check(tpl.count("__PROMO__")==1,"template has exactly one __PROMO__")
        check('name="referrer" content="no-referrer"' in tpl,
              "template suppresses the Referer header")
        check('name="robots" content="noindex' in tpl,"template is noindex")
    print("selftest: %d failure(s)"%len(fails))
    return 1 if fails else 0

if __name__=="__main__":
    if "--selftest" in sys.argv: sys.exit(selftest())
    sys.exit(main(sys.argv[1:]))
