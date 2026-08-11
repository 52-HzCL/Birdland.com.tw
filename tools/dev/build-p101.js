// Assembles product-101.html (reference-article layout) from structured data,
// the three blueprint SVG sprite files and the EU/US DIY ratings table.
// Section numbers derive from SECTIONS order, so inserting or reordering a
// section renumbers the body and the table of contents together.
// Run from the repo root:  node ../build-p101.js
const fs = require('fs');
const path = require('path');
const SCRATCH = __dirname;
const RATE = require(path.join(SCRATCH, 'ratings.js'));
// The Factory ships in ten editions, so it carries the facade's own picker and
// hreflang cluster rather than a control of its own. Both come from the shared
// list, and i18n-build.js writes the identical markup into this page — either
// tool can run last and the bytes are the same.
const { picker, cluster } = require(path.join(SCRATCH, '_langs.js'));

// The sprite files hold bare <symbol> elements, so they MUST be re-wrapped in a
// real <svg>. A <symbol> parsed outside an <svg> lands in the XHTML namespace
// and every <use href="#id"> then resolves to nothing and renders blank — which
// is exactly what shipped on 2026-07-30.
const symbols = ['bp-process.svg', 'bp-material.svg', 'bp-pack.svg']
  .map(f => fs.readFileSync(path.join(SCRATCH, f), 'utf8'))
  .map(s => s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim())
  .join('\n');
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">\n${symbols}\n</svg>`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The catalogue link comes from product-offers.json so AsiaSource and this
// page cannot drift apart — that file is the publishing source (docs/PRODUCT-OFFERS.md).
const OFFERS = JSON.parse(fs.readFileSync('product-offers.json', 'utf8'));
const CAT = (OFFERS.items || []).find(i => i.type === 'catalogue' && i.status === 'published');
if (!CAT) throw new Error('no published catalogue in product-offers.json');
const CATALOGUE_URL = CAT.pdf_url;

// ----------------------------------------------------------------- photos ---
// Third-party stock reference photographs. Birdland's own production
// photographs live in images/thumbs/ and are captioned "on our floor"; these
// are captioned as stock and credited, so the two can never be read as the
// same claim. Two subjects had no usable stock photograph and keep a drawing.
const PHOTOS = JSON.parse(fs.readFileSync('images/enc/CREDITS.json', 'utf8'));
const photoOf = id => (PHOTOS.items || []).find(p => p.id === id);
const stockFig = (id, cap) => {
  const p = photoOf(id);
  if (!p) return '';
  return `<figure class="wk-photo"><img src="images/${p.file}" alt="${esc(cap)}" loading="lazy" decoding="async">` +
    `<figcaption>${esc(cap)}<small>Stock reference photograph${p.photographer ? ' · ' + esc(p.photographer) : ''} / Pexels</small></figcaption></figure>`;
};

// ---------------------------------------------------------------- ratings ---
// Two scales that must never be confused, so they use different shapes rather
// than different colours, carry a word each, and sit under column headings
// that repeat on every list.
const rate = name => RATE.routes[name] || RATE.materials[name] || RATE.packs[name] || null;
const NOTES = require(path.join(SCRATCH, 'rating-notes.js'));
const POP_WORD = ['', 'Rare', 'Occasional', 'Regular', 'Common', 'Everywhere'];
const COST_WORD = ['', 'Low', 'Below average', 'Mid', 'Above average', 'High'];
const marks = (n, kind) => `<span class="wk-${kind}" aria-hidden="true">` +
  [1, 2, 3, 4, 5].map(i => `<i${i <= n ? ' class="on"' : ''}></i>`).join('') + '</span>';
const rateRow = name => {
  const r = rate(name);
  if (!r) return '';
  // Every rated option carries the two-sentence reading as well. Missing text
  // is a build failure rather than a blank line: a table where some rows have
  // the analysis and some do not reads as broken, not as abbreviated.
  const n = NOTES[name];
  if (!n || !n.buyer || !n.production) throw new Error(`rating-notes.js has no buyer/production note for "${name}"`);
  return `<li><b>${esc(name)}</b>` +
    `<span class="wk-cell">${marks(r.pop, 'dots')}<em>${POP_WORD[r.pop]}</em><span class="wk-sr">Popularity ${r.pop} of 5</span></span>` +
    `<span class="wk-cell">${marks(r.cost, 'steps')}<em>${COST_WORD[r.cost]}</em><span class="wk-sr">Relative cost ${r.cost} of 5</span></span>` +
    `<span class="wk-rnote">${esc(r.note)}</span>` +
    `<span class="wk-rview"><span class="wk-rv wk-rv-b"><b>Buyer view</b>${esc(n.buyer)}</span>` +
    `<span class="wk-rv wk-rv-p"><b>Production view</b>${esc(n.production)}</span></span></li>`;
};
const rateList = (names, heading) => `<div class="wk-rates-wrap"><b class="wk-rates-h">${esc(heading)}</b><ul class="wk-rates">
            <li class="wk-rates-head"><b>Option</b><span>How common</span><span>Relative cost</span><span>Why it matters</span></li>
${names.map(n => '            ' + rateRow(n)).join('\n')}
          </ul></div>`;
const LEGEND = `<p class="wk-legend"><b>How common</b> is how often the option appears in garden hand tools sold through European and North American DIY retail. <b>Relative cost</b> is its cost against the alternatives in its own group — a position, not a price. Both are ordinal judgements about that channel rather than market data.</p>`;

// ------------------------------------------------------------------ data ----
const GATES = [
  { id: 'material', sym: null, photo: 'raw-materials', name: 'Material intake',
    body: 'Nothing downstream can be better than what arrives. Grade, thickness, temper and traceability are fixed here, and a substitution made at this gate quietly changes hardness, corrosion life and forming behaviour further along the route.',
    enters: 'Steel strip and bar, tube, resin, timber billets, fabric rolls.',
    control: 'The specified material must suit the intended forming route and the service life claimed for the finished tool.',
    ask: 'Which material property is critical for the intended use — edge retention, corrosion life or stiffness?',
    routes: ['Blade & spring steel', 'Stainless steel', 'Aluminium', 'Rigid plastics', 'Grip compounds', 'Timber', 'Fabric'] },
  { id: 'forming', sym: null, photo: 'blade-forming', name: 'Forming and shaping',
    body: '“Forming” is not one operation. A blade may be stamped from strip, hot forged for grain flow or laser cut for a low-volume profile, and each route produces a different edge condition, a different tolerance band and a different tooling cost.',
    enters: 'Prepared metal, an approved profile and a maintained die set.',
    control: 'Press force, strike sequence and die clearance decide whether piece one and piece fifty thousand are the same part.',
    ask: 'Which single dimension or edge condition matters most to the finished tool?',
    routes: ['Stamping', 'Hot forging', 'Cold forging', 'Laser cutting', 'Tube drawing', 'Tube bending', 'Swaging', 'Wood turning', 'Injection moulding', 'Two-shot over-moulding', 'Dip moulding'] },
  { id: 'heat', sym: 'bp-heat', photo: 'heat-treatment', name: 'Heat treatment',
    body: 'Hardness is created here, not bought. The same steel can leave this gate soft and tough or hard and brittle, so hardness is specified as a band rather than a maximum. Local hardening treats only the working edge and leaves the body ductile.',
    enters: 'Formed steel parts and a defined hardness band.',
    control: 'Temperature, quench rate and tempering set hardness, toughness and how much the part distorts.',
    ask: 'What hardness band does the working edge need, and what is it trading away?',
    routes: ['Through hardening', 'Quench & temper', 'Induction (local) hardening', 'Solution annealing', 'Stress relief', 'Hardness banding by grade'] },
  { id: 'tooling', sym: 'bp-tooling', photo: 'tooling-die-library', name: 'Tooling',
    body: 'Tooling is the part of a programme a buyer never sees and always pays for. A worn die does not fail loudly; it drifts, and the drift appears as a dimension slowly leaving tolerance across a production run.',
    enters: 'Approved geometry, and dies and fixtures kept in known condition.',
    control: 'Tool condition and maintenance interval are what hold repeatable geometry over a long run.',
    ask: 'Which feature depends most on tooling repeatability rather than on operator skill?',
    routes: ['Progressive dies', 'Single-station dies', 'Trim & pierce tools', 'Injection moulds', 'Welding jigs', 'Assembly fixtures', 'Gauges'] },
  { id: 'joining', sym: null, photo: 'frame-welding', name: 'Joining and assembly',
    body: 'Most field failures in hand tools are joint failures, not material failures. The pivot of a pruner carries the whole cutting load, and how it is joined decides whether the tool stays aligned after ten thousand cuts.',
    enters: 'Prepared components, joint features and an agreed assembly sequence.',
    control: 'Fit, heat input and sequence must protect alignment and the load path through the joint.',
    ask: 'Which joint carries load, and which one controls alignment?',
    routes: ['Riveting', 'Bolted joints', 'Snap-fit', 'Press-fit', 'Spot welding', 'MIG welding', 'Brazing', 'Over-moulded joints', 'Adhesive bonding'] },
  { id: 'finish', sym: 'bp-finish', photo: 'surface-treatment', name: 'Surface treatment',
    body: 'A protective surface is a stack, not a colour. Preparation, protective layer and topcoat are three separate costs and three separate control points, and salt-spray performance comes from the whole stack rather than from the visible top.',
    enters: 'A cleaned, prepared surface and a defined treatment route.',
    control: 'Preparation, coverage in corners and cure must suit the exposure the tool will actually see.',
    ask: 'What environment and service life will the product face — and for how many hours must it resist it?',
    routes: ['Zinc plating', 'Nickel-chrome plating', 'Dacromet', 'Powder coating', 'Wet paint', 'E-coat', 'Anodising', 'Polishing', 'Sand-blasting', 'Lacquer or oil on wood', 'Heat transfer print', 'Laser marking'] },
  { id: 'inspection', sym: null, photo: 'pre-shipment-sampling', name: 'Inspection and release',
    body: 'The last gate is the only one a buyer can audit after the fact. Sampling plan, the tests chosen and the release record are what turn a finished pallet into a defensible commercial hand-off.',
    enters: 'Finished goods, packaging requirements and agreed checkpoints.',
    control: 'The sampling plan and release criteria have to be agreed before production, not after a rejection.',
    ask: 'What must be verified before release, and who signs it?',
    routes: ['Hardness sampling', 'Open/close cycle life', 'Salt-spray hours', 'Dimensional AQL', 'Edge & function check', 'Joint pull test', 'Pack drop test', 'Barcode & label check'] }
];

const MATERIALS = [
  { code: 'M1', photo: 'm-steel', sym: 'bp-m-steel', name: 'Blade and spring steel',
    use: 'Cutting blades, anvils, springs, hardened working edges.',
    grades: ['SK5', '65Mn', '420J2', 'SUS420J2', 'SUS440C'],
    body: 'Carbon and low-alloy grades take a hard edge cheaply but must be protected against corrosion. Hardenable stainless grades cost more per kilo and skip the plating step entirely.',
    cost: 'Harder grades hold an edge longer but are more brittle and slower to machine.' },
  { code: 'M2', photo: 'm-stainless', sym: 'bp-m-stainless', name: 'Stainless steel',
    use: 'Corrosion-exposed parts, fasteners, sprayer components.',
    grades: ['304', '410', '420'],
    body: '304 resists corrosion best but cannot be hardened, so it belongs on bodies and fasteners rather than on edges. 410 and 420 can be hardened and are the usual choice when an edge also has to resist moisture.',
    cost: 'Removes a plating operation, but the raw price per kilo is higher and machining is slower.' },
  { code: 'M3', photo: 'm-plating', sym: 'bp-m-plating', name: 'Plating and coating',
    use: 'Corrosion protection and appearance on carbon-steel parts.',
    grades: ['Zinc', 'Nickel-chrome', 'Dacromet', 'Powder coat', 'E-coat'],
    body: 'A coating is specified by the hours of salt-spray resistance it must deliver, not by how thick it looks. Coverage inside corners and around pivots is where a cheap line is exposed.',
    cost: 'Tracks layer thickness and required salt-spray hours. Specify the hours, not the thickest option.' },
  { code: 'M4', photo: 'm-aluminium', sym: 'bp-m-aluminium', name: 'Aluminium',
    use: 'Telescopic poles, light frames, lightweight handles.',
    grades: ['6061', '6063', 'Wall thickness', 'Anodised'],
    body: 'Wall thickness, not alloy, is usually what a buyer feels. A thinner wall is lighter and cheaper and flexes more under load, which matters on a three-metre pole and not at all on a short handle.',
    cost: '6061 is stronger; 6063 extrudes into finer profiles. Thinner wall is cheaper and less stiff.' },
  { code: 'M5', photo: 'm-plastic', sym: 'bp-m-plastic', name: 'Rigid plastics',
    use: 'Housings, sprayer bodies, gear parts, rigid handle cores.',
    grades: ['PP', 'PE', 'ABS', 'PA', 'PA+GF'],
    body: 'Resin choice sets stiffness, impact behaviour and how the part ages in sunlight. Glass-filled nylon is specified where a plastic part has to carry real load, such as a gear or a latch.',
    cost: 'Glass fill raises stiffness, heat resistance and price. Resin is traded, so quotes move with the index.' },
  { code: 'M6', photo: 'm-grip', sym: 'bp-m-grip', name: 'Grips and soft compounds',
    use: 'Handles, over-moulded grips, sleeves, cushioned contact areas.',
    grades: ['TPR', 'TPE', 'Thermoplastic rubber', 'PVC dip'],
    body: 'The grip is the only part of a tool the user judges by touch. An over-moulded soft layer bonded to a rigid core feels integral; a slip-on sleeve or a dip coating costs less and can rotate or peel in service.',
    cost: 'A two-shot over-mould costs more than a slip-on sleeve or a dip coating.' },
  { code: 'M7', photo: 'm-timber', sym: 'bp-m-timber', name: 'Timber',
    use: 'Wooden handles and shafts.',
    grades: ['Beech', 'Ash', 'Bamboo', 'FSC / PEFC stock'],
    body: 'Grain direction and moisture content decide whether a wooden handle survives its first hard season. Ash flexes, beech machines cleanly, bamboo is a laminate with its own behaviour.',
    cost: 'Certified kiln-dried stock carries a premium. Grade drives the reject rate more than the price per piece.' },
  { code: 'M8', photo: 'm-fabric', sym: 'bp-m-fabric', name: 'Fabric and textile',
    use: 'Gloves, storage bags, vests, blinds and covers.',
    grades: ['Canvas', 'Polyester', 'Coated fabric', 'Mesh'],
    body: 'Textile parts fail at seams long before the cloth wears out, so stitch density and seam construction matter more than the headline fabric name.',
    cost: 'Denier, coating and stitch density set the cost. A coating adds water resistance and price.' },
  { code: 'M9', photo: 'm-board', sym: 'bp-m-board', name: 'Packaging board',
    use: 'Export cartons, colour boxes, hang cards and inserts.',
    grades: ['Corrugated', 'Folding boxboard', 'Recycled content', 'Moulded pulp'],
    body: 'Board is the material most often changed late and most often responsible for a compliance problem at the destination. It is covered in its own section below.',
    cost: 'Recycled content and mono-material choices affect both price and destination compliance.' }
];

const PACKS = [
  { sym: 'bp-p-carton', photo: 'p-carton', name: 'Corrugated export carton', note: 'The outer shipping unit. Board grade and cube per carton drive freight cost more than weight does.' },
  // The name is the key the ratings table is looked up by, so it stays exactly
  // as it is; the note carries what the format actually is.
  { sym: 'bp-p-colourbox', photo: 'p-colourbox', name: 'Colour box', note: 'A printed box that ships full and opens into the display: two dozen pruners stand upright in a die-cut insert, held apart and visible. Shipper, shelf unit and print surface in one, which is why it is usually the largest single packaging cost.' },
  { sym: 'bp-p-hangtag', photo: 'p-hangtag', name: 'Hang tag / header card', note: 'A card folded over the tool with a punched hanging hole. The cheapest route to a shelf-ready presentation.' },
  { sym: 'bp-p-blister', photo: 'p-blister', name: 'Blister pack', note: 'A formed shell over a backing card. Highly protective, and the format most affected by plastic regulation.' },
  { sym: 'bp-p-skinpack', photo: 'p-skinpack', name: 'Skin pack', note: 'Film drawn tight over the tool onto board. Uses less plastic than a blister and shows the product shape.' },
  { sym: 'bp-p-composite', name: 'Paper-and-plastic composite', note: 'A card and a plastic shell combined. Recyclable only if the consumer separates the layers.' },
  { sym: 'bp-p-shrink', photo: 'p-shrink', name: 'Shrink film', note: 'Used to bundle multiples or to secure a set. Simple and cheap; a pure plastic line item.' },
  { sym: 'bp-p-label', photo: 'p-label', name: 'Label set', note: 'Barcode, origin, safety and retailer-specific marks. Small, and the most common cause of a rejected delivery.' },
  { sym: 'bp-p-voidfill', photo: 'p-voidfill', name: 'Void fill', note: 'Cushioning inside the carton. Right-sizing the carton usually beats adding more fill.' },
  { sym: 'bp-p-strapping', name: 'Strapping', note: 'Bands securing a palletised load. Tension and seal quality decide whether a load arrives square.' },
  { sym: 'bp-p-pallet', photo: 'p-pallet', name: 'Pallet', note: 'Wood or plastic. Wooden pallets must meet ISPM-15 phytosanitary treatment for export.' }
];

const ECO = [
  ['FSC / PEFC certified board', 'Uncertified board', 'A baseline requirement for most large retail accounts.'],
  ['Recycled-content board', 'Virgin board', 'Allows a declared recycled percentage on the pack.'],
  ['Mono-material paper pack', 'Paper-plus-plastic blister', 'Recyclable without the consumer separating materials.'],
  ['Moulded pulp or paper blister', 'PET or PVC blister', 'The main route to removing plastic from a retail pack.'],
  ['Paper hang tab', 'Moulded plastic hook', 'Avoids a plastic line item on an otherwise paper pack.'],
  ['Soy or water-based ink', 'Solvent-based ink', 'Lowers the solvent load in printing.'],
  ['Paper or gummed tape', 'PP packing tape', 'The whole carton can enter one recycling stream.'],
  ['Unprinted export carton', 'Full-colour outer', 'Lowest cost and lowest footprint for plain export.'],
  ['Recycled or rPET film', 'PVC shrink film', 'A compromise where a film genuinely cannot be removed.'],
  ['Heat-treated or plastic pallet', 'Untreated wood pallet', 'Meets ISPM-15 phytosanitary requirements on export.']
];

const COST = [
  ['Material', 'Steel, resin, timber, fabric. Traded inputs, so the index moves weekly. Grade and weight per piece drive it.'],
  ['Conversion', 'Forming, heat treatment, finishing and assembly labour. Cycle time, tooling condition and yield drive it.'],
  ['Packaging', 'Carton, colour box, hang tag, pallet. Routinely underestimated — a pack format can outweigh a material saving.'],
  ['Logistics', 'Inland trucking, customs, port charges and ocean freight. Cube per carton decides this, not weight.']
];

// ------------------------------------------------------------- renderers ----
const fig = (sym, cap) => `<figure class="wk-fig"><svg class="wk-bp" viewBox="0 0 200 130" role="img" aria-label="${esc(cap)}"><use href="#${sym}"/></svg><figcaption>${esc(cap)}</figcaption></figure>`;

// Gates lead with Birdland's own photograph of the station, at size. A drawing
// is added only where one carries something a camera cannot: the hardness band
// at heat treatment, the die section at tooling, the coating stack at finish.
const gateHtml = sn => (g, i) => `      <section class="wk-entry" id="gate-${g.id}">
        <h3><span class="wk-n">${sn}.${i + 1}</span> ${esc(g.name)}</h3>
        <div class="wk-entry-grid${g.sym ? '' : ' wk-nodiagram'}">
          <figure class="wk-shot"><img src="images/thumbs/${g.photo}.webp" alt="${esc(g.name)} on the Birdland production floor" loading="lazy" decoding="async"><figcaption>On our floor · Taiwan</figcaption></figure>
          <div class="wk-entry-copy">
            <p>${esc(g.body)}</p>
            <dl class="wk-dl">
              <dt>What enters</dt><dd>${esc(g.enters)}</dd>
              <dt>Control point</dt><dd>${esc(g.control)}</dd>
              <dt>A buyer should ask</dt><dd>${esc(g.ask)}</dd>
            </dl>
          </div>
          ${g.sym ? fig(g.sym, 'Schematic: ' + g.name.toLowerCase()) : ''}
        </div>
        ${rateList(g.routes, 'Routes at this gate')}
      </section>`;

const matHtml = sn => (m, i) => `      <section class="wk-entry" id="mat-${m.code.toLowerCase()}">
        <h3><span class="wk-n">${sn}.${i + 1}</span> ${esc(m.name)}</h3>
        <div class="wk-entry-grid wk-nophoto">
          ${stockFig(m.photo, m.name) || fig(m.sym, 'Schematic: ' + m.name.toLowerCase())}
          <div class="wk-entry-copy">
            <p>${esc(m.body)}</p>
            <dl class="wk-dl">
              <dt>Used for</dt><dd>${esc(m.use)}</dd>
              <dt>What moves cost</dt><dd>${esc(m.cost)}</dd>
            </dl>
            <p class="wk-routes"><b>Grades commonly specified</b>${m.grades.map(r => `<span>${esc(r)}</span>`).join('')}</p>
          </div>
        </div>
        ${rateList([m.name], 'In the European and North American DIY channel')}
      </section>`;

const packHtml = p => {
  const ph = p.photo && photoOf(p.photo);
  const visual = ph
    ? `<img class="wk-pack-img" src="images/${ph.file}" alt="${esc(p.name)}" loading="lazy" decoding="async">`
    : `<svg class="wk-bp" viewBox="0 0 200 130" role="img" aria-label="Schematic: ${esc(p.name.toLowerCase())}"><use href="#${p.sym}"/></svg>`;
  const credit = ph
    ? `<small>Stock reference photograph${ph.photographer ? ' · ' + esc(ph.photographer) : ''} / Pexels</small>`
    : `<small>Schematic drawing — no usable reference photograph</small>`;
  return `        <figure class="wk-pack">
          ${visual}
          <figcaption><b>${esc(p.name)}</b><span>${esc(p.note)}</span>${credit}</figcaption>
          <ul class="wk-rates wk-rates-tight">${rateRow(p.name)}</ul>
        </figure>`;
};

// -------------------------------------------------------------- sections ----
// Order here drives the numbering and the table of contents together.
const SECTIONS = [
  { id: 's-floor', title: 'The floor', subs: [{ id: 's-origin', title: 'Where it started, in 1974' }],
    take: "One site since 1974 — the same tooling library and the same hardening practice, which is what makes the rest of this page specific rather than generic.",
    render: sn => `        <p>Everything else on this page describes a route. This section is about the place that route runs through, because a process description is only worth reading if the plant behind it is real.</p>
        <div class="wk-origin">
          <figure><img src="images/thumbs/taiwan-factory.webp" alt="The Taiwan base where Birdland has manufactured since 1974" loading="lazy" decoding="async"><figcaption>The Taiwan base</figcaption></figure>
          <div>
            <h3 id="s-origin"><span class="wk-n">${sn}.1</span> Where it started, in 1974</h3>
            <p>Birdland began at this site in 1974 and still manufactures, warehouses and ships from it more than fifty years later. It is not a sourcing office opened to front a supply chain, and it is not a plant we moved into after the fact — it is the original works.</p>
            <p>That continuity is the reason the rest of this page can be specific. Fifty years in one place is fifty years of the same tooling library, the same hardening practice and the same people correcting each other, which is what a control point actually is.</p>
          </div>
        </div>
        <figure class="wk-album">
          <img src="images/factory-album.webp" alt="Contact sheet of fourteen photographs: the Taiwan base, material stock, the die library, blade forming, heat treatment, surface treatment, wooden handle making, frame welding, assembly and calibration, laser marking and quality control, pre-shipment sampling, an inspection walk, the finished-goods warehouse and outbound shipping" loading="lazy" decoding="async">
          <figcaption>Fourteen frames, left to right: the original 1974 Taiwan works · material stock · die library · blade forming · heat treatment · surface treatment · wooden handle making · frame welding · assembly &amp; calibration · laser marking &amp; QC · pre-shipment sampling · inspection walk · finished-goods warehouse · outbound shipping. Shown as one contact sheet rather than a gallery — the point is that the floor exists and is documented, not to display any particular product.</figcaption>
        </figure>` },

  { id: 's-cat', title: 'The catalogue', subs: [],
    take: "A decade-old archive, published for breadth, not as a price list. Nothing in it is a current quotation.",
    render: () => `        <p>Birdland keeps a product catalogue that is roughly a decade old. It is published as an <b>archive</b>, not as a price list: the items in it are not current quotations and nothing in it should be read as an offer. It is worth reading for one reason — breadth.</p>
        <div class="wk-callout">
          <b>What the catalogue actually shows</b>
          <ul>
            <li><b>Every item was approved by the customer it was made for.</b> Nothing in it is a concept, a render or a proposal. Each product passed a customer's own approval before it was produced.</li>
            <li><b>All of it is ODM work on tooling Birdland owns.</b> The dies and moulds behind these products are ours. That is why an item from this catalogue behaves differently from a new design: the tool already exists, so the cost is known and stable rather than quoted against a tool nobody has cut yet.</li>
            <li><b>Owned tooling is what protects the margin.</b> A buyer taking an existing item to market is not amortising a new tool and is not exposed to the cost drift that comes with proving one out.</li>
            <li><b>Its purpose is evidence, not selection.</b> Read it as the accumulated production and quality-control experience behind the seven gates described below — the range this floor has actually held to specification over decades.</li>
          </ul>
        </div>
        <p>If something in it is close to what you need, starting from that item is usually the fastest and cheapest route. If it is not, the same experience is what the rest of this article describes.</p>
        <div class="bl-actions"><a class="bl-button" href="${CATALOGUE_URL}" target="_blank" rel="noopener">Download the catalogue (PDF)</a><a class="bl-button bl-button-quiet" href="contact.html">Ask about an item</a></div>
        <p class="wk-note" style="margin-top:18px">The file opens in a new tab. It is an archive: use it to judge range and capability, and ask us before treating anything in it as available.</p>` },

  { id: 's-oem', title: 'OEM routes', subs: [
      { id: 'oem-spec', title: 'Specification OEM' },
      { id: 'oem-design', title: 'Design OEM' },
      { id: 'oem-levers', title: 'What each route lets you change' },
      { id: 'oem-tooling', title: 'How tooling is arranged' }],
    take: "Three routes: our tooling, your drawing, or a shared development. What differs is who owns the tooling and who carries the risk.",
    render: sn => `        <p>OEM is not one thing. Almost every programme sits on one of two levels, and the first useful question is not what it will cost — it is which level you are working at. That answer moves the tooling, the lead time and the order size together.</p>

        <div class="wk-faces">
          <article class="wk-face" id="oem-spec">
            <h3><span class="wk-n">${sn}.1</span> Specification OEM</h3>
            <svg class="wk-bp" viewBox="0 0 200 130" role="img" aria-label="Blueprint diagram: one die producing the same shape in three different specifications"><use href="#bp-oem-spec"/></svg>
            <p><b>The shape already exists. You change what it is made of.</b> The geometry has been proven in production, so what moves is the material grade, the hardness band, the surface treatment, the grip compound, the colour, the marking and the pack.</p>
            <p>No new tool is cut. The cost comes from a part that has been built before rather than an estimate against one nobody has built, sampling runs in weeks, and the order size can be smaller because there is no tooling investment to spread.</p>
            <p>The shallowest version of this route changes nothing about the product at all — only the brand, the marking and the pack. It is the fastest way to put a range on a shelf under your own name. This route runs on the tooling described in <a href="#s-cat">the catalogue</a>: ours, and long since amortised.</p>
          </article>
          <article class="wk-face" id="oem-design">
            <h3><span class="wk-n">${sn}.2</span> Design OEM</h3>
            <svg class="wk-bp" viewBox="0 0 200 130" role="img" aria-label="Blueprint diagram: a drawing becomes a new die and then a first article"><use href="#bp-oem-design"/></svg>
            <p><b>You bring the shape.</b> New dies or moulds are cut to your drawing and every lever is open, including the geometry itself.</p>
            <p>That investment has to be spread, so the order size is larger and sampling is measured in months rather than weeks. What you get back is a product nobody else can order, and a tool that exists only for your programme.</p>
            <p>Most buyers assume they need this route. Many do not: it is worth checking whether specification OEM reaches most of what you want before committing to a tool. We would rather say so early than quote a tool you did not need.</p>
          </article>
        </div>

        <h3 id="oem-levers"><span class="wk-n">${sn}.3</span> What each route lets you change</h3>
        <div class="p101-scroll">
          <table class="p101-table">
            <thead><tr><th scope="col">Lever</th><th scope="col">Specification OEM</th><th scope="col">Design OEM</th><th scope="col">Described in</th></tr></thead>
            <tbody>
              <tr><td>Material family and grade</td><td>Open</td><td>Open</td><td><a href="#s-mat">Material families</a></td></tr>
              <tr><td>Hardness band on the working edge</td><td>Open</td><td>Open</td><td><a href="#gate-heat">Heat treatment</a></td></tr>
              <tr><td>Surface treatment and colour</td><td>Open</td><td>Open</td><td><a href="#gate-finish">Surface treatment</a></td></tr>
              <tr><td>Grip compound and feel</td><td>Open</td><td>Open</td><td><a href="#mat-m6">Grips and soft compounds</a></td></tr>
              <tr><td>Marking and branding</td><td>Open</td><td>Open</td><td><a href="#gate-finish">Surface treatment</a></td></tr>
              <tr><td>Packaging and retail presentation</td><td>Open</td><td>Open</td><td><a href="#s-pack">Packaging</a></td></tr>
              <tr><td>Joining method and fasteners</td><td>Limited to the existing tool</td><td>Open</td><td><a href="#gate-joining">Joining and assembly</a></td></tr>
              <tr><td>Dimensions and geometry</td><td>Fixed by the existing tool</td><td>Open</td><td><a href="#gate-tooling">Tooling</a></td></tr>
              <tr><td>Exclusivity of the shape</td><td>No</td><td>Yes</td><td>${sn}.4 below</td></tr>
            </tbody>
          </table>
        </div>

        <h3 id="oem-tooling"><span class="wk-n">${sn}.4</span> How tooling is arranged</h3>
        <p>There is no standard tooling price and no single ownership policy, and any page that published one would be misleading you. It is set per programme. These are the arrangements that actually get used:</p>
        <div class="p101-scroll">
          <table class="p101-table">
            <thead><tr><th scope="col">Arrangement</th><th scope="col">Who funds it</th><th scope="col">Who holds it</th><th scope="col">Typically paired with</th></tr></thead>
            <tbody>
              <tr><td>Existing Birdland tooling</td><td>Not applicable</td><td>Birdland, already amortised</td><td>Specification OEM</td></tr>
              <tr><td>Customer-funded</td><td>Customer</td><td>Customer</td><td>Full exclusivity of the shape</td></tr>
              <tr><td>Shared</td><td>Split between both parties</td><td>Held jointly</td><td>A market restriction — see below</td></tr>
              <tr><td>Birdland-funded</td><td>Birdland</td><td>Birdland</td><td>A volume commitment</td></tr>
            </tbody>
          </table>
        </div>
        <div class="wk-callout">
          <b>The shared arrangement, and why it is the promise in writing</b>
          <ul>
            <li>Where a tool is funded jointly and held jointly, it is normally paired with a restriction on us: <b>Birdland does not sell that product into your market.</b> The tool may be shared; the market is not.</li>
            <li>That clause is what “never our brand” looks like in a contract rather than on a homepage. It is also the reason the two things on this page fit together — <a href="#s-cat">the catalogue</a> can be shown publicly because those tools are ours and unrestricted, while anything carrying a market restriction never appears in it, and never will.</li>
          </ul>
        </div>
        <p><b>What moves the line.</b> Four things, in practice: how complex the part is, how long we have worked together, the payment terms, and the volume. That is why tooling cost, order size and lead time are described here in relative terms only — a real figure depends on those four, and a number published on a public page would be wrong for most readers and stale for the rest.</p>
        <p>Tell us the volume, the market and the timing, and the arrangement can be structured against them.</p>
        <div class="bl-actions"><a class="bl-button" href="contact.html">Start a programme conversation</a></div>` },

  { id: 's-route', title: 'Production route', subs: GATES.map(g => ({ id: 'gate-' + g.id, title: g.name })),
    take: "Seven gates. A tool is only as good as the gate it was allowed to pass.",
    render: sn => `        <p>Each gate below takes a defined input, holds one thing under control and hands the part on. The routes listed at each gate are alternatives, not a sequence: choosing between them is what a specification actually decides.</p>
        ${LEGEND}
${GATES.map(gateHtml(sn)).join('\n')}` },

  { id: 's-mat', title: 'Material families', subs: MATERIALS.map(m => ({ id: 'mat-' + m.code.toLowerCase(), title: m.name })),
    take: "Nine families. The grade is a trade-off, never an upgrade — every point of hardness is bought with toughness.",
    render: sn => `        <p>A garden tool is rarely one material. These nine families cover a hand-tool programme, and the same nine are tracked as live inputs on the <a href="partner.html">AsiaSource</a>, so a grade discussed here can be checked against this week's price movement.</p>
        ${LEGEND}
${MATERIALS.map(matHtml(sn)).join('\n')}` },

  { id: 's-fail', title: 'How a tool fails',
    subs: [{ id: 's-fail-cut', title: 'Tools that cut' },
           { id: 's-fail-lever', title: 'Tools that lever' },
           { id: 's-fail-spring', title: 'Tools that spring' }],
    take: "Hardness is set by how the tool is expected to fail: blunt, fractured or fatigued. Three groups, three bands, three different answers.",
    render: sn => `        <p>Hardness is the number most often quoted about a hand tool and the one most often quoted wrongly. It is not a quality score, and harder is not better — every point of hardness is bought with toughness. What decides the number is the way the tool is expected to fail.</p>
        <p>Three groups, three failure modes, three different answers. The bands below are the ones Birdland works to; read them next to each other and they stop looking arbitrary.</p>

        <h3 id="s-fail-cut"><span class="wk-n">${sn}.1</span> Tools that cut &mdash; the failure is blunt</h3>
        <p>A pruner that goes dull has failed, even though nothing broke. Edge retention comes first, so these run the hardest bands on the site.</p>
        <div class="wk-hard">
          <div class="wk-hard-head"><b>Part &amp; grade</b><span>Hardness</span><span>What the route is for</span></div>
          <div class="wk-hard-row"><b>Upper blade &middot; SK5 high-carbon</b><span class="num">HRC 56&ndash;60</span><span>Highest edge retention</span></div>
          <div class="wk-hard-row"><b>Upper blade &middot; 65Mn carbon</b><span class="num">HRC 52&ndash;56</span><span>Resilient value route</span></div>
          <div class="wk-hard-row"><b>Upper blade &middot; S50C carbon</b><span class="num">HRC 50&ndash;55</span><span>Balanced route</span></div>
          <div class="wk-hard-row"><b>Upper blade &middot; 420J2 stainless</b><span class="num">HRC 50&ndash;54</span><span>Corrosion first</span></div>
          <div class="wk-hard-row wk-hard-gap"><b>Lower blade &middot; SK5 carbon</b><span class="num">HRC 50&ndash;56</span><span>Higher wear control</span></div>
          <div class="wk-hard-row"><b>Lower blade &middot; 420J2 stainless</b><span class="num">HRC 46&ndash;52</span><span>Wet-use route</span></div>
          <div class="wk-hard-row"><b>Lower blade &middot; S50C carbon</b><span class="num">HRC 45&ndash;50</span><span>Strength and value</span></div>
        </div>
        <p class="wk-rule"><b>The counter blade is softer on purpose.</b> Read the two halves of that table again: the same SK5 is specified at 56&ndash;60 on the cutting blade and 50&ndash;56 on the blade it closes against. Two equally hard blades chip each other. A softer counter blade wears sacrificially and keeps the cutting edge alive, which is why a pruner that has been resharpened twice still cuts and a &ldquo;fully hardened&rdquo; one has a notch in it.</p>

        <h3 id="s-fail-lever"><span class="wk-n">${sn}.2</span> Tools that lever &mdash; the failure is fracture</h3>
        <p>A spade meets stones, roots and frozen ground, and it gets used as a lever whether or not anyone intended it to. Its failure mode is a crack, not a dull edge, so the hardness is deliberately capped: the blade should bend before it breaks.</p>
        <div class="wk-hard">
          <div class="wk-hard-head"><b>Part &amp; grade</b><span>Hardness</span><span>What the route is for</span></div>
          <div class="wk-hard-row"><b>Blade &amp; full tang &middot; Boron steel</b><span class="num">HRC 38&ndash;45</span><span>Lower mass at strength</span></div>
          <div class="wk-hard-row"><b>Blade &amp; full tang &middot; 420 stainless</b><span class="num">HRC 38&ndash;44</span><span>Corrosion first</span></div>
          <div class="wk-hard-row"><b>Blade &amp; full tang &middot; S50C carbon</b><span class="num">HRC 35&ndash;42</span><span>Proven value route</span></div>
        </div>
        <p class="wk-rule"><b>Twenty points of hardness below a pruner blade, on purpose.</b> A spade at HRC 58 would hold a superb edge and snap the first time it was levered against a root.</p>
        <p>Digging tools fail at the neck, where the bending moment concentrates &mdash; so the structure there matters more than the steel. A forged neck carries continuous grain around the bend; a cast one has random grain, and any porosity becomes a fracture origin. It is the one place on a long-handled tool where forging earns its cost.</p>
        <p>The handle carries the same logic, and the specification most often left incomplete is the aluminium: a tube is defined by <b>wall thickness and temper</b>, not by diameter.</p>
        <details class="wk-more"><summary>Handles: temper, glass loading and what they cost later</summary>
          <p>6061-T6 is materially stronger than the same tube in T5. A drawing that names the alloy but not the temper has not specified anything, and the difference shows up the first time a three-metre pole is levered.</p>
          <p>A glass-filled core is chosen the same way. PA6-GF30 is the usual balance because above it the part stops bending and starts shattering, and on a consumer tool a handle that deforms is safer than one that fails suddenly. Glass also abrades the mould, so a higher loading quietly shortens tool life &mdash; a cost that lands on the second order, not the first.</p>
        </details>

        <h3 id="s-fail-spring"><span class="wk-n">${sn}.3</span> Tools that spring &mdash; the failure is fatigue</h3>
        <p>A rake tine is never asked to cut and rarely asked to resist a single large load. It is asked to bend and come back, thousands of times. What matters is the elastic limit and the cycle life, not edge retention.</p>
        <div class="wk-hard">
          <div class="wk-hard-head"><b>Part &amp; grade</b><span>Hardness</span><span>What the route is for</span></div>
          <div class="wk-hard-row"><b>14-tine set &middot; 65Mn spring steel</b><span class="num">HRC 42&ndash;48</span><span>Resilient route</span></div>
          <div class="wk-hard-row"><b>14-tine set &middot; S50C hardened</b><span class="num">HRC 38&ndash;45</span><span>Bend resistance</span></div>
          <div class="wk-hard-row"><b>14-tine set &middot; 420 stainless</b><span class="num">HRC 36&ndash;42</span><span>Wet-soil route</span></div>
        </div>
        <p class="wk-rule"><b>A tine that stays bent has failed as completely as one that snaps.</b> 65Mn is a spring steel and its heat treatment is aimed at return, not at hardness &mdash; the same grade appears in the pruner spring for the same reason.</p>

        <h3><span class="wk-n">${sn}.4</span> Three rules the numbers encode</h3>
        <dl class="wk-dl">
          <dt>A band, never a maximum</dt><dd>Every figure on this page is a range. A specification that names only a ceiling invites a plant to hit it, and the top of the range is where brittleness begins. A band fixes the floor and the ceiling together.</dd>
          <dt>Hard only where it wears</dt><dd>The 40Cr pivot set is induction hardened at the bearing surface and left tough through the body. A pin hardened all the way through does not wear &mdash; it cracks.</dd>
          <dt>Stainless is a trade, not an upgrade</dt><dd>420J2 gives up roughly four to six points against SK5 in the same position. It is the right answer for wet use, coastal air and grounds-maintenance fleets that will never resharpen. It is the wrong answer for professional pruning in a dry climate, and a supplier who offers it as a free improvement has not priced the edge you are losing.</dd>
        </dl>
        <p class="wk-ask"><b>Ask any supplier for:</b> the hardness band rather than a single figure, the sampling plan that confirms it, and whether the resulting report travels with the shipment. A band with no sampling plan behind it is a sentence, not a control.</p>
        <p>Every grade above is one route among several for that part. The full set &mdash; 159 material routes across 38 part types, with the process and finish options that go with each &mdash; is on the <a href="partner.html">AsiaSource</a>, or type a grade such as <b>SK5</b> or <b>420J2</b> into the Terminal to go straight to it.</p>` },

  { id: 's-fast', title: 'Nuts, bolts and the joint',
    subs: [{ id: 's-fast-p', title: 'The pivot' },
           { id: 's-fast-w', title: 'The washer stack' },
           { id: 's-fast-m', title: 'What the fastener is made of' }],
    take: "A hand tool fails at its joint more often than at its blade. The nut decides whether that joint can be brought back or has to be thrown away.",
    render: sn => `        <p>Every tool on this page is at least two parts held together. The blade gets the specification; the fastener gets whatever is in the bin. That is why a pruner whose blade still takes an edge can already be finished &mdash; the pivot has gone slack, and nothing on it can be tightened.</p>

        <h3 id="s-fast-p"><span class="wk-n">${sn}.1</span> The pivot decides whether the tool is repairable</h3>
        <p>One choice governs the life of the product: can the user re-tension the joint, or not.</p>
        <div class="p101-scroll">
          <table class="p101-table">
            <thead><tr><th scope="col">Joint</th><th scope="col">What holds it</th><th scope="col">User can re-tension</th><th scope="col">Where it belongs</th></tr></thead>
            <tbody>
              <tr><td>Riveted or peened pin</td><td>A deformed head</td><td>No &mdash; drilling it out ends the tool</td><td>Entry-price shears where no service is expected</td></tr>
              <tr><td>Bolt + nylon-insert lock nut</td><td>Nylon gripping the thread</td><td>Yes, with two spanners</td><td>The ordinary professional pruner pivot</td></tr>
              <tr><td>Bolt + all-metal prevailing-torque nut</td><td>A deformed thread crest</td><td>Yes, and it survives repeated opening</td><td>Wash-down, heat, or tools stripped each season for sharpening</td></tr>
              <tr><td>Shoulder bolt + castle nut + split pin</td><td>A mechanical lock</td><td>Yes, and it cannot back off at all</td><td>Loppers and long handles, where leverage is high</td></tr>
              <tr><td>Knurled or thumb nut</td><td>Hand tension</td><td>Yes, with no tools</td><td>Consumer tools sold on adjustability</td></tr>
            </tbody>
          </table>
        </div>
        <p class="wk-rule"><b>A rivet is a decision about the product's life, not about its price.</b> It saves a few cents and removes service, resharpening back to a true edge, and any spare-parts programme. On a tool sold as repairable it is a contradiction the pack cannot hide.</p>

        <h3 id="s-fast-w"><span class="wk-n">${sn}.2</span> The washer stack does more than the nut</h3>
        <div class="wk-kv">
          <div><b>Belleville (disc-spring) washer</b><span>Holds a preload as the bearing faces polish in. It is the difference between a pruner that keeps its adjustment through a season and one that is loose in a fortnight.</span></div>
          <div><b>Hardened flat washer</b><span>Spreads the clamp load. Without one the nut sinks into an aluminium or plastic handle and the joint goes slack with nothing actually broken.</span></div>
          <div><b>Low-friction washer &mdash; bronze or PTFE</b><span>Keeps two steel faces apart so the action stays smooth and the blade does not gall against the counter blade.</span></div>
          <div><b>Split (spring) lock washer</b><span>Commonly fitted and weak against transverse vibration &mdash; in a Junker-type test it can loosen about as fast as a plain washer. Treat it as a cost decision, not as the anti-loosening feature.</span></div>
        </div>

        <h3 id="s-fast-m"><span class="wk-n">${sn}.3</span> What the fastener is made of</h3>
        <div class="p101-scroll">
          <table class="p101-table">
            <thead><tr><th scope="col">Route</th><th scope="col">Belongs on</th><th scope="col">The trade</th></tr></thead>
            <tbody>
              <tr><td>Zinc-plated carbon steel, class 8.8</td><td>General dry use</td><td>Cheapest. The plating hours, not the steel, decide how long it looks new</td></tr>
              <tr><td>Stainless A2 (304)</td><td>Wet use; skips plating entirely</td><td>A2-70 is around 700&nbsp;MPa against class 8.8's 800 &mdash; stainless buys corrosion resistance, not strength</td></tr>
              <tr><td>Stainless A4 (316)</td><td>Salt air and coastal fleets</td><td>Highest cost, same strength trade</td></tr>
              <tr><td>Bronze or brass bush at the pivot</td><td>Tools sold on a smooth action</td><td>Wears sacrificially and protects the blade &mdash; a serviceable part, if you stock it</td></tr>
            </tbody>
          </table>
        </div>
        <p class="wk-rule"><b>Match the fastener to the handle, not to the blade.</b> A stainless bolt through an aluminium pole is a small battery: aluminium is the anode and corrodes at the interface. A &ldquo;stainless upgrade&rdquo; can arrive as a seized telescopic joint after one coastal season. Isolate it with a nylon bush or a coated fastener.</p>

        <details class="wk-more"><summary>Threads, lockers and the standards to quote</summary>
          <p>Rolled threads follow the grain of the material instead of cutting across it, so they are both stronger and cheaper at volume; cut threads belong on repairs and one-offs. Where a joint is never meant to be opened, a medium-strength anaerobic locker does a lock nut's work for less. Where adjustment is a selling feature it is the wrong answer &mdash; the first re-tension breaks the bond and nothing replaces it.</p>
          <p>A nylon insert is a consumable. It grips by being deformed, so a nut that has been off and on a few times no longer holds what it did. If a tool is meant to be stripped for sharpening every season, specify the all-metal nut and accept the higher torque to fit it.</p>
        </details>
        <p class="wk-ask"><b>Ask any supplier for:</b> the nut standard by number (ISO&nbsp;7040 or DIN&nbsp;985 for nylon-insert, DIN&nbsp;980 for all-metal), a drawing of the washer stack rather than a photograph of the finished tool, the salt-spray hours for the plating <i>on the fastener</i> and not only on the blade, and confirmation that the pivot can be re-tensioned with tools a gardener already owns.</p>` },

  { id: 's-pack', title: 'Packaging',
    subs: [{ id: 's-pack-f', title: 'Formats' },
           { id: 's-pack-d', title: 'Display and shelf presentation' },
           { id: 's-pack-r', title: 'Racks and display units' },
           { id: 's-pack-x', title: 'The parcel network is not the shelf' },
           { id: 's-pack-e', title: 'Lower-impact options' }],
    take: "Where a programme meets destination regulation, and the block buyers negotiate least and pay for most.",
    render: sn => `        <p>Packaging is where a programme meets destination regulation, and where a late change costs most. Four things are being specified at once: the format that protects the tool, the presentation that sells it, the unit that carries it, and the marks the destination requires.</p>

        <h3 id="s-pack-f"><span class="wk-n">${sn}.1</span> Formats</h3>
        ${LEGEND}
        <div class="wk-packs">
${PACKS.map(packHtml).join('\n')}
        </div>

        <h3 id="s-pack-d"><span class="wk-n">${sn}.2</span> Display and shelf presentation</h3>
        <p>A format protects the tool. A <i>presentation</i> decides how it is bought. The two are specified together, because the presentation is what dictates the die-cut, the board weight and the hole.</p>
        <div class="p101-scroll">
          <table class="p101-table">
            <thead><tr><th scope="col">Presentation</th><th scope="col">What the pack has to carry</th><th scope="col">Where it wins</th></tr></thead>
            <tbody>
              <tr><td>Colour box the tools stand in</td><td>A die-cut insert sized to the tool, so two dozen pruners travel in one box and stand upright the moment the lid comes off. The insert is the drawing that matters, not the box</td><td>The everyday counter route: one carton, one SKU, and no shelf-filling labour at the store</td></tr>
              <tr><td>Colour box with a printed window</td><td>The same insert plus a die-cut aperture, so a single tool shows through and is still fully enclosed</td><td>Gift and premium lines, where the box is part of what is being bought</td></tr>
              <tr><td>Open-front display box</td><td>A perforated lid that tears away and leaves a tray the store can put straight on the shelf</td><td>Shelf-ready lines &mdash; the case is the display, so nothing is unpacked twice</td></tr>
              <tr><td>Header card + euro slot</td><td>A folded card with a punched hanging hole sized to the retailer's own hook</td><td>The cheapest route onto a rail; the retailer owns the fixture</td></tr>
              <tr><td>Blister or clamshell on a hook</td><td>A formed shell welded or folded to a printed backer</td><td>Small tools that need theft resistance and full-face print</td></tr>
              <tr><td>Skin pack on board</td><td>Film drawn tight over the tool, plus a punched hole</td><td>Shows the real product shape with far less plastic than a blister</td></tr>
              <tr><td>Counter unit (PDQ)</td><td>A small pre-filled tray shipped ready to stand on a counter</td><td>Impulse lines and seasonal add-ons</td></tr>
              <tr><td>Floor or pallet display</td><td>A shipper that becomes a free-standing unit, with a printed header</td><td>Season openings, where the volume justifies the tooling</td></tr>
            </tbody>
          </table>
        </div>
        <p class="wk-rule"><b>Ask which hook it will hang on before drawing the hole.</b> Rail systems, pegboard and slatwall all take a different hook, and a hole punched for the wrong one turns a compliant pack into a repack at the destination. This is the single most common late packaging change on a garden programme.</p>

        <h3 id="s-pack-r"><span class="wk-n">${sn}.3</span> Racks and display units</h3>
        <p>Two different things get called a display: a fixture the retailer already owns, and a unit you ship. Which it is decides who pays for it, and whether you are quoting a pack or a piece of furniture.</p>
        <div class="p101-scroll">
          <table class="p101-table">
            <thead><tr><th scope="col">Rack</th><th scope="col">Life</th><th scope="col">What it is really for</th></tr></thead>
            <tbody>
              <tr><td>Powder-coated steel wire rack or spinner</td><td>Years; usually returnable</td><td>Trade counters and hardware. Doubles as the brand's own footprint in store</td></tr>
              <tr><td>Corrugated board PDQ or floor unit</td><td>One season, disposable</td><td>Promotions. Ships flat, costs least, and is thrown away rather than returned</td></tr>
              <tr><td>Chipboard or MDF panel with pegs</td><td>Several seasons</td><td>Garden centres, where the unit has to look like fixture rather than packaging</td></tr>
              <tr><td>Acrylic tray or riser</td><td>Long, but scratches</td><td>Premium and small parts; the most expensive per facing</td></tr>
              <tr><td>Retailer's own slatwall or pegboard</td><td>Permanent, not yours</td><td>You supply a euro-slotted pack and nothing else &mdash; the fixture is already there</td></tr>
            </tbody>
          </table>
        </div>

        <h3 id="s-pack-x"><span class="wk-n">${sn}.4</span> The parcel network is not the shelf</h3>
        <p>A retail pack is designed to be stacked on a pallet and to look right under store lighting. A parcel pack is designed to be thrown. The same box rarely does both, and a pack that passes a retail brief can still fail its first month online.</p>
        <div class="wk-kv">
          <div><b>Ships in its own container</b><span>A retail pack strong enough to travel alone, with no outer carton. It removes a box, a labour step and a lot of void fill &mdash; but only if it survives the marketplace's own parcel test on its own.</span></div>
          <div><b>Cube, not weight</b><span>Parcel networks charge for dimensional weight. Right-sizing the box is almost always a larger saving than anything negotiated on the board itself.</span></div>
          <div><b>One scannable barcode</b><span>A second visible barcode on the outside is a mis-scan waiting to happen. Retail marks belong under the outer label or on a face that is covered.</span></div>
          <div><b>Poly bag warnings</b><span>A bag above the marketplace's size threshold needs a suffocation warning printed on it, in the required wording. It is small, cheap, and a routine cause of a rejected inbound.</span></div>
          <div><b>Guarded edges</b><span>A blade that arrives through its own carton is a claim and a safety report. Edge guards are specified for the drop, not for the shelf.</span></div>
          <div><b>The listing and the pack must agree</b><span>Material names, dimensions and counts on the pack have to match what the listing claims. A mismatch reads as a wrong item and comes back as a return, not as a query.</span></div>
        </div>
        <p class="wk-note">Marketplace programme names, thresholds and test protocols change; treat the row above as the questions to ask and confirm each against the current seller or vendor manual for your account.</p>

        <h3 id="s-pack-e"><span class="wk-n">${sn}.5</span> Lower-impact options</h3>
        <p>Each conventional format has a lower-impact route. Availability depends on the pack, the volume and the destination — tell us the market and the retail presentation, and the compliant routes can be quoted alongside the conventional ones.</p>
        <div class="p101-scroll">
          <table class="p101-table">
            <thead><tr><th scope="col">Lower-impact option</th><th scope="col">Replaces</th><th scope="col">Why buyers ask for it</th></tr></thead>
            <tbody>
${ECO.map(r => `              <tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('\n')}
            </tbody>
          </table>
        </div>` },

  { id: 's-cert', title: 'Certificates and declarations',
    subs: [{ id: 's-cert-t', title: 'What each mark covers' },
           { id: 's-cert-r', title: 'Reading a certificate' }],
    take: "A certificate is a document about a site, a scope and a date. Check all three, because a valid certificate for the wrong site is worth nothing.",
    render: sn => `        <p>Certification is no longer a differentiator in this trade; it is an entry condition. What still separates suppliers is whether the paperwork survives being checked &mdash; a scope that covers the product you are buying, a site address that matches the plant, and a date that is still live when the container sails.</p>

        <h3 id="s-cert-t"><span class="wk-n">${sn}.1</span> What each mark covers</h3>
        <div class="p101-scroll">
          <table class="p101-table">
            <thead><tr><th scope="col">Mark</th><th scope="col">What it actually certifies</th><th scope="col">Who asks for it</th><th scope="col">What to check on the document</th></tr></thead>
            <tbody>
              <tr><td>FSC / PEFC</td><td>Chain of custody for timber and board &mdash; that certified fibre was tracked, not that a tree was certified</td><td>Most large EU and UK retail accounts, increasingly US</td><td>The CoC code, the claim type (100%, Mix or Recycled) and that the certificate covers the product group you are buying</td></tr>
              <tr><td>EU deforestation rules</td><td>Due diligence that wood placed on the EU market is deforestation-free</td><td>Whoever imports into the EU &mdash; usually you, not the factory</td><td>Geolocation of the harvest area and a due diligence statement; confirm the phase-in date that applies to your operator size</td></tr>
              <tr><td>amfori BSCI / Sedex SMETA</td><td>Labour and working conditions at a named site, on a named date</td><td>Nearly every EU and US retail account</td><td>The audit date, the rating or findings, and that the audited address is the plant that will make your goods</td></tr>
              <tr><td>ISO 9001 / ISO 14001</td><td>That a quality or environmental management system exists and is audited</td><td>Almost all trade buyers, as a baseline</td><td>Scope and site. A group certificate naming a different factory is not your certificate</td></tr>
              <tr><td>REACH &amp; SVHC</td><td>Restricted substances in the article &mdash; grips, coatings and plating as much as steel</td><td>EU importers</td><td>The substance list tested, the test date, and which part of the tool was sampled</td></tr>
              <tr><td>CPSIA and California Proposition&nbsp;65</td><td>Lead and phthalate limits; warning obligations</td><td>US importers</td><td>The test report, and whether a warning is required on the pack for your channel</td></tr>
              <tr><td>EN&nbsp;388 with CE / UKCA</td><td>Mechanical performance of protective gloves</td><td>Anyone selling gloves into the EU or UK</td><td>The notified body, the performance levels claimed, and that the certificate is for this glove</td></tr>
              <tr><td>Packaging EPR registrations</td><td>Who pays for the packaging waste in each market</td><td>Germany, France, Italy, Spain and others individually</td><td>Registration numbers held in the right name, and the on-pack marks each market requires</td></tr>
              <tr><td>UK plastic packaging tax</td><td>Plastic packaging below the recycled-content threshold</td><td>UK importers</td><td>Evidence of recycled content, not a statement of intent</td></tr>
              <tr><td>ISPM&nbsp;15</td><td>Heat treatment of wooden pallets and dunnage</td><td>Every destination, for wooden pallets</td><td>The stamp on the pallet itself, at loading</td></tr>
              <tr><td>GS1 GTIN</td><td>That the barcode belongs to the brand owner</td><td>All retail</td><td>That the prefix is licensed to the brand, not borrowed from a supplier</td></tr>
            </tbody>
          </table>
        </div>

        <h3 id="s-cert-r"><span class="wk-n">${sn}.2</span> Reading a certificate</h3>
        <dl class="wk-dl">
          <dt>Site, scope, date</dt><dd>Three fields decide whether a certificate applies to your order. A live FSC certificate held by a trading company does not let the factory print the logo, and a social audit of a sister plant says nothing about the one running your line.</dd>
          <dt>A claim needs a chain, not a logo</dt><dd>To put FSC on a pack, every party that takes ownership of the certified material needs its own chain-of-custody code &mdash; mill, converter, and the factory that assembles the pack. One missing link and the claim cannot be made, however certified the paper was.</dd>
          <dt>Audits expire; production does not</dt><dd>Ask when the next audit falls and what happens to your shipments if it slips. A certificate that lapses mid-programme is a commercial problem, not a paperwork one.</dd>
        </dl>
        <p class="wk-ask"><b>Ask any supplier for:</b> the certificate itself rather than a logo on a presentation, the scope page, and the name and address exactly as they appear on it. Then check that address against the plant you visited.</p>` },

  { id: 's-serve', title: 'What a wholesaler expects',
    subs: [{ id: 's-serve-b', title: 'Before the order' },
           { id: 's-serve-a', title: 'After it ships' }],
    take: "Most of what distinguishes suppliers at this level is not the tool. It is tooling ownership, sample discipline, documents and what happens when something goes wrong.",
    render: sn => `        <p>Importers, distributors and buying groups in Europe and North America, and the trading houses across Asia they compete with, converge on a short list of expectations. Almost none of it is about manufacturing. It is worth stating plainly, because it is what a first meeting is actually about.</p>

        <h3 id="s-serve-b"><span class="wk-n">${sn}.1</span> Before the order</h3>
        <div class="wk-kv">
          <div><b>Tooling ownership, in writing</b><span>Who owns the mould, where it is stored, what it costs to move, and what happens to it if the programme ends. The most expensive ambiguity in this trade.</span></div>
          <div><b>Sample discipline</b><span>How many rounds before samples are charged, and a sealed golden sample kept by both sides. Production is judged against that sample, not against a memory of it.</span></div>
          <div><b>MOQ across a range, not per line</b><span>A range of eight tools in three colours is not twenty-four minimums. Whether a supplier can pool a run is often the whole difference between a viable programme and a dead one.</span></div>
          <div><b>Artwork and label control</b><span>Versioned artwork, the right barcode, market-specific recycling marks and translations. Late artwork is the most common reason a ready order sits in a warehouse.</span></div>
          <div><b>Inspection terms agreed up front</b><span>Which AQL, who books the third party, who pays for a re-inspection, and what a failed lot actually triggers.</span></div>
          <div><b>Consolidation</b><span>Several lines, sometimes several factories, into one container &mdash; and one packing list that a customs broker can read.</span></div>
        </div>

        <h3 id="s-serve-a"><span class="wk-n">${sn}.2</span> After it ships</h3>
        <div class="wk-kv">
          <div><b>Documents that arrive before the goods</b><span>Invoice, packing list, certificate of origin, and whatever the destination adds. A container waiting on paperwork costs more per day than the margin on the pallet holding it up.</span></div>
          <div><b>Spare parts, for a stated number of years</b><span>Blades, springs and pivot kits held and priced. This is what makes a repairability claim real, and it is increasingly asked for in Europe.</span></div>
          <div><b>A claims process with a number on it</b><span>What evidence is needed, who decides, and how long it takes. &ldquo;We will look after you&rdquo; is not a process.</span></div>
          <div><b>Terms understood the same way by both sides</b><span>FOB, CIF and DDP move risk and cost to different places. Most disputes we see are a term agreed loosely rather than a price agreed wrongly.</span></div>
          <div><b>Continuity</b><span>Whether the same line, the same tooling and the same people will still make it next season &mdash; the reason the first section of this page is about a floor rather than a process.</span></div>
        </div>
        <p class="wk-ask"><b>Worth asking early:</b> who owns the tooling, how many sample rounds are free, whether MOQ can be pooled across the range, and how long spare parts are held. Four questions, and the answers tell you most of what a supplier relationship will be like.</p>` },

  { id: 's-cost', title: 'Cost structure', subs: [],
    take: "A landed price is four blocks. Most negotiations move only the first, and the last two are usually larger.",
    render: () => `        <p>A landed price is four blocks, not one number. Most sourcing conversations move only the first; in a hand-tool programme the last two are frequently larger than the saving being negotiated on the first.</p>
        <div class="cost-ladder">
${COST.map((c, i) => `          <div class="cost-cell"><b>BLOCK 0${i + 1}</b><strong>${esc(c[0])}</strong><span>${esc(c[1])}</span></div>`).join('\n')}
        </div>
        <p>Run your own numbers: the landed-cost tool on the <a href="partner.html#p-landed2">AsiaSource</a> uses these same four blocks, with current material and freight readings already loaded.</p>` },

  { id: 's-also', title: 'See also', subs: [],
    take: "Where to go next, and what this page deliberately does not contain.",
    render: () => `        <ul class="wk-seealso">
          <li><a href="partner.html">AsiaSource</a> — live material, freight and tariff readings, and the landed-cost tool referenced above.</li>
          <li><a href="executive.html">ABrief</a> — the daily industry brief behind those readings.</li>
          <li><a href="about.html#pure-play">About</a> — the confidentiality rule that governs what appears on this page.</li>
          <li><a href="contact.html">Contact</a> — to discuss a production route against a real specification.</li>
        </ul>
        <p class="wk-note">Diagrams on this page are schematic illustrations drawn for explanation. Process and material descriptions are general industry practice; the routes available for a given programme depend on the part, the volume and the origin. The two meters are ordinal judgements about the European and North American DIY retail channel, not measured market data.</p>` }
];

const sectionsHtml = SECTIONS.map((s, i) => `      <section class="wk-sec" id="${s.id}">
        <h2><span class="wk-n">${i + 1}</span> ${esc(s.title)}</h2>
${s.take ? `        <p class="wk-take">${s.take}</p>\n` : ''}${s.render(i + 1)}
      </section>`).join('\n\n');

const tocHtml = SECTIONS.map((s, i) => `        <li><a href="#${s.id}">${i + 1} ${esc(s.title)}</a>` +
  (s.subs.length ? `<ul>${s.subs.map((k, j) => `<li><a href="#${k.id}">${i + 1}.${j + 1} ${esc(k.title)}</a></li>`).join('')}</ul>` : '') +
  '</li>').join('\n');

const HEADER = `  <a class="bl-skip" href="#main">Skip to content</a>
  <header class="bl-header">
    <div class="bl-header-inner">
      <a class="bl-wordmark" href="index.html">BIRDLAND<small>Confidential OEM · Taiwan</small></a>
      <nav class="bl-nav" aria-label="Main navigation">
        <details class="bl-menu"><summary>About</summary><div class="bl-menu-panel"><a href="about.html">Us</a><a href="guide.html">Guide</a></div></details>
        <a href="product-101.html" aria-current="page">Factory</a>
        <button type="button" class="tm-chip" data-terminal aria-haspopup="dialog" aria-expanded="false"><i aria-hidden="true"></i>Terminal</button>
        <a href="contact.html">Contact</a>
      </nav>
      <div class="bl-header-actions"><div class="bl-status" aria-label="Birdland system status"><span class="bl-status-online" data-hq-status>Birdland Office <b data-hq-label>Resting</b></span><span class="bl-status-time" data-taipei-time>--:-- Taipei</span>${picker('product-101.html', null)}</div></div>
    </div>
  </header>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <link rel="stylesheet" href="tokens.css?v=20260804a"><script src="text-size.js?v=20260804a"></script>
  <link rel="stylesheet" href="terminal.css?v=20260803a"><script defer src="terminal.js?v=20260803a"></script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Factory | Garden Hand-Tool Manufacturing Reference</title>
  <meta name="description" content="A reference article on garden hand-tool manufacturing: the Taiwan works since 1974, seven production gates, nine material families, eleven packaging formats and the four blocks of landed cost — each rated for how common and how costly it is in European and North American DIY retail.">
  <link rel="stylesheet" href="birdland-visual.css?v=20260811a"><script defer src="terminal-status.js?v=20260730d"></script>
  ${cluster('product-101.html')}
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
</head>
<body>
${HEADER}
${sprite}

  <main class="wk" id="main">
    <nav class="wk-toc" aria-label="Contents">
      <b>Contents</b>
      <ol>
${tocHtml}
      </ol>
    </nav>

    <article class="wk-body">
      <div class="wk-head">
      <div>
      <nav class="ledger-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><span>Factory</span></nav>
      <h1>Garden hand-tool manufacturing</h1>
      <p class="wk-lead">A tool that looks simple on a shelf is the output of seven controlled gates and nine material families, packed and shipped under rules that change with the destination. This article sets out that route in public terms. It contains no customer drawing, specification or programme record.</p>

      </div>
      <aside class="wk-box" aria-label="At a glance">
        <b>Birdland Ind.</b>
        <img src="images/factory-album.webp" alt="A contact sheet of fourteen photographs taken across Birdland's own production and warehousing floor" loading="lazy" decoding="async">
        <span class="wk-box-cap">Fourteen frames from the original 1974 works and the chain around it — see §1</span>
        <dl>
          <dt>Founded</dt><dd>1974 — same Taiwan site</dd>
          <dt>Role</dt><dd>Confidential OEM / ODM</dd>
          <dt>Origins</dt><dd>Taiwan and China</dd>
          <dt>Production gates</dt><dd>7</dd>
          <dt>Material families</dt><dd>9</dd>
          <dt>Packaging formats</dt><dd>11</dd>
          <dt>Own brand</dt><dd>None, by rule</dd>
        </dl>
      </aside>
      </div>

${sectionsHtml}
    </article>
  </main>

  <script>
  /* The contents rail carried 48 links. A reader cannot triage 48 links, so
     it shows the twelve sections and opens the subsections of the one being
     read. Sub-links stay reachable: they appear as you arrive, and on focus.

     A probe line, not an IntersectionObserver: two sections are "on screen"
     whenever a boundary crosses the band, and picking between them needs a
     rule anyway. Which section have I most recently passed is that rule. */
  (function(){
    var toc = document.querySelector('.wk-toc');
    var secs = [].slice.call(document.querySelectorAll('.wk-sec'));
    if (!toc || !secs.length) return;
    toc.classList.add('is-live');
    var byId = {};
    [].forEach.call(toc.querySelectorAll('a[href^="#"]'), function (a) {
      byId[a.getAttribute('href').slice(1)] = a;
    });
    // Read-out: how far through the article, and which section of how many.
    var art = document.querySelector('.wk-body');
    var out = document.createElement('p');
    out.className = 'wk-read';
    toc.appendChild(out);

    var at = null, queued = false;
    function paint() {
      queued = false;
      var probe = 150, here = secs[0].id, n = 1;
      for (var i = 0; i < secs.length; i++) {
        if (secs[i].getBoundingClientRect().top <= probe) { here = secs[i].id; n = i + 1; }
        else break;
      }
      // At the foot of the document the probe line still sits in the section
      // above, so the last one could never be reached. If there is nothing
      // left to scroll, you are in the last section.
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) {
        here = secs[secs.length - 1].id; n = secs.length;
      }
      // How much of the article has passed the foot of the window. Not the
      // same as scroll position on the document: the header and the footer
      // are not the article.
      var box = art.getBoundingClientRect();
      var done = Math.max(0, Math.min(1, (innerHeight - box.top) / box.height));
      toc.style.setProperty('--wk-prog', Math.round(done * 100) + '%');
      var line = 'Read ' + Math.round(done * 100) + '% · ' + n + ' of ' + secs.length;
      if (out.textContent !== line) out.textContent = line;

      if (here === at) return;
      at = here;
      [].forEach.call(toc.querySelectorAll('.is-here'), function (n2) { n2.classList.remove('is-here'); });
      var link = at && byId[at];
      if (link && link.parentNode) link.parentNode.classList.add('is-here');
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    paint();
  })();
  </script>

  <footer class="bl-footer">
    <span>This page contains public manufacturing education only.</span>
    <span><a href="about.html#pure-play">Next: About →</a></span>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(require('./_env').REPO, 'product-101.html'), html, 'utf8');
console.log('bytes', html.length, '| sections', SECTIONS.length,
  '| symbols', (html.match(/<symbol/g) || []).length,
  '| uses', (html.match(/<use /g) || []).length,
  '| rated rows', (html.match(/class="wk-dots"/g) || []).length,
  '| sprite wrapped', /<svg[^>]*>\s*<symbol/.test(html));
