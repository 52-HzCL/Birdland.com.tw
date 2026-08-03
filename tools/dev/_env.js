// Shared paths for the dev tools.
//
// These scripts used to live outside the repo with the machine's own absolute
// paths compiled in, which meant they only ran on one Windows box. Everything
// machine-specific is now in this one file, resolved at run time.
'use strict';
const fs = require('fs');
const path = require('path');

// tools/dev/_env.js -> repo root
const REPO = path.resolve(__dirname, '..', '..');

// Playwright drives the system Chrome rather than downloading its own.
// CHROME_PATH overrides, for an install somewhere unusual.
const CANDIDATES = {
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    path.join(process.env.HOME || '', 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
};

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const list = CANDIDATES[process.platform] || CANDIDATES.linux;
  const hit = list.filter(Boolean).find(p => fs.existsSync(p));
  if (hit) return hit;
  throw new Error(
    'No Chrome found for platform "' + process.platform + '". Looked in:\n  ' +
    list.filter(Boolean).join('\n  ') + '\nSet CHROME_PATH to your browser binary.'
  );
}

// Screenshots land outside the repo by default so they are not accidentally
// committed. SHOTS_DIR overrides. Created on demand — sharp reports a missing
// directory as "unable to open for write", which reads like a permissions
// problem and is not one.
const SHOTS = process.env.SHOTS_DIR || path.join(REPO, '..', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

// The local preview server (tools/dev/serve.js).
const PORT = Number(process.env.BL_PORT || 8123);
const BASE = 'http://localhost:' + PORT;

module.exports = {
  REPO,
  SHOTS,
  PORT,
  BASE,
  get CHROME() { return findChrome(); },
};
