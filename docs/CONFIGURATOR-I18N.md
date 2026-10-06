# Configurator language repair — 2026-10-03

Local-only repair of the nine missing translated configurator routes. No push, deployment, mailto navigation or real submission.

## Authoritative sources and build

- `tools/configurator_template.html`: static shell, drawing/menu/summary runtime.
- `tools/dev/configurator-data.js`: unchanged 17 model structures and canonical English option identifiers.
- `i18n/page.configurator.<language>.json`: translated shell, tier copy, product and part names. Trowel blade has a contextual label rather than a generic knife blade label.
- `i18n/configurator.<language>.json`: existing UI/CSV/mail labels plus translated empty-sheet and confirmation wording.
- `i18n/page.product-101.<language>.json`: existing 58 option names and buyer/production notes reused without new technical claims.
- `tools/dev/build-configurator.js`: builds all ten real pages from those sources, rejects missing translations, writes relative assets and language handoff/hreflang/fingerprints.

`npm run build` now includes all configurator editions. Standalone: `node tools/dev/build-configurator.js --all`. The existing `node tools/dev/i18n-page.js build configurator.html [language]` delegates to the dedicated builder; it no longer requires the retired language picker.

## State and navigation

Selections keep the existing canonical English option identifiers in the existing `bl_cfg_sheet` storage; translated labels are presentation/export only. Previously saved English selections remain compatible. Quantity and delivery retain the existing persistence behavior. The current public model id travels as `?product=...`, including actual language links. Reload and language changes do not create a duplicate selection. The root URL explicitly chooses English; each language-folder URL explicitly chooses that language.

The configurator retains the formal Products return and adds a secondary Product Studio return. Products' existing disclosure link follows the active edition. Studio's existing configurator link now follows its active language through `studio-needs.js`; original app appearance and other content are unchanged. The obsolete shared-navigation rewrite that would mislabel the Studio return as Products is removed. Service worker v78.

## Validation scope

`node tools/dev/configurator-i18n-check.js` drives Chrome at 1440px and 375px across en/nl/de/fr/es/pt-br/pl/it/ja/zh-tw. Each direct URL must return 200. Each edition exercises all 17 models, every gate on the first part, canonical identifiers and responsive width. Actual language links preserve a pruning-shears selection, quantity 1500 and delivery 2027-02. Twenty downloaded CSVs must contain the active edition's headings, product and option labels and retained input. Products/Studio round trips and browser back/forward/reload are tested in every edition. Mail button enablement is checked; nothing is sent.

Evidence outside repo: `../site-audit/configurator-i18n/results.json`, representative en/de/fr/ja/zh-tw screenshots at both sizes, and localized CSV samples. Reproduce with a running local server on port 8123, then run the command above.

Related checks: `npm run check`, `npm test`, `node tools/dev/i18n-drift.js`, `node tools/dev/buyer-repairs-check.js`, `node tools/dev/studio-check.js`. The first four buyer repairs remain covered. No Safari/Firefox or offline/service-worker acceptance test is claimed. Translation completeness and operation are checked; all nine translations have not been independently proofread by native speakers. This does not certify model-specific engineering drawings or a complete RFQ architecture.
