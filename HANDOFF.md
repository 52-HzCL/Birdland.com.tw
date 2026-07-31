# HANDOFF.md

Read this first, then `UX-REVIEW.md`, then confirm the branch is `ux-refine`.

## State

- **Phase:** 1 complete. Phase 2 in progress.
- **Branch:** `ux-refine`. `main` is not touched. Nothing is pushed.
- **Approval gate:** the brief asked me to stop after Phase 1. The user then
  said they would leave the machine running unattended and to finish the work
  ("我不差時間你慢慢做完"), so Phase 2 proceeds without waiting — **with every
  item marked 待確認 in `UX-REVIEW.md` and `design-tokens.md` left untouched.**
  That list is what the approval gate was protecting.

## Tooling (all outside the repo, in `scratchpad/`)

| Script | What it does |
|---|---|
| `bl-server.js` | static server on :8123 — must be running for anything below |
| `build.js` | Node replica of `tools/build_news.py`; rebuilds all five generated pages |
| `syntax-check.js` | parses every inline `<script>`; the guard against silent half-cut code |
| `verify-desks.js` | boots both desks in jsdom and asserts behaviour |
| `ux-capture.js` | Playwright: screenshots + CLS/LCP + computed-style census → `ux-data.json` |
| `ux-summarise.js` | turns `ux-data.json` into the tables in `UX-REVIEW.md` |
| `cssprune.js` / `prune-apply.js` | brace-matching CSS cutter — **never cut CSS with a regex in this repo** |

Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
Node: `C:\Program Files\nodejs\node.exe`.

## Rules that bite in this repo

1. `news.html`, `partner.html`, `cost-desk.html`, `team.html`, `executive.html`
   are **built artifacts**. Edit `tools/*_template.html` and run `build.js`.
   `partner_template.html` builds twice via `__DESKMODE__` (buyer / cost).
2. `index.html`, `about.html`, `contact.html`, `privacy.html` are hand-authored.
   `product-101.html` comes from `scratchpad/build-p101.js`.
3. Files are **CRLF**. Multi-line anchors need `\r\n` or they silently miss.
4. `String.replace` with no match returns the string unchanged and reports
   nothing. Every edit script here asserts its match count and exits non-zero.
5. Never cut CSS or JS with a regex. Two silent breakages came from exactly
   that. Use `cssprune.js` (braces) and re-run `syntax-check.js` after.
6. After any template edit: `build.js` → `syntax-check.js` → `verify-desks.js`.
7. No BOM, no control characters. Check with a byte read, not by eye.

## Done

### Phase 1
- [x] page inventory, core purpose, P0/P1/P2
- [x] `screenshots/before/` — 11 pages x 2 viewports (Playwright)
- [x] `design-tokens.md` — measured census + proposed tokens
- [x] CLS/LCP per page per viewport
- [x] `UX-REVIEW.md`, `ISSUES.md`

### Phase 2
- [x] index — visible headline, static propositions, two CTAs, mobile stack (H-1..H-6)
- [x] site — one favicon, replacing a 404 and two stray marks
- [x] news — dead decision-visuals script removed (N-1)
- [x] news — one HQ light / clock / language picker, section-intro measure (N-2, N-4)
- [x] site — `tokens.css`; four palettes now delegate to it (T-3, M-1)
- [x] site — seven webfont families to four; 92 literal stacks tokenised (T-1)
- [x] type scale on the hand-authored pages and shared chrome (T-2)
- [x] daily supply news — CLS 0.234 -> 0.048; banner stops shifting the page (E-1)
- [x] site — CLS under 0.1 on every page, both viewports; font-display optional
- [x] desks — 28/25/17 font sizes down to 7 each (T-2)
- [x] corrected my own favicon regex damage (stray `">` on three pages)

### Still to do in Phase 2
- [ ] T-4 motion: one 150/200ms pair; news and executive declare none today
- [ ] T-5 spacing: 40 paddings / 30 gaps onto the 4/8/16/24/32/48 scale
- [ ] B-2 radii: 13 down to 3
- [ ] B-3 buyer desk first screen — everything is on it at once
- [ ] C-2 cost desk asks for the buying context twice on one screen
- [ ] E-3 daily supply news shows the same feed three ways
- [ ] P-1 privacy.html has no site shell

### Phase 3 (not started)
- [ ] dead CSS left by removed features: `.os-hero`, `.control-map`,
      `.ownership-note`, `.route-step`, `.dossier*`, `[data-mode]`
- [ ] console.log / commented-out blocks sweep

### Phase 4 (not started)
- [ ] `screenshots/after/`, full re-measure, `SUMMARY.md`

## Corrections to Phase 1

Two findings were withdrawn after the probe was fixed. The overflow check
counted any box wider than the viewport, including boxes correctly clipped by
a scrolling ancestor — so H-6 (+7px on index) and F-1 (+30px on Factory) were
measurement artefacts, not defects. The honest test is to scroll the page and
see whether it moves; `shot.js` does that now.

## Next

Phase 2, in the order listed at the end of `UX-REVIEW.md`. One commit per item,
`[UX] page — what changed`. Phase 3 (`[CLEAN] …`) stays in separate commits.
