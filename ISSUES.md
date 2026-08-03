# ISSUES.md

Things found during the UX audit that are **not** UI-layer work. Recorded, not
fixed, per the brief.

## Open

**I-1 · The Team Desk PIN gate is client-side only.**
`team.html` ships all 1,227 elements of the internal desk in the HTML; the gate
is an overlay released by `sessionStorage`. Anyone can read the content with
View Source. This is a known and deliberate state (it has been called a "假 PIN
閘門" before), so it is listed for the record rather than as a surprise. Any real
fix is a hosting/auth change, not a stylesheet change.

**I-2 · `birdland-intro.html` is orphaned AND broken.**
Nothing on the site links to it, and it references its images by bare UUID —
`url("d4598bf2-6df5-4149-8a58-1adb46724366")` and two more — none of which
exist in the repo. That is the 404 it logs and most of the 2.3 seconds it takes
to render seven words. It has presumably looked like this for as long as it has
existed, because nobody opens it.

Deleting a page is your call, not mine, so it is untouched. If you want it kept,
it needs its assets; if not, it and its entry in `service-worker.js` can go.

**I-3 · ~~An intermittent 404 on `index.html`~~ — CLOSED.**
It was `/favicon.ico`: no page declared an icon, so Chrome asked for the default
and the server had none. Fixed in 552e8c0 — one `favicon.svg` on every page.

**I-4 · Six webfont families across two blocking requests on the desks.**
`partner.html` and `cost-desk.html` each request two Google Fonts stylesheets.
Phase 2 removes the stale one as a token change, which is UI work — but the
remaining single request is still render-blocking against a CDN, and
self-hosting or preloading is a build/hosting decision outside this brief.

**I-5 · ~~Suspected unused dependency~~ — CLOSED.**
`jsdom` moved to `devDependencies`, where it belonged, when the tooling came
into the repo as `tools/dev/`. `playwright-core` and `sharp` joined it: they
were installed outside the repo and undeclared, so a fresh clone could run
none of the gates and reproduce no measurement. CI installs no node
dependencies, so nothing in the pipeline is affected.

**I-6 · `tools/build_terminal.py` has never been executed.**
There is no Python on the development machine, so the CI version of the
Terminal index build is untested; only the Node twin
(`tools/dev/gen-terminal.js`) has been run. It is invoked non-fatally, so a
failure costs the panel its live values and its search, not the daily news.
Watch the first CI run after this merges.

**I-7 · The two desks shadow four palette token names.**
`body.theme-light` in `partner_template.html` redefines `--down`, `--up`,
`--flat` and `--line` for the desks' own data colours. Anything shared that
reads those names renders differently on `partner.html` and `cost-desk.html`
than on the other pages — `desk-banner.css` uses `var(--line)` six times and
`var(--flat)` twice, so the shared header's hairlines are cool grey there and
warm everywhere else.

The Terminal dot was hit by this and is fixed (it reads `--jade-700` directly,
with a comment saying why). The header hairlines are left alone: the difference
is small, it is the state you reviewed in the Phase 4 screenshots, and renaming
the desks' four variables is a change worth making deliberately rather than in
the last minutes before a deploy.

## Closed during the audit

**I-0 · `renderDecisionVisuals` throws on every `news.html` load.**
`news.html:343` assigns `.innerHTML` on `null`; it targets `#cost-waterfall`,
`#cost-summary`, `#cost-updated` and `#risk-actions`, all removed with the old
Overview hero. Dead code with a live symptom — handled as `[CLEAN]` in Phase 3
rather than left here, because it is an error thrown on the site's routing page.
