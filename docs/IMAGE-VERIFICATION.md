# Latest decision: documented third-party concepts (2026-10-03)

The user explicitly authorizes publicly documented third-party tool construction as the basis of generic concept illustrations; Birdland-specific engineering drawings/BOMs are no longer a prerequisite for these general educational illustrations. The earlier accuracy rule still applies. Do not claim an exact BT/BC construction, complete BOM, verified sales ranking, material grade, dimensions or performance.

Five original images are now connected to Product Studio via data/studio-illustrations.json, studio-references.js/css and the canonical template/build. Referenced physical principles are sourced from FELCO, GARDENA, Sneeboer and packaging manufacturers. These are assembly/functional concepts, not secretly rebranded drawings. Real catalogue photos and SKU data remain separate.

A complex exploded pruner generation failed review (frame decomposition, spring, omitted stop/lock) and was rejected. Its replacement is a complete assembled functional view with a distinct catch, adjustment segment, flat-strip volute spring and stop. Trowel and rake show only documented connection groups; sprinkler drive stays opaque. GARDENA technical-image endpoints return a no-drawing placeholder; do not report them as obtained engineering drawings. Packaging shows one face-seal option, not every optional planning component. Source documents are retained outside the public repo in ../catalogue-source; source links and limits appear next to each published concept image.

Hidden fasteners stay inside complete assemblies, not omitted from a claimed full BOM. Published parts documentation is linked for detailed checking. The generated geometry is illustrative, not an installation procedure or manufacturer-approved engineering validation.

The historical gate and rejected drafts below are retained for traceability; this decision supersedes the statement that no generated structural image has been connected.

---

# Engineering imagery: verification gate

Latest user constraint, 2026-10-03: generated illustrations must follow actual product construction, neither inventing components nor omitting essential parts. Buyers are technical professionals. This takes precedence over the earlier permission to generate clearer concept images.

## Current outcome

No new generated structural illustration has been connected to the website. The first exported pruner draft has been moved outside the public repository to `../catalogue-source/generated-drafts/pruner-reference-UNVERIFIED.png`. Existing image files are retained for reversibility; retaining them does not certify their engineering accuracy.

Generated pruner, trowel, rake, sprinkler and packaging candidates are rejected as verified exploded drawings. In particular, the six-group pruner draft does not explicitly account for the locking mechanism and all necessary retaining components; its numbered groups also do not match the existing workbench's eight reference part categories. Trowel connections and sprinkler internals cannot be established from the generated appearance. A generic-reference caption alone does not remedy these problems.

The local source collection contains Birdland catalogue PDFs, extracted catalogue pages, and reviewed public product records. No matching model-specific engineering drawing or verified BOM was found in the inspected source folders. Catalogue exterior photos do not establish hidden construction.

## Requirements for a replacement

1. Identify the exact model and source revision. Use a Birdland-approved assembly drawing, exploded drawing, verified BOM, or documented disassembly of that exact product.
2. Account for every functional component and assembly interface. Include locks, fasteners, springs, bushings, seals and stops where present in the actual source; do not transplant these from another design.
3. Preserve component shape, quantity, connection method and assembly order. Make simplifications in linework, lighting and layout, not in the underlying construction. State explicitly when a diagram presents assemblies rather than individual parts.
4. Render labels as HTML/SVG text from a reviewed component list rather than trusting generated lettering. Verify label-to-part correspondence on desktop and mobile.
5. Do not infer material grade, hardness, dimensions or performance from surface appearance. Material images can illustrate a surface concept; confirmed technical properties require their own evidence.
6. Third-party official repair documentation can explain why generic illustrations need verification. It is not evidence of a Birdland SKU's BOM and must not be relabelled as one.
7. Keep original assets and record provenance, source/model revision, generation method and review status before changing public references. No unreviewed structural drawing is published by default.

## Primary sources inspected

- FELCO 2 official spare-parts list: https://eu.felco.com/en-lu/collections/spare-parts-felco-2 — identifies model-specific handle assemblies, blade, counterblade, pivot hardware, bushing, thumb catch and associated fasteners, and other components. Not a Birdland product reference.
- GARDENA OS 90 official spare-parts page: https://www.gardena.com/int/products/watering/micro-drip-system/oscillating-sprinkler-os-90/967998901.html — includes model-specific seals, filter and spring element, illustrating that hidden components need documentary evidence. This oscillating design does not validate the generated rotary sprinkler.

Remaining blocker: approved construction evidence for the particular Birdland reference models. Until supplied, generated exterior/surface concepts can be reviewed as concepts, but accurate structural replacements cannot be certified.
