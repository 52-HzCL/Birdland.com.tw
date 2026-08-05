// Run both built desks with their scripts and assert what the page actually
// becomes, not what the markup says. CostNow in particular is built by
// deleting DOM at load, so the only honest check is to let it run.
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { REPO: ROOT } = require('./_env');

const results = [];
function check(page, name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  results.push(ok);
  console.log((ok ? '  ok   ' : '  FAIL ') + name + '  ' + JSON.stringify(got) + (ok ? '' : '  expected ' + JSON.stringify(want)));
}

function load(file) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errs.push(String(e.message || e).split('\n')[0]));
  vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, file), 'utf8'), {
    url: 'https://birdland.com.tw/' + file,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    // jsdom has neither. Without the stubs the ReferenceError takes down the
    // rest of that script tag, and the page under test is not the page that
    // ships — which is how the install-card check "failed" the first time.
    beforeParse(w) {
      w.fetch = () => Promise.reject(new Error('offline in this harness'));
      w.scrollTo = () => {};
    },
  });
  return { dom, errs };
}

['partner.html', 'cost-desk.html'].forEach(file => {
  const { dom, errs } = load(file);
  const d = dom.window.document;
  const q = s => d.querySelectorAll(s);
  const toc = [...q('.toc a')].map(a => a.getAttribute('href'));
  console.log('\n' + file + '  (BL_DESK=' + dom.window.BL_DESK + ')');

  check(file, 'no 01-04 step rail', q('.bd-steps,.bd-step').length, 0);
  check(file, 'no masthead note', q('.bd-mast-note,.bd-mast-actions').length, 0);
  check(file, 'no anatomy caption', q('.bd-reference-note').length, 0);
  check(file, 'no old share bar', q('.bd-sharebar,.bd-share-btn,.bd-brief-actions,.bd-mail-to').length, 0);
  check(file, 'no rake-route picker', q('[class*=bd-head-route]').length, 0);
  check(file, 'no PIN gate', q('#gate,#pin,.gbox').length, 0);

  if (file === 'partner.html') {
    // The third label is rewritten at render time: it names the matched public
    // PDF when the feed has one, and the general Factory page when it does not.
    const labels = [...q('.bd-actbar .bd-act')].map(b => b.getAttribute('aria-label'));
    check(file, 'brief toolbar icons', [labels[0], labels[1], /^Open the related public/.test(labels[2]), labels[3]],
      ['Share this brief', 'Print this brief or save it as a PDF', true, 'Prepare an email to Birdland']);
    check(file, 'every icon has a tooltip', [...q('.bd-actbar .bd-act')].every(b => b.querySelector('.bd-act-tip')), true);
    check(file, 'every icon has an svg', [...q('.bd-actbar .bd-act')].every(b => b.querySelector('svg')), true);
    check(file, 'no visible action text', [...q('.bd-actbar .bd-act')].map(b => b.childNodes[0].nodeName), ['svg', 'svg', 'svg', 'svg']);
    check(file, 'desk routing kept in the tooltip', !!d.querySelector('.bd-act-tip #bb-desk'), true);
    check(file, 'install card moved under the work', !!d.querySelector('.bd-grid > .bd-install-card:last-child'), true);
    check(file, 'overview still the home panel', toc[0], '#overview');
    check(file, 'buyer brief still listed', toc.includes('#pd-builder'), true);
  } else {
    check(file, 'overview shell gone', !!d.getElementById('overview'), false);
    check(file, 'overview not in the menu', toc.includes('#overview'), false);
    check(file, 'buyer brief not in the menu', toc.includes('#pd-builder'), false);
    check(file, 'menu opens on cost & origin', toc[0], '#p-mkt');
    check(file, 'cost & origin is the shown panel',
      [...q('main .blk')].filter(b => !b.classList.contains('sk-off')).map(b => b.id), ['p-mkt']);
    check(file, 'buying context survives', [!!d.getElementById('room'), !!d.getElementById('region')], [true, true]);
    check(file, 'the six tools are here',
      toc.filter(h => /p-(landed2|margin|reorder|sail|calc|cduty)/.test(h)).length, 6);
  }

  const real = errs.filter(e => !/Not implemented|fetch|ENOTFOUND|getContext/i.test(e));
  check(file, 'no script errors', real, []);
  if (errs.length !== real.length) console.log('  (' + (errs.length - real.length) + ' jsdom-only notices ignored: no network, no canvas)');
  dom.window.close();
});

const bad = results.filter(r => !r).length;
console.log('\n' + (results.length - bad) + '/' + results.length + ' checks passed');
process.exit(bad ? 1 : 0);
