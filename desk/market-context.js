
(function(){
'use strict';
// The demand shelf that used to share this IIFE moved out to My Market;
// only the Cost Desk market-signal wiring below is left of it. landedSel
// and bcSignalEl are both #p-landed2 elements, so this whole script is a
// no-op on any page that does not carry the Cost Desk landed-cost calculator.
var landedSel=document.getElementById('bc_co'); // Cost Desk only
if(!landedSel) return;
var bcSignalEl=document.getElementById('bc-signal');

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function t(s){ return window.blT ? window.blT(s) : s; }
var PRODUCTS=[
 {cn:'82015000',hs:'8201.50',name:'One-handed pruners',icon:'pruner',
  bands:[
   {n:'Premium',route:'SK5 high-carbon',d:'HRC 56–60 · edge retention'},
   {n:'Mid',route:'65Mn carbon',d:'HRC 52–56 · resilient value'},
   {n:'Entry',route:'420J2 stainless',d:'HRC 50–54 · corrosion-first'}
  ]},
 {cn:'82016000',hs:'8201.60',name:'Two-handed shears',icon:'lopper',
  bands:[
   {n:'Premium',route:'SK5 + alloy handle',d:'geared cut · light weight'},
   {n:'Mid',route:'65Mn + steel tube',d:'workhorse spec'},
   {n:'Entry',route:'65Mn basic',d:'price-point spec'}
  ]},
 {cn:'82011000',hs:'8201.10',name:'Spades & shovels',icon:'spade',
  bands:[
   {n:'Premium',route:'Boron steel + ash',d:'forged neck · FSC handle'},
   {n:'Mid',route:'Boron steel, powder-coat',d:'pressed, hardened'},
   {n:'Entry',route:'Carbon steel',d:'stamped, painted'}
  ]},
 {cn:'82013000',hs:'8201.30',name:'Hoes, rakes & cultivators',icon:'rake',
  bands:[
   {n:'Premium',route:'65Mn + ash handle',d:'full-tang heads'},
   {n:'Mid',route:'65Mn + epoxy',d:'standard programme'},
   {n:'Entry',route:'Carbon steel',d:'promotional spec'}
  ]}
];
function dir(pct){ if(pct>=6) return 2; if(pct>=1) return 1; if(pct>-1) return 0; return -1; }
function dclass(d){ return d>=1?'up':(d===0?'flat':'down'); }
// ---- Market roster ----
// Every name comes from trade.json's own `.n` field — which market appears
// at all is a mechanical function of public trade statistics, decided by
// tools/dev/fetch-trade.js's TIER1_MIN_USD threshold, not a hand-picked
// list (see that file's header comment). This table only cleans up a
// handful of UN Comtrade legal-name forms into the plain English a buyer
// expects ("USA" -> "United States"); it never adds or removes a market.
var DISPLAY_NAME={us:'United States',kr:'South Korea','do':'Dominican Republic',
 tz:'Tanzania',hk:'Hong Kong',mo:'Macao',bo:'Bolivia',ky:'Cayman Islands',
 cf:'Central African Republic',ba:'Bosnia and Herzegovina',md:'Moldova'};

// UK is excluded from this signal for the same reason it was always
// excluded from the demand shelf before that moved to My Market: Eurostat
// dropped coverage after Brexit and HMRC's series has no public CN8 lookup
// (see tools/dev/fetch-trade.js's header comment). trade.json carries a
// Comtrade-sourced 'gb' row like any other mechanically-qualifying reporter,
// but whether that feed is trustworthy enough to show here is out of scope
// for this migration, so 'gb' stays treated as not published.
var UK_ISO='gb';

var TRADE=null, MARKETS=[], MARKET_BY_ISO={};
function marketName(iso,rawName){ return DISPLAY_NAME[iso]||rawName; }

function buildMarkets(trade){
 var out=[]; MARKET_BY_ISO={};
 var mk=(trade&&trade.markets)||{};
 Object.keys(mk).forEach(function(iso){
  var m=mk[iso];
  var rec={iso:iso,name:marketName(iso,m.n),tier:m.tier,src:m.src};
  out.push(rec); MARKET_BY_ISO[iso]=rec;
 });
 out.sort(function(a,b){ return a.name<b.name?-1:(a.name>b.name?1:0); });
 return out;
}

function cellCode(mkt,cn){ return mkt.src==='comtrade'?cn.slice(0,6):cn; }
function cellOf(mkt,cn){
 if(mkt.iso===UK_ISO) return null;
 if(!TRADE||!TRADE.markets||!TRADE.markets[mkt.iso]) return null;
 var raw=TRADE.markets[mkt.iso];
 var code=cellCode(mkt,cn);
 var c=raw.cells&&raw.cells[code];
 if(!c||c.stale) return null;
 return c;
}
function firstPublished(mkt){
 for(var i=0;i<PRODUCTS.length;i++){ var c=cellOf(mkt,PRODUCTS[i].cn); if(c) return {p:PRODUCTS[i],c:c}; }
 return null;
}

function boot(trade,failed){
 TRADE=trade;
 MARKETS=buildMarkets(trade);
 wireCostDeskSignal();
}

// ---- Cost Desk: "Market signal" line beside the destination select ----
// CostNow already asks for a destination in #p-landed2; when the customs feed
// has published data for that same market, this is the one line that hands a
// Cost Desk buyer across to My Market, opened on that exact cell. It used to
// point at the demand shelf inside AsiaSource; the shelf became its own app,
// and the ?cell=<code>|<iso> format came with it unchanged.
// Reads TRADE directly (loaded above) rather
// than a second fetch, and listens on #bc_co independently of the landed-
// cost calculator's own script — the two are unrelated concerns sharing
// one element.
function wireCostDeskSignal(){
 if(!landedSel||!bcSignalEl) return;
 function show(){
  var iso=landedSel.dataset.otherIso||landedSel.value;
  var mkt=iso&&MARKET_BY_ISO[iso];
  if(!mkt||mkt.iso===UK_ISO||!TRADE){ bcSignalEl.hidden=true; bcSignalEl.innerHTML=''; return; }
  var hit=firstPublished(mkt);
  if(!hit){ bcSignalEl.hidden=true; bcSignalEl.innerHTML=''; return; }
  var d=dir(hit.c.uv_change_pct), cls=dclass(d);
  var href='my-market.html?cell='+hit.p.cn+'|'+mkt.iso;
  bcSignalEl.hidden=false;
  bcSignalEl.innerHTML=esc(t('Market signal'))+': '+esc(t('unit value'))+' <b class="'+cls+'">'+(hit.c.uv_change_pct>0?'+':'')+hit.c.uv_change_pct+'%</b> '+esc(t('this year'))+' · <a href="'+esc(href)+'">'+esc(t('My Market'))+' →</a>';
 }
 landedSel.addEventListener('change',show);
 if(window.blCtx) window.blCtx.on(show);
 show();
}

fetch('trade.json',{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('trade.json '+r.status); return r.json(); })
 .then(function(j){
  if(!j||j.schema!==2){ boot(null,false); return; } // unexpected schema — no crash, empty state
  boot(j,false);
 })
 .catch(function(){ boot(null,true); });
}());
