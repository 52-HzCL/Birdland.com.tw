# ISSUES.md

Things found during the UX audit that are **not** UI-layer work. Recorded, not
fixed, per the brief.

## Open

**I-1 · The Team Desk gate is a speed bump, and that is now written down.**
`team.html` ships the whole desk in the HTML; the gate is an overlay released
by `sessionStorage`, and the passphrase is a plain-text comparison in a file
committed to a **public** repository. It stops a customer who guessed the URL
and nobody else.

Re-examined 2026-08-09, and the exposure is smaller than the phrasing above
suggests: everything the page renders comes from `outlook-data.json`, which is
public in the same repo, and the cost tools are input forms — the reader types
their own numbers and nothing is stored. Statically the page carries 366 words,
no amounts, no percentages. The gate protects a layout, not a secret, so there
is nothing here to justify a hosting change today.

The live risk is not what leaks now; it is that `ENTER PIN` **promises** a
protection that does not exist, and the next person to add a real number will
believe it. So the rule is recorded at the gate itself in
`tools/team_template.html`: never put a supplier price, a margin or a customer
name on this page while it is served from GitHub Pages. When that becomes the
thing you want, the hosting changes first — an authenticating front door, not a
better client-side check, because the client already holds the page.

One action outstanding, and it is the owner's: **the current passphrase is
readable in the public repo and should be treated as burned.** If it is reused
anywhere else, change it there.

**I-2 · ~~`birdland-intro.html` is orphaned AND broken~~ — CLOSED, deleted.**
Deleted 2026-08-09 with its `service-worker.js` precache entry, its
`robots.txt` rule and its `tools/dev/ux-capture.js` row; the service-worker
`VERSION` moved v41 → v42 so clients holding the old precache drop it.

What settled it was reading the file rather than the symptom. It is not a page
anyone wrote and stopped maintaining — it is a bundler artifact that got
committed: the title is literally "Bundled Page", it carries a
`#__bundler_loading` element, and 203,553 of its 205,655 bytes are a single
`<script>` against 820 bytes of style. Its three images were referenced by bare
UUID and have never existed, so it has never once rendered as intended. Nothing
linked to it. But it sat in the service worker's precache list, which means
every first-time visitor was downloading 200 KB of a build artifact that could
not display. That was the cost, and it was being paid on every visit.

Git keeps it if it is ever wanted back. The audit documents (`SUMMARY.md`,
`UX-REVIEW.md`, `audit-report.md`, `HANDOFF.md`) still mention it on purpose —
they are records of what was measured at the time, not live state.

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

**I-6 · ~~`tools/build_terminal.py` has never been executed~~ — CLOSED.**
Executed 2026-08-09 on Python 3.11: it runs, and its `terminal.json` is
byte-identical to the shipped file. The worry is retired. What the run
surfaced instead is the opposite problem: the Node twin
(`tools/dev/gen-terminal.js`) had drifted from the Python — different number
formatting in `steps` ("1,187" where CI writes "1,187.0") and diverging
`index` entries — so a local `build.js` run silently produced a search index
the next CI run would overwrite. The Node side is being brought back in step
with the Python, which is the authority because CI runs it.

**I-7 · ~~The two desks shadow four palette token names~~ — CLOSED, stale.**
The finding described `desk-banner.css` reading `var(--line)` inside the two
desks, whose `body.theme-light` redefines it — cool grey hairlines there, warm
everywhere else. Measured again 2026-08-09: the situation no longer exists.
`partner.html` and `cost-desk.html` stopped loading `desk-banner.css` when
they became apps (the same migration whose dead branches the 2026-08-07 sweep
removed from `desk-banner.js`); the one page still loading it is `guide.html`,
where `--line` resolves to `site-shell.css`'s value on every load — one page,
one appearance, nothing shadowed. A fix was written, measured and withdrawn:
it changed guide.html's hairlines and repaired nothing. The Terminal-dot
precedent (read an unshadowed name directly, with a comment saying why) is
still the right pattern if a shared component ever moves into the desks again.

## Closed during the audit

**I-0 · `renderDecisionVisuals` throws on every `news.html` load.**
`news.html:343` assigns `.innerHTML` on `null`; it targets `#cost-waterfall`,
`#cost-summary`, `#cost-updated` and `#risk-actions`, all removed with the old
Overview hero. Dead code with a live symptom — handled as `[CLEAN]` in Phase 3
rather than left here, because it is an error thrown on the site's routing page.
