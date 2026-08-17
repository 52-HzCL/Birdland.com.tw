/* Hand-drawn anatomy specs for the AsiaSource configurator, one entry per
   configurator-data.js `draw` key. Authored in a 0..100 square; part ids MUST
   match the part ids in configurator-data.js (drawable parts only — 'pack'
   has no anatomy and stays menu-only). Every drawing must pass the eyeball
   screenshot gate before shipping; polygon counts stay low on purpose, the
   sketch renderer supplies the character. */
(function () {
  'use strict';
  window.BL_DRAWINGS = {

    trowel: {
      view: 'top', parts: [
        { id: 'handle', name: 'Handle',
          poly: [[8,46],[38,44.5],[44,46.5],[44,53.5],[38,55.5],[8,54],[4.5,50]],
          label: [20,45, 12,20] },
        { id: 'joint', name: 'Tang & joint',
          poly: [[44,45.5],[56,47],[56,53],[44,54.5]],
          label: [50,54, 42,84] },
        { id: 'blade', name: 'Blade',
          poly: [[56,46.5],[63,40.5],[80,40],[96.5,50],[80,60],[63,59.5],[56,53.5]],
          label: [82,41, 70,16] },
      ] },

    shears: {
      view: 'side', parts: [
        { id: 'blade', name: 'Cutting blade',
          poly: [[55,43.5],[70,33.5],[85,26.5],[93,24.5],[91.5,28.5],[79,34.5],[63,43],[56,46.5]],
          label: [87,27, 91,10] },
        { id: 'counter', name: 'Counter blade',
          poly: [[55,48.5],[70,42],[85,33.5],[90,30.5],[86,37],[72,45.5],[57,52]],
          label: [80,41, 92,62] },
        { id: 'pivot', name: 'Pivot & spring',
          ellipse: [54,47,4.2,4.2],
          label: [51,43.5, 30,20] },
        { id: 'handle', name: 'Handles & grip',
          poly: [[50,50],[33,57],[15,64.5],[5,70],[8,74],[22,68],[42,59],[51,54.5]],
          label: [24,66, 34,92] },
        { id: 'counterhandle', name: '',
          poly: [[52,54.5],[40,62],[24,72.5],[13,81],[17,85],[31,76.5],[47,65],[54,58]] },
      ] },

  };
})();
