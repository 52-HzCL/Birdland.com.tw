// Parse every inline <script> in a page.
//
// A half-removed function once left this template with a syntax error that
// produced NO console message at all — the browser dropped the whole script
// tag and the symptom was an empty panel. This is the guard: nothing ships
// until every inline script parses.
'use strict';
const fs = require('fs');
const vm = require('vm');

let bad = 0;
process.argv.slice(2).forEach(file => {
  const src = fs.readFileSync(file, 'utf8');
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, i = 0, ok = 0;
  while ((m = re.exec(src))) {
    const attrs = m[1] || '', body = m[2];
    i++;
    if (/\bsrc\s*=/.test(attrs)) continue;                       // external
    if (/type\s*=\s*["'](?!text\/javascript|module)/i.test(attrs)) continue; // JSON data island
    const line = src.slice(0, m.index).split('\n').length;
    try { new vm.Script(body, { filename: file + ':script#' + i + '@line' + line }); ok++; }
    catch (e) { bad++; console.error('SYNTAX ERROR  ' + file + '  script #' + i + ' starting line ' + line + '\n  ' + e.message); }
  }
  console.log(file + ': ' + ok + ' inline scripts parsed, ' + i + ' script tags seen');
});
process.exit(bad ? 1 : 0);
