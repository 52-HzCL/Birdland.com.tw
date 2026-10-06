# Catalogue integration and buyer planning

The Products page represents metal-tool manufacturing capabilities for importers
and private-label brands. It is not a stock list. Plastic and wooden components
are explicitly described as specialist-partner supplies. No product price, MOQ,
lead time or availability claim is published.

## Sources and selected coverage

Two user-authorized catalogue PDFs were downloaded and visually reviewed: a
60-page BC catalogue and the 68-page Garden Tools catalogue. The latter is
byte-identical to the synced OneDrive Garden_Catalog_Birdland.pdf. Full PDFs,
private share links and access parameters remain outside the repository.

69 representative models cover eight tool categories: 18 pruners/snips, 4 hedge
shears, 7 loppers, 10 saws, 10 hoes, 6 hand tools, 8 rakes and 6 brass fittings.
BT means Taiwan production and BC means China production, as confirmed by the
owner. This is a curated capability selection, not transcription of every page.
Pure plastic products, decorations and unrelated accessories are not in the
primary catalogue. No claim is made that every metal process is done in-house.

data/catalogue-manifest.json owns reviewed SKU, dimensions, origin, source PDF
page, source hash and extraction coordinates/image references. Page means PDF
page, not its printed page number. Embedded original images are preferred;
scanned BT pages use reviewed crops. Small source images remain small: no AI
product reconstruction or invented details. Some scanned crops retain original
catalogue annotations; higher-resolution source photographs would improve them.

data/catalogue-categories.json owns the eight categories. The canonical builder
generates catalog.json using tools/build/catalogue.js. Only edit source data.
data/legacy-catalog-selections.json preserves 56 earlier capability IDs solely
for existing saved enquiries. They are never relabelled as official SKUs.

To reproduce images, install PyMuPDF in a developer Python environment, supply
the exact source PDFs as china.pdf/taiwan.pdf in an external folder, then run:

```
python tools/import_catalogue.py --source-dir <private-folder> --output-dir <crop-folder>
node tools/dev/encode-catalogue.js <crop-folder>
npm run build
npm run check
```

## Page and selection boundaries

tools/products_template.html owns partner.html independently of the large cost
workspace. Products loads no outlook payload, manufacturing-options table or
legacy desk scripts. Legacy engineering/calculator URLs redirect via
product-links.js to cost-desk.html, retaining queries and hashes. The engineering
builder is rescued into a disclosure on the cost page so its old material links
continue to work. Original homepage artwork and the shared design tokens remain.

Model search ignores punctuation (BT9005 and BT-9005 both work). Global search
contains all 69 verified references and resolves directly to a model. Origin
filters use full country names. Multi-length catalogue models require a dimension
before selection; their enquiry entry includes SKU plus chosen dimension. Distinct
blade designs are not merged just because their code prefixes look similar.

Only public selection IDs/dimensions and filter preferences persist under the
existing bl-cat key. Quantities and optional requirements stay in page memory and
expire on reload. Copy produces plain text; nothing is sent or submitted. A clear
control removes selections. Existing capability selections survive without
automatic matching to a supposedly equivalent official tool.

## Buying Tools

The existing landed-cost tool remains the main entry. Secondary references stay
collapsed. A compact material reference uses 12 actual monthly World Bank
observations for aluminum and nickel, with relative index (first month = 100),
month-on-month change, observation month, accessible history and source attribution.
These are commodity references, not steel procurement costs or tool quotations.

tools/fetch_buyer_materials.py discovers the current workbook from the official
World Bank commodity page, validates headers/units/finite values/contiguous months,
and writes data/buyer-materials.json. It uses Python's standard library and no
API key or database. The existing daily workflow calls it before building. Failed
fetches and older workbooks preserve the previous data and successful timestamp.
The UI labels older observations instead of presenting them as today's prices.
The current source observations end in August 2026. Data attribution and the
World Bank data terms are linked beside the reference.

Freight remains a link to the public route report: the existing FRED status is
unavailable and AI summaries lack verified observation provenance. No licensed
freight time series or fabricated processing index is added. Cost sensitivity
uses buyer-entered component shares summing to 100 and explicit assumed changes.
An invalid total produces no result; inputs are not persisted.

## Verification

npm run build/check/test cover twelve public pages at 375/1280px, ten languages,
official SKU search/deep links, origin/photo contracts, dimension selection,
clipboard output, selection persistence, ephemeral quantities/notes, earlier IDs,
dialog focus/ESC, legacy engineering links, material trend and cost sensitivity.
Desktop/mobile screenshots at 1440/375px are stored outside the repository.
No remote commit, push or deployment was performed.
