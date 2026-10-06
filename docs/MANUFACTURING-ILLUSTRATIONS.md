# Manufacturing educational illustrations

Implemented locally on 2026-10-03 at the user's request. The Wiki table of contents and chapter structure are preserved. No production deployment was made.

## What changed

- Nine material sections now use a consistent generated sample plate in place of their stock reference photographs: blade/spring steel, stainless steel, coating, aluminium, rigid plastics, grip compounds, timber, textile and paperboard.
- Seven production gates include generated explanatory examples: intake/traceability, sheet forming, matched tooling, heat/quench/temper, arc-welded T-joint, powder application and dimensional inspection.
- Existing production photographs remain separately captioned. The three existing technical diagrams for heat, tooling and finishing remain accessible in expandable sections. Original material stock files and their credits are retained for rollback.
- HTML captions identify generated concepts, their scope and non-scale proportions. Material appearance does not establish grade or performance; process examples do not establish actual Birdland equipment, certification or a specific product's construction.
- Plastic and timber components remain attributed to specialist partners, with metal manufacturing identified as the core capability.
- All captions and scope notes are translated into the existing nine non-English Factory editions. Source names are unchanged proper nouns.

## Technical ownership

`tools/dev/build-p101.js` remains the Wiki builder. `tools/dev/manufacturing-illustrations.js` supplies figure markup and reviewed scope notes; `manufacturing-illustrations.css` presents the plates through fixed CSS viewports. The plates are displayed without editing their component content. WebP conversion preserves the illustrations while reducing download size.

`data/manufacturing-illustrations.json` records PNG source hashes, WebP hashes, grid mappings and limitations. Source PNGs are outside the public repository at `../catalogue-source/generated-manufacturing/`. The rejected Product Studio exploded drawings remain unapproved under IMAGE-VERIFICATION.md; none was substituted into a SKU or into this Wiki.

## Review limits and references

The generated images were visually reviewed for the stated conceptual relationships, not certified as equipment or production drawings. In particular, the coating cross-section is not to scale, the powder image shows application only, and the dimensional image shows one inspection example. Their captions explicitly retain the omitted stages/inspection-plan limits.

- Sheet forming and die relationship: [TRUMPF bending principles](https://www.trumpf.com/en_US/solutions/applications/bending/).
- Hardening/tempering order: [Bodycote hardening and tempering](https://www.bodycote.com/what-we-do/precision-heat-treatment/hardening-and-tempering-atmosphere-vacuum/).
- Arc welding: [TWI fusion welding](https://www.twi-global.com/technical-knowledge/faqs/what-is-fusion-welding.aspx).
- Powder application and curing: [Nordson powder coating guide](https://www.nordson.com/en/About-Us/Newsroom/Industrial-Coating-Systems-News/Complete-Guide-to-Powder-Coating).
- Dimensional measurement: [NIST dimensional metrology](https://www.nist.gov/pml/sensor-science/dimensional-metrology).

## Validation

Build the English Wiki with `node tools/dev/build-p101.js`, then use `node tools/dev/i18n-page.js build product-101.html` for all translated editions. Update only the Factory translation fingerprints after successful translation; do not stamp unrelated stale pages.

`node tools/dev/manufacturing-check.js` verifies sixteen displayed figure views, distinct atlas cells, preserved seven production photos/three technical diagrams, translated captions, image delivery and mobile layout. `npm run check` and `npm run test` cover the existing site boundary. Section screenshots are saved outside the repository under `../shots/manufacturing-*.png`. Service-worker version is v75.
