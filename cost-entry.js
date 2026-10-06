/* Preserve old calculator bookmarks while using one public buying workspace. */
(function(){var hash=location.hash.slice(1);if(/^pd-|^mat-/.test(hash)||hash==='engineering-options')return;
var targets={'p-reorder':'reorder-planning','p-sail':'reorder-planning','p-mkt':'cost-trends'};
location.replace('buying-tools.html'+location.search+'#'+(targets[hash]||'landed-cost'));})();
