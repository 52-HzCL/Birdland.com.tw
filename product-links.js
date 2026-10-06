/* Preserve old Products desk links while keeping the new catalogue independent. */
(function(){
function route(){var hash=location.hash.slice(1);if(!/^(?:p-|pd-|mat-|bc_|room$|region$)/.test(hash))return;var target=window.BL_SITE.routes.find(function(r){return r.id==='cost';});if(target)location.replace(target.file+location.search+location.hash);}
route();window.addEventListener('hashchange',route);
})();
