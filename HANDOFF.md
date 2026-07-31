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

- [x] Phase 1 · page inventory, core purpose, P0/P1/P2
- [x] Phase 1 · `screenshots/before/` — 11 pages × 2 viewports (Playwright)
- [x] Phase 1 · `design-tokens.md` — measured census + proposed tokens
- [x] Phase 1 · CLS/LCP per page per viewport
- [x] Phase 1 · `UX-REVIEW.md`, `ISSUES.md`

## Next

Phase 2, in the order listed at the end of `UX-REVIEW.md`. One commit per item,
`[UX] page — what changed`. Phase 3 (`[CLEAN] …`) stays in separate commits.
