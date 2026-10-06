(function(){ // boot: live strip · section order · remembered workspace (bd_p_*)
try{var D=JSON.parse(document.getElementById('outlook-data').textContent);}catch(e){return;}
var main=document.querySelector('main'),disc=document.getElementById('disc');
// 2) section order: daily brief & the two money tools first
(function(){if(!main||!disc)return;var ORD=['p-alerts','p-landed2','p-margin','p-reorder','p-sail','p-cduty','p-mkt','p-offers'];
 /* This used to run ORD.concat(REF) — REF was ['p-freight','p-watch','p-news'],
    the client-desk duplicates that got demoted below a "Reference data —
    shared with Data Desk" divider. All three, and the ten other desk-set
    panels this reorder also carried (p-brief, p-market, p-keynews, p-regcal,
    p-report, p-material, p-shipping, p-season, p-war, p-tariff), were retired
    outright rather than reference material, so there is nothing left to
    divide from and the divider went with them. */
 ORD.forEach(function(id){var s=document.getElementById(id);if(s)main.insertBefore(s,disc);});})();
// 3b) product PDFs are maintained in product-offers.json and opened from view-only links
// 4) remembered workspace
var LS={g:function(k){try{return localStorage.getItem('bd_p_'+k);}catch(e){return null;}},s:function(k,v){try{localStorage.setItem('bd_p_'+k,v);}catch(e){}}};
// The room/region selects used to be restored a second time here, from the
// same two keys the desk had already read. blCtx owns that state now, so a
// second restorer would only be a second chance to disagree.
// 5) full-scroll accordion: funnel modules open, reference collapsed; remember per-section state
(function(){var FUN={'p-alerts':1,'p-mkt':1,'p-offers':1,'p-landed2':1,'p-margin':1,'p-reorder':1,'p-sail':1,'p-cduty':1};
 var saved=null;try{saved=JSON.parse(LS.g('col')||'null');}catch(e){}
 [].forEach.call(document.querySelectorAll('main .blk'),function(sec){
   var open=!!FUN[sec.id];
   if(saved&&saved[sec.id]!=null)open=(saved[sec.id]==='1');
   sec.setAttribute('data-open',open?'1':'0');});
 function snap(){var m={};[].forEach.call(document.querySelectorAll('main .blk'),function(sec){m[sec.id]=sec.getAttribute('data-open');});LS.s('col',JSON.stringify(m));}
 document.addEventListener('click',function(e){if(e.target.closest('.blk-h')||e.target.closest('.toc a')||e.target.closest('.lt'))setTimeout(snap,400);});})();
// 6) right rail (terminal column, >=1100px): today's actions + mini watchlist + my-cost shortcut
(function(){if(!main)return;
 var col=document.createElement('div');col.id='p-col';
 while(main.firstChild)col.appendChild(main.firstChild);
 main.appendChild(col);
 var rail=document.createElement('aside');rail.id='p-rail';rail.setAttribute('aria-label','AsiaSource navigation');
 var tocEl=document.querySelector('.toc');
 if(tocEl){
   var TOOL_IDS=['p-landed2','p-margin','p-reorder','p-sail','p-cduty'];
   [].forEach.call(tocEl.children,function(node){if(node.tagName==='A'){var id=(node.getAttribute('href')||'').slice(1);node.setAttribute('data-mode',TOOL_IDS.indexOf(id)>=0?'tools':'information');}});
   /* There used to be a .pr-grp heading above each group, reading "Information"
      or "Tools". The mode switch directly above it already says which of the
      two you are in, and only one group is ever on screen, so the heading was
      the same word twice in a row. */
   /* This used to be an Information/Tools switch inside one page. The two
      groups are now two pages, so the same two-cell control switches desks —
      and it keeps carrying the buyer across, because blCtx already spans pages
      and both desks read the same context. */
   var isCost=window.BL_DESK==='cost';
   /* Three desks, one control, present on all three pages: read the day
      (News), work a programme (Buyer), price it (Cost). A buyer moves between
      those three constantly, and blCtx carries their region, market and line
      across, so the move costs nothing. */
   /* The rail's News / Buyer / Cost switch is gone: the Terminal panel in the
      header is the switch now, and it carries the whole path rather than three
      bare labels. */
   tocEl.setAttribute('data-mode',isCost?'tools':'information');
   var menuBtn=document.createElement('button');menuBtn.type='button';menuBtn.className='toc-toggle';menuBtn.setAttribute('aria-expanded','true');menuBtn.innerHTML='<span class="toc-toggle-copy"><span class="toc-toggle-icon" aria-hidden="true">☷</span><span>Open AsiaSource menu</span></span><span class="toc-toggle-arrow" aria-hidden="true">⌄</span>';tocEl.insertBefore(menuBtn,tocEl.firstChild);
   menuBtn.addEventListener('click',function(){var collapsed=tocEl.classList.toggle('is-collapsed');menuBtn.setAttribute('aria-expanded',collapsed?'false':'true');var label=menuBtn.querySelector('.toc-toggle-copy span:last-child');if(label)label.textContent=collapsed?'Show Information & Tools':'Open AsiaSource menu';});
   if(window.matchMedia&&window.matchMedia('(max-width:899px)').matches){tocEl.classList.add('is-collapsed');menuBtn.setAttribute('aria-expanded','false');var mobileLabel=menuBtn.querySelector('.toc-toggle-copy span:last-child');if(mobileLabel)mobileLabel.textContent='Show Information & Tools';}
 }
 /* The rail used to open with BIRDLAND / COSTNOW. The header says exactly
    that, 80px above it. */
 // Context card: the single place the buying context is set. It sits above the
 // mode switch, so it is on screen in Information and in Tools alike — which is
 // the point. The tools no longer ask a question the desk already answered.
 (function(){
  var srcRoom=document.getElementById('room'),srcMkt=document.getElementById('region');
  if(!window.blCtx||!srcRoom||!srcMkt)return;
  var card=document.createElement('div');card.className='pr-ctx';
  card.innerHTML='<div class="pr-ctx-h">Buying context</div>'+
   '<label class="pr-ctx-f"><span>Commercial region</span><select id="ctx-room"></select></label>'+
   '<label class="pr-ctx-f"><span>Focus market</span><select id="ctx-market"></select><span class="pr-ctx-one" id="ctx-market-one" hidden></span></label>'+
   '<label class="pr-ctx-f"><span>Product line</span><select id="ctx-line"></select></label>'+
   '<p class="pr-ctx-n">Set once. The desk, every tool and your enquiry follow it.</p>';
  rail.appendChild(card);
  var cRoom=card.querySelector('#ctx-room'),cMkt=card.querySelector('#ctx-market'),cLine=card.querySelector('#ctx-line'),cMktOne=card.querySelector('#ctx-market-one');
  // The focus-market options are rebuilt whenever the region changes, so the
  // card copies them rather than keeping a second list that could drift.
  function mirror(from,to){var sig=[].map.call(from.options,function(o){return o.value+'|'+o.textContent;}).join('~');
   if(to.getAttribute('data-sig')!==sig){to.innerHTML=from.innerHTML;to.setAttribute('data-sig',sig);}}
  function sync(){var st=window.blCtx.get();
   mirror(srcRoom,cRoom);mirror(srcMkt,cMkt);
   if(cRoom.value!==st.room)cRoom.value=st.room;
   if(cMkt.value!==st.market)cMkt.value=st.market;
   if(cLine.value!==st.line)cLine.value=st.line;
   /* Some regions carry exactly one market. A dropdown with one option is a
      control pretending there is a choice, so it is shown as text instead. */
   if(cMktOne){var single=cMkt.options.length<=1;
    cMkt.hidden=single;cMktOne.hidden=!single;
    if(single)cMktOne.textContent=cMkt.options.length?cMkt.options[0].textContent:'—';}}
  cRoom.addEventListener('change',function(){window.blCtx.set({room:cRoom.value});});
  cMkt.addEventListener('change',function(){window.blCtx.set({market:cMkt.value});});
  cLine.addEventListener('change',function(){window.blCtx.set({line:cLine.value});});
  window.blCtx.on(sync);
  // The product lines live in mail-routing.js, which is deferred; duplicating
  // them here would be a second list to keep in step.
  document.addEventListener('DOMContentLoaded',function(){
   var lines=(window.blMail&&window.blMail.lines)||[['','Garden & field tools']];
   cLine.innerHTML=lines.map(function(p){return '<option value="'+p[0]+'">'+p[1]+'</option>';}).join('');
   sync();});
 })();
 var homeCard=document.createElement('div');homeCard.className='pr-install-card';
 var installEl=document.querySelector('.hero-install');if(installEl){homeCard.appendChild(installEl);}
 if(tocEl){
   var todayLink=tocEl.querySelector('a[href="#overview"]');
   if(todayLink)todayLink.insertAdjacentElement('afterend',homeCard);else tocEl.insertBefore(homeCard,tocEl.firstChild);
   rail.appendChild(tocEl);
 }
 main.appendChild(rail);
})();
})();