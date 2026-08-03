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

## Tooling (in the repo, `tools/dev/` — see its README)

| Script | What it does |
|---|---|
| `serve.js` | static server on :8123 — must be running for anything below |
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
   `product-101.html` comes from `tools/dev/build-p101.js`, with its data and
   blueprint sprites beside it.
3. Files are **CRLF**. Multi-line anchors need `\r\n` or they silently miss.
4. `String.replace` with no match returns the string unchanged and reports
   nothing. Every edit script here asserts its match count and exits non-zero.
5. Never cut CSS or JS with a regex. Two silent breakages came from exactly
   that. Use `cssprune.js` (braces) and re-run `syntax-check.js` after.
6. After any template edit: `build.js` → `syntax-check.js` → `verify-desks.js`.
7. No BOM, no control characters. Check with a byte read, not by eye.

## Done

All four phases are complete. See `SUMMARY.md` for what changed and what was
measured; `ISSUES.md` for what is open.

- [x] Phase 1 — audit, token census, before screenshots, CLS/LCP baseline
- [x] Phase 2 — index, Overview→Guide, Terminal, tokens, type, colour, spacing,
      motion, CLS, About Us, privacy, news de-duplication
- [x] Phase 3 — dead CSS in five sweeps, plus the control-map stylesheet
- [x] Phase 4 — after screenshots, full re-measure, `SUMMARY.md`

Not done, and why:

- **Team Desk** has no shared header and no Terminal trigger. It was excluded
  from the banner by instruction; revisit only if that instruction changes.
- **B-3** was attempted and reverted — the brief aside sets the page height, so
  deferring anything in the work column cannot shorten it (`4afd0a5`).
- **`birdland-intro.html`** left alone: orphaned and referencing images that do
  not exist (ISSUES I-2). Deleting a page is the owner's call.
## Corrections to Phase 1

Two findings were withdrawn after the probe was fixed. The overflow check
counted any box wider than the viewport, including boxes correctly clipped by
a scrolling ancestor — so H-6 (+7px on index) and F-1 (+30px on Factory) were
measurement artefacts, not defects. The honest test is to scroll the page and
see whether it moves; `shot.js` does that now.

## Next

Phase 2, in the order listed at the end of `UX-REVIEW.md`. One commit per item,
`[UX] page — what changed`. Phase 3 (`[CLEAN] …`) stays in separate commits.
