# SUMMARY — Birdland.com.tw UX pass

Branch `ux-refine`, 24 commits, not pushed. `main` untouched.
Before/after screenshots: `screenshots/before/` and `screenshots/after/`.

---

## The numbers

Measured the same way both times: Playwright driving real Chrome at 1440×900
and 380×780, reading *computed* styles off every rendered element and CLS/LCP
off `PerformanceObserver`.

| | Before | After |
|---|---|---|
| Distinct font sizes, site-wide | **80** | **22** (≤11 per page) |
| Webfont families | **7** | **3 + 1** (Libre Baskerville, Daily Supply News only) |
| Text colours | **81** | **64** |
| Backgrounds | **61** | **44** |
| Padding values | **40** | **12** |
| Gap values | **30** | **10** |
| Border radii | **13** | **4** |
| Transition durations | 7 on one page, **0** on two | **2**, everywhere |
| Worst CLS | **0.234** (executive) | **0.019** (partner mobile) |
| Pages over the 0.1 CLS target | **4** | **0** |
| Pages with console errors | 2 | 0 (see I-6) |
| 8px body text | 8 of 11 pages | none |

Per-page font sizes: cost-desk 28→8, partner 25→8, executive 23→11,
Guide 19→6, product-101 18→9, index 15→10, about 15→7, team 17→7.

---

## What changed

### The front door said nothing
The homepage `<h1>` — *"Your design. Our discipline. Never our brand."* — was
`clip:rect(0,0,0,0)`: present for screen readers, 1×1px for everyone else. The
three propositions sat at `opacity:0` until a pointer came within 260px, and a
one-shot intro flashed them once and wrote `bl_oem_ink_seen`. **A returning
visitor, and any phone visitor at all, arrived at birdland.com.tw and read a
picture.** Now: a headline, one sentence, two ways forward, and three
propositions that are simply on. `4d2f0e6`

### Desks became the Terminal
Four links in a dropdown became a panel, and the panel is the buyer's route:
`01 WHAT CHANGED → 02 WHAT YOU NEED → 03 WHAT IT COSTS`, with Team Desk off
the path. Each step carries a real number derived exactly as the desks derive
theirs. The trigger has no border and no fill — one 5px dot, which turns amber
and names the edition's age when the daily run has not landed.

Search is real: `terminal.json` is built beside the pages from
`outlook-data.json` and the desk templates — 246 entries, 159 materials, 20
processes, 31 Factory sections. Typing `420J2` lands on the Buyer Desk with
Cutting tools / Upper blade / 420J2 already selected. `f98552d`

### Overview left the desks and became About ▸ Guide
It was never a desk; it is the manual. It now sits beside About Us, and it
shows the pages instead of describing them — real screenshots of the real
destinations, captured from the running site. `2ca8be3` `c002b43`

### About Us is three plates
Five sections became `I Your brand, protected. / II Your product, controlled.
/ III Your supply, continuous.` — figure on one side, argument on the other,
sides alternating, in the engraving language the homepage already speaks.
`3d39968`

### One header, one palette, one scale
Four variable sets with four different jades became one `tokens.css` that the
old names delegate to. The desk banner became the homepage header. Seven
webfont families became four. `42100d4` `f9348f4` `a71d686`

### CLS
Four separate causes, found by measuring which boxes moved rather than by
reading the score: the banner being inserted after paint (0.193 on its own),
the page's own strip being hidden in script, nine sections being reordered at
load, and the webfont swap reflowing wrapped headers. `762f21c` `9d4a3b4`

---

## What was removed

| | Why |
|---|---|
| `renderDecisionVisuals` (6,821 bytes) | Wrote to six ids that no longer existed. Threw on every Overview load. |
| OEM control map stylesheet (4,940 bytes) | 45 rules for markup deleted months ago. |
| PIN gate, rake routes, `.atlas-*`, `.mat-*`, `.dia-*` (15,055 bytes) | Dead since earlier passes. |
| The header's *Open buyer software* button | The Terminal sits two nav items away. |
| Factory's *01 Factory / 02 Buying tools* switch | Same. Also cut from its generator, or it would come back. |
| The desk rail's wordmark and News/Buyer/Cost switch | The shared header carries both now. |
| The Origin panel's duplicate region/market selects | The rail asks once; hidden, not removed, because `#room`/`#region` are what the context system reads. |
| Three reprinted headlines on Daily Supply News | The local desks and the daily desk read one feed; the daily desk now skips what the local desks printed. |

---

## What was tried and reverted

**B-3 — folding the Buyer Desk's cost floor.** It was supposed to shorten the
page. It did not move it by a pixel: the work column is 2,019px, the brief
aside beside it is 1,876px, and the grid stretches both to the taller. All it
bought was a 300px void. Reverted; the finding is corrected in `UX-REVIEW.md`
rather than left standing. `4afd0a5`

**Two Phase 1 findings withdrawn.** The overflow probe counted any box wider
than the viewport, including boxes correctly clipped by a scrolling ancestor,
so H-6 (+7px on index) and F-1 (+30px on Factory) were measurement artefacts.
The honest test is to scroll the page and see whether it moves. `c4324c2`

---

## Decisions taken without asking

The brief said to leave 待確認 items alone; that was later lifted. These were
called here and are reversible:

1. **Daily Supply News keeps Libre Baskerville.** The broadsheet is that page's
   personality and layout alone will not carry it. It loses the duplicate
   roles, so it runs three families like everywhere else.
2. **`font-display: optional`, not `swap`.** This is what took CLS to zero on
   the pages whose headers wrap. The cost: on a slow first visit a reader may
   get the fallback face for that whole load. Reversible in one word.
3. **Terminal, not SaaS.** SaaS implies subscriptions and accounts, and this
   site's promise is *no account, nothing stored*.
4. **The colour snap stops at Δ12.** At Δ20 it started proposing a pale blue as
   a cream. 543 colours were left alone for that reason.
5. **`birdland-intro.html` untouched.** Nothing links to it (see `ISSUES.md`
   I-2). Restyling a page that may be deleted is work spent twice.

---

## Still open

- **`ISSUES.md`** — the Team Desk's client-side PIN, the possibly-orphaned
  intro page, the render-blocking font request, `jsdom` under `dependencies`.
- **The Team Desk** has no shared header. It was excluded from the banner by
  instruction, and the Terminal panel does not appear on it.
- **`build_terminal.py` has never run.** There is no Python on this machine, so
  the CI version of the index build is untested. It is called non-fatally: if
  it fails, the panel falls back to a plain path and the daily news still
  ships. **Watch the first CI run after this merges.**
- **The Guide's screenshots are a manual re-run** (`scratchpad/gen-guide-shots.js`).
  CI has Python, not Playwright. After any redesign they must be recaptured, or
  the Guide shows the old site — the exact failure it exists to prevent.
