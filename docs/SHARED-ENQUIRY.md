# Catalogue and Product Studio: shared buyer enquiry

Implemented locally on 2026-10-04 under the approved A catalogue-first flow. The public site has not been pushed or deployed.

## Ownership

- `buyer-enquiry.js` owns the shared request model, catalogue browsing, optional component/packaging/sample/logistics fields, versioned lines, preview and text export.
- `buyer-enquiry.css` scopes the new interface to `.be-root`; the original three App frames and Manufacturing wiki remain in their existing sources.
- `buyer-enquiry-labels.js` reuses the existing ten-language dictionaries, adds shared action/logistics labels and Traditional Chinese technical fields. Supplemental technical explanations still use English fallback in editions without a dedicated translation. RFQ text uses English consistently.
- `tools/catalog_partial.html` mounts the workflow in generated Products. `tools/restored-partner_template.html` supplies the same reviewed catalogue to Studio. `studio-needs.js` retains its old implementation as a fallback; the integrated shared workflow owns its current entry. The original engineering/reference workspace remains expandable.
- `buyer-brief.js` bridges the current canonical request snapshot to existing Contact routing. It does not submit an enquiry or upload an attachment.
- `data/catalogue-manifest.json` and `tools/build/catalogue.js` remain the only SKU/image/provenance source. Add a reviewed model there and rebuild: no per-SKU UI implementation is needed.

## Request and privacy boundaries

Each line has a stable local ID and revision. Different configurations of one SKU can coexist. Duplicate configuration makes an independent line. Cancel edit preserves the saved line; closing the workspace keeps the unfinished draft. Removal has one-level undo. Up to 100 lines are supported.

The user's 2026-10-04 request expressly authorizes draft retention and refresh/back navigation. `bl_enquiry_cart_2` holds a sanitized, schema-versioned, 30-minute **sessionStorage** draft after the last edit/workflow action for this browser tab and same-origin page transitions. No request values are written to localStorage or a server. Existing public preference keys and reference UI remain intact. Clearing device preferences removes this new session key too. If session storage is unavailable, a visible message recommends downloading before leaving. File content is never stored; filenames/size metadata remain for a maximum of 20 attachments, requiring original files to be reattached by the buyer.

Order quantity, annual forecast, sample quantity and purpose are separate. Assembly is separate from retail/logistics packaging. Sample arrival, shipment, receipt, launch and evaluation dates remain distinct buyer preferences. The three optional logistics choices are pallet need, expected container/advice, and help consolidating a full container. There is **no CBM, fill percentage, capacity prediction or freight estimate**.

Component fields are generic, optional discussion references, not an SKU BOM. Buyer can name a component/drawing reference, material family, grade, hardness scale/range and requested processing. Changing a component's material clears that component's processing preference only. No compatibility or completed engineering verification is claimed. Multiple catalogue sizes and missing units/dates remain visible open questions.

Commodity context reads `data/buyer-materials.json` independently of AI summaries. Only validated World Bank monthly aluminium or nickel observations are shown, with two observation periods, units, checked date, provider and source link. Nickel is labelled an alloy-input proxy, not a stainless-grade or finished-product price. Other selected materials or missing/malformed data display no verified observation. Processing-cost changes are not fabricated.

RFQ preview, clipboard and TXT download use exactly the same formatter. Local email preview creates no mailbox draft. Contact routing uses the existing buyer-initiated handoff. No message-sent confirmation exists. Attachments are listed by name only. MOQ, prices and lead-time promises are not disclosed or invented.

## Verification

`node tools/dev/enquiry-acceptance.cjs` runs actual Chrome clicks against local `http://localhost:8123/`, with synthetic buyer inputs. It verifies catalogue/search/origin/pagination, separate quantities and component targets, affected-process reset on refresh, Manufacturing popup retention, credible commodity scope, optional packaging and logistics, cross-page state, back navigation, edit cancellation, revisions, copy/remove/undo, exact clipboard/download/email text, Contact snapshot, new concepts and missing dimensions, translated stable option values, 375px overflow and wheel scrolling, 21-line stress, corrupted and expired drafts.

Screens and results: `screenshots/enquiry/`, including `acceptance.json`. `npm test` retains public-page, ten-language, search, legacy engineering workspace and cost-calculator checks, updated only for intentionally replaced catalogue selectors and the newly authorized tab draft behavior. `npm run check` verifies exact generated outputs and source/data invariants.

Local entry: `http://localhost:8123/products.html` and `http://localhost:8123/partner.html#studio-needs`.

Closeout details and precise expiry/translation boundaries: docs/ENQUIRY-CLOSEOUT.md.
