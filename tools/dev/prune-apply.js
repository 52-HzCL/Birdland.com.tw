// Cut the dead CSS. Reports first, writes only with --write.
'use strict';
const fs = require('fs');
const path = require('path');
const { parse, plan, applyCuts } = require('./cssprune.js');
const { REPO: ROOT } = require('./_env');
const WRITE = process.argv.includes('--write');

// A token list rather than a loose prefix: `.gt` must not take `.gt-on`, and
// `.bd-act` must not be caught by anything meant for `.bd-share-*`.
function tokens(list) {
  const alt = list.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp('(^|[^\\w-])(' + alt + ')(?![\\w-])');
}

const TARGETS = {
  'tools/partner_template.html': tokens([
    // the PIN gate, removed from this desk last session (#tpin/#tgo belong to
    // the Team Desk, which carries its own copy of these styles)
    '#gate', '#pin', '#tpin', '#tgo', '.gbox', '.gt', '.gk', '.gs', '.gsub', '.glabel', '.gbtn', '.gerr', '.pinrow',
    // the rake head/material route picker, dropped from AsiaSource
    '.bd-head-route', '.bd-head-routes', '.bd-head-route-grid',
    // the 01-04 step rail, and the chrome the action icons replaced
    '.bd-steps', '.bd-step', '.bd-mast-actions', '.bd-mast-note', '.bd-reference-note',
    '.bd-sharebar', '.bd-share-label', '.bd-share-btn', '.bd-brief-actions', '.bd-mail-to',
    // the rail's own wordmark and desk switch, both now in the shared header
    '.pr-brand', '.pr-brand-mark', '.pr-brand-word', '.pr-mode-switch', '.pr-mode-3',
    // The Google Translate widget and every shell built around it: the topbar
    // box, the rail popover that adopted it, and the classes Google's own
    // script would have applied. The script was never loaded, so none of this
    // ever matched an element; language is the app bar's picker now.
    '#google_translate_element', '.gt-on', '.language-box',
    '.goog-te-banner-frame', '.goog-te-gadget', '.goog-te-combo',
    '.pr-lang', '.pr-lang-btn', '.pr-lang-chev', '.pr-lang-pop', '.pr-lang-note',
    // the watchlist ticker strip across the top of the rail (blinking cursor,
    // brand bars, price table, "featured" callout) — gone with the ticker
    '.gcursor', '.b-mk', '.eyk', '.ev', '.rng', '.feat', '.wl', '.tk-wrap',
    // the old landed-cost calculator's freight/material note fields, replaced
    // by the Workspace panel's own inputs
    '#matl', '#lcbar', '.fwd-card', '#p-fr-note', '#matl-note', '#ship-note',
    // the header's live-status LEDs and the "Information/Tools" rail heading —
    // .pr-grp is JS-referenced only in a comment explaining its own removal
    // ("There used to be a .pr-grp heading above each group..."), never
    // assigned to an element any more
    '.bb-body', '.tpk-led', '.hol', '.pr-h', '.pr-act', '.pr-wl', '.pr-go', '.pr-grp',
    '.hled', '.bb-bar', '.bb-led', '.sysled', '.thm-sun', '.thm-moon', '.glogo', '.outbig',
    // a square/social share card format that was never wired up
    '.sqh', '.sqmk', '.saas', '.sq-mk', '.sq-wm', '.sq-tag', '.sq-foot', '.pstrip',
    // an earlier "dashboard" summary card for the rail, superseded by the
    // Buy Queue panel
    '.dash-head', '.dash-k', '.dash-verdict', '.dash-grid', '.dash-foot', '.fresh-tier', '.spk',
    // the share-brief topic picker and its language sub-picker, both replaced
    // by the current single-button share flow
    '.rp-topics', '#rp_lang',
    // a "watch category" picker and a calendar mini-grid that lost their markup
    '.wcat', '.wcat-h', '.cal-grid', '.cal-m', '.hero-note',
    // freshness badges and a homepage price-card variant from an earlier
    // Overview layout
    '.fresh-badges', '.fresh-badge', '.pr-home-card', '.pr-home-k',
    // a market-snapshot card format replaced by the current Cost & Origin panel
    '.market-grid', '.market-card', '.market-k', '.market-source', '.market-v', '.market-chg',
    '.market-mini', '.market-read', '.market-impact', '.impact-head', '.market-disclaimer',
    // an "info viz" bar/dot chart that lost its markup
    '.info-viz', '.info-viz-head', '.viz-line', '.viz-fill', '.viz-bar', '.viz-dot',
    // an earlier cockpit-style layout for the buyer brief (eyebrow/title/main
    // grid/panel), superseded by the current pd-builder structure
    '.pd-eyebrow', '.pd-title', '.pd-cockpit-head', '.pd-updated', '.pd-main-grid',
    '.pd-panel', '.pd-panel-body', '.pd-room-layout', '.pd-land', '.pd-offers',
    '.pd-live-link', '.pd-cockpit-foot', '.pd-legend',
    // process icons (heat/grind/finish/forming) for material choices — the
    // material swatches now carry an image tile instead (see bd-swatch-process)
    '.bd-process-icon', '.process-heat', '.process-grind', '.process-finish', '.process-forming',
    // a full catalogue/decision-panel layout for the product finder that was
    // rebuilt around the current offer-card grid
    '.pd-buy-hero', '.pd-hero-trust', '.pd-privacy-line', '.pd-section-no', '.pd-core-grid',
    '.pd-category-ribbon', '.pd-catalogue-foot', '.pd-decision-panel', '.pd-origin-box',
    '.pd-origin-head', '.pd-decision-actions',
    // an earlier buyer-brief builder layout (head/local/grid/steps/work,
    // product-study, choice rows), superseded by the current brief sheet
    '.pd-builder-head', '.pd-builder-local', '.pd-builder-grid', '.pd-builder-steps',
    '.pd-builder-work', '.pd-product-study', '.pd-study-image', '.pd-study-copy',
    '.pd-choice-group', '.pd-choice-row', '.pd-choice-split', '.pd-swatch-row', '.pd-priority-row',
    '.pd-brief-sheet', '.pd-paperclip', '.pd-brief-checks', '.pd-brief-pdf', '.pd-brief-email', '.pd-data-foot',
    // the header's old resource switch and language picker — desk-banner.js
    // and app-bar.js own both jobs now
    '.bd-resource-switch', '.top-language-btn', '.top-language-chevron', '.top-language-pop', '.top-language-links',
  ]),
  // The banner's News/Buyer/Cost switch — the Terminal panel is the switch now.
  'desk-banner.css': tokens(['.dbar-switch']),
  'tools/news_template.html': tokens([
    // the Guide's five-across step strip, replaced by the screenshot walk
    '.ov-steps','.ov-step','.ov-dot',
    // the OEM control map and its dossier, whose script went in a2f3823
    '.os-hero','.control-map','.control-shell','.ownership-note','.route-step',
    '.route-graphic','.dossier','.evidence-grid','.evidence-cell','.system-node','.map-svg',
    // the rest of that same control-map/dossier feature, missed the first pass:
    // its hero echo strip, node icons, evidence panel and an Asia-route SVG
    // chart with its own axis/legend/risk table
    '.os-hero-echo', '.map-label', '.customer-core',
    '.node-make', '.node-monitor', '.node-private', '.node-heritage', '.node-top', '.node-index', '.node-icon',
    '.evidence-panel', '.evidence-head', '.evidence-visual', '.evidence-actions',
    '.proof-grid', '.proof-card', '.proof-tag', '.handoff-strip',
    '.signal-section', '.signal-grid', '.signal-card',
    '.cost-svg', '.axis', '.copper', '.cost-note', '.asia-map', '.signal-legend', '.risk-table',
  ]),
  // birdland-visual.css's real TARGETS entry is assembled below (it needs a
  // dynamic-prefix regex alongside a literal token list).
  'site-shell.css': tokens([
    // the shell chrome only the Guide ever used: the collapsed-rail divider,
    // the Terminal label that stood in for the (now real) Terminal chip, and
    // an archive/timeline/process-spine layout replaced by the walkthrough
    '.nav-divider', '.terminal-label', '.hero-card', '.section-head',
    '.archive-map', '.visual-grid', '.visual-card', '.index-no', '.heritage-wall',
    '.process-spine', '.material-bars', '.risk-flow', '.risk-detail', '.enquiry-choices',
    // the boundary block's "vs" divider glyph — .boundary itself is still used
    // by news/manufacturing/why-birdland, but no page ever fills .divide
    '.divide',
  ]),
  'tools/executive_template.html': tokens([
    // an install-nudge card in the rail — the install button/copy under it
    // are still live, but the wrapping card, its head/badge/copy layout, and
    // the standalone "mail app" art button were never actually rendered.
    // (.source-deck-note was on this list too at first — a text search found
    // it only inside a comment and looked dead, but it is a real <p> in the
    // production-desk source list; the pixel diff on executive.html caught
    // the mistake and it was put back, see the style block above.)
    '.install-card', '.install-head', '.install-badge', '.install-copy', '.mail-art',
  ]),
  'tools/team_template.html': tokens([
    // the same watchlist/ticker LED cluster removed from partner_template.html
    // (Team Desk carries its own copy of the header) — .pr-grp is likewise
    // only mentioned in a comment about its own removal, never on an element
    '.fc-spark', '.outbig', '.hled', '.bb-bar', '.bb-led', '.tpk-led', '.sysled',
    '.thm-sun', '.thm-moon', '.pr-grp', '.pr-h', '.feat',
  ]),
  'daily-journal.css': tokens([
    // requires a class="journal" ancestor that no element on executive.html
    // carries — <body> is unclassed, so `.journal main .section` never matches
    '.journal',
  ]),
  'tokens.css': tokens(['.tabular']),
};
// birdland-visual.css also carries the Product 101 blocks whose class names
// are dynamic prefixes (.atlas-x, .mat-x, .dia-x), plus a handful of named
// blocks from the same rebuild and the pre-rename Product 101 wk- classes
// (walkthrough figs/forms/strip/shot — product-101.html's markup now uses the
// wk- namespace end to end, see tools/dev/build-p101.js).
TARGETS['birdland-visual.css'] = (() => {
  const named = tokens([
    '.bl-hero', '.bl-hero-copy', '.bl-hero-lede',
    '.bl-resilience-art', '.bl-resilience-signal', '.bl-resilience-signal-a',
    '.bl-resilience-signal-b', '.bl-resilience-signal-c',
    '.bl-capability-journey', '.bl-capability-stage', '.bl-capability-stage-make',
    '.bl-capability-stage-move', '.bl-capability-stage-yours',
    '.bl-option-a-visual', '.bl-operating-path', '.bl-home-workflow', '.bl-decision-bridge',
    '.bl-orbit-flow', '.bl-orbit-node', '.bl-orbit-response',
    '.bl-bridge-head', '.bl-bridge-rule', '.bl-bridge-promise', '.bl-bridge-grid',
    '.bl-bridge-stage', '.bl-stage-no', '.bl-bridge-signals', '.bl-signal-scope',
    '.bl-bridge-engineering', '.bl-tool-scan', '.bl-bridge-outcome', '.bl-outcome-readout', '.bl-bridge-link',
    '.bl-digital-path', '.bl-path-step', '.bl-path-buy', '.bl-path-email', '.bl-path-visual',
    '.bl-news-wave', '.bl-buy-dial', '.bl-email-fold',
    '.bl-operating-response', '.bl-response-title', '.bl-response-rail',
    '.bl-hero-visual', '.bl-drawing-meta', '.bl-drawing-measure', '.bl-proof',
    '.bl-home-cards', '.bl-home-icon', '.bl-home-signal', '.bl-home-layers',
    '.bl-section', '.bl-section-head', '.bl-portals', '.bl-portal', '.bl-portal-index',
    '.bl-band', '.bl-band-copy', '.bl-band-links',
    '.ledger-facts', '.ledger-timeline', '.ownership-grid', '.ownership-panel', '.resilience-row',
    '.bl-ink-promise',
    // .is-revealed: no code ever adds it — the hero's reveal script only ever
    // toggles is-near (see index.html's pointermove handler)
    '.is-revealed',
    '.ab-fig-chart', '.bd-boundary', '.bd-side', '.ab-firewall',
    // pre-rename Product 101 names (see tools/dev/build-p101.js — its output
    // uses .wk-* everywhere now, not .p101-*)
    '.p101-lead', '.pk-forms', '.p101-strip', '.p101-shot',
    // build-p101.js's marks() helper only ever emits .wk-dots / .wk-steps
    // (see the `marks(r.pop,'dots')` / `marks(r.cost,'steps')` calls) — these
    // three never come out of it
    '.wk-meter', '.wk-pop', '.wk-cost',
    '.bl-terminal', '.bl-resource-switch',
  ]);
  const dynamic = /(^|[^\w-])\.(atlas|mat|dia)-[\w-]+/;
  return { test: s => named.test(s) || dynamic.test(s) };
})();

function styleBlocks(src, file) {
  if (/\.css$/.test(file)) return [{ start: 0, end: src.length, css: src }];
  const out = [], re = /<style\b[^>]*>/gi; let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length, end = src.indexOf('</style>', start);
    if (end < 0) continue;
    out.push({ start, end, css: src.slice(start, end) });
    re.lastIndex = end;
  }
  return out;
}

let total = 0;
Object.keys(TARGETS).forEach(rel => {
  const file = path.join(ROOT, rel);
  const src = fs.readFileSync(file, 'utf8');
  const re = TARGETS[rel];
  const cuts = [], kept = [];
  styleBlocks(src, rel).forEach(b => plan(parse(b.css, b.start), s => re.test(s), cuts, kept));
  const bytes = cuts.reduce((a, c) => a + (c.end - c.start) - (c.replace ? c.replace.length : 0), 0);
  console.log(rel + ': ' + cuts.length + ' rules, ' + bytes + ' bytes');
  total += bytes;
  if (!WRITE) { cuts.forEach(c => console.log('   ' + (c.replace != null ? 'trim ' : 'cut  ') + c.why.replace(/\s+/g, ' ').slice(0, 110))); return; }
  const out = applyCuts(src, cuts);
  // Deleting a rule must not disturb any brace outside it.
  const count = (s, ch) => (s.split(ch).length - 1);
  if (count(out, '{') - count(out, '}') !== count(src, '{') - count(src, '}')) {
    console.error('ABORT ' + rel + ': brace balance changed'); process.exit(1);
  }
  fs.writeFileSync(file, out, 'utf8');
  console.log('   written');
});
console.log('total ' + total + ' bytes');
