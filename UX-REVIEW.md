# UX-REVIEW — Birdland.com.tw

Phase 1 audit. Branch `ux-refine`. Nothing has been changed yet.

Every number here was measured, not estimated: Playwright drove real Chrome at
1440×900 and 380×780 on all eleven pages, recorded CLS/LCP from
`PerformanceObserver`, and walked every rendered element for its *computed*
font-size, colour, padding and transition. Raw data: `ux-capture.js` output.
Screenshots: `screenshots/before/`.

---

## What this website is for

Birdland Ind. is a Taiwanese garden and field tool OEM, founded 1974, that has
never sold its own brand. The site exists to do one thing:

> **Get a qualified overseas buyer to send an OEM enquiry to the right regional
> desk — having already satisfied themselves that (a) Birdland will not compete
> with their brand, (b) Birdland can actually make their product, and (c) the
> landed cost works, using their own numbers.**

There is no cart, no account, no form submission, no lead capture. The single
conversion is *a considered email from a buyer who has done their homework on
this site*. That is the yardstick used below: **anything that does not move a
buyer toward that email, or does not help them decide, is a candidate for
removal.**

Two consequences worth stating, because they change what counts as a defect:

- **The buyer's first language is usually not English.** 8px type, dense
  broadsheet columns and unlabelled icons cost more here than they would on an
  English-domestic site.
- **The tools are the proof.** A buyer who works out their own landed cost has
  effectively qualified themselves. So the desks are not a nice-to-have side
  feature — they are the argument.

---

## Page inventory and priority

| Pri | Page | Role | Why this priority |
|---|---|---|---|
| **P0** | `index.html` | Front door | Everyone arrives here. Currently **155 words and no visible headline** (see H-1). |
| **P0** | `news.html` — Overview | Orientation map | The router for the whole site. Two full navigation bars stacked, CLS 0.151 mobile, live JS error. |
| **P0** | `partner.html` — Buyer Desk | Where the brief is built | The conversion tool. 25 distinct font sizes, 26 text colours, 26 backgrounds. |
| **P0** | `contact.html` | The conversion | Last step before the email. |
| **P1** | `cost-desk.html` | Cost tools | Same template as Buyer Desk; 28 font sizes — the worst on the site. |
| **P1** | `executive.html` — Daily Supply News | Return-visit hook | **CLS 0.234, worst on the site.** Its own separate type system. |
| **P1** | `about.html` | The pure-play argument | Answers "will you compete with me?" — the first objection. |
| **P1** | `product-101.html` — Factory | Capability proof | 5,800 words, CLS 0.178 mobile, +30px horizontal overflow. |
| **P2** | `team.html` — Team Desk | Internal | PIN-gated; a fourth design language behind the gate. |
| **P2** | `privacy.html` | Legal | Unstyled — Arial, 3 sizes, no shell. |
| **P2** | `birdland-intro.html` | Standalone intro | LCP 2,380ms; a fifth type system. Unclear whether still linked. |
| — | `manufacturing.html`, `why-birdland.html` | Redirect stubs | Meta-refresh only. No work needed. |

---

## Measured baseline

| Page | CLS desktop | CLS mobile | LCP desktop | Elements | Words | Overflow |
|---|---|---|---|---|---|---|
| index | 0.001 | 0.000 | 232ms | 121 | 155 | **+7px desktop** |
| about | 0.002 | 0.002 | 200ms | 172 | 358 | — |
| product-101 | 0.021 | **0.178** | 236ms | 3,652 | 5,800 | **+30px mobile** |
| news | 0.034 | **0.151** | 176ms | 249 | 435 | — |
| executive | **0.234** | 0.067 | 328ms | 647 | 1,624 | — |
| partner | 0.067 | 0.079 | 572ms | 1,763 | 1,155 | — |
| cost-desk | 0.047 | 0.057 | 444ms | 907 | 738 | — |
| team | **0.118** | 0.017 | 224ms | 1,227 | 156 | — |
| contact | 0.003 | 0.037 | 168ms | 125 | 173 | — |
| privacy | 0.000 | 0.000 | 40ms | 16 | 195 | — |
| birdland-intro | 0.000 | 0.000 | **2,380ms** | 17 | 7 | — |

**CLS > 0.1 → P0 per the brief:** `executive` (desktop 0.234), `product-101`
(mobile 0.178), `news` (mobile 0.151), `team` (desktop 0.118).

LCP is comfortable everywhere except `birdland-intro`. Note this is a localhost
run with a warm cache — LCP will be worse in the field, particularly on the two
desks, which each fetch **two blocking Google Fonts requests covering six
families** (see T-1).

---

## Site-wide findings

### T-1 · Four separate type systems — P0

| Page group | Families actually rendering |
|---|---|
| index, about, contact, product-101, news, partner | Manrope + Playfair Display + DM Mono |
| **executive** | Source Sans 3 + Libre Baskerville + IBM Plex Mono |
| **team** | Inter + IBM Plex Mono |
| **birdland-intro** | Times New Roman + Archivo Black |
| **privacy** | Arial |

Seven webfont families site-wide. `partner.html` and `cost-desk.html` each load
**two** Google Fonts stylesheets — the first (Inter / IBM Plex Mono / Source
Serif 4) is a leftover from an earlier skin, the second (DM Mono / Manrope /
Playfair Display) is the current one. On `cost-desk` the old one still wins for
12 elements (Source Serif 4).

**Fix:** one family trio for the whole site; delete the stale font request.
**待確認:** whether Daily Supply News keeps Libre Baskerville deliberately —
the broadsheet look may be intentional brand voice rather than drift.

### T-2 · 80 distinct font sizes — P0

Target per the brief is four levels. Actual, per page: cost-desk **28**,
partner **25**, executive **23**, news **19**, product-101 **18**.

Two distinct causes, and they need different fixes:

- **Hand-picked values.** 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13,
  13.5, 14, 15 — a half-pixel ladder that no reader can perceive as hierarchy.
- **`em` compounding.** `team.html` renders 11.04, 11.776, 12.144, 12.88,
  13.248, 13.984, 14.352, 14.72, 15.456, 16.928, 17.48, 19.32, 20.24px. Not one
  of those was chosen by anyone. `cost-desk` has the same problem
  (12.2/13.2/13.6/14.4/14.8/15.6/16.6/16.8/17.6/18.8/19.2/22.4/22.8/26.4).

**8px body text appears on 8 of the 11 pages.** For a non-native-English B2B
reader this is the single most expensive legibility decision on the site.

### T-3 · 81 text colours, 61 backgrounds — P0

Six near-identical jade greens are in use where one belongs:
`rgb(7,60,51)` · `rgb(7,63,53)` · `rgb(6,59,50)` · `rgb(6,61,52)` ·
`rgb(23,54,47)` · `rgb(21,58,50)`. Likewise two coppers, `rgb(185,96,50)` and
`rgb(166,79,42)`, and four greys for the same "muted" role.

`partner.html` alone paints **26 different backgrounds**.

### T-4 · Transition durations are unmanaged — P1

Where transitions exist at all they run at 7 different durations on `index`
alone. `news.html` and `executive.html` declare **none** — every state change
there is instant while the rest of the site eases. The brief asks for one
150–200ms standard.

### T-5 · Spacing has no scale — P1

40 distinct padding values, 30 gap values, 13 border radii. The most-used
paddings are 8/9/13/10/4/11px — i.e. the 4/8/16/24 rhythm the brief asks for
does not exist; 9px and 13px are more common than 16px.

---

## Per-page findings

### index.html — Front door · P0

- **H-1 · The only headline is invisible.** The `<h1>` — *"Your design. Our
  discipline. Never our brand."* — is `position:absolute; clip:rect(0,0,0,0)`,
  rendered at 1×1px. It exists for screen readers only. **A sighted buyer
  landing on birdland.com.tw sees no headline at all.** For the front door of
  the business this is the most serious single finding in this audit.
  *Type: 閱讀動線 / 資訊冗餘(反向).*
- **H-2 · The three value propositions are on a timer.** "MAKE IT RIGHT" /
  "KEEP SUPPLY MOVING" / "KEEP IT YOURS" cross-fade. Sampled mid-run their
  opacities were 0.00 / 0.60 / 0.05 — at that instant **not one of the three
  was legible**. A buyer who looks for three seconds may read one of them, and
  cannot choose which.
- **H-3 · 155 words on the whole page**, one screen tall (1001px doc / 900px
  viewport — a 101px overhang that scrolls to nothing).
- **H-4 · No visible call to action** other than "OPEN BUYER SOFTWARE" in the
  top bar. On mobile that button collapses to **an empty green pill with a dot**
  — its label is gone. Contact appears only in the footer.
- **H-5 · Mobile crops the artwork to the middle panel**, so two of the three
  stages are not merely faded but absent.
- **H-6 · ~~+7px horizontal overflow~~ — WITHDRAWN.** The probe counted any box
  wider than the viewport, including ones clipped by a scrolling ancestor. The
  page never scrolled sideways. Corrected probe: try to scroll and see if it
  moves.
- **待確認:** an intermittent 404 was logged on one of two runs and did not
  reproduce. Not actioned until identified.

### news.html — Overview · P0

- **N-1 · A live JavaScript error on every load.** `renderDecisionVisuals` at
  `news.html:343` sets `.innerHTML` on `null` — it targets `#cost-waterfall`,
  `#cost-summary`, `#cost-updated`, `#risk-actions`, all of which were removed
  with the old hero. The throw kills the rest of that script. *Dead code with a
  visible symptom; Phase 3 removes it, but it is P0 because it is an error on
  the site's routing page.*
- **N-2 · Two complete navigation bars, stacked.** The desk banner (BIRDLAND
  OVERVIEW · HQ status · Taipei time · Taiwan holiday · Language · NEWS/BUYER/
  COST) sits directly above a second site header (BIRDLAND IND. DATA DESK ·
  Data Desk · SaaS Terminal · Contact · **HQ status · Taipei time · Language
  again**). HQ status, the clock and the language picker are each rendered
  twice, ~60px apart. Then a breadcrumb makes a third row.
  *`desk-banner.js` hides `.topbar`, `header.top` and `.terminal-strip`; this
  page's header matches none of those selectors.*
- **N-3 · CLS 0.151 on mobile** — P0 per the brief.
- **N-4 · A wide empty column.** Both section headlines occupy the left half;
  the right half holds one small paragraph and then nothing. At 1440 that is
  roughly a third of the fold carrying 30 words.

### executive.html — Daily Supply News · P1 (CLS makes it P0-by-rule)

- **E-1 · CLS 0.234 desktop — the worst on the site.** Four content blocks
  render from JSON after paint with no reserved height.
- **E-2 · Four bands before the story starts:** desk banner → EDITION INDEX nav
  → "DAILY SUPPLY READ · BIRDLAND TAIWAN" strip → date/source line.
- **E-3 · The same news appears three times.** "Local News: Taiwan and China",
  "Local English media source desk" and "Asia production, export and freight"
  are three presentations of one feed.
- **E-4 · Its own type system** (T-1) and its own reading size. The large-print
  toggle exists precisely because the default is too small — which is the
  argument for raising the default.
- **待確認:** the broadsheet pastiche is a deliberate brand choice. Recommend
  raising the *base size* and reserving block heights **without** touching the
  newspaper look.

### partner.html — Buyer Desk · P0

- **B-1 · 25 font sizes, 26 text colours, 26 backgrounds, 1,763 elements.** The
  worst concentration of T-2/T-3 on the site.
- **B-2 · 10 border radii on one page** (50%, 999px, 8, 10, 2, 14, 6, 12, 11,
  7px) — three "rounded card" treatments coexisting.
- **B-3 · ~~First screen carries everything at once~~ — TRIED AND REVERTED.**
  The finding was written from reading the page, not from measuring it. The
  work column is 2,019px and the brief aside beside it is 1,876px, and the
  grid stretches both to the taller — so folding the 589px cost floor did not
  shorten the page by a pixel. It only opened a 300px void beside the aside.
  Deferring anything inside the work column cannot help while the aside sets
  the height; the real question, if this is ever worth revisiting, is whether
  the brief belongs in a column at all.
- **B-4 · LCP 572ms — slowest of the real pages**, driven by the six-family
  double font request (T-1).

### cost-desk.html — Cost tools · P1

- **C-1 · 28 font sizes, almost all fractional** (T-2). Same template as the
  Buyer Desk, different rendered scale.
- **C-2 · The buying context is asked twice on one screen.** The left rail's
  "Buying context" (commercial region / focus market / product line) and the
  panel's own "COMMERCIAL REGION / FOCUS MARKET" selects are the same two
  controls, visible simultaneously.
- **C-3 · Stale Source Serif 4** still winning on 12 elements from the old font
  request.

### about.html · P1

- CLS and overflow are clean. 358 words, 15 font sizes, 89px display type
  against 8px captions — an 11:1 range with nothing in between.

### product-101.html — Factory · P1

- **F-1 · ~~+30px horizontal overflow on mobile~~ — WITHDRAWN.** Same faulty
  probe as H-6. `.p101-table` is 620px wide inside a `.p101-scroll` box that is
  348px wide with `overflow-x:auto`, which is correct: the table scrolls, the
  page does not.
- **F-2 · CLS 0.178 mobile.**
- **F-3 · 5,800 words, 3,652 elements** — by far the heaviest page, with no
  in-page navigation captured in the audit. **待確認** whether it should be
  split or given a sticky section index.

### contact.html · P0

- Clean on the metrics (CLS 0.003, no overflow). 173 words, 12 font sizes.
- **X-1 · 68px and 89px display type** on a page whose job is one routed email;
  the same 11:1 range as About, and the largest type on the page is not the
  action.

### team.html — Team Desk · P2

- **M-1 · A fourth design language.** The PIN gate is a blue `#3B82F6` SaaS
  card on cool grey, in Inter, with mixed Chinese/English — sharing nothing with
  the jade/copper/cream serif system of the other ten pages.
- **M-2 · CLS 0.118 desktop** despite showing only a gate.
- **M-3 · `em` compounding gives 17 fractional sizes** (T-2).
- **待確認:** the gate is client-side only, so the 1,227 elements behind it are
  in the HTML either way. Logged in `ISSUES.md`; not a UI question.

### privacy.html · P2

- **P-1 · Unstyled.** Arial, three font sizes, no site shell, no navigation
  back. It reads as a different website.

### birdland-intro.html · P2

- **I-1 · LCP 2,380ms** — 10× the next slowest page, for 7 words.
- **I-2 · A fifth type system** (Times New Roman + Archivo Black).
- **待確認:** nothing in the eleven audited pages links to it. If it is dead,
  it is a Phase 3 deletion, not a Phase 2 restyle.

---

## Proposed Phase 2 order

Grouped so that each commit is independently revertible, hardest-hitting first.

1. **P0 · `[UX] index — visible headline, static value props, real CTA`** (H-1…H-6)
2. **P0 · `[UX] news — one banner, not two`** (N-2, N-4)
3. **P0 · `[CLEAN] news — remove the dead hero renderer`** (N-1) *(Phase 3 work, pulled forward: it is a live error)*
4. **P0 · `[UX] tokens — one type scale, one palette, one spacing rhythm`** (T-1…T-5) — the shared file every later commit depends on
5. **P0 · `[UX] partner — apply tokens, defer the second screen`** (B-1…B-4)
6. **P1 · `[UX] cost-desk — apply tokens, drop the duplicate context`** (C-1…C-3)
7. **P1 · `[UX] executive — reserve block heights, raise base size`** (E-1, E-4)
8. **P1 · `[UX] product-101 — table scroll containers, mobile overflow`** (F-1, F-2)
9. **P1 · `[UX] about + contact — tighten the type range`**
10. **P2 · `[UX] privacy — put it back in the site shell`** (P-1)
11. **P2 · `[UX] team — gate adopts the site palette`** (M-1)

Items marked **待確認** are excluded from all of the above and wait for a
decision.

---

## What I am not touching

Per the brief: no data pipeline, no `outlook-data.json` consumers, no build
script behaviour, no new features, no package upgrades. Non-UI defects found
during the audit are recorded in `ISSUES.md` and left alone.
