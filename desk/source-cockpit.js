(function(){/* Partner Desk Today cockpit: existing data only, with per-source freshness */
try{var D=JSON.parse(document.getElementById('outlook-data').textContent)||{};}catch(e){return;}
var $=function(id){return document.getElementById(id);};
var esc=function(x){return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
var status=(D.status||{}),src=status.sources||{},workflow=status.workflow||{},team=D.teamdesk||{};
function norm(s){s=(s||'unknown').toLowerCase();if(s==='ok')return 'current';if(s==='stale'||s==='warning')return 'delayed';return s;}
function sourceState(key,fallback){var x=src[key]||{},derived='unavailable';if(key==='gemini'&&(D.headline||D.summary||D.supply))derived='current';else if(key==='twelvedata'&&(D.indices||D.macro))derived='delayed';else if(key==='fx'&&(D.fx_today||(D.macro&&Object.keys(D.macro).length)))derived='current';else if(key==='market_news'&&Array.isArray(D.market_news)&&D.market_news.length)derived='current';return norm(x.state||fallback||derived);}
function stateLabel(s){s=norm(s);return s==='unavailable'?'Unavailable':s.charAt(0).toUpperCase()+s.slice(1);}
function realChg(ix){if(ix&&ix.spark&&ix.spark.length>=2){var a=ix.spark[ix.spark.length-2],b=ix.spark[ix.spark.length-1],i=ix.spark.length-2;while(i>0&&a===b){i--;a=ix.spark[i];}if(a!=null&&a!==0)return (b-a)/Math.abs(a)*100;}return ix&&ix.chg;}
function findIndex(re){return (D.indices||[]).filter(function(x){return re.test((x.short||'')+' '+(x.label||''));})[0]||null;}
function shortTime(x){var m=/(\d{2}):(\d{2})/.exec(x||'');return m?(m[1]+':'+m[2]+' UTC'):'time unavailable';}
function spark(a,cls){a=(a||[]).slice(-14);if(a.length<2)return '<div class="pd-spark" aria-label="Trend unavailable"></div>';var mn=Math.min.apply(null,a),mx=Math.max.apply(null,a),rg=(mx-mn)||1,w=118,h=34;var pts=a.map(function(v,i){return (i/(a.length-1)*w).toFixed(1)+','+(h-4-((v-mn)/rg)*(h-8)).toFixed(1);}).join(' '),last=pts.split(' ').pop().split(',');return '<svg class="pd-spark '+(cls||'')+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Recent trend"><polyline points="'+pts+'"></polyline><circle cx="'+last[0]+'" cy="'+last[1]+'" r="2.5"></circle></svg>';}
function kpi(title,call,action,icon,series,state,warn,meta){return '<article class="pd-kpi '+(warn?'warn':'')+'"><div class="pd-kpi-title"><span>'+esc(title)+'</span><span class="pd-kpi-call">'+esc(call)+'</span></div><div class="pd-kpi-viz"><span class="pd-kpi-icon" aria-hidden="true">'+icon+'</span>'+spark(series)+'</div><div class="pd-kpi-meta"><span>'+esc(meta||shortTime(workflow.run_at||D.updated))+'</span><span class="pd-state '+esc(norm(state))+'">'+esc(stateLabel(state))+'</span></div><div class="pd-kpi-action">'+esc(action)+'</div></article>';}

var steel=findIndex(/steel/i),resin=findIndex(/resin|polypropylene/i),freight=findIndex(/freight|container/i);
var costMoves=[steel,resin].filter(Boolean).map(realChg).filter(function(v){return v!=null;});
var costMove=costMoves.length?costMoves.reduce(function(a,b){return a+b;},0)/costMoves.length:0;
var lanes=(D.shipping&&D.shipping.lanes)||[],freightMove=lanes.length?lanes.reduce(function(a,b){return a+(Number(b.chg)||0);},0)/lanes.length:(realChg(freight)||0);
var timeline=((D.timeline||{}).items||[]),today=(function(){var d=new Date(workflow.run_at||D.updated||Date.now());return isNaN(d)?new Date():d;})();
var upcoming=timeline.map(function(x){return {item:x,date:new Date(x.date+'T00:00:00Z')};}).filter(function(x){return !isNaN(x.date)&&x.date>=today;}).sort(function(a,b){return a.date-b.date;})[0];
var days=upcoming?Math.max(0,Math.ceil((upcoming.date-today)/86400000)):null;
var proc=((D.procurement||{}).items||[]),next=proc.filter(function(x){return x.urgency==='high';})[0]||proc[0]||{};
var kpis=$('pd-kpis'),upd=$('dash-upd');
if(upd)upd.textContent='updated '+(D.updated||'not available');
if(kpis)kpis.innerHTML=[
 kpi('Cost pressure',costMove>.25?'WATCH':(costMove<-.25?'HOLD':'REVIEW'),costMove>.25?'Recheck steel and resin cover before pricing.':(costMove<-.25?'Inputs are easing; avoid unnecessary pre-buy.':'Mixed inputs; review before committing volume.'),'$',(resin&&resin.spark)||(steel&&steel.spark)||[],sourceState('twelvedata','unknown'),costMove>.25),
 kpi('Freight window',freightMove<=0?'BOOK':'WATCH',freightMove<=0?'Rates are easing; compare and book strategic space.':'Rates are firming; protect critical sailing windows.','≋',(freight&&freight.spark)||lanes.map(function(x){return Number(x.rate)||0;}),norm(workflow.state),freightMove>0),
 kpi('Compliance deadline','PREPARE',upcoming?(esc(upcoming.item.label)+' in '+days+' days.'):'No future dated milestone is connected.','♢',days==null?[]:[120,90,60,Math.min(days,120)],'manual',days!=null&&days<45,days==null?'manual calendar':days+' days left')
].join('');

var brief=$('pd-brief-list'),briefState=$('pd-brief-state');
if(briefState)briefState.innerHTML='<span class="pd-state '+sourceState('gemini',norm(workflow.state))+'">'+stateLabel(sourceState('gemini',norm(workflow.state)))+'</span>';
if(brief){var verbs=['LOCK','BOOK','PREPARE'];var picks=[];
 function take(re){var x=proc.filter(function(p){return re.test((p.input||'')+' '+(p.action||''));})[0];if(x&&picks.indexOf(x)<0)picks.push(x);}
 take(/steel|crude|fuel|lock/i);take(/freight|container|book/i);take(/compliance|document|EUDR|CBAM/i);
 proc.forEach(function(x){if(picks.length<3&&picks.indexOf(x)<0)picks.push(x);});
 brief.innerHTML=picks.slice(0,3).map(function(x,i){var warn=x.urgency==='high'||i===2;return '<div class="pd-brief-item '+(warn?'warn':'')+'"><span class="pd-brief-num">'+(i+1)+'</span><span class="pd-brief-verb">'+verbs[i]+'</span><span class="pd-brief-copy"><b>'+esc((x.input?x.input+' — ':'')+(x.action||'Review'))+'</b><small>'+esc(x.why||'Open the brief for the buyer rationale.')+'</small></span></div>';}).join('');}

var roomDefs=[
 {code:'NA',key:'us',map:'us',label:'North America'},{code:'SA',key:'sa',map:'sa',label:'South America'},
 {code:'EU',key:'eu',map:'eu',label:'Europe'},{code:'AF',key:'',map:'af',label:'Africa'},
 {code:'AS',key:'',map:'asia',label:'Asia'},{code:'OC',key:'au',map:'au',label:'Oceania'},
 {code:'GL',key:'global',map:'global',label:'Global'}
],chips=$('pd-room-chips'),world=$('pd-world'),roomRead=$('pd-room-read'),roomAsof=$('pd-room-asof');
function renderRoom(def){
 var missing=!def.key||!D.regions||!D.regions[def.key],r=missing?((D.regions||{}).global||{}):D.regions[def.key],sum=r.summary||{};
 if(world)world.setAttribute('data-active',def.map);
 if(chips)[].forEach.call(chips.querySelectorAll('button'),function(b){b.classList.toggle('on',b.getAttribute('data-code')===def.code);});
 if(roomAsof)roomAsof.textContent=(missing?'global context · ':'')+(r.asof||'date unavailable');
 if(roomRead)roomRead.innerHTML='<div class="pd-room-fact"><b>What changed</b><span>'+esc(missing?'A dedicated '+def.label+' room is not connected; Global context is shown.':(sum.changed||r.headline||'No change note is available.'))+'</span></div><div class="pd-room-fact"><b>Buyer impact</b><span>'+esc((r.view||r.supply||'Open the room for buyer impact.').split('. ')[0]+'.')+'</span></div><div class="pd-room-fact"><b>Next move</b><span>'+esc(sum.action||'Review origin, timing and documents before committing.')+'</span></div>';
}
if(chips){chips.innerHTML=roomDefs.map(function(d){return '<button class="pd-room-chip" type="button" data-code="'+d.code+'" title="'+esc(d.label)+'">'+d.code+'</button>';}).join('');chips.addEventListener('click',function(e){var b=e.target.closest('button[data-code]');if(!b)return;var d=roomDefs.filter(function(x){return x.code===b.getAttribute('data-code');})[0];if(d)renderRoom(d);});renderRoom(roomDefs[2]);}

var market=$('pd-market-list'),fxToday=team.fx_today||{},fxSpark=team.usdtwd_spark||[];
function buyerImpact(item,role){
 var c=realChg(item)||0;
 if(role==='freight')return c<-.15?{label:'Book strategically',cls:''}:(c>.15?{label:'Book earlier',cls:'pressure'}:{label:'Recheck lanes',cls:'neutral'});
 if(role==='fx')return c>.15?{label:'Higher exposure',cls:'pressure'}:(c<-.15?{label:'Lower exposure',cls:''}:{label:'Recheck origin',cls:'neutral'});
 return c>.25?{label:'Higher cost pressure',cls:'pressure'}:(c<-.25?{label:'Lower cost pressure',cls:''}:{label:'Neutral',cls:'neutral'});
}
function metricValue(item){return item&&(item.value!=null?item.value:(item.current!=null?item.current:(item.last!=null?item.last:null)));}
function metricFmt(x){if(x==null||x==='')return '';if(typeof x!=='number')return String(x);return x.toLocaleString(undefined,{maximumFractionDigits:2});}
function marketDetail(item){
 var c=realChg(item),v=metricValue(item),unit=item&&item.unit?(' '+item.unit):'';
 var parts=[];
 if(v!=null&&v!=='')parts.push(metricFmt(v)+unit);
 if(c!=null)parts.push((c>0?'+':'')+c.toFixed(1)+'% vs prior move');
 return parts.length?parts.join(' · '):'series unavailable';
}
function sparkClass(impact){return impact.cls==='pressure'?'pressure':(impact.cls==='neutral'?'neutral':'');}
if(market){var rows=[
 {name:'Steel',item:steel,state:sourceState('twelvedata','unknown'),role:'cost'},
 {name:'Resin',item:resin,state:sourceState('twelvedata','unknown'),role:'cost'},
 {name:'Freight',item:freight,state:norm(workflow.state),role:'freight'}
];market.innerHTML=rows.map(function(r){var imp=buyerImpact(r.item,r.role);return '<div class="pd-market-row"><div class="pd-market-name"><b>'+r.name+'</b><span class="pd-state '+norm(r.state)+'">'+stateLabel(r.state)+'</span></div><div class="pd-market-trend">'+spark((r.item&&r.item.spark)||[],sparkClass(imp))+'<div class="pd-market-detail">'+esc(marketDetail(r.item))+'</div></div><div class="pd-market-impact '+imp.cls+'">'+imp.label+'</div></div>';}).join('');}

var offers=$('pd-offer-grid');
window.BirdlandProductFeed=window.BirdlandProductFeed||fetch('product-offers.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('Product feed '+r.status);return r.json();}).then(function(feed){if(!feed||!Array.isArray(feed.items))throw new Error('Invalid product feed');feed.items=feed.items.filter(function(o){return o&&o.status==='published'&&/^https:\/\//i.test(o.pdf_url||'');});return feed;});
function platformCards(){return '<article class="pd-platform-card"><img src="images/foundry-engraving.webp" alt="Birdland published product information reference" loading="lazy"><div class="pd-platform-copy"><span>Public reference shelf</span><h3>Published product information</h3><p>Open the latest view-only product PDFs before you shape a buying brief.</p><button type="button" data-go="p-offers">Open product PDFs →</button></div></article><article class="pd-platform-card"><img src="images/pruner-inspection.webp" alt="Birdland pruning tool programme study" loading="lazy"><div class="pd-platform-copy"><span>Enquiry preparation</span><h3>Shape an OEM programme</h3><p>Organise a product platform, process direction and buying priority before opening your email.</p><button type="button" data-scroll-builder>Build a buyer brief →</button></div></article>';}
function productCards(items){return items.slice(0,1).map(function(o){return '<article class="pd-offer"><img src="'+esc(o.cover_image||'images/hero-forged-trowel.webp')+'" alt="" loading="lazy"><div class="pd-offer-copy"><span class="pd-product-type">'+esc(o.type||'Product information')+' · public PDF</span><h3>'+esc(o.title||'Birdland product information')+'</h3><span class="pd-product-note">'+esc(o.subtitle||'Open the current published PDF.')+'</span><div class="pd-offer-meta"><span>Category<br><b>'+esc(o.category||'General')+'</b></span><span>Origin<br><b>'+esc(o.origin||'See PDF')+'</b></span><span>Availability<br><b>'+esc(o.availability||'See PDF')+'</b></span><span>Format<br><b>View-only PDF</b></span></div><a class="pd-link" href="'+esc(o.pdf_url)+'" target="_blank" rel="noopener">Open view-only PDF</a></div></article>';}).join('')+platformCards();}
if(offers){offers.innerHTML='<div class="pd-offer-empty">Loading Birdland’s published product information…</div>';window.BirdlandProductFeed.then(function(feed){var items=feed.items.filter(function(o){return o.featured;});if(!items.length)items=feed.items;offers.innerHTML=items.length?productCards(items):'<div class="pd-offer-empty">No published product PDF is currently available.</div>';var updated=$('pd-product-updated');if(updated)updated.textContent='published '+(feed.updated||'date unavailable');}).catch(function(){offers.innerHTML='<div class="pd-offer-empty">The published product feed is unavailable. Please contact Birdland for the current catalogue.</div>';});}

document.addEventListener('click',function(e){var g=e.target.closest&&e.target.closest('[data-go]');if(!g)return;var a=document.querySelector('.toc > a[href="#'+g.getAttribute('data-go')+'"]');if(a){e.preventDefault();a.click();}});
var api=document.querySelector('.sys-api'),ai=document.querySelector('.sys-token');
if(api){var apiState=sourceState('fx',norm(workflow.state));api.classList.add('is-'+apiState);api.title='Source API · '+stateLabel(apiState);}
if(ai){var aiState=sourceState('gemini',norm(workflow.state));ai.classList.add('is-'+aiState);ai.title='AI narrative · '+stateLabel(aiState)+'; not a usage or billing meter.';}
})();