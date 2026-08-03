#!/usr/bin/env python3
"""Build terminal.json — the Terminal panel's live values and its search index.

The panel costs the page nothing at load: this one small file is fetched when
the panel first opens, and once at idle for the staleness dot. Everything in it
is derived from files that already exist, so it cannot drift from what the
desks show.

Kept in step with scratchpad/gen-terminal.js, which is the version used for
local verification on a machine without Python.
"""
import json, os, re, urllib.parse

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TD = os.path.dirname(os.path.abspath(__file__))


def read(p):
    with open(p, encoding="utf-8", newline="") as f:
        return f.read()


data = json.loads(read(os.path.join(HERE, "outlook-data.json")))
partner = read(os.path.join(TD, "partner_template.html"))
factory = read(os.path.join(HERE, "product-101.html"))


# ── live values ─────────────────────────────────────────────────────────────
# Same derivation the desks use: walk back through spark until the value really
# changes, so a flat repeat does not read as 0.00%.
def real_chg(ix):
    spark = (ix or {}).get("spark") or []
    if len(spark) >= 2:
        last = spark[-1]
        i = len(spark) - 2
        a = spark[i]
        while i > 0 and a == last:
            i -= 1
            a = spark[i]
        if a:
            return (last - a) / abs(a) * 100
    return (ix or {}).get("chg") or 0


by_short = {x["short"]: x for x in (data.get("indices") or []) if x.get("short")}


def arrow(c):
    return "up" if c > 0.05 else ("down" if c < -0.05 else "flat")


def cell(short):
    ix = by_short.get(short)
    if not ix:
        return None
    c = real_chg(ix)
    d = arrow(c)
    mark = " ▲" if d == "up" else (" ▼" if d == "down" else " —")
    return {"text": "%s %s%s" % (short, "{:,}".format(ix.get("value") or 0), mark), "dir": d}


def biggest_move():
    pool = [by_short[s] for s in ("STEEL HRC", "PP RESIN", "BRENT") if s in by_short]
    if not pool:
        return None
    top = max(pool, key=lambda ix: abs(real_chg(ix)))
    c = real_chg(top)
    return {"text": "BIGGEST MOVE · %s %s%.1f%%" % (top["short"], "+" if c > 0 else "", c),
            "dir": arrow(c)}


steps = {"news": cell("STEEL HRC"), "buyer": biggest_move(), "cost": cell("FREIGHT WCI")}

# ── search index ────────────────────────────────────────────────────────────
index, seen = [], set()


def add(t, n, d, u):
    k = (t, n, d)
    if not n or k in seen:
        return
    seen.add(k)
    index.append({"t": t, "n": n, "d": d, "u": u})


for n, d, u in [
    ("Daily Supply News", "Today's steel, resin, freight and policy signals", "executive.html"),
    ("Buyer Desk", "Product families, materials, processes, buyer brief", "partner.html"),
    ("Cost Desk", "Landed cost, margin, sailing, duty comparison", "cost-desk.html"),
    ("Team Desk", "Internal dashboard", "team.html"),
    ("Guide", "How this site works, step by step", "guide.html"),
    ("Factory", "The floor, the routes, the materials, the cost structure", "product-101.html"),
    ("About us", "The pure-play OEM model and the commercial boundary", "about.html"),
    ("Contact", "Routed to your regional desk", "contact.html"),
]:
    add("PAGE", n, d, u)

for n, d, u in [
    ("My landed cost", "FOB to your warehouse, per unit", "cost-desk.html#p-landed2"),
    ("Retail margin", "Cost to shelf price and gross profit", "cost-desk.html#p-margin"),
    ("Reorder timing", "When to place the next order", "cost-desk.html#p-reorder"),
    ("Plan a sailing", "Lane options and booking window", "cost-desk.html#p-sail"),
    ("Quick estimate", "A first number in four inputs", "cost-desk.html#p-calc"),
    ("TW vs CN duty", "Origin comparison including duty", "cost-desk.html#p-cduty"),
]:
    add("TOOL", n, d, u)


# Materials and processes come out of the Buyer Desk's own tables by bracket
# matching, never by a regex across the whole file — this repo has been bitten
# twice by that. Zero results is a build warning, not a silent pass.
def match_bracket(src, start):
    depth = 0
    i = start
    while i < len(src):
        c = src[i]
        if c == "'":
            i += 1
            while i < len(src) and src[i] != "'":
                if src[i] == "\\":
                    i += 1
                i += 1
        elif c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


PAIR = re.compile(r"\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\]")
PART = [(m.start(), m.group(1)) for m in re.finditer(r"\{name:'((?:[^'\\]|\\.)*)'", partner)]


def harvest(kind, key, url):
    n = 0
    for m in re.finditer(re.escape(key) + r":\[", partner):
        open_at = m.end() - 1
        end = match_bracket(partner, open_at)
        if end < 0:
            continue
        block = partner[open_at:end + 1]
        part = ""
        for at, nm in PART:
            if at < m.start():
                part = nm
            else:
                break
        for name, note in PAIR.findall(block):
            add(kind, name, (part + " · " if part else "") + note,
                url.replace("#", "?q=" + urllib.parse.quote(name) + "#"))
            n += 1
    return n


n_mat = harvest("MATERIAL", "materials", "partner.html#pd-builder")
n_proc = harvest("PROCESS", "processes", "partner.html#pd-builder")

# Factory sections, taken from the page's own table of contents rather than its
# headings: the TOC is what the page considers navigable, and it is correct.
n_sec = 0
i = factory.find('class="wk-toc"')
if i >= 0:
    block = factory[i:factory.find("</nav>", i)]
    for anchor, label in re.findall(r'<a href="#([a-z0-9-]+)"[^>]*>([\s\S]*?)</a>', block):
        title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", label)).strip()
        if not title:
            continue
        add("SECTION", re.sub(r"^[\d.]+\s*", "", title),
            "Factory · " + title.split(" ")[0], "product-101.html#" + anchor)
        n_sec += 1

# Today's headlines, so a policy code finds the edition that carries it.
n_sig = 0
for x in ((data.get("news") or []) + (data.get("market_news") or []))[:40]:
    title = (x or {}).get("title") or (x or {}).get("headline") or (x or {}).get("h") or ""
    if not title:
        continue
    add("SIGNAL", str(title)[:90], "Today’s edition", "executive.html#news")
    n_sig += 1

out = {"updated": data.get("updated") or "", "steps": steps, "index": index}
path = os.path.join(HERE, "terminal.json")
with open(path, "w", encoding="utf-8", newline="") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print("built terminal.json %d bytes — %d entries (%d materials, %d processes, %d sections, %d signals)"
      % (os.path.getsize(path), len(index), n_mat, n_proc, n_sec, n_sig))
if not n_mat or not n_proc:
    print("WARNING: material/process harvest came back empty — the Buyer Desk tables moved")
if not n_sec:
    print("WARNING: no Factory sections indexed")
