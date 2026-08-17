// AsiaSource configurator: the product catalogue and its part anatomy.
// This file is the ONLY new data the configurator introduces. Every option
// name under parts[].options MUST be an exact key of tools/dev/ratings.js
// (routes/materials/packs) so the buyer/production sentences in
// rating-notes.js are reused verbatim — run verify-config-data.js after any
// edit; the configurator build must refuse to ship on a mismatch, the same
// discipline build-p101.js applies to its own ratings.
//
// Ordering is deliberate (owner's positioning, 2026-08-17): Birdland is a
// metal-working factory first, so the menu leads with the products whose
// margin we infer to be highest — full-metal forged and heat-treated tools —
// and ends with the assembly/sourcing programme. Within a tier, sort by
// `metal` (metal content 5..1) then listed order. No prices anywhere.
'use strict';

const TIERS = [
  { id: 'forge',  name: 'Forged & heat-treated in-house',
    body: 'Hot-forged bodies, our own furnaces and hardness control. This is the core of the factory.' },
  { id: 'form',   name: 'Formed, welded & fitted in-house',
    body: 'Stamped and drawn steel, welded joints, fitted wood and grip handles on our own lines.' },
  { id: 'source', name: 'Assembly & sourcing programme',
    body: 'Non-metal items we assemble or source to complete a programme under one shipment.' },
];

// Shared part option sets, spelled once. Keys of `options` are the gate ids
// used by build-p101.js (material/forming/heat/tooling/joining/finish/
// inspection) plus 'pack'.
const EDGE_STEEL   = ['Blade & spring steel', 'Stainless steel'];
const FORGE_FORM   = ['Hot forging', 'Cold forging'];
const SHEET_FORM   = ['Stamping', 'Laser cutting'];
const EDGE_HEAT    = ['Quench & temper', 'Induction (local) hardening', 'Through hardening'];
const METAL_FINISH = ['Powder coating', 'E-coat', 'Zinc plating', 'Polishing', 'Sand-blasting'];
const WOOD_HANDLE  = ['Timber', 'Wood turning', 'Lacquer or oil on wood'];
const GRIP_HANDLE  = ['Grip compounds', 'Two-shot over-moulding', 'Dip moulding'];
const TUBE_HANDLE  = ['Tube drawing', 'Tube bending', 'Swaging'];
const RIVET_JOIN   = ['Riveting', 'Bolted joints', 'Press-fit'];
const WELD_JOIN    = ['Spot welding', 'MIG welding', 'Brazing'];
const EXPORT_PACK  = ['Colour box', 'Hang tag / header card', 'Corrugated export carton'];
const EDGE_QC      = ['Edge & function check', 'Hardness sampling', 'Salt-spray hours'];
const JOINT_QC     = ['Joint pull test', 'Open/close cycle life'];

function P(id, name, tier, metal, draw, parts) {
  return { id, name, tier, metal, draw, parts };
}
function part(id, name, options) { return { id, name, options }; }

const PRODUCTS = [
  // ---- forge tier: full-metal, forged, our furnaces --------------------
  P('forged-trowel', 'Forged garden trowel', 'forge', 5, 'trowel', [
    part('blade',  'Blade',        { material: EDGE_STEEL, forming: FORGE_FORM, heat: EDGE_HEAT, finish: METAL_FINISH, inspection: EDGE_QC }),
    part('handle', 'Handle',       { material: ['Timber', 'Grip compounds'], forming: [...WOOD_HANDLE.slice(1), ...GRIP_HANDLE.slice(1)] }),
    part('joint',  'Tang & joint', { joining: RIVET_JOIN, inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: EXPORT_PACK }),
  ]),
  P('hatchet', 'Hatchet', 'forge', 5, 'hatchet', [
    part('head',   'Head & edge',  { material: EDGE_STEEL, forming: FORGE_FORM, heat: EDGE_HEAT, finish: ['Powder coating', 'Polishing', 'Sand-blasting'], inspection: EDGE_QC }),
    part('handle', 'Handle',       { material: ['Timber', 'Rigid plastics'], forming: WOOD_HANDLE.slice(1) }),
    part('joint',  'Eye & wedge',  { joining: ['Press-fit', 'Adhesive bonding'], inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: ['Blister pack', ...EXPORT_PACK] }),
  ]),
  P('mattock', 'Mattock / pick', 'forge', 5, 'mattock', [
    part('head',   'Forged head',  { material: ['Blade & spring steel'], forming: FORGE_FORM, heat: ['Quench & temper', 'Through hardening'], finish: ['Powder coating', 'Wet paint'], inspection: EDGE_QC }),
    part('handle', 'Handle',       { material: ['Timber'], forming: WOOD_HANDLE.slice(1) }),
    part('joint',  'Eye fit',      { joining: ['Press-fit'], inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: ['Corrugated export carton', 'Strapping', 'Pallet'] }),
  ]),
  P('machete', 'Machete', 'forge', 5, 'machete', [
    part('blade',  'Blade',        { material: EDGE_STEEL, forming: ['Stamping', 'Hot forging'], heat: EDGE_HEAT, finish: ['Powder coating', 'Polishing', 'Laser marking'], inspection: EDGE_QC }),
    part('handle', 'Handle scales',{ material: ['Rigid plastics', 'Timber', 'Grip compounds'], forming: ['Injection moulding'] }),
    part('joint',  'Full tang',    { joining: ['Riveting'], inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: ['Skin pack', ...EXPORT_PACK] }),
  ]),
  P('pruning-shears', 'Bypass pruning shears', 'forge', 4, 'shears', [
    part('blade',  'Cutting blade',{ material: EDGE_STEEL, forming: FORGE_FORM, heat: EDGE_HEAT, finish: ['Nickel-chrome plating', 'Polishing'], inspection: EDGE_QC }),
    part('counter','Counter blade',{ material: EDGE_STEEL, forming: SHEET_FORM, heat: ['Quench & temper'] }),
    part('handle', 'Handles & grip',{ material: ['Aluminium', 'Grip compounds'], forming: [...GRIP_HANDLE.slice(1)], finish: ['Anodising'] }),
    part('pivot',  'Pivot & spring',{ joining: ['Bolted joints', 'Riveting'], inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: ['Blister pack', 'Colour box', 'Hang tag / header card'] }),
  ]),
  P('loppers', 'Loppers', 'forge', 4, 'loppers', [
    part('blade',  'Blade set',    { material: EDGE_STEEL, forming: FORGE_FORM, heat: EDGE_HEAT, finish: ['Nickel-chrome plating', 'Powder coating'], inspection: EDGE_QC }),
    part('handle', 'Long handles', { material: ['Aluminium'], forming: TUBE_HANDLE, finish: ['Anodising', 'Powder coating'] }),
    part('grip',   'Grips',        { material: ['Grip compounds'], forming: ['Dip moulding', 'Two-shot over-moulding'] }),
    part('pivot',  'Pivot',        { joining: ['Bolted joints'], inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: EXPORT_PACK }),
  ]),
  P('hedge-shears', 'Hedge shears', 'forge', 4, 'hedge', [
    part('blade',  'Blades',       { material: EDGE_STEEL, forming: ['Stamping', 'Hot forging'], heat: EDGE_HEAT, finish: ['Polishing', 'Nickel-chrome plating'], inspection: EDGE_QC }),
    part('handle', 'Handles',      { material: ['Timber', 'Aluminium'], forming: ['Wood turning', 'Tube drawing'] }),
    part('pivot',  'Pivot & bumper',{ joining: ['Bolted joints'], inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: EXPORT_PACK }),
  ]),
  P('pruning-saw', 'Pruning saw', 'forge', 4, 'saw', [
    part('blade',  'Saw blade',    { material: ['Blade & spring steel'], forming: ['Stamping', 'Laser cutting'], heat: ['Induction (local) hardening', 'Hardness banding by grade'], finish: ['Laser marking'], inspection: EDGE_QC }),
    part('handle', 'Handle',       { material: ['Rigid plastics', 'Grip compounds', 'Timber'], forming: ['Injection moulding', 'Two-shot over-moulding'] }),
    part('joint',  'Blade lock',   { joining: ['Bolted joints', 'Snap-fit'], inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: ['Skin pack', 'Colour box', 'Hang tag / header card'] }),
  ]),
  // ---- form tier: stamped/welded steel bodies, fitted handles ----------
  P('garden-hoe', 'Garden hoe', 'form', 4, 'hoe', [
    part('head',   'Blade head',   { material: ['Blade & spring steel'], forming: ['Stamping', 'Hot forging'], heat: ['Quench & temper'], finish: ['Powder coating', 'Wet paint'], inspection: EDGE_QC }),
    part('neck',   'Neck / socket',{ forming: ['Tube drawing', 'Swaging'], joining: WELD_JOIN, inspection: JOINT_QC }),
    part('handle', 'Handle',       { material: ['Timber', 'Aluminium'], forming: ['Wood turning', 'Tube drawing'] }),
    part('pack',   'Packaging',    { pack: ['Corrugated export carton', 'Strapping'] }),
  ]),
  P('cultivator', '3-prong cultivator', 'form', 4, 'cultivator', [
    part('head',   'Prong head',   { material: ['Blade & spring steel'], forming: SHEET_FORM, heat: ['Quench & temper'], finish: ['Powder coating', 'Zinc plating'], inspection: EDGE_QC }),
    part('handle', 'Handle',       { material: ['Timber', 'Grip compounds'], forming: ['Wood turning', 'Dip moulding'] }),
    part('joint',  'Tang & ferrule',{ joining: RIVET_JOIN, inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: EXPORT_PACK }),
  ]),
  P('garden-fork', 'Digging fork', 'form', 4, 'fork', [
    part('head',   'Tines',        { material: ['Blade & spring steel'], forming: ['Hot forging', 'Stamping'], heat: ['Quench & temper'], finish: ['Powder coating', 'E-coat'], inspection: EDGE_QC }),
    part('socket', 'Socket',       { forming: ['Tube drawing', 'Swaging'], joining: WELD_JOIN, inspection: JOINT_QC }),
    part('handle', 'Shaft & grip', { material: ['Timber', 'Rigid plastics'], forming: ['Wood turning', 'Injection moulding'] }),
    part('pack',   'Packaging',    { pack: ['Corrugated export carton', 'Strapping', 'Pallet'] }),
  ]),
  P('shovel', 'Shovel / spade', 'form', 4, 'shovel', [
    part('head',   'Blade',        { material: ['Blade & spring steel', 'Stainless steel'], forming: ['Stamping'], heat: ['Quench & temper'], finish: ['Powder coating', 'Polishing'], inspection: EDGE_QC }),
    part('socket', 'Socket & step',{ forming: ['Swaging'], joining: WELD_JOIN, inspection: JOINT_QC }),
    part('handle', 'Shaft & D-grip',{ material: ['Timber', 'Rigid plastics'], forming: ['Wood turning', 'Injection moulding'] }),
    part('pack',   'Packaging',    { pack: ['Corrugated export carton', 'Strapping', 'Pallet'] }),
  ]),
  P('bow-rake', 'Bow rake', 'form', 3, 'rake', [
    part('head',   'Rake head',    { material: ['Blade & spring steel'], forming: SHEET_FORM, finish: ['Powder coating', 'Zinc plating'], inspection: ['Dimensional AQL'] }),
    part('handle', 'Handle',       { material: ['Timber', 'Aluminium'], forming: ['Wood turning', 'Tube drawing'] }),
    part('joint',  'Bow joint',    { joining: WELD_JOIN, inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: ['Corrugated export carton', 'Strapping'] }),
  ]),
  P('hand-weeder', 'Hand weeder', 'form', 3, 'weeder', [
    part('blade',  'Fork tip',     { material: EDGE_STEEL, forming: SHEET_FORM, heat: ['Quench & temper'], finish: ['Zinc plating', 'Powder coating'], inspection: EDGE_QC }),
    part('handle', 'Handle',       { material: ['Timber', 'Grip compounds', 'Rigid plastics'], forming: ['Wood turning', 'Injection moulding'] }),
    part('joint',  'Tang',         { joining: ['Riveting', 'Press-fit'] }),
    part('pack',   'Packaging',    { pack: ['Hang tag / header card', 'Blister pack', 'Corrugated export carton'] }),
  ]),
  // ---- sourcing tier: completes a programme, honest about the role -----
  P('garden-snips', 'Garden snips (sourced blades, our assembly)', 'source', 3, 'snips', [
    part('blade',  'Blades',       { material: ['Stainless steel'], forming: ['Stamping'], finish: ['Polishing'], inspection: EDGE_QC }),
    part('handle', 'Handles',      { material: ['Rigid plastics', 'Grip compounds'], forming: ['Injection moulding', 'Two-shot over-moulding'] }),
    part('joint',  'Pivot',        { joining: ['Riveting'], inspection: JOINT_QC }),
    part('pack',   'Packaging',    { pack: ['Blister pack', 'Colour box'] }),
  ]),
  P('garden-gloves', 'Garden gloves (sourcing)', 'source', 1, 'gloves', [
    part('body',   'Shell & coating', { material: ['Fabric', 'Grip compounds'], forming: ['Dip moulding'], inspection: ['Dimensional AQL'] }),
    part('cuff',   'Cuff & label', { pack: ['Label set', 'Hang tag / header card'] }),
    part('pack',   'Packaging',    { pack: ['Hang tag / header card', 'Corrugated export carton'] }),
  ]),
  P('tool-set', 'Boxed tool set (mixed programme)', 'source', 2, 'set', [
    part('tools',  'Tool selection', { material: ['Blade & spring steel', 'Stainless steel'], inspection: ['Edge & function check', 'Dimensional AQL'] }),
    part('tray',   'Tray / case',  { material: ['Rigid plastics', 'Packaging board'], forming: ['Injection moulding'] }),
    part('pack',   'Retail pack',  { pack: ['Colour box', 'Paper-and-plastic composite'], inspection: ['Barcode & label check', 'Pack drop test'] }),
  ]),
];

module.exports = { TIERS, PRODUCTS };
