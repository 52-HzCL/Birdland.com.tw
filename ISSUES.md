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

**I-2 · `birdland-intro.html` may be orphaned.**
Nothing in the eleven audited pages links to it. LCP 2,380ms for 7 words. If it
is genuinely unreferenced it is a deletion, not a restyle — but confirming that
means checking external links and print material, which is a decision, not an
audit finding.

**I-3 · An intermittent 404 on `index.html`.**
Logged once across two identical runs and did not reproduce. Not enough to
identify the resource. Re-check under Phase 4; if it reappears, capture the URL
before acting.

**I-4 · Six webfont families across two blocking requests on the desks.**
`partner.html` and `cost-desk.html` each request two Google Fonts stylesheets.
Phase 2 removes the stale one as a token change, which is UI work — but the
remaining single request is still render-blocking against a CDN, and
self-hosting or preloading is a build/hosting decision outside this brief.

**I-5 · Suspected unused dependency.**
`package.json` declares only `jsdom`, which no shipped page uses — it is a test
dependency for the local verification harness. Correct as a `devDependency`,
currently listed under `dependencies`. Listed, not changed.

## Closed during the audit

**I-0 · `renderDecisionVisuals` throws on every `news.html` load.**
`news.html:343` assigns `.innerHTML` on `null`; it targets `#cost-waterfall`,
`#cost-summary`, `#cost-updated` and `#risk-actions`, all removed with the old
Overview hero. Dead code with a live symptom — handled as `[CLEAN]` in Phase 3
rather than left here, because it is an error thrown on the site's routing page.
