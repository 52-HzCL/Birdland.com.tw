(function(){var D;try{D=JSON.parse(document.getElementById('outlook-data').textContent);}catch(e){return;}
var R=D.regions||{},order=D.order||[];
var sel=document.getElementById('region'),roomSel=document.getElementById('room'),roomMeta=document.getElementById('room-meta'),chips=document.getElementById('room-chips'),roomSummary=document.getElementById('room-summary'),content=document.getElementById('content'),regionLabel=document.getElementById('region-label');
var ROOMS=[
  {id:'global',label:'Global',markets:['global'],fallback:'global',intro:'Start here when you want the shortest read on what changed globally, what looks steady and what deserves a second click today.'},
  {id:'na',label:'North America',markets:['us','ca'],fallback:'us',intro:'Tariffs, origin stacking and steel traceability decide this room more than spot input moves.'},
  {id:'europe',label:'Europe',markets:['eu','uk','nl','de','fr','it','pl','es'],fallback:'eu',intro:'Compliance and documentation lead this room: EUDR, CBAM, PFAS and route reliability.'},
  {id:'asia',label:'Asia Supply Base',markets:['global'],fallback:'global',intro:'Factory-side view across Taiwan and China. This room leads with materials, FX and booking rhythm, then uses the global policy backdrop as context.'},
  {id:'oceania',label:'Oceania',markets:['au'],fallback:'au',intro:'Biosecurity, timber paperwork and shipment readiness shape buyer risk in this room.'},
  {id:'mea',label:'Middle East & Africa',markets:['me'],fallback:'me',intro:'Energy-led freight volatility and certificate readiness matter most across this room.'},
  {id:'latam',label:'Latin America',markets:['sa'],fallback:'sa',intro:'FX swings, customs friction and route predictability deserve a dedicated buying cadence here.'}
];
function labelFor(code){for(var i=0;i<order.length;i++){if(order[i][0]===code)return order[i][1];}return code;}
function roomMarketLabel(room,code){if(room&&room.id==='asia'&&code==='global')return 'Global policy backdrop';return labelFor(code);}
function roomById(id){for(var i=0;i<ROOMS.length;i++){if(ROOMS[i].id===id)return ROOMS[i];}return ROOMS[0];}
function uniq(list){var seen={},out=[];list.forEach(function(item){if(item&&!seen[item]){seen[item]=1;out.push(item);}});return out;}
function roomSignals(room){
  var out=[];
  room.markets.forEach(function(code){
    var rg=R[code];
    if(rg&&rg.summary){
      out.push({title:labelFor(code),body:rg.summary.changed+' '+rg.summary.action});
    }
  });
  if(room.id==='asia'){
    var td=D.teamdesk||{},brief=((td.advice||{}).en||'').replace(/^\[Birdland Supply-Chain Brief\]\s*/,'');
    if(brief)out.unshift({title:'Supply base brief',body:brief});
    var mats=((td.materials||[]).slice(0,2)).map(function(m){return m.name+' '+(m.dir||'flat')+' — '+(m.note||'');});
    if(mats.length)out.push({title:'Factory-side inputs',body:mats.join(' ')});
  }
  var proc=(D.procurement&&D.procurement.items)||[];
  if(proc.length){out.push({title:'Shared action queue',body:proc.slice(0,2).map(function(x){return (x.input?x.input+': ':'')+x.action;}).join(' · ')});}
  return out.slice(0,3);
}
function renderRoomSummary(room,focusCode){
  if(!roomSummary)return;
  var signals=roomSignals(room);
  var html='<h3>'+room.label+'</h3><p>'+room.intro+'</p>';
  html+='<ul>'+signals.map(function(item){return '<li><b>'+item.title+'</b><br>'+item.body+'</li>';}).join('')+'</ul>';
  roomSummary.innerHTML=html;
  if(roomMeta)roomMeta.textContent=room.label+' · '+roomMarketLabel(room,focusCode);
}
function render(code){
  var r=R[code]||R.global;if(!r)return;
  var h='<div class="head2">'+r.headline+'</div>';
  if(r.summary){h+='<div class="plain"><b>Buyer takeaway</b>'+r.summary.changed+' '+r.summary.action+'</div>';}
  h+='<div class="dh">▸ Regulation &amp; policy</div>';
  r.regulation.forEach(function(it){h+='<div class="card"><h4>'+it.t+'</h4><p>'+it.b+'</p></div>';});
  h+='<div class="dh c">▸ Supply &amp; cost backdrop</div><div class="supplyb"><p>'+r.supply+'</p></div><div class="view"><div class="vh">◆ Birdland’s view</div><p>'+r.view+'</p></div>';
  if(content)content.innerHTML=h;
}
function fillMarkets(room){
  if(!sel)return;
  sel.innerHTML='';
  uniq(room.markets).forEach(function(code){
    var op=document.createElement('option');
    op.value=code;
    op.textContent=roomMarketLabel(room,code);
    sel.appendChild(op);
  });
}
function paintChips(active){
  if(!chips)return;
  chips.innerHTML=ROOMS.map(function(room){return '<button type="button" class="rp-chip'+(room.id===active?' on':'')+'" data-room="'+room.id+'">'+room.label+'</button>';}).join('');
}
function setRoom(roomId,requestedCode){
  var room=roomById(roomId);
  fillMarkets(room);
  paintChips(room.id);
  if(roomSel)roomSel.value=room.id;
  if(regionLabel)regionLabel.textContent=room.id==='asia'?'Policy backdrop':'Focus market';
  var target=requestedCode;
  if(!target||![].some.call(sel.options,function(o){return o.value===target;}))target=room.fallback;
  if(sel)sel.value=target;
  if(window.blCtx)window.blCtx.set({room:room.id,market:target});
  else try{localStorage.setItem('bd_p_room',room.id);localStorage.setItem('bd_p_region',target);}catch(e){}
  renderRoomSummary(room,target);
  render(target);
}
if(roomSel&&sel&&content){
  ROOMS.forEach(function(room){
    var op=document.createElement('option');
    op.value=room.id;
    op.textContent=room.label;
    roomSel.appendChild(op);
  });
  roomSel.addEventListener('change',function(){setRoom(roomSel.value);});
  sel.addEventListener('change',function(){if(window.blCtx)window.blCtx.set({market:sel.value});else try{localStorage.setItem('bd_p_region',sel.value);}catch(e){}renderRoomSummary(roomById(roomSel.value),sel.value);render(sel.value);});
  if(chips)chips.addEventListener('click',function(e){var btn=e.target.closest('[data-room]');if(btn)setRoom(btn.getAttribute('data-room'));});
  var startRoom='global',startCode=(order[0]&&order[0][0])||'global';
  if(window.blCtx){var c0=window.blCtx.get();if(c0.room)startRoom=c0.room;if(c0.market)startCode=c0.market;}
  else try{
    var savedRoom=localStorage.getItem('bd_p_room');
    var savedCode=localStorage.getItem('bd_p_region');
    if(savedRoom)startRoom=savedRoom;
    if(savedCode)startCode=savedCode;
  }catch(e){}
  setRoom(startRoom,startCode);
  // Anything else that moves the context — the rail's context card, another
  // tab, the calculator's destination — pulls the desk with it.
  if(window.blCtx)window.blCtx.on(function(st){
    if(roomSel.value===st.room&&sel.value===st.market)return;
    setRoom(st.room,st.market);
  });
}
})();