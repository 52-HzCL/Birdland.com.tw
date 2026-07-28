# Public data schema

This site publishes public market, sourcing and catalogue information only. It
must never contain a customer name, email address, quote, drawing, specification,
order, price agreement or project identifier.

## `outlook-data.json`

`outlook-data.json` is the daily edition payload injected into `news.html`,
`partner.html`, `team.html` and `executive.html` at build time.

- `updated`: human-readable edition timestamp. It means the workflow produced an
  edition; it does **not** mean every source succeeded.
- `status.workflow`: workflow run time and overall state.
- `status.sources`: source-level state. Valid states are `current`, `delayed`,
  `manual`, `modelled` and `unavailable`.
- `indices`, `macro`, `shipping`, `market_news`: daily or best-effort public
  context. Renderers must show the supplied source state and tolerate absence.
- `market_news` items may carry `topic`, `category`, `region`, `source_tier` and
  `fetched_at`. `source_tier` is `official`, `trade` or `context`; it must never
  imply that a Google News redirect is a direct official feed.
- `timeline`, `landed`, `tariff_calc`, `partner.*`: desk-set public planning
  content. These are never presented as live feeds.

The Gemini merge preserves only known top-level fields. Do not add a new field to
this JSON without also updating `tools/gen_news_gemini.py` carry-through logic.

## `product-offers.json`

The public Product & Offer Finder feed. Every item must have a stable id, public
view-only HTTPS PDF URL, factual availability and `status: "published"`.
Customer-specific catalogues, private folders, expiring tokens, prices and quotes
are prohibited.

## `calendar-events.json`

The manual source for the public Calendar Hub and `.ics` feeds.

- `id`: stable public identifier.
- `starts_at` / `ends_at`: ISO 8601 UTC times.
- `status`: `scheduled`, `actual`, `forecast` or `manual`.
- `source_url`: an official or primary source when one exists.
- `verified_at`: date Birdland last checked the public event.
- `deep_link`: same-origin report or manufacturing page only.

Calendar events are public planning reminders, never customer milestones.

## RSS feeds

`tools/build_feeds.py` generates the public, deterministic RSS files in `feeds/`
from `market_news`. They contain only public titles, source attribution, a deep
link and a short buyer-action prompt; they never contain article text or customer
information. A feed can be empty when no relevant public item is available.

## Local-only browser preferences

Allowed local keys use the existing namespaces (`bd_e_*`, `bd_p_*`, `bl_*`) and
may hold only language choice, selected public region, watch categories, saved
public report ids, last-seen hashes and read state. A visible "Clear this device"
control must delete them. Names, email addresses, free text, quantities and prices
are not allowed in local storage.
