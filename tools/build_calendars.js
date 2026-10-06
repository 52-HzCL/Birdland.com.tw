#!/usr/bin/env node
/* Build public iCalendar feeds from calendar-events.json. No dependencies. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'calendar-events.json'), 'utf8'));
const out = path.join(root, 'calendars');
const verifiedDates = (source.events || []).map((event) => String(event.verified_at || '')).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
const stamp = (verifiedDates[verifiedDates.length - 1] || '1970-01-01').replace(/-/g, '') + 'T000000Z';

function esc(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function date(value) { return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function feed(name, events) {
  const rows = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Birdland//Public Calendar Hub//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Birdland '+name];
  events.forEach((event) => {
    rows.push('BEGIN:VEVENT', 'UID:'+esc(event.id)+'@birdland.com.tw', 'DTSTAMP:'+stamp, 'DTSTART:'+date(event.starts_at), 'DTEND:'+date(event.ends_at), 'SUMMARY:'+esc(event.title), 'DESCRIPTION:'+esc(event.buyer_meaning+' Source: '+event.source_url+' Birdland: https://birdland.com.tw/'+event.deep_link), 'URL:https://birdland.com.tw/'+event.deep_link, 'STATUS:CONFIRMED', 'CATEGORIES:'+esc((event.topics || []).join(',')), 'END:VEVENT');
  });
  rows.push('END:VCALENDAR', '');
  return rows.join('\r\n');
}
fs.mkdirSync(out, { recursive: true });
const events = (source.events || []).filter((event) => event && event.id && event.starts_at && event.ends_at);
const sets = { global: events };
events.forEach((event) => {
  (event.topics || []).forEach((topic) => ((sets[topic] ||= []).push(event)));
  if (event.region) ((sets[event.region.toLowerCase().replace(/\s+/g, '-') ] ||= []).push(event));
});
Object.entries(sets).forEach(([name, list]) => fs.writeFileSync(path.join(out, name+'.ics'), feed(name, [...new Map(list.map((event) => [event.id, event])).values()]), 'utf8'));
console.log('built', Object.keys(sets).length, 'calendar feeds');
