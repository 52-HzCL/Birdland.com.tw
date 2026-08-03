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
    // the rake head/material route picker, dropped from the Buyer Desk
    '.bd-head-route', '.bd-head-routes', '.bd-head-route-grid',
    // the 01-04 step rail, and the chrome the action icons replaced
    '.bd-steps', '.bd-step', '.bd-mast-actions', '.bd-mast-note', '.bd-reference-note',
    '.bd-sharebar', '.bd-share-label', '.bd-share-btn', '.bd-brief-actions', '.bd-mail-to',
    // the rail's own wordmark and desk switch, both now in the shared header
    '.pr-brand', '.pr-brand-mark', '.pr-brand-word', '.pr-mode-switch', '.pr-mode-3',
  ]),
  // The banner's News/Buyer/Cost switch — the Terminal panel is the switch now.
  'desk-banner.css': tokens(['.dbar-switch']),
  // the Guide's five-across step strip, replaced by the screenshot walk
  'tools/news_template.html': tokens([
    // the Guide's five-across step strip, replaced by the screenshot walk
    '.ov-steps','.ov-step','.ov-dot',
    // the OEM control map and its dossier, whose script went in a2f3823
    '.os-hero','.control-map','.control-shell','.ownership-note','.route-step',
    '.route-graphic','.dossier','.evidence-grid','.evidence-cell','.system-node','.map-svg',
  ]),
  // The Product 101 encyclopedia was rebuilt; these blocks lost their markup.
  'birdland-visual.css': new RegExp(
    // the Product 101 encyclopedia blocks whose markup was rebuilt
    '(^|[^\\w-])(\\.(atlas|mat|dia)-[\\w-]+' +
    // the header's buyer-software button and Factory's 01/02 switch, both
    // replaced by the Terminal sitting in the nav two items away
    '|\\.bl-terminal(?![\\w-])|\\.bl-resource-switch(?![\\w-]))'),
  'site-shell.css': /(^|[^\w-])\.(atlas|mat|dia)-[\w-]+/,
};

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
