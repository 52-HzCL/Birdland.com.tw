# Birdland.com.tw — Agent Instructions

Confidential OEM/ODM garden-tool manufacturer site (since 1974). Static site on
GitHub Pages, custom domain birdland.com.tw, serving `main` directly — **push = deploy**.

## Pages & build system (the #1 rule)

- `index.html` — hand-authored public landing page. Edit directly.
- `news.html`, `partner.html`, `team.html` — **BUILT ARTIFACTS. NEVER hand-edit.**
  They are generated from `tools/news_template.html`, `tools/partner_template.html`,
  `tools/team_template.html` by substituting the literal token `__DATA__` with the
  full contents of `outlook-data.json` (see `tools/build_news.py`).
- Rebuild after any template change (Node version, works everywhere):
  ```
  node -e "const fs=require('fs');const d=fs.readFileSync('outlook-data.json','utf8');for(const [t,o] of [['tools/news_template.html','news.html'],['tools/partner_template.html','partner.html'],['tools/team_template.html','team.html']])fs.writeFileSync(o,fs.readFileSync(t,'utf8').split('__DATA__').join(d));"
  ```
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

- In page scripts: `D` = whole JSON, `P` = `D.partner`.
- **`D.partner.*` subtrees are STATIC desk-set data** (the AI is forbidden from
  touching them, except `partner.birdbot`). **Top-level blocks are daily-refreshed**:
  `indices, macro, forward, shipping, war, procurement, material, market_news,
  news (company-owned, AI never touches), timeline (desk-set), landed, tariff_calc`.
  Always prefer the top-level daily block; use `P.*` only as fallback, and label
  static data honestly (see freshness badges below).
- Known trap: `P.shipping` is a desk-set forecast CURVE whose levels can sit far
  below real spot rates; live lane rates live in `D.shipping` (no points[] series —
  it can never be fed to `lineChart`, it would throw).
- Known pipeline bug: the last spark-array point is often duplicated, so naive
  `chg` reads 0.0%. Use the existing "walk back past duplicate tail" pattern
  (search `realChg` / `rc(` in partner template) when deriving % change.

## Front-end conventions (Partner/Team desks)

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
- Storage namespaces: partner `bd_p_*`, team `bd_t_*`, index `bl_*`
  (`bl_intro_seen`, `bl_fol_cut`). PIN gates bypass in dev:
  `sessionStorage.bd_partner='1'` / `sessionStorage.bd_team='1'`.

## index.html specifics

- Foliage-cut feature: keywords hidden behind SVG foliage (`.fol` component),
  persisted in `bl_fol_cut`. `.fol-cut` is a real `<button>`; text stays in the
  a11y tree; `preserveAspectRatio='none'` is set in JS so the SVG stretch-fills.
- Reading-focus scroll zoom: text scale peak is capped at 1.1 with center origin.
  Anything larger overflows the container and `body{overflow-x:hidden}` visibly
  slices letters off. Do not raise it.
- Desktop nav (≥981px) is a single row (brand | links | rule | SaaS Terminal |
  EN); mobile keeps the hamburger overlay. Watch flex-shrink when touching it.

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

1. Rebuild the three pages; confirm untouched templates give zero diff.
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
- Hand-translated 6-language dictionary (Google Translate widget only)
- BirdBot fake iMessage chat
- Any claim that a report is "AI-generated" when it's rule-based — reports are
  composed client-side from tracked data, zero API calls, and must say so honestly.
