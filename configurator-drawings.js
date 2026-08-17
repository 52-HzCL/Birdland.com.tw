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

    hatchet: {
      view: 'side', parts: [
        { id: 'head', name: 'Head & edge',
          poly: [[63,18],[78,12],[90,8],[96,16],[97,26],[93,38],[80,36],[66,30]],
          label: [80,11, 56,4] },
        { id: 'joint', name: 'Eye & wedge',
          ellipse: [65.5,24,3.2,5.5],
          label: [63,23, 36,14] },
        { id: 'handle', name: 'Handle',
          poly: [[10,85],[36,55],[63,24],[67,27],[40,58],[16,90],[9,89]],
          label: [37,55, 52,72] },
      ] },

    mattock: {
      view: 'side', parts: [
        { id: 'head', name: 'Forged head',
          poly: [[28,20],[48,15],[66,13],[88,9],[93,12],[92,29],[86,30],[64,25],[46,24]],
          label: [86,11, 60,4] },
        { id: 'joint', name: 'Eye fit',
          ellipse: [62,20,3,5.5],
          label: [64,22, 74,44] },
        { id: 'handle', name: 'Handle',
          poly: [[14,88],[38,56],[60,26],[64,29],[42,60],[19,92],[13,91]],
          label: [39,58, 54,74] },
      ] },

    machete: {
      view: 'side', parts: [
        { id: 'blade', name: 'Blade',
          poly: [[34,46],[56,42],[76,39],[92,37],[97,44],[86,54],[64,57],[38,56]],
          label: [76,40, 78,22] },
        { id: 'joint', name: 'Full tang',
          poly: [[26,49],[30,48],[34,47],[35,52],[35,56],[30,57],[27,58]],
          label: [31,48, 36,24] },
        { id: 'handle', name: 'Handle scales',
          poly: [[6,57],[22,48],[27,50],[27,58],[24,60],[10,66],[5,63]],
          label: [14,62, 20,80] },
      ] },

    loppers: {
      view: 'side', parts: [
        { id: 'blade', name: 'Blade set',
          poly: [[68,26],[76,18],[84,11],[91,8],[93,13],[86,20],[77,27],[71,31]],
          label: [86,12, 58,4] },
        { id: 'cblade', name: '',
          poly: [[70,33],[79,29],[88,23],[91,26],[83,32],[74,37]] },
        { id: 'pivot', name: 'Pivot',
          ellipse: [69,30,3.5,3.5],
          label: [72,33, 78,48] },
        { id: 'handle', name: 'Long handles',
          poly: [[66,29],[36,45],[6,62],[7,66],[37,49],[67,33]],
          label: [48,39, 40,9] },
        { id: 'handle2', name: '',
          poly: [[69,33],[42,55],[15,78],[18,81],[45,58],[72,37]] },
        { id: 'grip', name: 'Grips',
          poly: [[17,76],[10,82],[6,88],[10,91],[16,85],[21,80]],
          label: [10,87, 24,95] },
        { id: 'grip2', name: '',
          poly: [[8,60],[3,64],[1,69],[5,71],[10,67],[12,63]] },
      ] },

    hedge: {
      view: 'side', parts: [
        { id: 'blade', name: 'Blades',
          poly: [[48,47],[70,32],[92,17],[94,21],[73,36],[50,52]],
          label: [80,27, 70,6] },
        { id: 'blade2', name: '',
          poly: [[50,54],[72,40],[93,25],[95,29],[74,44],[52,58]] },
        { id: 'pivot', name: 'Pivot & bumper',
          ellipse: [48,52,3.5,3.5],
          label: [50,54, 48,86] },
        { id: 'handle', name: 'Handles',
          poly: [[43,53],[26,60],[10,66],[11,71],[28,65],[45,58]],
          label: [30,59, 26,36] },
        { id: 'handle2', name: '',
          poly: [[45,58],[30,68],[15,79],[18,83],[32,72],[48,62]] },
      ] },

    saw: {
      view: 'side', parts: [
        { id: 'blade', name: 'Saw blade',
          poly: [[34,44],[62,37],[92,25],[93,30],[78,36],[74,41],[58,45],[54,50],[40,50],[36,53]],
          label: [74,34, 66,12] },
        { id: 'joint', name: 'Blade lock',
          ellipse: [33,50,3.2,3.2],
          label: [33,53, 44,66] },
        { id: 'handle', name: 'Handle',
          poly: [[8,52],[20,46],[30,46],[32,54],[24,56],[14,66],[7,62]],
          label: [14,58, 24,76] },
      ] },

    hoe: {
      view: 'side', parts: [
        { id: 'head', name: 'Blade head',
          poly: [[74,30],[88,25],[92,29],[90,44],[86,52],[76,50],[73,36]],
          label: [88,42, 76,66] },
        { id: 'neck', name: 'Neck / socket',
          poly: [[62,20],[68,18],[75,22],[78,28],[74,31],[68,26],[63,24]],
          label: [70,19, 60,6] },
        { id: 'handle', name: 'Handle',
          poly: [[10,86],[36,54],[62,21],[66,24],[40,57],[15,90],[9,89]],
          label: [32,63, 44,78] },
      ] },

    cultivator: {
      view: 'top', parts: [
        { id: 'head', name: 'Prong head',
          poly: [[56,42],[64,40],[68,46],[90,47],[94,50],[90,53],[68,54],[64,60],[56,58]],
          label: [60,41, 52,24] },
        { id: 'tine2', name: '',
          poly: [[62,42],[68,40],[88,29],[91,33],[70,45],[64,46]] },
        { id: 'tine3', name: '',
          poly: [[62,58],[68,60],[88,71],[91,67],[70,55],[64,54]] },
        { id: 'handle', name: 'Handle',
          poly: [[6,46],[32,44],[40,46],[40,54],[32,56],[6,54],[3,50]],
          label: [18,54, 24,74] },
        { id: 'joint', name: 'Tang & ferrule',
          poly: [[40,46],[48,45],[56,46],[56,54],[48,55],[40,54]],
          label: [48,55, 44,80] },
      ] },

    fork: {
      view: 'side', parts: [
        { id: 'head', name: 'Tines',
          poly: [[60,12],[69,19],[78,25],[76,28],[67,22],[58,15]],
          label: [61,13, 52,4] },
        { id: 'tine1', name: '',
          poly: [[62,13],[65,8],[69,3],[71,4],[68,9],[64,15]] },
        { id: 'tine2', name: '',
          poly: [[67,17],[70,12],[74,7],[76,8],[73,13],[69,18]] },
        { id: 'tine3', name: '',
          poly: [[72,20],[75,15],[79,10],[81,11],[78,16],[74,22]] },
        { id: 'tine4', name: '',
          poly: [[77,24],[80,19],[84,14],[86,15],[83,20],[79,25]] },
        { id: 'socket', name: 'Socket',
          poly: [[54,33],[60,26],[66,19],[70,22],[64,29],[59,37]],
          label: [62,28, 74,44] },
        { id: 'handle', name: 'Shaft & grip',
          poly: [[16,86],[36,60],[55,35],[59,38],[39,63],[21,90],[15,89]],
          label: [35,66, 46,80] },
        { id: 'dgrip', name: '',
          ellipse: [15,89,6,5] },
      ] },

    shovel: {
      view: 'side', parts: [
        { id: 'head', name: 'Blade',
          poly: [[63,20],[72,10],[82,5],[90,5],[96,12],[89,21],[79,29],[69,29]],
          label: [90,20, 86,40] },
        { id: 'socket', name: 'Socket & step',
          poly: [[57,32],[63,25],[68,21],[71,24],[66,29],[61,36]],
          label: [63,28, 56,10] },
        { id: 'handle', name: 'Shaft & D-grip',
          poly: [[14,86],[34,62],[56,34],[60,37],[38,65],[19,90],[13,89]],
          label: [36,64, 44,78] },
        { id: 'dgrip', name: '',
          ellipse: [13,89,6,5] },
      ] },

    rake: {
      view: 'side', parts: [
        { id: 'head', name: 'Rake head',
          poly: [[62,6],[66,5],[88,22],[87,27],[83,27],[61,10]],
          label: [87,25, 84,46] },
        { id: 'tooth1', name: '', poly: [[68,7],[70,4],[73,1],[74,3],[72,6],[70,8]] },
        { id: 'tooth2', name: '', poly: [[74,11],[76,8],[79,6],[80,7],[78,10],[76,13]] },
        { id: 'tooth3', name: '', poly: [[80,16],[82,13],[85,10],[86,12],[84,14],[82,17]] },
        { id: 'tooth4', name: '', poly: [[85,20],[87,17],[90,14],[91,16],[89,19],[87,21]] },
        { id: 'joint', name: 'Bow joint',
          poly: [[56,33],[61,9],[65,10],[60,32],[84,26],[85,30],[58,37]],
          label: [61,20, 52,10] },
        { id: 'handle', name: 'Handle',
          poly: [[12,88],[33,63],[54,37],[58,40],[37,66],[17,92],[11,91]],
          label: [32,65, 42,80] },
      ] },

    weeder: {
      view: 'top', parts: [
        { id: 'blade', name: 'Fork tip',
          poly: [[60,46],[76,43],[92,36],[95,40],[86,50],[95,60],[92,64],[76,57],[60,54]],
          label: [90,40, 84,20] },
        { id: 'joint', name: 'Tang',
          poly: [[33,47],[46,47],[60,48],[60,52],[46,53],[33,53]],
          label: [46,53, 52,70] },
        { id: 'handle', name: 'Handle',
          poly: [[5,45],[28,44],[33,47],[33,53],[28,56],[5,55],[2,50]],
          label: [16,44, 22,26] },
      ] },

    snips: {
      view: 'side', parts: [
        { id: 'blade', name: 'Blades',
          poly: [[48,44],[64,35],[82,26],[88,25],[78,33],[62,42],[52,49]],
          label: [76,31, 70,10] },
        { id: 'blade2', name: '',
          poly: [[50,52],[66,45],[82,34],[88,29],[80,42],[66,51],[53,57]] },
        { id: 'joint', name: 'Pivot',
          ellipse: [49,49,3.2,3.2],
          label: [51,52, 62,64] },
        { id: 'handle', name: 'Handles',
          ellipse: [34,58,10,6.5],
          label: [31,52, 27,34] },
        { id: 'ring2', name: '',
          ellipse: [28,69,10,6.5] },
        { id: 'arm2', name: '',
          poly: [[46,51],[50,50],[52,54],[45,58],[38,63],[35,60]] },
      ] },

    gloves: {
      view: 'top', parts: [
        { id: 'body', name: 'Shell & coating',
          poly: [[30,64],[31,44],[38,26],[48,15],[59,12],[66,19],[70,30],[79,43],[71,52],[44,64]],
          label: [74,46, 70,84] },
        { id: 'slit1', name: '', poly: [[44,20],[46,26],[49,34],[51,33],[48,25],[47,18]] },
        { id: 'slit2', name: '', poly: [[53,14],[55,22],[57,30],[59,29],[57,21],[56,13]] },
        { id: 'slit3', name: '', poly: [[61,17],[62,24],[64,31],[66,30],[65,23],[64,18]] },
        { id: 'cuff', name: 'Cuff & label',
          poly: [[26,66],[46,62],[50,72],[44,76],[28,78],[24,72]],
          label: [28,74, 34,92] },
      ] },

    set: {
      view: 'top', parts: [
        { id: 'tray', name: 'Tray / case',
          poly: [[14,34],[50,32],[86,34],[92,54],[94,76],[50,79],[6,76],[8,54]],
          label: [90,60, 86,90] },
        { id: 'tools', name: 'Tool selection',
          poly: [[24,50],[36,48],[40,50],[46,46],[58,44],[64,52],[56,60],[46,58],[40,54],[26,56]],
          label: [58,47, 52,14] },
        { id: 'tool2', name: '',
          poly: [[30,64],[52,62],[60,60],[66,64],[58,68],[50,66],[32,68]] },
      ] },

  };
})();
