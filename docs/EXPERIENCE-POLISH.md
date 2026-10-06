# Buyer experience polish — 2026-10-04

Implemented locally; no push or production deployment.

## Changes

- Catalogue selection updates existing cards rather than replacing the grid. Keyboard focus, images and browsing position survive adding a model or changing its size.
- Category changes restore focus to the selected category. Removing a shortlist item moves focus to a remaining item or the notes field. Closing a product modal does not steal focus from a subsequent action.
- Product Studio restores focus after switching between a model and an idea.
- Corporate navigation shares its font and touch control height. Phone links wrap when necessary rather than showing a clipped final link. Language menus dismiss with Escape or an outside click.
- Native dialogs close from their backdrop, retain keyboard return, contain their scrolling and prevent the background from scrolling. Backdrop dismissal requires the pointer to start outside, so dragging text from inside does not close the dialog.
- Controls use restrained 160ms colour and border transitions; dialogs use a 160ms entrance. Reduced motion disables these effects. App launch screens retain their artwork with shorter waiting time.
- Purchase Planning fields align across wrapped labels. Its phone result bar has clearance through the end of the document, keeping footer actions reachable.
- Home artwork has an explicit width so its aspect ratio and minimum height cannot widen the page at 1024px. Wiki facts and mobile perspective labels wrap in large text mode.
- Catalogue focus styles stay inside the catalogue instead of affecting every page. Phone inputs in the catalogue, market controls and enquiry use 16px text.
- Products has its own canonical URL. Service worker cache advanced to v81.

The three original apps retain their individual appearance, illustrations and content. Manufacturing retains its Wiki directory. No database, login, published commercial terms or new external services were introduced.

## Verification

All passed with local system Chrome driven by Playwright:

- `npm run build` and `npm run check`: generated pages match their templates; routes, ten language dictionaries and encoding validated.
- `npm test`: 13 public pages at 375/1280px, ten languages, search, deep links, catalogue persistence and live cost calculation.
- `node tools/dev/layout-audit.js`: 12 pages at 375, 390, 768, 1024 and 1440px; navigation containment, no document horizontal overflow, real mouse wheel scrolling, no page exceptions or failed requests.
- `node tools/dev/buyer-journey-check.js`: desktop and phone custom/model enquiry paths, separate sizes and quantities, return/edit/remove, clipboard denial fallback, download, Contact handoff, language changes, storage refusal, expiry/corrupt-state recovery and keyboard modal containment. No mail was actually sent.
- `node tools/dev/experience-check.js`: focused keyboard operations, Escape and backdrop dismissal, background wheel locking, menu dismissal, reduced motion and large text on seven pages at 375/1440px.
- Before/after desktop and phone screenshots reviewed. Screenshots are outside the repository under `../shots/experience-before-*` and `../shots/experience-after-*`.

Preview: `http://localhost:8123/` on this ThinkPad.

These are browser viewport tests, not certification on physical iOS/Android devices or Safari. Existing business data and statistical freshness were not changed by this interaction pass.
