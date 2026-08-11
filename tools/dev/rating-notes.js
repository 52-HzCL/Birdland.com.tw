// Two sentences for every option in the rated lists on product-101.html: what
// a buyer is actually deciding, and what fifty years on this floor says about
// running it. Keyed by the same names as ratings.js — build-p101.js fails the
// build if any rated name reaches the page without an entry here, so the two
// files cannot drift apart.
//
// Rule for both fields: general engineering fact and industry practice only.
// Nothing here asserts a Birdland-internal figure, yield or customer detail.
module.exports = {
  // ---------------------------------------------------------- 4.1 intake ---
  "Blade & spring steel": {
    buyer: "Admitting this family means admitting a hardenable grade, so the mill certificate matters more than the price line: carbon content, decarburisation depth and strip flatness at intake decide the hardness band you can hold later, not the heat treatment you specify.",
    production: "We check the incoming coil for decarburised skin before it ever reaches a die — a soft surface layer of a few hundredths of a millimetre survives hardening as an edge that dulls in the first season, and it is invisible once the part is plated."
  },
  "Stainless steel": {
    buyer: "Stainless arriving at intake is two different materials: austenitic 304 cannot be hardened by heat treatment and belongs on bodies and fasteners, while martensitic 410 and 420 can — and since those two are both magnetic and visually identical, dropping the lower-carbon 410 into an edge application is the substitution no goods-in check short of a material test will catch.",
    production: "We keep martensitic and austenitic stock physically separated on the rack, because the two look identical under a coolant film and a mixed batch is only discovered after quench, when half the parts come out soft."
  },
  "Aluminium": {
    buyer: "The temper designation is the specification, not the alloy number: 6061-T6 and 6061-T4 are the same metal at different yield strengths, and a shaft supplied in the softer temper bends permanently under a load the harder one springs back from.",
    production: "Extrusion tolerance on wall thickness is what we watch at intake — a tube under nominal wall passes a diameter gauge and still buckles at the ferrule, so we gauge wall, not just outside diameter."
  },
  "Rigid plastics": {
    buyer: "Resin at intake is defined by grade and filler, not by the word 'nylon': PA6 unfilled and PA6-GF30 differ by roughly a factor of three in stiffness, and glass content is the single line most often quietly dropped from a bill of materials.",
    production: "We take moisture seriously on polyamide because it is hygroscopic — resin that has sat unsealed hydrolyses in the barrel and moulds parts that look correct and snap at the boss, so it is dried to specification before every run."
  },
  "Grip compounds": {
    buyer: "Specify the elastomer by Shore A hardness and by what it must bond to; a TPR that is correct on polypropylene delaminates on nylon, and a grip that peels is a warranty return even though the tool still works.",
    production: "Adhesion in over-moulding is chemical, not mechanical, so we match the elastomer family to the substrate and hold the interface temperature — a cold substrate gives a joint that survives assembly and fails in the hand."
  },
  "Timber": {
    buyer: "Moisture content is the whole specification: a handle fitted at 18% and shipped into a heated European interior shrinks in its ferrule and loosens, so the number to agree is kiln-dried moisture at packing, not species alone.",
    production: "We look at grain run-out rather than surface appearance — a handle whose grain leaves the side within the length of the shaft breaks across the fibres under a prying load no matter how clean the finish looks."
  },
  "Fabric": {
    buyer: "Fabric enters a metal-goods bill of materials as the item most likely to carry the chemical compliance risk — dyes, coatings and any leather trim are what a REACH or Proposition 65 question lands on first, not the steel.",
    production: "Cut-and-sew stretch is our control point: the same roll behaves differently across its width, so panels are cut to nested markers rather than singly, which is what keeps a pair of gloves a matched pair."
  },

  // --------------------------------------------------------- 4.2 forming ---
  "Stamping": {
    buyer: "Stamping is cheap per piece and expensive to change: the die carries the geometry, so a profile revision after tooling sign-off is a tooling charge and a lead-time reset, and this is the gate where a drawing should stop moving.",
    production: "Die clearance is set as a percentage of stock thickness, and it is what decides burr height and the depth of the sheared band on the cut face — too tight and the die chips, too open and the edge rolls, so we tune it to the material rather than to habit."
  },
  "Hot forging": {
    buyer: "You are paying for grain flow, not for weight: forging aligns the material along the shape so the load path is continuous, which is why a forged tang survives prying loads that fracture an equally thick stamped one.",
    production: "Finish temperature and the trim of the flash line are what we watch — a forging finished too cold work-hardens unevenly and carries residual stress into quench, where it becomes distortion nobody can straighten out economically."
  },
  "Cold forging": {
    buyer: "Cold forging work-hardens the part as it forms it, so a cold-forged pin or rivet arrives stronger than the bar it came from and holds a tighter diameter tolerance than machining at the same price at volume.",
    production: "The limit is formability, not force: material has a finite strain before it cracks, so we split the shape across progressive stations rather than chasing it in one hit, and anneal between stations when the geometry demands it."
  },
  "Laser cutting": {
    buyer: "Laser is the right answer for short runs and prototype profiles because it removes tooling cost entirely, but it leaves a heat-affected zone at the cut edge that must be ground away before hardening on any part that will carry an edge.",
    production: "We treat the cut edge as unfinished — the recast layer and the hardness gradient beside the kerf behave differently in quench, so a laser-cut blade profile gets stock left on the edge for removal."
  },
  "Tube drawing": {
    buyer: "Drawing sets both the diameter and the wall, and wall is what carries bending load: two shafts quoted at the same outside diameter can differ by a third in stiffness, so specify wall thickness explicitly or you are buying appearance.",
    production: "Straightness after drawing is the control point on long shafts — residual stress from the die shows up as bow over a two-metre length, so we straighten and stress-relieve rather than selecting parts by eye."
  },
  "Tube bending": {
    buyer: "The number to specify is the centreline bend radius against tube diameter: a tight radius thins the outer wall and wrinkles the inner one, which is where a bent handle eventually cracks in service.",
    production: "We use a mandrel on thin-wall bends because the tube needs internal support to keep its section — without it the bend ovalises, and an oval tube will not accept the ferrule that was designed for a round one."
  },
  "Swaging": {
    buyer: "Swaging is the cheap way to taper or close a tube end, and it costs nothing in material, but the reduced section is work-hardened and slightly harder — a fair trade on a handle end, a poor one on a part that must be welded afterwards.",
    production: "Die alignment is everything: a swage taken off-axis produces a taper that looks fine and seats crooked in its ferrule, so we set concentricity on the fixture rather than correcting it downstream."
  },
  "Wood turning": {
    buyer: "Turning is priced by the cut, not by the wood, and every extra bead or shoulder in a handle profile is another operation — a simpler profile in a better-dried billet is a stronger handle at a lower price than the reverse.",
    production: "We turn oversize and let the blank rest before final cut, because timber moves after material is removed; skipping that rest is why some turned handles come out of the warehouse slightly oval in winter."
  },
  "Injection moulding": {
    buyer: "Unit cost falls with volume and rises with wall thickness and cycle time, so the biggest lever on a moulded handle price is the design, not the negotiation — thick ribs are slow to cool and expensive twice over.",
    production: "We manage sink marks and weld lines at the gate position, not at the polish stage — a weld line where two flow fronts meet is a genuine strength discontinuity, so it gets placed away from the load path."
  },
  "Two-shot over-moulding": {
    buyer: "Two-shot is a single tool that makes a finished bi-material part, so it costs more up front and less per unit than moulding and assembling separately, and it removes the peel-off failure mode that a glued-on grip has.",
    production: "The second shot must meet a substrate that is still chemically receptive, which is why the two shots are sequenced in one machine rather than stockpiled — a cold, aged first shot is what turns a bonded grip into a sleeve."
  },
  "Dip moulding": {
    buyer: "Dipping gives a cushioned handle end at the lowest tooling cost of any grip method, but coating thickness is process-controlled rather than tool-controlled, so agree a thickness range and a cure standard instead of a single figure.",
    production: "Withdrawal speed and preheat set the film thickness, so we control both rather than the dip time alone — a hurried withdrawal leaves the film thin at the shoulder, which is exactly where the grip is gripped."
  },

  // ------------------------------------------------------------ 4.3 heat ---
  "Through hardening": {
    buyer: "Through hardening makes the whole section hard, which is right for a trowel blade and wrong for anything that must absorb shock, because a fully hard part has nowhere ductile left to yield before it cracks.",
    production: "Section thickness drives quench severity — the same steel through-hardens in a thin blade and only case-hardens in a thick one, so we set the quench to the section rather than to the grade."
  },
  "Quench & temper": {
    buyer: "Hardness is meaningless without the tempering step behind it: as-quenched steel is hard and brittle, and the temper is what buys back toughness, so ask for the hardness band after tempering and the tolerance on it.",
    production: "We temper promptly after quench rather than letting parts sit — untempered martensite is under enormous residual stress, and a batch left overnight can crack in the basket before anyone has touched it."
  },
  "Induction (local) hardening": {
    buyer: "Local hardening puts hardness only where the tool cuts and leaves the body ductile, which is the correct answer for a pruner blade; what you should specify is the case depth and where the hardened zone starts and stops.",
    production: "Coil geometry and dwell decide the hardened pattern, so we prove the pattern by sectioning and etching a sample rather than trusting a surface hardness reading, which cannot see how deep the case actually runs."
  },
  "Solution annealing": {
    buyer: "This is a stainless-specific step that dissolves carbides back into solution and restores corrosion resistance after forming or welding; without it a welded stainless part can rust in a line along the heat-affected zone.",
    production: "The cooling rate out of solution temperature is the whole point — cool too slowly through the sensitisation range and chromium carbides precipitate at the grain boundaries, undoing the treatment you just paid for."
  },
  "Stress relief": {
    buyer: "Stress relief is a cheap insurance step, not a strength step: it removes the locked-in stress left by forming so the part does not move later, and it is the fix for components that leave tolerance in the warehouse rather than on the line.",
    production: "We relieve after heavy forming and before final machining, because relieving afterwards just moves the finished dimension — the order of operations is where this step earns its cost."
  },
  "Hardness banding by grade": {
    buyer: "Banding sorts output into hardness ranges instead of accepting a single average, and it is what turns a hardness figure into a guarantee — a mean of HRC 58 says nothing about how many parts left the line at 52.",
    production: "We treat the band as a process control, not a sorting operation: if parts need sorting to meet the band, the quench is drifting, and the useful response is to fix the furnace rather than to grade the output."
  },

  // --------------------------------------------------------- 4.4 tooling ---
  "Progressive dies": {
    buyer: "A progressive die is a capital item that pays back in unit price and lead time at volume, and it is normally the largest single tooling line in an OEM programme — settle ownership and amortisation in writing before it is cut.",
    production: "Strip layout decides material yield, and yield is the quiet half of the part cost — a nested layout that saves a few millimetres of pitch pays for itself across a run far faster than any press-speed gain."
  },
  "Single-station dies": {
    buyer: "Single-station tooling is the right economics below the volume where a progressive die pays back: cheaper to cut, slower to run, and far cheaper to modify when a profile is still settling.",
    production: "The trade is handling between stations, which is where positional error enters, so we fixture the transfer rather than the operator — repeatability at a single station is easy, repeatability between them is the work."
  },
  "Trim & pierce tools": {
    buyer: "These secondary tools are where hole position and edge condition are actually set, so a drawing that tolerances the hole to the part outline rather than to a datum will be interpreted differently by every supplier who quotes it.",
    production: "We pierce before hardening wherever the design allows, because a hole put into hardened steel needs grinding or EDM and turns a cheap operation into an expensive one."
  },
  "Injection moulds": {
    buyer: "The mould is usually the largest tooling cost in a plastic programme, and steel grade and cavity count are what you are buying — a hardened tool costs more and survives the volumes that a pre-hardened one will not.",
    production: "Cooling layout inside the tool sets cycle time and warpage together, so we treat the water circuit as part of the part design; a tool that cools unevenly makes parts that bow no matter how the machine is tuned."
  },
  "Welding jigs": {
    buyer: "A jig is cheap, and it is the only reason a welded frame is the same shape on the first and last unit of a run — the absence of one shows up as assemblies that need forcing to fit their own fasteners.",
    production: "We design jigs for heat, not just for position: a fixture that clamps a frame rigidly while it is welded locks in distortion, so the clamping sequence has to allow the assembly to move and then settle."
  },
  "Assembly fixtures": {
    buyer: "Assembly fixtures are what make hand assembly repeatable across shifts and lines, and they are cheap enough that their absence is a process decision rather than a cost one.",
    production: "The fixture we care most about is the one that makes the wrong build physically impossible — poka-yoke geometry catches a reversed component at the bench, where it costs nothing, rather than at the final function check."
  },
  "Gauges": {
    buyer: "Gauges are what make an inspection result comparable between your QC and ours; without an agreed gauge, two honest measurements of the same feature can legitimately disagree and there is nothing to arbitrate against.",
    production: "We calibrate on a schedule and record it, because an uncalibrated go/no-go gauge does not fail loudly — it drifts, and it quietly passes parts it should have stopped for as long as nobody checks it."
  },

  // -------------------------------------------------------- 4.5 joining ----
  "Riveting": {
    buyer: "The pivot rivet is the single joint that decides whether a pruner still cuts cleanly after a season, and it is specified by clamp load and by whether it can be re-tensioned, not by rivet diameter alone.",
    production: "Set force is our control point rather than set height — a rivet closed to the right dimension at the wrong force gives a pivot that feels correct on the bench and loosens after a few thousand cycles."
  },
  "Bolted joints": {
    buyer: "A bolted pivot is the serviceable answer: it can be re-tensioned by the user and it is what lets a tool be sold with a sharpening or maintenance story, at the cost of a fastener that can also be lost.",
    production: "We specify the locking method with the fastener — a nylon insert or thread-locking patch is what keeps a torque figure meaningful after vibration, and it is a consumable that does not survive repeated disassembly."
  },
  "Snap-fit": {
    buyer: "Snap-fits remove fasteners and assembly labour entirely, which is why they dominate mass-market housings; the design question is whether the joint must ever be opened again, because most snap-fits are designed to close once.",
    production: "Cantilever strain at assembly is what decides whether a snap survives — over-strain does not break the hook, it creeps, and the housing that clipped tight at assembly rattles by the time it reaches a shelf."
  },
  "Press-fit": {
    buyer: "A press-fit ferrule or tang holds by interference alone, so the joint's strength lives entirely in a tolerance pair — specify the fit, not the nominal diameter, or you are trusting two independent tolerance stacks to meet.",
    production: "We control both halves of the interference rather than one, because a fit assembled at the loose end of both tolerances still presses together and simply does not hold the load it was designed for."
  },
  "Spot welding": {
    buyer: "Spot welding is fast and cheap on sheet assemblies, and its weakness is that quality is invisible from outside: a weld that looks identical can be a fraction of the strength if the current or the electrode was wrong.",
    production: "We verify by destructive peel on samples rather than by appearance, because the nugget is inside the joint — a surface indentation proves the electrode arrived, not that the material fused."
  },
  "MIG welding": {
    buyer: "MIG suits the heavier long-handled assemblies where a continuous weld carries real load, and it brings heat distortion with it, so any part that must stay straight needs a fixture and, often, a stress-relief step afterwards.",
    production: "Heat input is the variable we manage, not travel speed alone — the same weld laid too hot burns through thin wall and too cold leaves lack of fusion, and only one of those two is visible to the welder."
  },
  "Brazing": {
    buyer: "Brazing joins dissimilar metals below their melting point, which is how a hard blade meets a tough tang without destroying either, and it is a premium, low-volume answer priced by filler metal and labour.",
    production: "Joint gap is what makes a braze work — capillary action needs a narrow, even clearance, so we control the fit-up; a gap opened up to be forgiving produces a joint that is mostly filler and mostly weak."
  },
  "Over-moulded joints": {
    buyer: "Over-moulding bonds the grip to the handle as one part, which removes the peel and twist failures of a slid-on sleeve; the specification that matters is substrate compatibility, and it is set at the material choice, not the moulding.",
    production: "We treat the substrate surface as part of the joint — mould release, dust or a fingerprint at the interface is enough to turn a chemical bond into a mechanical one, so handling between shots is controlled."
  },
  "Adhesive bonding": {
    buyer: "Adhesive is the flexible answer for ferrules and labels, and its performance is entirely a function of surface preparation and cure conditions, which means it is the joint most sensitive to a change of shift or season.",
    production: "Surface energy is what we prepare for — a degreased and abraded surface bonds and an as-moulded polyolefin surface does not, regardless of which adhesive is on the datasheet."
  },

  // --------------------------------------------------------- 4.6 finish ----
  "Zinc plating": {
    buyer: "Zinc is sacrificial protection, so what you are buying is thickness and passivate, not appearance: the coating corrodes in place of the steel, and salt-spray hours scale with how much of it there is.",
    production: "We watch hydrogen embrittlement on hardened parts — plating charges hydrogen into high-hardness steel, and the bake that drives it back out has to happen within hours of plating or the part is already compromised."
  },
  "Nickel-chrome plating": {
    buyer: "Nickel-chrome is a decorative stack, not a single layer: the corrosion resistance lives in the nickel underneath and the chrome is a thin bright top, so a specification that names only chrome has specified the wrong thing.",
    production: "Coverage in recesses is where this finish fails — plating current follows geometry, so inside corners and blind features receive the least deposit, and that is exactly where the first rust appears."
  },
  "Dacromet": {
    buyer: "A zinc-flake coating gives high salt-spray resistance at low coating thickness and without the hydrogen embrittlement risk of electroplating, which is why it appears on high-strength fasteners and rarely on consumer tools, where it is hard to justify on price.",
    production: "It is a dip-spin and bake process rather than a plating bath, so the control points are coating weight and cure temperature — an undercured film looks finished and wipes off in handling."
  },
  "Powder coating": {
    buyer: "Powder gives a thick, durable, colour-matched film in one pass with no solvent, and its real limitation is edges: powder pulls away from a sharp edge as it flows, so edge corrosion is the failure to design against.",
    production: "Pre-treatment decides adhesion far more than powder quality does — a phosphate or equivalent conversion coat is what the film keys into, and a coating applied over a poorly cleaned part will pass inspection and lift in the field."
  },
  "Wet paint": {
    buyer: "Wet paint is the cheapest way to put colour on metal and the least durable in service, which makes it the right answer for a display surface and the wrong one for a wear surface such as a spade blade.",
    production: "Film build and cure are the controls, and both are easy to get wrong quickly — paint applied heavy to cover a poor surface runs, and paint cured short stays soft enough to mark in the carton."
  },
  "E-coat": {
    buyer: "Electro-deposited primer coats complex geometry evenly, including inside recesses that spray cannot reach, which is why it is an automotive standard; on hand tools it usually only makes sense as a primer under a topcoat.",
    production: "Throwing power is the property being bought — the deposited film insulates as it builds, which is what drives coating into shadowed areas, so the part must be racked to let the bath drain rather than trap."
  },
  "Anodising": {
    buyer: "Anodising converts the aluminium surface itself rather than adding a layer, so it cannot chip; what it can do is vary in colour between batches and alloys, which matters when a part must match another part.",
    production: "Alloy and temper drive the colour, so we keep a colour-critical part on one alloy and one supplier — the same anodise recipe on a different 6000-series lot comes out a visibly different shade."
  },
  "Polishing": {
    buyer: "Polishing is bought for the shelf, and it is labour, so it scales linearly with volume rather than falling — on a bright blade it is often the largest single finishing cost and the easiest place to over-specify.",
    production: "We control the abrasive sequence rather than the final buff, because a skipped grit leaves scratches that the buff makes shinier instead of removing, and they only become visible under retail lighting."
  },
  "Sand-blasting": {
    buyer: "Blasting is surface preparation, not decoration: it gives a coating something to key into and removes scale, and skipping it is the most common reason a perfectly good coating lifts off a perfectly good part.",
    production: "Media and pressure set the profile, and profile is what adhesion depends on — too aggressive on thin sheet also induces stress and warps the part, so the blast is matched to the section."
  },
  "Lacquer or oil on wood": {
    buyer: "The choice is a maintenance decision you are making for the end user: lacquer seals and eventually chips, oil penetrates and needs re-application, and each implies a different care instruction on the pack.",
    production: "Moisture content at finishing is the control point — finish applied over timber that has not stabilised traps moisture, and the handle later checks and lifts the film from underneath."
  },
  "Heat transfer print": {
    buyer: "Heat transfer puts full-colour graphics onto a moulded handle cheaply and is the standard route for branding plastic, with the limitation that it sits on the surface and abrades where the tool is actually held.",
    production: "Dwell, temperature and pressure have to suit the substrate — the same foil that transfers cleanly to polypropylene will not key to a soft TPR grip, so the print area is placed on the rigid component."
  },
  "Laser marking": {
    buyer: "Laser marking is permanent and cannot be counterfeited off the part, which is why it carries brand, grade and traceability data on premium lines where a printed mark would wear away.",
    production: "On hardened steel we mark with parameters that do not re-temper the surface — an over-powered mark puts a local heat-affected zone into a cutting edge, and it is a soft spot exactly where the edge works."
  },

  // ----------------------------------------------------- 4.7 inspection ----
  "Hardness sampling": {
    buyer: "A hardness figure is only as good as the plan that produced it: ask for the sampling frequency and the band, because a certificate quoting one number for a whole shipment tells you nothing about consistency.",
    production: "We take readings on a prepared surface rather than through plating or scale, because a reading taken through a coating reads soft and will have someone chasing a heat-treatment problem that does not exist."
  },
  "Open/close cycle life": {
    buyer: "Cycle testing is the only test that finds pivot loosening and spring fatigue before the market does, and the number to agree is cycles under load with a defined pass criterion — not simply 'it still opens'.",
    production: "We watch the pivot for wear rather than the blade for sharpness in this test — in almost every cycle-life failure the geometry opens up first, and the loss of cutting quality is a symptom of that, not a separate fault."
  },
  "Salt-spray hours": {
    buyer: "Salt spray is a comparative screen, not a prediction of years in a garden; it is useful for holding a coating supplier to a standard and misleading if quoted as a service-life claim.",
    production: "We test the assembled part rather than the plated component, because failure almost always begins at an edge, a fastener or a joint where two metals meet — the flat, easy surfaces are never the problem."
  },
  "Dimensional AQL": {
    buyer: "The AQL level and the inspection standard are the commercial terms here: they define exactly how many defects a lot may contain and still be accepted, and agreeing them before production is what makes a rejection arguable rather than personal.",
    production: "We keep incoming and outgoing checks on the same datums as the drawing, because a dimension measured from a different reference is a different dimension, and most disputes we have seen begin there."
  },
  "Edge & function check": {
    buyer: "This is the last check that reflects what the end user will experience in the first five seconds out of the pack, and it is cheap enough to run at full coverage rather than by sample.",
    production: "We use a consistent cutting medium so the result means something across shifts — a subjective sharpness check varies with the operator, and it is the one test where that variation reaches the customer directly."
  },
  "Joint pull test": {
    buyer: "This is destructive, so it is a process verification rather than a shipment gate: it tells you the joint the line is producing is sound, which is a different question from whether a given carton is good.",
    production: "We record the failure mode, not just the load — a joint that fails by tearing the parent material is a correct joint at its limit, and one that fails at the interface is a process problem regardless of the number."
  },
  "Pack drop test": {
    buyer: "The drop test protects margin rather than product: transit damage arrives as a retailer deduction, and the test defines the pack that survives the distribution route the goods will actually travel.",
    production: "We test the shipping unit as it will actually be palletised, since a carton that passes alone can still fail in a stack — most transit damage we have seen is compression over time, not a single impact."
  },
  "Barcode & label check": {
    buyer: "This is compliance, not quality: an unreadable barcode or a missing country-of-origin mark stops goods at a distribution centre as effectively as a broken tool, and it is the cheapest failure on this list to prevent.",
    production: "We verify by scanning under the same conditions a retailer will, because a code that reads on a bench scanner can fail at a warehouse gun if the print contrast or the quiet zone is marginal."
  },

  // -------------------------------------------------- 5. material families --
  "Blade and spring steel": {
    buyer: "This family is where edge retention is bought and where corrosion resistance is not — a carbon or low-alloy grade takes a hard, fine edge cheaply and then depends entirely on the finish applied over it.",
    production: "Grade and hardness band have to be chosen together with the intended use: the same steel at HRC 58 holds an edge and chips on a knot, and at HRC 52 blunts sooner and survives the same knot."
  },
  "Plating and coating": {
    buyer: "Treat this as a stack with a stated performance rather than a colour: preparation, protective layer and topcoat are three separate costs, and salt-spray performance comes from all three rather than from the visible top.",
    production: "We size the protection to the exposure the tool will actually see — a coating specified for coastal or professional grounds use is a different stack from one for a domestic shed, and over-specifying it is as wasteful as under-specifying it."
  },
  "Grips and soft compounds": {
    buyer: "Soft grip is now an expected feature rather than a premium one, and the buying decision is durability: hardness, substrate compatibility and resistance to oils and UV are what separate a grip that lasts from one that goes tacky.",
    production: "We match the compound to how the tool is held and stored — an elastomer that performs in the hand can still degrade in a hot shed or under sunlight, and that failure arrives long after any incoming inspection."
  },
  "Fabric and textile": {
    buyer: "Textiles carry a different compliance burden from metal: dyes, coatings and trims are what a chemical-restriction question lands on, and the substantiation is held by the mill rather than by the tool factory.",
    production: "We manage this family through the supply chain rather than the line — the controls that matter are documentation and consistency at the mill, because a fault in a roll is not correctable downstream."
  },
  "Packaging board": {
    buyer: "Board is specified by construction and burst or edge-crush strength, not by thickness, and it is the cheapest place on a bill of materials where under-specifying reliably turns into transit damage deductions.",
    production: "We set board grade against the stacking height and the humidity of the route — board loses a significant part of its compression strength when it takes up moisture, and a long sea leg is exactly where that happens."
  },

  // --------------------------------------------------------- 8. packaging --
  "Corrugated export carton": {
    buyer: "The export carton is the unit your freight and your damage claims are both calculated on, so carton dimensions deserve the same attention as the product — a carton that palletises badly costs freight on every shipment.",
    production: "We work the carton back from the pallet footprint rather than forward from the product, because a few millimetres of overhang loses a full column on the pallet and pays for itself in wasted volume every run."
  },
  "Colour box": {
    buyer: "A printed retail box is a marketing asset with a long lead time and a minimum order quantity of its own, and it is usually the component that fixes how early artwork must be frozen in a programme.",
    production: "Colour consistency across print runs is the recurring issue, so we work to an approved physical proof rather than a screen reference — the same file prints differently on different board and different presses."
  },
  "Hang tag / header card": {
    buyer: "The header card is what makes a product hang on a peg hook, and its die-cut and hole position are retailer-specific — this is where a pack fails a planogram rather than a quality check.",
    production: "Board grain direction relative to the hang hole is what stops a card tearing on the hook, and it is easy to lose when artwork is resized late without re-checking the die."
  },
  "Blister pack": {
    buyer: "Blister presents the tool well and is under active regulatory pressure over plastic content in several markets, so it is worth confirming that a format is still compliant in the destination before committing artwork and tooling.",
    production: "Seal temperature and dwell are the controls: an under-sealed blister opens in transit and an over-sealed one cannot be opened by the customer without tools, and the acceptable window between them is narrow."
  },
  "Skin pack": {
    buyer: "Skin packing suits irregular shapes that a blister tool cannot economically match, and it trades a lower tooling cost for a slower line rate and a less premium shelf presence.",
    production: "The film has to draw evenly over the product's high points, so we control heating and vacuum together — a thin spot over a corner is where the pack later splits in handling."
  },
  "Paper-and-plastic composite": {
    buyer: "These hybrid formats exist to cut plastic content ahead of packaging regulation, and the practical question is whether the format is separable for recycling in the destination market, because that is what the rules actually address.",
    production: "The paper and the film respond differently to heat and humidity, so we prove the combination through a transit test rather than assuming it behaves like the blister it replaces."
  },
  "Shrink film": {
    buyer: "Shrink is the cheapest way to bundle a multipack, and it is a bundling material rather than a protective one — it holds units together and does nothing about compression or impact.",
    production: "Tunnel temperature and line speed set the shrink, and over-shrinking is the failure we watch for: film pulled too tight deforms the pack it is holding, particularly on a colour box."
  },
  "Label set": {
    buyer: "Labels carry the regulatory content — origin, safety marking, barcode — and they are the component most often revised late, so it is worth keeping them on a separate artwork approval from the pack itself.",
    production: "Adhesive choice is matched to the surface and the temperature of the route: a label that stays put on a warm carton can lift from a cold, waxy or textured one, and that is discovered at the destination."
  },
  "Void fill": {
    buyer: "Void fill is bought to stop movement inside the carton, and its cost is trivial next to a damage claim, but it also adds volumetric weight — the cheaper fix is usually a carton that fits.",
    production: "We prefer designing the movement out to filling it in, because fill settles during a long sea leg and the void it was there to occupy reappears somewhere around the middle of the journey."
  },
  "Strapping": {
    buyer: "Strapping secures bundles and pallets and is a handling decision rather than a product one; whether it is needed is a function of the route and the number of handovers, not of the goods.",
    production: "Tension and edge protection go together — strapping pulled tight over an unprotected carton edge cuts into the board, and the pallet arrives secured by straps that are no longer holding anything."
  },
  "Pallet": {
    buyer: "The pallet specification is a customs and cost item at once: heat-treated wood carries an ISPM 15 mark that timber packaging needs for most international movements, and pallet dimensions decide how much container volume you actually pay for.",
    production: "We plan the load pattern before the first carton is printed, because pallet fit is set by carton size — changing a carton by a few millimetres afterwards is what turns a full pallet into a part-filled one."
  }
};
