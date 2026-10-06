# Product Studio: approved needs-first entry

Implemented 2026-10-03 from the buyer-approved mockup. This reading layer supersedes the Product Studio entry layout in APP-RESTORATION.md; the original engineering and reference functions remain available.

The public entry asks for a known catalogue model or a new idea, main use, and up to two priorities. Material/process advice is a request to Birdland staff, not automated specification approval. The summary separates deliberate buyer choices, unresolved decisions/reference choices, and engineering review. It can be previewed and copied into the buyer's own enquiry. No price, MOQ or commercial lead time is published.

Source ownership:

- `tools/restored-partner_template.html` remains the page source. `studio-needs.js/css` own only the needs-first layer; `tools/build/studio-labels.js` supplies labels for all ten languages through the generated site registry.
- The page embeds the same canonical catalogue produced by `tools/build/catalogue.js`. All 69 model IDs, photos and origins come from reviewed catalogue records; BT/Taiwan and BC/China are not invented diagram mappings.
- The original reference catalogue is a separate set of 52 capability references, retained inside the reference-library accordion. The engineering workspace retains its original diagrams, material/process selection, comparison modal, notes and controls.
- Engineering defaults are examples. Only deliberate material/process button clicks enter the new brief, labelled as reference choices. Selecting another category/model clears those choices. Generic engineering diagrams never establish a catalogue SKU's BOM.
- Buyer needs remain in memory for this page session. No database, account, extra AI call, automatic sending or new data-refresh job was added. The Purchase Planning link carries only public catalogue/category preferences through the existing `BL_FOCUS` API.
- The original folding script previously moved `#p-col`, containing the catalogue and overview, into a closed details element. `BL_STUDIO_NEEDS` bypasses that wrapper. The new layer moves existing nodes into explicit secondary accordions rather than rebuilding their controls.
- Original engine `#pd-builder` links open the engineering accordion. Removed legacy calculator panel hashes route to the existing Purchase Planning workspace. Original cost/origin panel navigation remains available; its rail appears when that panel is active.
- Cross-document view transitions are disabled on this entry, following Market Compare's existing compatibility fix. Chrome otherwise reports aborted/invalid transitions when a legacy calculator hash redirects between the original app and Purchase Planning.

Verification: `npm run build`, `npm run check`, `npm run test`, and `node tools/dev/studio-check.js` against the local preview. The Studio browser check covers actual default visibility, 69 model selection, verified photos/origins, two-priority limit, clipboard text, session reset, explicit engineering selections, comparison modal, 52 reference rows, panel navigation, legacy calculator routing, ten languages and mobile overflow.

Visual evidence is stored outside the repository in `../shots/studio-needs-1440.png` and `../shots/studio-needs-375.png`. Portable public preview is generated with `npm run preview:package`. Service-worker cache version is v74. No commit, push, merge or production deployment was performed.

## Material/process discoverability repair — 2026-10-04

The material/process controls had not been removed. They were inside the closed original engineering workspace, while disabling the recommendation checkbox revealed nothing. The main entry therefore appeared to provide no way to specify them.

The buyer entry now has an explicit, translated **Choose reference material & process** button beside the recommendation path. It opens and jumps directly to the retained engineering controls, skipping the cost content above them. A translated return button leads back to the buyer brief. No second material catalogue or configuration interface was created.

Deliberate choices appear in the buyer summary and enquiry preview with **reference; requires confirmation**. Original workspace defaults remain examples. Clearing references preserves the buyer's purpose and priorities; changing the catalogue model, category or starting mode clears references. Explicit Contact handoff and return restore both the summary and original control selections through the existing 30-minute tab-scoped handoff. No new long-term storage is used. Selection indices are sanitized before handoff; no catalogue SKU-to-BOM mapping is asserted.

Verified in a dedicated visible desktop Chrome window with `node tools/dev/studio-reference-check.js`: the reported zh-TW BT-3149A scenario, keyboard entry and selection, original controls, summary/preview, Contact return with matched control state, clearing, model/mode changes, ten translated entries and 375px layout. Original Studio checks and existing buyer-journey regression checks also pass. New screenshots: `../shots/studio-material-entry-zh-desktop.png`, `../shots/studio-material-controls-zh-desktop.png`, `../shots/studio-material-entry-zh-mobile.png`. Current service-worker cache is v82; local preview only, no push/deploy.
