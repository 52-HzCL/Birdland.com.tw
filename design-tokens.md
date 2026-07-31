# design-tokens.md — Birdland.com.tw

Two halves: **what is there now** (measured from computed styles in real
Chrome, not read off the stylesheets) and **what to standardise on**. Phase 2
implements the second half; nothing here has been applied yet.

Source data: `scratchpad/ux-data.json`, 11 pages × 2 viewports.

---

## 1 · What is there now

| Axis | Distinct values in use | Target |
|---|---|---|
| Font size | **80** | 7 steps |
| Font family | **17** (7 webfonts) | 3 |
| Text colour | **81** | 9 |
| Background | **61** | 6 |
| Border radius | **13** | 3 |
| Gap | **30** | 6 |
| Padding | **40** | 6 |
| Transition duration | 7 on `index`, **0** on `news`/`executive` | 2 |

Worst pages: `cost-desk` 28 font sizes, `partner` 25 sizes / 26 colours / 26
backgrounds / 10 radii.

### Where the sprawl comes from

Two different causes, needing two different fixes:

**a) Hand-picked half-pixel values.** 8 / 8.5 / 9 / 9.5 / 10 / 10.5 / 11 / 11.5
/ 12 / 12.5 / 13 / 13.5 / 14 / 15px all ship. Half a pixel is not a hierarchy —
it is noise that costs a reader nothing but costs every future edit a decision.

**b) `em` compounding.** Nobody chose 11.776px. `team.html` renders 11.04,
11.776, 12.144, 12.88, 13.248, 13.984, 14.352, 14.72, 15.456, 16.928, 17.48,
19.32, 20.24px — all of it fallout from nested `em` sizing. `cost-desk.html`
does the same (12.2 / 13.2 / 13.6 / 14.4 / 14.8 / 15.6 / 16.6 / 16.8 / 17.6 /
18.8 / 19.2 / 22.4 / 22.8 / 26.4px). **Fixing (a) without fixing (b) leaves
most of the problem in place** — the scale must be applied in `rem`/`px`, not
`em`, or the ladder regenerates itself.

### Type systems currently coexisting

| Pages | Sans | Serif | Mono |
|---|---|---|---|
| index, about, contact, product-101, news, partner | Manrope | Playfair Display | DM Mono |
| executive | Source Sans 3 | Libre Baskerville | IBM Plex Mono |
| team | Inter | — | IBM Plex Mono |
| birdland-intro | Archivo / Archivo Black | Times New Roman | — |
| privacy | Arial | — | — |

`partner.html` and `cost-desk.html` each request **two** Google Fonts
stylesheets, six families total. The first (Inter · IBM Plex Mono · Source Serif
4) is a leftover skin; on `cost-desk` its Source Serif 4 still wins on 12
elements.

---

## 2 · Proposed tokens

### 2.1 Spacing — 4 / 8 / 16 / 24 / 32 / 48

```css
--sp-1:  4px;   /* inside a control: icon↔label, chip padding      */
--sp-2:  8px;   /* between elements in one component               */
--sp-3: 16px;   /* between components inside a block               */
--sp-4: 24px;   /* block padding                                   */
--sp-5: 32px;   /* between blocks                                  */
--sp-6: 48px;   /* between page sections                           */
```

The rhythm the brief asks for — **section > block > component > element** —
means `--sp-6 > --sp-4 > --sp-3 > --sp-2`. Today the three most-used paddings
are 8, 9 and 13px, and 9px is used more than 16px, so there is no rhythm to
speak of.

Migration: 4→`--sp-1`; 7,8,9→`--sp-2`; 10..14→`--sp-3` where it is
component-level and `--sp-2` where it is element-level; 16,18,20→`--sp-3`;
22..26→`--sp-4`; 28..38→`--sp-5`; 40+→`--sp-6`.

### 2.2 Type scale — 7 steps, four visible levels

The brief allows at most four levels of hierarchy. Seven tokens, because
"caption" and "micro-label" are the same level in different roles, and display
type is not part of the reading hierarchy.

```css
--fs-display: 48px;  /* one per page, at most                       */
--fs-h1:      32px;
--fs-h2:      22px;
--fs-h3:      16px;
--fs-body:    15px;  /* already the most-used size on the site      */
--fs-small:   13px;  /* captions, table cells, secondary            */
--fs-micro:   11px;  /* eyebrow labels, uppercase tags — FLOOR      */
```

**11px is a hard floor.** 8px text ships on 8 of 11 pages today; 8/8.5/9/9.5/10
all go. The buyer's first language is usually not English, and 8px is the
single most expensive legibility decision on the site.

15px as body is not a guess — it is already the most-used size site-wide by an
order of magnitude (1,921 uses; the next is 10px at 348).

Line heights: `--lh-tight: 1.15` (display/h1), `--lh-head: 1.3` (h2/h3),
`--lh-body: 1.55`, `--lh-dense: 1.4` (tables).

Display sizes of 89px (about, contact) and 96px (executive) collapse into
`--fs-display`; **待確認** whether the newspaper masthead on `executive.html`
is exempt as brand furniture.

### 2.3 Families — three

```css
--ff-sans:  "Manrope", system-ui, -apple-system, sans-serif;
--ff-serif: "Playfair Display", Georgia, "Times New Roman", serif;
--ff-mono:  "DM Mono", "IBM Plex Mono", ui-monospace, monospace;
```

Chosen because they already carry the site: Manrope 2,788 uses, DM Mono 623,
Playfair 188. Inter (85, team gate only), Source Sans 3 + Libre Baskerville
(404, executive only) and Source Serif 4 (12, stale) are the outliers.

Drops **one whole Google Fonts request** from both desks.

**待確認 — the one real judgement call in this file:** Daily Supply News is
deliberately a broadsheet, and Libre Baskerville is what makes it read as a
newspaper. Two options, and this is the user's call, not mine:
1. **Unify** — one type system, the paper look carried by layout and rules
   instead of a second serif. Cheapest, most consistent.
2. **Exempt** — Daily Supply News keeps Libre Baskerville as a declared
   sub-brand; every other rule still applies to it.

### 2.4 Colour — 9 text, 6 surface, 3 functional

Today six near-identical jade greens do one job:
`#073c33` `#073f35` `#063b32` `#063d34` `#17362f` `#153a32`. Two coppers do
another: `#b96032` `#a64f2a`. Four greys share the "muted" role: `#66736e`
`#5f665f` `#6b6e65` `#6b736d`.

```css
/* brand */
--jade-900: #073C33;  /* primary; 276 background uses, the most on the site */
--jade-700: #0E6652;  /* accent green, links and active states              */
--jade-100: #E7EDEA;  /* jade tint surface                                  */
--copper-600:#B96032; /* the one accent; 174 background uses                */
--copper-800:#A64F2A; /* copper hover/pressed                               */

/* ink */
--ink-900:  #17362F;  /* body text; already the most-used text colour       */
--ink-700:  #42675D;  /* secondary text                                     */
--ink-500:  #66736E;  /* muted, captions                                    */
--ink-300:  #9AA1A9;  /* disabled, hairline text                            */

/* surface */
--paper:    #FBF9F3;  /* page                                               */
--paper-2:  #F3EFE5;  /* recessed band                                      */
--card:     #FFFDF8;  /* raised card                                        */
--white:    #FFFFFF;
--line:     rgba(7,60,51,.18);
--line-soft:rgba(7,60,51,.08);

/* functional — cost movement only */
--up:       #A83C2E;  /* cost rising: bad for the buyer                     */
--down:     #0E6652;  /* cost falling                                       */
--flat:     #8D8171;
```

Everything outside this list goes. Named casualties, all of which are visibly
off-system today: `#3B82F6` (team gate blue), `#123752` and `#f2f7fc` (a stray
navy/ice pair), `#f8f9fa` / `#f9fafb` / `#bbbbbb` (cool greys from the old SaaS
skin), `#EF4444` (a second red next to `--up`).

Contrast: `--ink-500` on `--paper` is the lightest combination that stays above
4.5:1; nothing lighter is allowed for running text.

### 2.5 Radius — three

```css
--r-sm: 6px;    /* inputs, chips, small controls   */
--r-md: 10px;   /* cards, panels                   */
--r-pill: 999px;/* pills and round buttons         */
```

50% stays for genuine circles (step markers, LEDs) — that is a shape, not a
radius token. 2/3/4/7/8/11/12/14/20px all collapse into the three above.

### 2.6 Motion — two durations

```css
--dur-fast: 150ms;  /* hover, focus, colour and border changes */
--dur-slow: 200ms;  /* open/close, reveal, position changes    */
--ease: cubic-bezier(.22,.8,.28,1);   /* already the house curve */

@media (prefers-reduced-motion: reduce) {
  --dur-fast: 0ms; --dur-slow: 0ms;
}
```

`news.html` and `executive.html` declare **no** transitions at all today —
every state change on those two pages is instant while the rest of the site
eases. Adding the tokens there is as much of the fix as removing the odd ones
elsewhere.

### 2.7 Numbers in tables

Required by the brief and currently unenforced:

```css
.num { font-variant-numeric: tabular-nums; font-family: var(--ff-mono);
       text-align: right; }
```

Thousands separators are a formatting change in the render layer, not a data
change — the underlying values are untouched.

---

## 3 · How Phase 2 applies this

1. One `tokens.css`, loaded first on every page, defining the variables above.
2. Page stylesheets replace literal values with `var(--…)` — mechanical, one
   page per commit, so any single page can be reverted alone.
3. `em`-based sizing on `team.html` and `cost-desk.html` converts to `rem`, or
   the fractional ladder regenerates.
4. A guard script re-runs the census after each commit and fails if a page
   introduces a value outside the token set. Same principle as the inline-script
   parser already guarding the build: measure, do not assume.

One caveat to set expectations: `desk-banner.css` deliberately uses literal
colours because the four desk pages run three different palettes, and a banner
built on inherited variables would look different on each. Once the palette is
actually unified that reason expires — but it expires *after* step 2, not
before, so the banner is converted last.
