# Birdland.com.tw — Agent Instructions

Confidential OEM/ODM garden-tool manufacturer site (since 1974). Static site on
GitHub Pages, custom domain birdland.com.tw, serving `main` directly — **push = deploy**.

## Pages & build system (the #1 rule)

_(Corrected 2026-08-09 by the Zero-Touch audit: `news.html` is no longer a
built page and `cost-desk.html` was missing from this list entirely — see
`tools/dev/build.js`'s `JOBS` array and `pr-validation.yml`'s `pairs` array,
which are the two independent sources of truth this correction is based on.)_

- `index.html` — hand-authored public landing page. Edit directly.
- `news.html` — hand-written redirect stub (same pattern as `manufacturing.html`
  and `why-birdland.html`). Edit directly; it is **not** generated.
- `guide.html`, `partner.html`, `cost-desk.html`, `team.html`, `executive.html`
  — **BUILT ARTIFACTS. NEVER hand-edit.** Generated from `tools/news_template.html`
  (→ `guide.html`), `tools/partner_template.html` (→ `partner.html` with
  `__DESKMODE__` substituted to `buyer`, **and** → `cost-desk.html` with it
  substituted to `cost` — one template, two pages), `tools/team_template.html`,
  `tools/executive_template.html`, by substituting the literal token `__DATA__`
  with the full contents of `outlook-data.json` (see `tools/build_news.py`).
- Rebuild after any template change: `node tools/dev/build.js` (the Node
  twin of `tools/build_news.py`, kept for this Python-less machine — it also
  chains `gen-terminal.js` afterward, since the search index is harvested from
  these same templates and goes stale the moment they change). Point at this
  script rather than hand-rolling the substitution loop again — a previous
  version of this exact section had its own inline one-liner, which is what
  drifted out of sync (missing `cost-desk.html` and the `__DESKMODE__` step)
  and went uncaught until this audit.
- A template you did NOT edit must produce zero `git diff` in its built page.

## Daily CI pipeline (do not break it)

`.github/workflows/news-update.yml` runs daily: `gen_news_gemini.py` (one Gemini
call refreshes the whole JSON) → `fetch_market.py` (TwelveData quotes, FRED
freight, open.er-api FX, Google News RSS → `market_news`) → rebuild → commit+push.

- **The Gemini prompt must NEVER be a Python f-string.** It contains literal
  `{braces}`; converting it to an f-string once silently killed ALL daily updates
  for days (NameError before even the fallback). Plain strings + `json.dumps`
  concatenation only.
- The merge logic in `gen_news_gemini.py` **only preserves known fields**. Any new
  field added to `outlook-data.json` must also be added to the carry-through list
  (search for `("landed","timeline","tariff_calc","market_news")`) or the next CI
  run silently drops it. Renderers must guard with `if (field)` — the field may
  not exist in live data at deploy time.
- `fetch_market.py` steps are best-effort try/except; they must never fail the job.

## Data model (outlook-data.json)

**Full field-by-field reference: [`docs/DATA-SCHEMA.md`](docs/DATA-SCHEMA.md).**
Read it before touching any data-driven feature — it maps every top-level key,
which are AI-refreshed vs live-fetched vs desk-set static, and the recurring
top-level-vs-`partner.*` "looks like a duplicate, isn't" trap. The summary below
is the two rules that matter most; the doc has the rest.

- In page scripts: `D` = whole JSON, `P` = `D.partner`.
- **`D.partner.*` subtrees are STATIC desk-set data** (the AI is forbidden from
  touching them, except `partner.birdbot`). **Top-level blocks are daily-refreshed**:
  `indices, macro, forward, shipping, war, procurement, material, market_news,
  news (company-owned, AI never touches), timeline (desk-set), landed, tariff_calc`.
  Always prefer the top-level daily block; use `P.*` only as fallback, and label
  static data honestly (see freshness badges below).
- Known trap: `P.shipping` is a desk-set forecast CURVE whose levels can sit far
  below real spot rates; live lane rates live in `D.shipping` (no points[] series).
  _(The section that used to render `P.shipping` was retired outright — see
  `tools/partner_template.html`'s own "retired outright" comment — and no
  function named `lineChart` exists anywhere in the repo anymore, corrected
  2026-08-09 by the Zero-Touch audit after this warning was found to describe
  a mechanism that no longer exists.)_
- Known pipeline bug: the last spark-array point is often duplicated, so naive
  `chg` reads 0.0%. Use the existing "walk back past duplicate tail" pattern
  (search `realChg` / `rc(` in partner template) when deriving % change.

## Front-end conventions (Partner/Team/Executive desks)

- Palette: ONLY the `--kb-*` Kubera fintech tokens. Chart series colors come from
  the fixed `SERCOL` array by index — never from colors embedded in the data.
- Semantic colors are BUYER-COST semantics: `up` = RED (rising cost is bad),
  `down` = GREEN. Do not invert to stock-market convention.
- Tables: reuse `.wl` (right-aligned numeric, `th.l/td.l` left column, `td.up/
  .down/.flat` colored) or `.tm`. Note `.wl` hides its 4th column under 560px.
- `esc()`-style HTML escapers are scoped per `<script>` block. Define a local one
  (`kn_esc`/`sesc` pattern) — calling one from another block is a ReferenceError
  that kills every renderer after it in the same IIFE.
- `bentofy(id,lgSel,mdSel,smFns)` rebuilds a section body into a grid AFTER the
  render scripts run. Renderers must be synchronous/inline. Selector traps: it
  takes the FIRST match — give containers unique ids (e.g. `#ship-chartwrap`)
  instead of generic `.svgwrap` when a section has more than one.
- Adding a NEW Partner Desk section requires ALL of: `.toc` anchor, `<section
  class="blk" data-open="0" id="...">` markup (`.blk-h` button first child, `.tog`
  last; `.blk-b` second child), the `ORD` array (or it strands after the
  disclaimer), the `FUN` map (default-open), the `GROUPS` array (rail label), a
  `bentofy()` call, render JS inside the IIFE where `D` is in scope, and — if the
  data is not daily-refreshed — an entry in the honest-freshness override array
  (search `'manual · desk set'`) so the auto "updated today" badge doesn't lie.
- The single-panel router is driven entirely by `.toc a` clicks; hiding uses the
  `.sk-off` class (with `!important`), never bare inline styles (specificity wars).
- `innerHTML` renderers are INTENTIONAL (static templates, no user input). Do not
  "security-fix" them to textContent — that turns nav markup into visible text.
- Storage namespaces: partner `bd_p_*`, team `bd_t_*`, executive `bd_e_*`, index `bl_*`
  (`bl_ink_intro` — see index.html specifics below).
- PIN gate bypass in dev: `sessionStorage.bd_team='1'` for team.html only.
  _(Corrected 2026-08-09: partner.html and cost-desk.html no longer have a PIN
  gate at all — deliberately removed in `6fd00c1` ("Actions become icons, and
  15KB of CSS for markup that is gone", 2026-07-31). Both load fully with no
  bypass needed; `sessionStorage.bd_partner` does nothing now.
  `executive.html`'s only `sessionStorage` use is an unrelated dismissible-tip
  mechanism, not a gate — there never was a `bd_executive` gate to bypass on
  this page despite what this line used to imply.)_

## index.html specifics

_(Corrected 2026-08-09 by the Zero-Touch audit: the foliage-cut feature, the
reading-focus scroll zoom, and the hamburger mobile nav this section used to
describe were all removed in `6fa66ad` ("Rebuild Birdland as a buyer decision
platform", 2026-07-28) and no longer exist anywhere in the repo — grep-verified.
The section below describes what's actually there now.)_

- The hero is `.bl-ink-hero`/`.bl-ink-stage` (3 stages, 4 `[data-ink-reveal]`
  points each): clicking a stage advances `data-ink-index` and toggles
  `.is-near` on one point at a time. A one-shot staggered flash of all three
  `[data-ink-main]` propositions plays once per session
  (`sessionStorage.bl_ink_intro`); after that, on desktop (>900px) they sit at
  `opacity:0` at rest and only light up on hover/click/focus of their stage —
  `birdland-visual.css:984` (base rule) vs `:998` (`.is-near`)/`.is-intro`. This
  is a deliberate `7d87c09` trade-off restoring a cursor-mask interaction, not
  a bug; below 900px `birdland-visual.css:1139` forces them permanently
  visible. The `<h1>` tagline itself is always visible at every width
  (unlike the pre-`5de128e` state this section used to warn about).
- Desktop nav (`.bl-nav`) is a single flex row (brand | links | rule | Terminal
  chip | language picker); there is no hamburger/overlay at any width — mobile
  keeps the same row, horizontally scrollable (`overflow:auto`). Watch
  flex-shrink when touching it, same reason as before: nothing between the
  nav items and them (rebuilt to be) squeezed off-screen.

## Encoding & platform discipline

- Files are UTF-8 **without BOM**, no control chars. Verify after every edit:
  `node -e "const b=require('fs').readFileSync('FILE');console.log(/[\x00-\x08\x0e-\x1f]/.test(b.toString('utf8')),b[0]===0xEF)"` → both must be false.
- **Never rewrite files with PowerShell `Set-Content`/`Out-File`** — it has
  corrupted Chinese text (mojibake + BOM + white pages) before. Use Node/sed or
  a proper editor tool.
- Exact-string replacements can silently fail on CRLF; tolerate `\r?\n` or
  re-read before editing.

## Git & deploy discipline

- **NEVER push unless the boss explicitly says "push" in that turn.** Commit
  locally and wait. One approval does not carry to the next change.
- Always `git pull --rebase` before pushing — the daily CI commits every day and
  will conflict otherwise.
- Push = live deploy (GitHub Pages serves main). Pages build can lag a few
  minutes; check `gh api repos/52-HzCL/Birdland.com.tw/pages/builds/latest`.
- Commit messages: explain the root cause and what was verified, not just the change.

## Verification checklist (every change)

1. Rebuild the four generated pages; confirm untouched templates give zero diff.
2. Encoding check (above) on every touched file.
3. Serve locally (`npx serve . -l 8123`), open each affected page: zero console
   errors is mandatory.
4. Partner/Team: bypass the gate via sessionStorage, click through affected
   sections, check bento grids for blank-gap/overflow, verify up/down colors.
5. Mobile 375px: no horizontal scroll (`document.documentElement.scrollWidth`).
6. Heavy pages can hang screenshot tooling — verify via DOM/computedStyle/
   getAnimations() queries instead of screenshots.

## Removed features — do NOT reintroduce

- "My Orders" PO tracker (boss: not needed)
- Threshold/target-value price alerts (Share tool is manual multi-select only)
- The Google Translate widget, in every shape it took: the header `<select>`,
  the topbar `.language-box`, the AsiaSource rail popover and the "Translate
  this report" control. The script behind them was never loaded, so none of it
  ever translated anything. **This entry replaces the opposite instruction that
  stood here until 2026-08-06** — the site now ships a hand-translated ten-
  language edition (`i18n/`, `tools/dev/i18n-build.js`), and that is the only
  language mechanism. Do not reintroduce a machine-translation widget.
- BirdBot fake iMessage chat
- Any claim that a report is "AI-generated" when it's rule-based — reports are
  composed client-side from tracked data, zero API calls, and must say so honestly.
