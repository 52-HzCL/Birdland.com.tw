# Products: one selection and enquiry flow

Public catalogue → detail → optional five-step custom request → persistent tab enquiry list → copy/TXT/email preview. There is no checkout, price, MOQ, delivery promise, automatic email or file upload. Original Studio URLs and engineering references remain available; the primary flow does not require changing Apps.

## Publication boundary

`data/catalogue-access.json` fixes the existing 69 published SKU baseline. Existing records without an explicit visibility inherit public status only when in this baseline. New records require `visibility: "public"` and an allowed public source. `visibility: "oem"`, unreviewed new SKUs and any `customerConfidential: true` record are excluded from every static catalogue, including Studio. Public source projection contains only ID/title; internal order/source objects are not copied.

Invited OEM is **not enabled**. The interface never accepts a PIN, grants authority or requests an OEM catalogue. Public output contains only `oem.enabled: false`. CSS hiding, client storage and query parameters confer no access. No new service, persistent invitation credential or security setting was created.

To activate actual OEM access later, the owner must approve: (1) the existing or chosen server authentication/hosting service, (2) the explicit approved OEM inventory excluding confidential customer programmes, (3) server-held invitation verification and access-expiry policy, and (4) credential configuration and deployment. Authentication must precede any restricted catalogue response. The endpoint must return 401/403 without product metadata when unauthorized and use private/no-store responses. Never place the private master, credentials or customer SC files in this repository or GitHub Pages. Server-authorized SKU filtering and source projection must occur before serialization.

## Extending public details

`data/catalogue-manifest.json` remains identity, classification, origin, catalogue facts and image extraction source. `data/product-details.json` adds records keyed by SKU. Every detail record must have `publication: "public"`; each gallery/feature/packaging/specification item must also explicitly be public. Unknown descriptions/features/packaging are empty, not fabricated. The canonical builder projects public data through `tools/build/product-details.js` into `catalog.json` and both generated entrances.

Supported detail fields: stable product version; locale-keyed descriptions; stable feature IDs and locale text; gallery IDs/assets/captions; named specifications with value, unit, status and public evidence; curated `new`/`featured` collections; packaging variants with stable ID/version, locale title/description, format/material and confirmation status. Current facts use the source catalogue only. Additional specifications are pending confirmation unless catalogue-backed; SKU-specific verified BOM, grade, hardness and fit are not inferred from generic engineering references.

Packaging is per configuration. A selected package reference ID/version survives edit, reload, copy and RFQ export; changed requirements remain subject to review. SC-specific customer identity, branding, barcode, prices, order quantities, trade terms and private drawings belong to internal order records. Extract only explicitly approved common product facts into this public file; never import an SC wholesale.

## Collections and campaigns

All/New/Featured/Promotion coexist with tool-category, origin and search filters. All new collections and campaigns are currently empty: no new/hot/discount claim was assigned without evidence. Curated collections are manually published metadata, not inferred from SC dates or sales.

Campaigns require public publication, stable ID/version, matching public product SKUs, locale title/terms, and explicit valid-from/valid-until timestamps. Expired or future campaigns are not returned as active. A request captures an English campaign summary, version and validity; RFQ and cart warn that configuration changes require eligibility confirmation. No price or discount calculation is added. Conditions summaries should fit the existing 2,000-character request-field retention limit; longer full conditions require an approved public reference and a concise summary.

## Interaction and accessibility

Image/detail entry, visible focus, predictable return buttons and optional material/processing/packaging knowledge panels preserve context. Add-to-list feedback lasts 320ms; revised-row confirmation 360ms. No shake, reward gamble, artificial scarcity, forced wait or action delay. Reduced motion disables animations/transitions. An external polite live region announces list count/revisions even when the list is rerendered. State is not communicated by colour alone; pressed states, labels, borders and IDs remain visible.

Tab draft behavior remains the explicit 30-minute session authorization in `ENQUIRY-CLOSEOUT.md`. Catalogue filters, selected detail and gallery can be retained with the tab draft; no persistent buyer identity or localStorage request was added. Classic `?sku=...` links select the matching public model; `?sku=...&view=detail` opens its public detail.

## Actual validation

`products-experience-check.cjs`: public-only projection; restricted/confidential/unreviewed exclusion; private-source stripping; real desktop/mobile complete flow; honest zero-data collections; disabled OEM without requests; long-copy/gallery/package/campaign synthetic fixtures; RFQ/clipboard/TXT; 69-line rapid double clicks and reload; keyboard detail heading; reduced motion.

`enquiry-locales-check.cjs`: ten editions, public/OEM/empty collection/detail, five configuration steps and guides, desktop/modal geometry and mobile overflow. Existing `enquiry-acceptance.cjs`, `enquiry-closeout-check.cjs`, `npm test` and `npm run check` remain required. Fixture data is isolated inside browser/test inputs; delivery images depict the actual public catalogue only.
