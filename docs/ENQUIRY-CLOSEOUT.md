# Enquiry closeout: actual integration checks

This closes the 2026-10-04 local integration. No push, deployment, service, account or destination changed.

| Area | Actual support | Boundary |
| --- | --- | --- |
| Catalogue facts | 69 source-linked SKU references, exterior photos, Taiwan/China origin, stated catalogue dimensions and PDF page | These facts do not verify internal parts, grade, hardness, MOQ, price or availability |
| Component requests | Three optional discussion references: working part, handle/grip, connection/joint. Each can be renamed using buyer's drawing reference | Generic reference slots, not a SKU-specific BOM. Complete drawings/BOM must be separately attached |
| Materials | Carbon steel, stainless family, aluminium alloy, polymer grip, or ask for advice; buyer-entered grade | No per-SKU approved-grade list or automatic material suitability verdict |
| Processing/hardness | Heat treatment, surface finish, forming/machining, injection/overmoulding, or advice; HRC/HB/Shore A and buyer target range | All are requested directions pending engineering. “Buyer specification supplied” is a claimed information basis, not Birdland approval. Only input consistency is checked |
| Package/sample/logistics | Every configuration owns its package, print/barcode, display, inner/outer/pallet/supply; separate order/annual/sample quantities; five distinct dates; pallet/container/consolidation preference | No CBM, container capacity, freight quotation or delivery promise |
| Commodity context | Actual two-month World Bank aluminium or nickel observations with unit, observation periods, checked timestamp and source | Nickel is an alloy-input proxy. Carbon steel and unavailable/malformed input show no verified observation. No fabricated processing-cost or product-price change |
| Deep references | Real `product-101.html#s-mat` and `#gate-heat`; original `my-market.html` and `executive.html` Apps in new tabs | Both Manufacturing anchors checked to exist. Returning keeps buyer configuration unchanged |
| Summary | Same-SKU different configurations remain separate; stable ID/version, cancel, copy, delete/undo, optional-field export, clipboard/TXT/email preview | Fixed a genuine omission: counterpart standard/unit now exports even when mating size remains blank. Missing data stays pending |

## Exact draft behavior

- Tab-scoped `sessionStorage bl_enquiry_cart_2` expires **30 minutes after the last edit or workflow action**. There is no localStorage request persistence, server save or file-content storage.
- Catalogue/Studio navigation and refresh preserve the draft while it is valid; merely opening/loading a page does not extend the saved deadline.
- A visible retention notice is present. With five minutes remaining, it warns and offers explicit renewal or a full-draft text download, including an unfinished configuration.
- At expiry, the saved session record is removed. An already open page keeps its in-memory work and visibly warns that refresh/leaving may lose it. Explicit renewal starts another 30-minute tab save; typing or a workflow action likewise renews it.
- Attempting to unload an open expired/unsaved-to-storage draft requests the browser's normal leave-page warning. On a fresh load after expiry, expired saved data is not restored and an expiry notice appears. This does not promise recovery after tab/browser closure.
- The independent Contact handoff remains the existing buyer-initiated, 30-minute transfer; no transmission destination changed.

## Language scope

All ten existing editions are covered: en, nl, de, fr, es, pt-br, pl, it, ja, zh-tw. The eight supplemental editions now include the new technical fields, option labels, guides, warnings, comparison metadata, placeholders, accessibility labels and draft-expiry notices. Traditional Chinese comparison and metadata omissions were also filled. Canonical source is `tools/build/enquiry-copy.js`; the build generates `buyer-enquiry-locales.js`, which overrides legacy English fallbacks while reusing the site dictionary. Structural labels are composed without changing saved option values.

Brand/App names, SKU IDs, HRC/HB/Shore A, engineering units, buyer-entered text, source titles and original catalogue specification quotations are preserved. RFQ, TXT and email body remain the same intentionally English business export in every edition. No translation widget, account or external translation service was introduced. Generic catalogue product names are localized where a corresponding label is available; original source specification quotations remain verbatim evidence.

Actual Chrome checks cover all ten editions at 1440px and 375px, all five configuration steps, eleven guides, configuration comparison, RFQ/email preview, new concepts and Catalogue/Studio draft continuity. Each supplemental language is checked against the English UI inventory for remaining long technical fallback. Product Studio overlays now reserve the actual App bar/dock area, so long translations and the save button are not covered by the original navigation.

## Actual browser evidence

- `node tools/dev/enquiry-acceptance.cjs`: full integrated flow, two same-SKU custom configurations, cancel, refresh/back, copied/removed/restored lines, missing data, complete clipboard/TXT/email consistency, 21-line list and 375px scrolling.
- `node tools/dev/enquiry-closeout-check.cjs`: virtual-clock 25-minute and 30-minute actual UI states, unchanged expiry across both pages and refresh, retained in-memory unfinished fields, full-draft download and renewal; all packaging/date/logistics values; counterpart-only summary; actual Manufacturing anchors and both App popups; real commodity periods and values; malformed data; English/Traditional Chinese guides.
- `node tools/dev/enquiry-locales-check.cjs`: ten editions, desktop/mobile overflow, scrollable modal body and App-dock clearance, stable English field values, shared Catalogue/Studio lines and absence of long technical English fallback in the eight supplemental editions.
- Outputs: `screenshots/enquiry/acceptance.json`, `closeout-acceptance.json`, `locales-acceptance.json`; per-edition copy inventories and mobile screenshots. Inputs are synthetic test data. Prototype tests were not substituted for integration tests.

Remaining data limit: SKU-specific validated engineering drawings, complete BOM, approved material grades, hardness results and compatibility. These are pending engineering confirmation and are not inferred from source catalogue photos. No email was inspected during this translation closeout.

Local previews: `http://localhost:8123/products.html` and `http://localhost:8123/partner.html#studio-needs`. Use the existing language selector; these shared App routes do not have invented per-language URL paths. The independent prototype on port 8134 remains unchanged. Nothing was pushed or deployed.

## Customise visual/navigation repair

The reported translucent overlapping text was reproducible on desktop Studio. The App switcher is inline in the top bar on desktop; treating its distance from the viewport bottom as a fixed bottom dock reduced the overlay to 32px and its panel to 2px. Bottom reservation now applies only to an actual fixed dock in the bottom half of the viewport. Both page headers are measured for top clearance. Configuration header/body have opaque backgrounds and a bounded flex layout with the body scrolling between the header and footer. Launch-screen fade no longer covers an active configuration, and a buyer action dismisses that decorative launch sheet.

The ambiguous “I have a model” CTA now uses the existing translated model/tool search label. Its action actually returns to catalogue view and focuses search; it retains the unfinished configuration. Both entrances have a compact Products/Product Studio navigation row with current-page indication and a return/resume action when relevant. Original App frames and engineering workspace remain.

Regression: `node tools/dev/enquiry-visual-repair.cjs` checks both entrances at 1440, 1280 and 375px, full panel/body/footer containment and opacity, help, resume, cross-page navigation, browser back/forward, and returning from a new concept without losing its text. `enquiry-locales-check.cjs` additionally asserts the desktop Studio panel/body dimensions in every edition; width-only checks cannot detect this collapse.
