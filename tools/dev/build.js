// Node replica of tools/build_news.py (no Python on this machine).
// newline='' on both read and write in the Python means bytes pass through
// untouched, so a plain utf8 read/write here produces the same file.
// Keep this in step with the Python — including the __DESKMODE__ substitution,
// which is what makes AsiaSource and CostNow two pages.
const fs = require('fs'), path = require('path');
const { REPO } = require('./_env');
const data = fs.readFileSync(path.join(REPO, 'outlook-data.json'), 'utf8');
// The buyer desk ships the garden & DIY catalogue; the cost desk never sees it,
// so cost-desk.html stays byte-identical. Data is inlined the same way __DATA__ is.
let catalogPartial = '';
const capPath = path.join(REPO, 'tools', 'catalog_partial.html');
if (fs.existsSync(capPath)) {
  const cjsonPath = path.join(REPO, 'catalog.json');
  const cjson = fs.existsSync(cjsonPath)
    ? fs.readFileSync(cjsonPath, 'utf8').trim().split('</').join('<\\/')
    : 'null';
  catalogPartial = '\n' + fs.readFileSync(capPath, 'utf8').split('__CATALOGDATA__').join(cjson);
}

const JOBS = [
  ['news_template.html', 'guide.html', null],
  ['partner_template.html', 'partner.html', { __DESKMODE__: 'buyer', __CATALOG__: catalogPartial }],
  ['partner_template.html', 'cost-desk.html', { __DESKMODE__: 'cost', __CATALOG__: '' }],
  ['team_template.html', 'team.html', null],
  ['executive_template.html', 'executive.html', null]
];
JOBS.forEach(([tpl, out, extra]) => {
  const p = path.join(REPO, 'tools', tpl);
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, 'utf8').split('__DATA__').join(data);
  Object.entries(extra || {}).forEach(([k, v]) => { s = s.split(k).join(v); });
  fs.writeFileSync(path.join(REPO, out), s, 'utf8');
  console.log('built', out, s.length, 'bytes');
});
// A leftover token would ship as literal text and break the mode switch.
JOBS.forEach(([, out]) => {
  const f = path.join(REPO, out);
  if (fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('__DESKMODE__'))
    console.log('WARNING: unsubstituted __DESKMODE__ in', out);
});

// build_news.py does not stop at the pages: it then runs build_terminal.py,
// because terminal.json's search index is harvested FROM these templates and
// goes stale the moment they change. This replica skipped that step, so a
// local build produced pages and a search index that disagreed — the exact
// "verified locally is not what CI ships" gap the twin exists to close.
// (build_feeds.py, the third step, has no Node twin and no local consumer.)
try {
  require('child_process').execFileSync(
    process.execPath, [path.join(__dirname, 'gen-terminal.js')],
    { cwd: REPO, stdio: 'inherit' }
  );
} catch (e) {
  // Non-fatal, exactly as in build_news.py: a stale search index is a
  // navigation nicety, and killing the page build over it is the wrong trade.
  console.log('WARNING: gen-terminal.js failed — terminal.json not refreshed');
}
