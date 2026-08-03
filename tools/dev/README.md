# tools/dev

The tooling this site is actually maintained with. It lived outside the repo
in a temp directory until 2026-08-03, which meant a fresh clone could not
rebuild `product-101.html`, could not run the pre-ship gates, and could not
reproduce any of the measurements in `SUMMARY.md`.

Nothing here ships. CI does not run any of it — CI is Python
(`tools/build_news.py`) and never installs node dependencies.

```bash
npm install          # devDependencies: jsdom, playwright-core, sharp
node tools/dev/serve.js &
```

Playwright drives your **system Chrome** rather than downloading a browser.
`tools/dev/_env.js` finds it per platform; set `CHROME_PATH` if yours is
somewhere unusual. Screenshots go to `../shots` next to the repo, or
`SHOTS_DIR`. The preview port is 8123, or `BL_PORT`.

## Build

| | |
|---|---|
| `build.js` | Node replica of `tools/build_news.py` — substitutes `__DATA__` and `__DESKMODE__` into the four templates. Use it when you have no Python. Keep it in step with the Python. |
| `gen-terminal.js` | Builds `terminal.json` (live values + search index) from `outlook-data.json` and the desk templates. Node twin of `tools/build_terminal.py`. |
| `build-p101.js` | Generates `product-101.html` from `ratings.js` and the three `bp-*.svg` blueprint sprites in this directory. Section numbers derive from `SECTIONS` order. **Run it and diff before committing** — it must reproduce the shipped page byte for byte. |
| `gen-guide-shots.js` | Recaptures `images/guide/*.webp`. CI has Python, not Playwright, so after any redesign this is a manual re-run or the Guide shows the old site — the exact failure it exists to prevent. |

## Gates — run these before shipping

| | |
|---|---|
| `syntax-check.js <file>…` | Parses every inline `<script>`. A half-removed function once left a template with a syntax error that produced **no console message at all**: the browser dropped the whole tag and the symptom was an empty panel. |
| `verify-desks.js` | Boots `partner.html` and `cost-desk.html` in jsdom with scripts running and asserts 29 behaviours. |
| `postmerge-check.js` | Loads every page in Chrome; fails on console errors or any 4xx. |
| `terminal-interact.js` | Clicks the Terminal chip on all six pages that carry it, opens the panel, runs a search. Written after the chip shipped to two desks with no stylesheet and no script behind it. |

## Measure

| | |
|---|---|
| `ux-capture.js` | The instrument behind every number in `SUMMARY.md`: computed-style census of every rendered element, CLS/LCP from `PerformanceObserver`, full-page screenshots at 1440×900 and 380×780. |
| `shot.js <page> [w] [h]` | One screenshot plus an honest overflow test — it scrolls the page and sees whether it moves, rather than counting boxes a scrolling ancestor is correctly clipping. |

## Refactor

| | |
|---|---|
| `cssprune.js` | Brace-matching CSS parser. **The only sanctioned way to cut CSS here.** Cutting rules with a regex is banned: a regex once matched a `<link>` whose href was an inline data-URI SVG, the first `>` closed the inner `<svg>`, and the wreckage shipped. |
| `prune-apply.js` | Per-file dead-token lists driving `cssprune`. Aborts if brace balance changes. |
| `snap-type.js` / `snap-space.js` / `snap-color.js` | Band-based token snappers. `--root=` handles the desks' `html{font-size:125%}`. Colour snapping stops at Δ12 on purpose — at Δ20 it started proposing a pale blue as a cream. |

## The rule these tools encode

A replace that matches nothing returns the input unchanged and exits zero.
Every edit script here asserts its match count and exits non-zero. Keep it
that way.
