(function(){/* bento content grid — one feature, one 4-tile layout */
var D={},P={};try{D=JSON.parse(document.getElementById('outlook-data').textContent)||{};P=D.partner||{};}catch(e){}
/* published Product Finder; the source file contains checked view-only OneDrive or SharePoint PDF links */
(function(){var host=document.getElementById('offer-grid'),meta=document.getElementById('offer-meta');if(!host)return;var esc=function(x){return String(x==null?'':x).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});};host.innerHTML='<div class="pd-offer-empty">Loading Birdland’s published product information…</div>';var feed=window.BirdlandProductFeed||fetch('product-offers.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('Product feed unavailable');return r.json();});feed.then(function(data){var items=(data.items||[]).filter(function(o){return o&&o.status==='published'&&/^https:\/\//i.test(o.pdf_url||'');});if(meta)meta.textContent=items.length+' published · '+(data.updated||'date unavailable');host.innerHTML=items.length?items.map(function(o){return '<article class="offer-card product-card"><img src="'+esc(o.cover_image||'images/thumbs/finished-goods-warehouse.webp')+'" alt="" loading="lazy"><div class="offer-product-copy"><span class="offer-badge">'+esc(o.type||'Product information')+'</span><h3>'+esc(o.title||'Birdland product information')+'</h3><p>'+esc(o.subtitle||'Open the published product PDF.')+'</p><div class="offer-meta">'+esc(o.category||'General')+' · '+esc(o.origin||'See PDF')+' · '+esc(o.availability||'See PDF')+'</div><a class="offer-cta" href="'+esc(o.pdf_url)+'" target="_blank" rel="noopener">Open view-only PDF</a></div></article>';}).join(''):'<div class="pd-offer-empty">No published product PDF is currently available.</div>';}).catch(function(){if(meta)meta.textContent='feed unavailable';host.innerHTML='<div class="pd-offer-empty">The published product feed is unavailable. Please contact Birdland for the current catalogue.</div>';});})();
function txt(sel,body){var e=body.querySelector(sel);return e?e.textContent.trim():'';}
var TOOLSET={'p-margin':1,'p-reorder':1,'p-sail':1,'p-cduty':1};
function bentofy(id,lgSel,mdSel,smFns,mdSynth){
  var sec=document.getElementById(id);if(!sec)return;
  var body=sec.querySelector('.blk-b');if(!body)return;
  var smVals=(smFns||[]).map(function(f){try{return f(body);}catch(e){return null;}}).filter(function(v){return v&&v.v;});
  var lgEls=[],mdEls=[];
  (lgSel||[]).forEach(function(x){var e=body.querySelector(x);if(e)lgEls.push(e);});
  (mdSel||[]).forEach(function(x){var e=body.querySelector(x);if(e)mdEls.push(e);});
  var used=lgEls.concat(mdEls);
  var rest=[].slice.call(body.children).filter(function(c){return used.indexOf(c)<0;});
  var synthHtml=(!mdEls.length&&mdSynth)?(function(){try{return mdSynth(body);}catch(e){return null;}})():null;
  var hasMd=mdEls.length>0||!!synthHtml;
  var grid=document.createElement('div');grid.className='bento'+((hasMd||smVals.length)?'':' bento-2');
  var lgWrap=document.createElement('div');lgWrap.className='b-lg';
  rest.forEach(function(e){lgWrap.appendChild(e);});
  lgEls.forEach(function(e){lgWrap.appendChild(e);});
  grid.appendChild(lgWrap);
  if(mdEls.length){var mdWrap=document.createElement('div');mdWrap.className='b-md';mdEls.forEach(function(e){mdWrap.appendChild(e);});grid.appendChild(mdWrap);}
  else if(synthHtml){var mdWrap2=document.createElement('div');mdWrap2.className='b-md';mdWrap2.innerHTML=synthHtml;grid.appendChild(mdWrap2);}
  var isTool=TOOLSET[id],smRow=null;
  if(isTool&&smVals.length&&!/[0-9]/.test(String(smVals[0].v)))isTool=false;
  if(smVals.length){smRow=document.createElement('div');smRow.className=isTool?'tool-hero':'b-sm-row';
    smVals.forEach(function(v,ix){var tile=document.createElement('div');tile.className=(isTool&&ix===0)?'b-tile hero':'b-tile';tile.innerHTML='<span class="b-k">'+v.k+'</span><span class="b-v">'+v.v+'</span>';smRow.appendChild(tile);});
    if(!isTool)grid.appendChild(smRow);}
  body.innerHTML='';if(isTool&&smVals.length)body.appendChild(smRow);body.appendChild(grid);
  if(isTool&&smRow){
   sec._heroFns=smFns||[];sec._heroRow=smRow;
   var redraw=function(){
    var vals=(sec._heroFns||[]).map(function(f){try{return f(body);}catch(e){return null;}}).filter(function(v){return v&&v.v;});
    var tiles=sec._heroRow.querySelectorAll('.b-tile');
    vals.forEach(function(v,ix){var t=tiles[ix];if(!t)return;var kv=t.querySelector('.b-k'),vv=t.querySelector('.b-v');if(kv)kv.textContent=v.k;if(vv)vv.textContent=v.v;});
   };
   body.addEventListener('input',function(){setTimeout(redraw,0);});
   body.addEventListener('change',function(){setTimeout(redraw,0);});
  }
}
function pct(str){var m=/([\d.]+)\s*%/.exec(str||'');return m?m[1]+'%':'—';}

/* The landed-cost tool was hand-built into a two-panel workspace — set it up on
   the left, read the answer on the right — while the other five were rendered
   by bentofy into a generic bento grid. Same page, same job, two shapes, and the
   one that reads best was the one nobody could reuse.

   toolShell gives the other five that shape, and takes the arguments the bentofy
   call already passed, so no tool needed rewriting. The split is positional and
   holds for all five: .calc is the input, the named output element is the
   answer, anything before .calc is preamble, anything after is a footnote. */
var SHELL_COPY={
 'p-margin':['Margin setup','Set your cost and your target','Retail outcome','What it earns at the shelf'],
 'p-reorder':['Stock setup','Describe the run you are holding','Timing outcome','When to place the order'],
 'p-sail':['Sailing setup','Choose the route and your readiness','Booking outcome','The sailings that still fit'],
 'p-cduty':['Origin setup','Set the shipment and the origin','Origin outcome','Taiwan against China, landed']
};
function toolShell(id,outSel,smFns){
  var sec=document.getElementById(id);if(!sec)return;
  var body=sec.querySelector('.blk-b');if(!body||body.querySelector('.landed-workspace'))return;
  var copy=SHELL_COPY[id];if(!copy)return;
  var calc=body.querySelector('.calc');if(!calc)return;
  var out=null;(outSel||[]).forEach(function(x){if(!out)out=body.querySelector(x);});

  var seenCalc=false,before=[],after=[];
  [].slice.call(body.children).forEach(function(k){
    if(k===calc){seenCalc=true;return;}
    if(k===out)return;
    if(/bd-tool-share|tool-explain|tool-links|landed-tool-nav/.test(k.className||''))return;
    (seenCalc?after:before).push(k);
  });

  var ws=document.createElement('div');ws.className='landed-workspace';
  var panel=document.createElement('section');panel.className='landed-input-panel';
  var head=document.createElement('div');head.className='landed-panel-head';
  head.innerHTML='<span>01 · '+copy[0]+'</span><h3>'+copy[1]+'</h3>';
  before.forEach(function(k){head.appendChild(k);});
  panel.appendChild(head);
  calc.classList.add('landed-form');
  panel.appendChild(calc);

  var summary=document.createElement('section');summary.className='landed-summary';
  var shead=document.createElement('div');shead.className='landed-summary-head';
  shead.innerHTML='<span>02 · '+copy[2]+'</span><b>Updates as you type</b>';
  summary.appendChild(shead);
  var h3=document.createElement('h3');h3.textContent=copy[3];summary.appendChild(h3);

  var vals=(smFns||[]).map(function(f){try{return f(body);}catch(e){return null;}})
    .filter(function(v){return v&&v.v;});
  var hero=null;
  /* A sentence set at hero size reads as a broken number, so a headline that
     is prose gets no card. 'Order now' is a verdict, not prose, and it is the
     right answer for a timing tool — the test is length, not digits. Taiwan vs China
     duty leads with a paragraph-long caveat and keeps only its outcome panel. */
  function headlineOK(v){v=String(v||'');return /[0-9]/.test(v)||v.length<=24;}
  if(vals.length&&headlineOK(vals[0].v)){
    hero=document.createElement('div');hero.className='landed-hero-result';
    vals.slice(0,2).forEach(function(v){
      var d=document.createElement('div'),k=document.createElement('span'),n=document.createElement('b');
      k.textContent=v.k;n.textContent=v.v;d.appendChild(k);d.appendChild(n);hero.appendChild(d);
    });
    summary.appendChild(hero);
  }
  if(out)summary.appendChild(out);
  after.forEach(function(k){summary.appendChild(k);});

  ws.appendChild(panel);ws.appendChild(summary);
  /* The share bar, the tool switcher, the Product 101 card and the Next chips
     stay outside the workspace, so every tool still opens and closes the same. */
  var share=body.querySelector('.bd-tool-share'),nav=body.querySelector('.landed-tool-nav');
  var tail=[].slice.call(body.querySelectorAll('.tool-explain,.tool-links'));
  body.innerHTML='';
  if(share)body.appendChild(share);
  if(nav)body.appendChild(nav);
  body.appendChild(ws);
  tail.forEach(function(t){body.appendChild(t);});
  sec.classList.add('landed-tool');

  /* Same lesson as the bento hero tiles: a figure rendered once is a figure that
     goes stale the moment somebody types. */
  if(hero){
    var redraw=function(){
      var v2=(smFns||[]).map(function(f){try{return f(body);}catch(e){return null;}})
        .filter(function(v){return v&&v.v;});
      v2.slice(0,2).forEach(function(v,ix){var c=hero.children[ix];if(!c)return;
        c.firstChild.textContent=v.k;c.lastChild.textContent=v.v;});
    };
    body.addEventListener('input',function(){setTimeout(redraw,0);});
    body.addEventListener('change',function(){setTimeout(redraw,0);});
    /* Some tools populate their own inputs after this runs, so the first read
       lands on an empty field and prints a dash. One deferred pass catches it. */
    setTimeout(redraw,400);
  }
}
bentofy('p-brief',['#pb-actions'],['#pb-sum'],[
  function(b){return {k:'Actions',v:b.querySelectorAll('#pb-actions .act').length+' open items'};},
  function(){return {k:'Basis',v:'AI + desk review'};}
]);
bentofy('p-material',['.svgwrap'],['.legend'],[
  function(b){return {k:'Model accuracy',v:pct(txt('.fc-acc',b))};},
  function(){return {k:'Horizon',v:'Rebased to 100 = now'};}
]);
bentofy('p-shipping',['#ship-chartwrap'],['.legend'],[
  function(b){return {k:'Model accuracy',v:pct(txt('.fc-acc',b))};},
  function(){return {k:'Unit',v:'US$ / FEU'};}
]);
bentofy('p-freight',['.svgwrap'],['.fr-src'],[
  function(b){var t=b.querySelector('table');var n=t?t.querySelectorAll('tr').length:0;return {k:'Indices tracked',v:n?(n+' rows'):'No data today'};},
  function(){return {k:'Cadence',v:'Monthly, official'};}
]);
(function(){var sec=document.getElementById('p-landed2');if(!sec)return;var body=sec.querySelector('.blk-b'),nav=body&&body.querySelector('.landed-tool-nav'),input=body&&body.querySelector('.landed-input-panel'),summary=body&&body.querySelector('.landed-summary');if(!body||!nav||!input||!summary)return;var workspace=document.createElement('div');workspace.className='landed-workspace';workspace.appendChild(input);workspace.appendChild(summary);body.innerHTML='';body.appendChild(nav);body.appendChild(workspace);})();
toolShell('p-sail',['#s_cards'],[
  function(b){return {k:'Options shown',v:b.querySelectorAll('.sailcard').length+' sailings'};},
  function(){return {k:'Freight',v:'Indicative — confirm w/ carrier'};}
]);
toolShell('p-cduty',['#pcalcOut'],[
  function(b){return {k:'Note',v:txt('#pcalc-note',b)||'See detail'};},
  function(b){var v=b.querySelector('#pcVal');return {k:'Shipment value',v:v?('US$'+Number(v.value).toLocaleString()):'—'};}
]);
bentofy('p-war',['.war'],['.sub'],[
  function(b){return {k:'Events tracked',v:b.querySelectorAll('.war .row').length+' items'};},
  function(){return {k:'Scale',v:'0–100 risk score'};}
]);
bentofy('p-tariff',['.svgwrap'],[],[
  function(b){var t=b.querySelector('table');return {k:'Updates tracked',v:(t?t.querySelectorAll('tr').length:0)+' rows'};},
  function(){return {k:'Coverage',v:'By market'};}
],function(){
  var tmc=(P.tariffmon&&P.tariffmon.changes)||[];if(!tmc.length)return null;
  var latest=tmc.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');})[0];
  return '<div class="b-k" style="text-transform:uppercase;font-size:.64rem;letter-spacing:.08em;color:var(--kb-faint);margin-bottom:6px">Latest change</div><div style="font-weight:700;margin-bottom:4px">'+latest.market+' · '+latest.date+'</div><div style="font-size:.92rem;color:var(--kb-mut)">'+latest.change+(latest.note?' — '+latest.note:'')+'</div>';
});
bentofy('p-mkt',['#content'],['.ctl'],[]);
bentofy('p-offers',['#offer-grid'],[],[]);
bentofy('p-news',['.news'],[],[]);
bentofy('p-alerts',[],[],[]);
bentofy('p-keynews',['.news'],[],[]);
bentofy('p-regcal',['.news'],[],[
  function(b){return {k:'Upcoming',v:b.querySelectorAll('.item.rc-up').length+' milestones'};},
  function(b){return {k:'Past',v:b.querySelectorAll('.item.rc-past').length+' on record'};}
]);
bentofy('p-report',[],[],[]);
toolShell('p-margin',['#mg_out'],[
  function(b){var t=b.querySelector('#mg_out .mg-retail');return {k:'Suggested retail',v:t?t.textContent:'—'};},
  function(b){var t=b.querySelector('#mg_out .mg-gp');return {k:'Gross profit / order',v:t?t.textContent:'—'};}
]);
toolShell('p-reorder',['#ro_out'],[
  function(b){var t=b.querySelector('#ro_out .ro-when');return {k:'Reorder by',v:t?t.textContent:'—'};},
  function(b){var t=b.querySelector('#ro_out .ro-qty');return {k:'Suggested qty',v:t?t.textContent:'—'};}
]);
bentofy('p-season',[],[],[]);

/* The tool switcher was written into the landed-cost markup by hand, so it only
   existed on that one tool: from any of the other five the only way across was
   the rail. Every tool gets it now, marked to the one you are on. */
(function(){
  var src=document.querySelector('#p-landed2 .landed-tool-nav');if(!src)return;
  ['p-margin','p-reorder','p-sail','p-cduty'].forEach(function(id){
    var body=document.querySelector('#'+id+' .blk-b');
    if(!body||body.querySelector('.landed-tool-nav'))return;
    var nav=src.cloneNode(true);
    [].forEach.call(nav.querySelectorAll('button'),function(b){
      b.classList.toggle('on',b.getAttribute('data-go')===id);
    });
    var ws=body.querySelector('.landed-workspace');
    if(ws)body.insertBefore(nav,ws);else body.insertBefore(nav,body.firstChild);
  });
}());

/* The install prompt is a note about this browser, not part of the brief, so
   it moves to the end of the grid as a full-width footnote under the work.
   Moving it in script rather than in the markup keeps it next to its own
   button wiring. */
(function(){
  var grid=document.querySelector('.bd-grid');if(!grid)return;
  var card=grid.querySelector('.bd-install-card');if(!card)return;
  grid.appendChild(card);
}());
})();