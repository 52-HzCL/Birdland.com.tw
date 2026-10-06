# Buyer workflow repairs — 2026-10-03

Local-only first batch. No push, merge or deployment. Preserve the three original apps, Wiki and source-linked concept images.

1. Configurator header/footer return links now target `products.html#bl-cat`. Source: `tools/configurator_template.html`; rebuild with `node tools/dev/build-configurator.js`.
2. Market Compare stores two comparison positions including empty strings. Clearing the first no longer moves the second. Explicit None choices survive reload and category/market changes. Existing saved choices are normalized; only users without a configured selection receive defaults.
3. Purchase Planning retains quote/freight/duty inputs when product/category/market changes, clears prior result/copy feedback and disables estimate/copy/mobile result until explicit review confirmation. Editing values alone does not confirm the changed context. Returning to the last confirmed context is valid. Form reset clears the review requirement. Private quote values are never persisted.
4. Availability selectors use non-stale finite unit-value and volume observations with known piece/kg basis for the selected statistical category. Missing data remains missing, never zero. Unmapped watering/hand-tool categories receive no inferred HS mapping.

Sources: `buyer-tools.js/css`, `buyer-intelligence.js`, `market-reading.js/css`, `tools/build/repair-labels.js`. Ten-language labels enter `site-registry.js` through the canonical build. Service worker v77.

Validation: `npm run check`, `npm test`, `node tools/dev/buyer-repairs-check.js`, `node tools/dev/studio-illustrations-check.js`. Repair test drives Chrome at 1440px and 375px; exercises actual return links, history, empty comparison slots, reload, changed context, edits/confirmation, invalid quantity, preference clear/form reset, all ten language labels and mobile overflow. Evidence lives outside the repo in `../site-audit/repairs-*.png` and `buyer-repairs-results.json`.

The existing main test formerly cleared the first peer twice, relying on the faulty slot compaction; it now explicitly clears both peers.

Known remaining scope: nine static translated configurator pages were already absent and their page translation dictionaries are absent. This batch fixes the root configurator's return path; it does not claim to localize the advanced configurator. Full RFQ/output consolidation, browser engines beyond Chrome and production deployment remain separate work.

Concept imagery already integrated: five original, source-linked functional/assembly illustrations; nine material and seven process examples in Manufacturing. See `data/studio-illustrations.json`, `docs/IMAGE-VERIFICATION.md` and `docs/MANUFACTURING-ILLUSTRATIONS.md`. These are general concepts, never Birdland SKU engineering drawings or quantity-complete BOMs. Public sources do not establish bestseller rankings.

Update: the nine missing configurator editions are repaired in the next local batch. See [CONFIGURATOR-I18N.md](CONFIGURATOR-I18N.md) for its precise validation scope; the earlier audit/report remains historical evidence.
