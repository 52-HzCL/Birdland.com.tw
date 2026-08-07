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
| `build-sitemap.js` | Generates `sitemap.xml` from all HTML files in root and language folders (nl/, de/, fr/, es/, pt-br/, pl/, it/, ja/, zh-tw/), excluding pages with `noindex` meta tag or filenames containing "vault"/"encrypt". Run when pages are added or removed. |
| `fetch-trade.js` | Node twin of `tools/fetch_trade.py`, the quarterly customs fetcher behind `trade.json` (Eurostat Comext + UN Comtrade, sharded across runs). CI runs the Python; this is the only way to read or exercise that logic on a machine without one. The two must stay behaviourally identical. |
| `verify-material-vocab.js` | Checks that AsiaSource's material and process vocabulary still matches what `gen-terminal.js` harvests into the search index — a renamed material silently drops out of Terminal search otherwise. |

## Languages

`_langs.js` is the one language list the build tools read: a language exists
because `i18n/facade.<dir>.json` exists, and it is named the way that file names
itself. `app-bar.js` and `desk-banner.js` cannot `require()` it, so they carry
their own copy — and `i18n-build.js` fails if theirs disagrees.

Three kinds of page carry a language control, and they are not interchangeable:

* **facade** (index, about, contact, privacy) — a folder per language, built by
  `i18n-build.js` from a pairs file.
* **built static** (product-101) — a folder per language too, but the English
  page comes from `build-p101.js` and the translations from `i18n-page.js`.
  Both write the same picker and cluster as `i18n-build.js`, so whichever runs
  last the bytes match.
* **run time** (the Guide and the four desks) — one artifact CI rebuilds
  nightly, translated in the browser from `i18n/app.<lang>.json`. Their picker
  stores `bl_lang`; it does not change folder.

Every translated page writes `bl_lang` on load, so arriving on `/de/` and then
tapping into a desk gets you a German desk.

| | |
|---|---|
| `i18n-build.js` | Builds the facade editions; refreshes the English pickers and hreflang clusters; and checks what it cannot build — that no page still ships a machine-translation widget, that the two browser pickers list the facade set, and that the ten `app.*.json` dictionaries are aligned key for key. |
| `i18n-page.js` | `extract` / `build` for big generated pages. The picker is skipped on extract and regenerated on build, so language names never become translation keys. |
| `i18n-drift.js` | Every translated page carries the SHA-1 of the English source it was made from. `--stamp` after a rebuild; bare to check. |
| `i18n-harvest.js` | Renders the desks and the Guide at 390×844 **and** 1440×900 and reports which on-screen chrome strings the dictionary has never seen, minus anything that is a value out of `outlook-data.json` or `terminal.json`. |
| `i18n-accept.js` | Phone acceptance: at 390px, can a thumb reach the picker, are all ten editions **inside the viewport**, and does `innerText` actually come back in the chosen language. Written after the popover shipped opening 121px off the left edge — ten editions present in the DOM, none of them on the phone. |

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

## Acceptance

| | |
|---|---|
| `verify-textsize.js` | The A/A/A control on all ten pages: present, text actually grows, setting survives reload. |
| `live-suite.js` | The production walk-through against birdland.com.tw: every page, nav, Terminal open/search/navigate/close, text size across pages, hero hover, contact routing. Run it after every deploy. |
