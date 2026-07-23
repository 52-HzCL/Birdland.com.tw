# Public data schema

This site publishes public market, sourcing and catalogue information only. It
must never contain a customer name, email address, quote, drawing, specification,
order, price agreement or project identifier.

## `outlook-data.json`

`outlook-data.json` is the daily edition payload injected into `news.html`,
`partner.html`, `team.html` and `executive.html` at build time.

- `updated`: human-readable edition timestamp. It means the workflow produced an
  edition; it does **not** mean every source succeeded.
- `status.workflow`: workflow run time and overall state.
- `status.sources`: source-level state. Valid states are `current`, `delayed`,
  `manual`, `modelled` and `unavailable`.
- `indices`, `macro`, `shipping`, `market_news`: daily or best-effort public
  context. Renderers must show the supplied source state and tolerate absence.
- `market_news` items may carry `topic`, `category`, `region`, `source_tier` and
  `fetched_at`. `source_tier` is `official`, `trade` or `context`; it must never
  imply that a Google News redirect is a direct official feed.
- `timeline`, `landed`, `tariff_calc`, `partner.*`: desk-set public planning
  content. These are never presented as live feeds.

The Gemini merge preserves only known top-level fields. Do not add a new field to
this JSON without also updating `tools/gen_news_gemini.py` carry-through logic.

## `product-offers.json`

The public Product & Offer Finder feed. Every item must have a stable id, public
view-only HTTPS PDF URL, factual availability and `status: "published"`.
Customer-specific catalogues, private folders, expiring tokens, prices and quotes
are prohibited.

## `calendar-events.json`

The manual source for the public Calendar Hub and `.ics` feeds.

- `id`: stable public identifier.
- `starts_at` / `ends_at`: ISO 8601 UTC times.
- `status`: `scheduled`, `actual`, `forecast` or `manual`.
- `source_url`: an official or primary source when one exists.
- `verified_at`: date Birdland last checked the public event.
- `deep_link`: same-origin report or manufacturing page only.

Calendar events are public planning reminders, never customer milestones.

## RSS feeds

`tools/build_feeds.py` generates the public, deterministic RSS files in `feeds/`
from `market_news`. They contain only public titles, source attribution, a deep
link and a short buyer-action prompt; they never contain article text or customer
information. A feed can be empty when no relevant public item is available.

## Local-only browser preferences

Allowed local keys use the existing namespaces (`bd_e_*`, `bd_p_*`, `bl_*`) and
may hold only language choice, selected public region, watch categories, saved
public report ids, last-seen hashes and read state. A visible "Clear this device"
control must delete them. Names, email addresses, free text, quantities and prices
are not allowed in local storage.

---

# Field-by-field reference

This is the single data file every page reads. It's fetched once at page load and
parsed as `D` (and `D.partner` is aliased `P` on the Partner/Team desks). This doc
maps every top-level field: what it contains, its shape, and — most importantly —
**whether it's refreshed daily by AI, fetched live by a script, or hand-maintained
by the desk.** Get this wrong and you'll build a feature on stale data without
realizing it (see the shipping-rate incident in git log `40671d2` for what that
costs).

Field names and shapes below were captured from a real snapshot — **verify against
current `outlook-data.json` before relying on an exact field name**, especially for
anything under `teamdesk.*`, which has grown organically. This file itself is not
authoritative; the JSON is. Update this doc whenever you add/rename a field.

## Refresh cadence — the one thing to get right

| Source | How it updates | Where |
|---|---|---|
| **AI-refreshed daily** | `gen_news_gemini.py`, one Gemini call/day, validated per-field before merge | `regions` (14 country objects), `indices`, `macro`, `forward`, `shipping` (top-level), `war` (top-level), `procurement` (top-level), `material` (top-level, note only), `teamAnalysis`, `partner.birdbot`, `birdbot_client`, `teamdesk.{materials_bot,shipping_bot,reg_bot}` |
| **Live-fetched daily** | `fetch_market.py`, real API calls, best-effort | `indices`/`macro` live quotes (TwelveData), freight FRED series, `teamdesk.fx_today`/`fx_baseline`/`usdtwd_spark` (open.er-api), `market_news` (Google News RSS) |
| **Desk-set, static** | Hand-edited in the JSON by whoever maintains the desk; AI is explicitly forbidden from touching these except where noted | `partner.procurement/shipping/material/tariffmon/war` (the `P.*` subtree — a forecast/planning layer, NOT live data), `timeline`, `landed`, `tariff_calc`, `teamdesk.materials`/`regnews`/`advice`/`materials2` |
| **Company-owned, AI never touches** | Manually written PR/marketing copy | `news` (top-level — Birdland's own announcements, different from `market_news`) |

**The recurring trap**: a top-level block and its `partner.*` namesake often look
like duplicates but are NOT interchangeable — `shipping` (top-level) is today's
real lane rates; `partner.shipping` is a desk-set 10-month forecast *curve* whose
"Now" point can drift far from reality. Same pattern for `material`/`partner.material`,
`war`/`partner.war`, `procurement`/`partner.procurement`. **Prefer the top-level
block for anything claiming to be current; treat `partner.*` as a separate,
clearly-labeled forecast/planning layer.**

## Top-level keys

```
us, ca, au, uk, me, sa, global, nl, de, fr, it, pl, es, eu   — 14 region objects (see below)
regions          — { <code>: <same shape as the 14 keys above> }  (a mirror/lookup map)
order            — [[code, displayName], ...] — display order for the region picker
updated          — string, e.g. "23 Jul 2026, 04:19 UTC" — stamped by the CI run, not by any script logic
news             — [{date, title, url, blurb}] — Birdland's own company announcements (client desk)
market_news      — [{topic, title, url, source, date}] — external tariff/shipping/China/Taiwan headlines
indices          — [{label, short, value, unit, sub, dir, chg, spark, icon}] — the live ticker strip
macro            — [{short, label, value, unit, dir, chg, spark}] — 10-item macro/FX ticker
forward          — {note, commodities:[{name, unit, tip, ...}]} — forward-curve commentary
shipping         — {note, lanes:[{lane, rate, unit, chg, dir, transit, rel}]} — LIVE current lane rates
war              — {note, zones:[{zone, status, impact, affects[], note}]} — geopolitical risk monitor
procurement      — {note/summary, items:[{input, action, urgency, dir, why}]} — daily buy/hold guidance
material         — {note} — currently just a headline note; the actual series live under partner.material
landed           — {sku, unit, note, components:[{name, v, c, tip}]} — landed-cost calculator seed data
timeline         — {from, to, items:[{label, date, region, tip}]} — regulatory/trade-show calendar (desk-set)
tariff_calc      — {note, destinations:{<country>:{mfn, addons:[{label, pct, origin, tip}]}}}
teamAnalysis     — string — one narrative paragraph, used as a fallback summary on Partner Desk
partner          — { procurement, shipping, material, tariffmon, war, birdbot } — see below
teamdesk         — { ...14 fields } — see below
birdbot_client    — { c-desk, c-watch, c-freight, c-curve, c-cost, c-duty, c-mkt, news } — see below
```

### Region object shape (the 14 country keys + `regions`)

```
{
  headline: string,
  regulation: [{t: title, b: body}],
  supply: string,
  view: string,
  viz: {heat:{regulation,tariff,freight,energy}, x, y, size, px, py, pheat, geo:[lat,lon], flow},
  summary: {changed: string, action: string},   // AI-written 2-sentence digest; may be absent if never validated
  asof: string                                   // only bumped when content signature actually changes
}
```
`viz.p*` fields are the previous run's values, used to animate transitions — never
overwrite them directly, they're rolled by `gen_news_gemini.py`.

### `partner.*` (static planning/forecast layer — `P` in page scripts)

```
partner.procurement  — {summary, actions:[{level, label, note}]}   // fallback only; prefer top-level procurement
partner.shipping     — {unit, note, lanes:[{lane, c, points:[{t,v}, ...]}]}  // FORECAST CURVE, not live rate
partner.material      — {unit, tenors:[...], note, series:[{name, c, points:[{t,v}, ...]}]}
partner.tariffmon    — {changes:[{date, market, change, dir, note}]}  // no top-level daily equivalent
partner.war           — {note, items:[{event, region, impact, affects[], note}]}
partner.birdbot       — { <section-id>: {simple, expert:[...], src?} }  // one-line "plain terms" copy per section
```

### `teamdesk.*`

```
updated          — string, own timestamp separate from top-level `updated`
fx_baseline       — {TWD, CNY, JPY}  — previous run's snapshot, for day-over-day %
fx_today          — {TWD, CNY, JPY}  — current live rates (open.er-api, keyless)
usdtwd_spark      — number[] — rolling sparkline, capped 30 points
usdtwd_view       — AI commentary on the FX chart
materials         — [{name, dir, note}] — Traditional-Chinese material notes, desk-set
materials2        — { tw: [...], cn: [...], updated, rolled }  — weekly self-rolling trend model (deterministic, no AI)
regnews           — { china: [{date,title,summary,url}], taiwan: [...] }  — regulatory news by country
advice            — AI-written procurement guidance text
materials_bot, shipping_bot, reg_bot  — birdbot-style {simple, expert[]} plain-language summaries
```

### `birdbot_client.*`

Same `{simple, expert:[...]}` shape as `partner.birdbot`, keyed by client-desk
section id (`c-desk`, `c-watch`, `c-freight`, `c-curve`, `c-cost`, `c-duty`,
`c-mkt`, `news`).

## Known pipeline quirks (see also AGENTS.md)

- **Duplicate spark tail**: the last point in any `spark` array is often a repeat
  of the second-to-last (an artifact of how the daily update rolls values). Naive
  `chg` reads 0.0% as a result — use the "walk back past duplicates" pattern
  (`realChg`/`rc(` in the partner template) rather than trusting `.chg` directly
  or diffing the last two spark points yourself.
- **New fields get silently dropped**: `gen_news_gemini.py`'s merge only carries
  forward an explicit allow-list of top-level keys from the previous day's file.
  Adding a new top-level field to the JSON (like `market_news` was) does nothing
  until that key is added to the allow-list in `gen_news_gemini.py` — otherwise the
  next daily run erases it. See AGENTS.md → "Daily CI pipeline".
- **`market_news` topic balance**: the fetcher guarantees up to 2 slots per topic
  before filling the rest by date (fixed in `b347659` after date-only sorting let
  fresher topics crowd out shipping entirely some days).
