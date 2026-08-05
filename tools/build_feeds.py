#!/usr/bin/env python3
"""Build deterministic public RSS feeds from the daily public outlook payload."""
from datetime import datetime, timezone
from email.utils import format_datetime
from hashlib import sha256
from html import escape
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "outlook-data.json").read_text(encoding="utf-8"))
OUT = ROOT / "feeds"
OUT.mkdir(exist_ok=True)
BASE = "https://birdland.com.tw/"

def parse_date(value):
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    for parser in (
        lambda: datetime.fromisoformat(text),
        lambda: datetime.strptime(text, "%d %b %Y, %H:%M UTC").replace(tzinfo=timezone.utc),
        lambda: datetime.strptime(text, "%Y-%m-%d").replace(tzinfo=timezone.utc),
    ):
        try:
            result = parser()
            return result if result.tzinfo else result.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None

def action(topic):
    return {
        "freight": "Review upcoming bookings before changing a sailing plan.",
        "tariff": "Recheck origin and documentation before confirming validity.",
        "taiwan": "Confirm Taiwan-origin timing with Birdland before locking delivery.",
        "china": "Recheck China-origin lead-time assumptions before locking delivery.",
    }.get(str(topic).lower(), "Review the original source before changing a buying decision.")

def item_xml(item):
    title = str(item.get("title") or "").strip()
    url = str(item.get("url") or BASE + "executive.html#news")
    topic = str(item.get("topic") or "supply")
    publisher = str(item.get("source") or "Public source")
    stamp = item.get("date") or DATA.get("updated") or ""
    guid = sha256((title + "|" + url + "|" + str(stamp)).encode("utf-8")).hexdigest()
    desc = "{} Source: {}. Buyer action: {}".format(title, publisher, action(topic))
    bits = ["<item>", "<title>{}</title>".format(escape(title)), "<link>{}</link>".format(escape(url)), "<guid isPermaLink=\"false\">{}</guid>".format(guid), "<category>{}</category>".format(escape(topic)), "<description>{}</description>".format(escape(desc))]
    parsed = parse_date(stamp)
    if parsed:
        bits.append("<pubDate>{}</pubDate>".format(format_datetime(parsed)))
    bits.append("</item>")
    return "".join(bits)

def feed(filename, title, description, items):
    rows = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0"><channel>', '<title>{}</title>'.format(escape(title)), '<link>{}</link>'.format(BASE + "executive.html#news"), '<description>{}</description>'.format(escape(description)), '<language>en</language>']
    updated = parse_date(DATA.get("updated"))
    if updated:
        rows.append("<lastBuildDate>{}</lastBuildDate>".format(format_datetime(updated)))
    rows.extend(item_xml(item) for item in items if item.get("title"))
    rows.extend(["</channel></rss>", ""])
    (OUT / filename).write_text("\n".join(rows), encoding="utf-8")

items = [x for x in DATA.get("market_news", []) if isinstance(x, dict) and x.get("title")]
feed("daily-supply-news.xml", "Birdland ABrief", "Asia production, export and freight signals for Western buyers.", items)
feed("taiwan-production.xml", "Birdland Taiwan Production", "Public Taiwan production and export signals.", [x for x in items if x.get("topic") == "taiwan"])
feed("china-production.xml", "Birdland China Production", "Public China production and export signals.", [x for x in items if x.get("topic") == "china"])
feed("freight-trade-policy.xml", "Birdland Freight & Trade Policy", "Public freight, tariff and policy signals.", [x for x in items if x.get("topic") in ("shipping", "freight", "tariff")])
print("built RSS feeds", len(items), "news items")
