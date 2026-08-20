#!/usr/bin/env node
// Build holidays.json (repo root): national public holidays for the factory
// calendar (TW) plus every export market the Team Desk delivery-promise tool
// serves, current year + next year.
//
// Source: Nager.Date public API, no key required:
//   https://date.nager.at/api/v3/PublicHolidays/{year}/{code}
// Nager has no Taiwan data (the TW endpoint answers 204 / empty body), so TW
// falls back to the builtin table below and is marked source:"builtin".
//
// Fetch-failure guard: if a market cannot be fetched, that market's days are
// carried over from the existing holidays.json instead of being blanked; if
// every remote market fails and an old file exists, the script aborts without
// writing so a bad network day can never destroy the calendar.
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'holidays.json');
const API = 'https://date.nager.at/api/v3/PublicHolidays/{year}/{code}';
// TW first (factory), then the export markets served by the Team Desk tool.
const MARKETS = ['TW', 'US', 'DE', 'NL', 'IT', 'FR', 'ES', 'PL', 'GB', 'AU', 'NZ', 'JP'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR, THIS_YEAR + 1];

// ---------------------------------------------------------------------------
// Taiwan national holidays (DGPA calendar style, incl. observed/make-up days).
// Used only when Nager returns nothing for TW (its current state). Observed
// days for the later year follow the standard DGPA rule (Sat -> prior
// workday, Sun -> following workday) and may shift slightly once the official
// calendar is published — conservative enough for delivery promises.
// ---------------------------------------------------------------------------
const TW_BUILTIN = {
  2026: {
    '2026-01-01': "New Year's Day",
    '2026-02-15': "Lunar New Year holiday (eve of the eve)",
    '2026-02-16': "Lunar New Year's Eve",
    '2026-02-17': 'Lunar New Year Day 1',
    '2026-02-18': 'Lunar New Year Day 2',
    '2026-02-19': 'Lunar New Year Day 3',
    '2026-02-20': 'Lunar New Year (make-up holiday)',
    '2026-02-27': 'Peace Memorial Day (observed)',
    '2026-02-28': 'Peace Memorial Day',
    '2026-04-03': "Children's Day (observed)",
    '2026-04-04': "Children's Day",
    '2026-04-05': 'Tomb-Sweeping Day',
    '2026-04-06': 'Tomb-Sweeping Day (observed)',
    '2026-05-01': 'Labour Day',
    '2026-06-19': 'Dragon Boat Festival',
    '2026-09-25': 'Mid-Autumn Festival',
    '2026-09-28': "Confucius' Birthday (Teachers' Day)",
    '2026-10-09': 'National Day (observed)',
    '2026-10-10': 'National Day',
    '2026-10-25': 'Taiwan Retrocession Day',
    '2026-10-26': 'Taiwan Retrocession Day (observed)',
    '2026-12-25': 'Constitution Day'
  },
  2027: {
    '2027-01-01': "New Year's Day",
    '2027-02-04': "Lunar New Year holiday (eve of the eve)",
    '2027-02-05': "Lunar New Year's Eve",
    '2027-02-06': 'Lunar New Year Day 1',
    '2027-02-07': 'Lunar New Year Day 2',
    '2027-02-08': 'Lunar New Year Day 3',
    '2027-02-09': 'Lunar New Year (make-up holiday)',
    '2027-02-10': 'Lunar New Year (make-up holiday)',
    '2027-02-28': 'Peace Memorial Day',
    '2027-03-01': 'Peace Memorial Day (observed)',
    '2027-04-04': "Children's Day",
    '2027-04-05': 'Tomb-Sweeping Day',
    '2027-04-06': "Children's Day (observed)",
    '2027-04-30': 'Labour Day (observed)',
    '2027-05-01': 'Labour Day',
    '2027-06-09': 'Dragon Boat Festival',
    '2027-09-15': 'Mid-Autumn Festival',
    '2027-09-28': "Confucius' Birthday (Teachers' Day)",
    '2027-10-10': 'National Day',
    '2027-10-11': 'National Day (observed)',
    '2027-10-25': 'Taiwan Retrocession Day',
    '2027-12-24': 'Constitution Day (observed)',
    '2027-12-25': 'Constitution Day'
  }
};

// Fetch one market-year. Returns an array (possibly empty) on success, or
// null on failure so the caller can tell "no holidays" from "no answer".
async function fetchYear(code, year) {
  const url = API.replace('{year}', year).replace('{code}', code);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      if (r.status === 204) return [];            // valid country, no data (TW)
      if (r.status === 404) return [];            // unknown country: treat as no data
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (attempt === 2) {
        console.error('  FETCH FAILED ' + code + ' ' + year + ': ' + e.message);
        return null;
      }
      await new Promise(res => setTimeout(res, 1500));
    }
  }
  return null;
}

// Some countries file de-facto nationwide days as regional (GB lists even New
// Year's Day under all four counties, so global===true alone loses it). For
// those, also accept entries scoped to the subdivision our cargo actually
// clears through (main container port region).
const PORT_REGION = {
  GB: 'GB-ENG',   // Felixstowe / Southampton
  DE: 'DE-HH',    // Hamburg (adds Reformation Day, a real port closure)
  AU: 'AU-NSW',   // Sydney
  NZ: 'NZ-AUK'    // Auckland
};

// Nationwide public holidays: global === true keeps state/county-only entries
// out (e.g. Good Friday in 10 US states), plus the port-region entries above.
// "Bank" catches federal closures Nager files that way (e.g. US Columbus
// Day) — banks and customs closed is exactly what this calendar is for.
function pickDays(list, code) {
  const days = {};
  const region = PORT_REGION[code];
  list.forEach(h => {
    const regional = region && Array.isArray(h.counties) && h.counties.indexOf(region) >= 0;
    if (h.global !== true && !regional) return;
    const types = h.types || (h.type ? [h.type] : ['Public']);
    if (types.indexOf('Public') < 0 && types.indexOf('Bank') < 0) return;
    const name = h.name || h.localName || 'Public holiday';
    if (days[h.date] && days[h.date].indexOf(name) < 0) days[h.date] += ' / ' + name;
    else days[h.date] = name;
  });
  return days;
}

function sortedDays(days) {
  const out = {};
  Object.keys(days).sort().forEach(k => { out[k] = days[k]; });
  return out;
}

async function main() {
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  const prevMarket = code =>
    (previous && previous.markets && previous.markets[code] && previous.markets[code].days) || null;

  const markets = {};
  let remoteOK = 0, remoteFail = 0;

  for (const code of MARKETS) {
    let days = {};
    let source = 'nager';
    let failedYears = [];

    for (const year of YEARS) {
      const list = await fetchYear(code, year);
      if (list === null) { failedYears.push(year); continue; }
      Object.assign(days, pickDays(list, code));
    }

    if (code === 'TW' && Object.keys(days).length === 0) {
      // Nager has no Taiwan data — builtin table (see header comment).
      source = 'builtin';
      failedYears = [];
      for (const year of YEARS) {
        if (TW_BUILTIN[year]) Object.assign(days, TW_BUILTIN[year]);
        else if (prevMarket('TW')) {
          // Builtin table not yet extended to this year: keep whatever the
          // old file carried rather than silently dropping the factory calendar.
          const old = prevMarket('TW');
          Object.keys(old).forEach(d => { if (d.slice(0, 4) === String(year)) days[d] = old[d]; });
          source = 'builtin+carried-over';
        }
      }
    } else if (failedYears.length) {
      const old = prevMarket(code);
      if (old) {
        failedYears.forEach(year => {
          Object.keys(old).forEach(d => { if (d.slice(0, 4) === String(year)) days[d] = old[d]; });
        });
        source = 'nager (carried over ' + failedYears.join(',') + ': fetch failed)';
      } else {
        source = 'nager (incomplete: ' + failedYears.join(',') + ' unavailable)';
      }
    }

    if (code !== 'TW') { failedYears.length === YEARS.length ? remoteFail++ : remoteOK++; }
    markets[code] = { source, count: Object.keys(days).length, days: sortedDays(days) };
    console.log(code + ': ' + markets[code].count + ' days  (' + source + ')');
  }

  if (remoteOK === 0 && previous) {
    console.error('ABORT: every remote market failed — keeping the existing holidays.json untouched.');
    process.exit(1);
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: 'Nager.Date public API — https://date.nager.at/api/v3/PublicHolidays/{year}/{code} (no key). TW: builtin table in tools/dev/build-holidays.js (Nager has no Taiwan data).',
    years: YEARS,
    markets
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('wrote ' + OUT + ' (' + MARKETS.length + ' markets, years ' + YEARS.join('+') + ')');
}

main().catch(e => { console.error(e); process.exit(1); });
