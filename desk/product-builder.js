(function(){/* AsiaSource: public choices stay in this tab; email opens a reviewable draft */
 var root=document.getElementById('overview'),email=document.getElementById('bb-email'),pdf=document.getElementById('bb-pdf'),destination=document.getElementById('bb-destination');
 /* The guard used to stand here. CostNow drops the whole #overview shell at
    load, so it returned before reaching the families table below — and that
    table is the desk's material catalogue, which the command palette has to
    index on both pages. The table is now defined and published first; the
    guard that stops the brief builder itself moved to just after it. */
 var deskData={};try{deskData=JSON.parse(document.getElementById('outlook-data').textContent)||{};}catch(e){}
 var families=JSON.parse(document.getElementById('manufacturing-options').textContent);
 /* Published flat, in the same shape tools/dev/gen-terminal.js harvests out of
    this file, so terminal.json and the in-page palette are the same index read
    two ways rather than two lists that can disagree. */
 window.BL_FAMILIES=families;
 if(!root||!email||!destination)return;
 var state={family:0,model:0,part:0,material:0,process:0,priority:'Cost stability'};
 var familyTabs=document.getElementById('bd-family-tabs'),modelTabs=document.getElementById('bd-model-tabs'),partList=document.getElementById('bd-part-list'),materials=document.getElementById('bd-materials'),processes=document.getElementById('bd-processes');
 var image=document.getElementById('bd-anatomy-image');
 var publicItems=[];
 function esc(x){return String(x||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function line(x){return String(x||'').replace(/[\r\n]+/g,' ').trim();}
 function activeFamily(){return families[state.family];}
 /* A model that has just been switched to by family change may not exist at
    the previous model index (families carry different counts), so this reads
    defensively rather than trusting state.model to already be in range. */
 function activeModelObj(){var f=activeFamily(),list=f.models||[];return list[state.model]||list[0];}
 function activePart(){return activeModelObj().parts[state.part];}
 function activeMaterial(){return activePart().materials[state.material];}
 function activeProcess(){return activeModelObj().processes[state.process];}
 function activeModel(){return activeModelObj().name;}
 function setText(id,value){var el=document.getElementById(id);if(el)el.textContent=value;}
 // Buyer-view and production-view professional notes, one pair per unique
 // material/process NAME in the catalogue (see the embedded material-detail
 // JSON: build-time content, not part of the nightly data refresh). Parsed
 // once and cached — the catalogue itself is static within a page load, so
 // re-parsing 66KB of JSON on every material click would be wasted work.
 var MATERIAL_NOTES=null;
 function materialNotes(){
  if(MATERIAL_NOTES)return MATERIAL_NOTES;
  try{var el=document.getElementById('material-detail');MATERIAL_NOTES=el?JSON.parse(el.textContent):{};}
  catch(e){MATERIAL_NOTES={};}
  return MATERIAL_NOTES;
 }
 // A name not found here is not expected — every materials[]/processes[]
 // entry in this template has a matching key — but a future catalogue
 // addition should read as an empty card, never a broken one.
 function renderMaterialNotes(materialName,processName){
  var notes=materialNotes(),mat=notes[materialName],proc=notes[processName];
  setText('bb-notes-material-name',materialName);
  setText('bb-notes-material-buyer',mat?mat.buyer:'');
  setText('bb-notes-material-production',mat?mat.production:'');
  setText('bb-notes-process-name',processName);
  setText('bb-notes-process-buyer',proc?proc.buyer:'');
  setText('bb-notes-process-production',proc?proc.production:'');
 }
 function lastDistinctChange(points){
  if(!Array.isArray(points)||points.length<2)return null;
  var current=Number(points[points.length-1]),i=points.length-2;
  while(i>=0&&Number(points[i])===current)i--;
  var prior=i>=0?Number(points[i]):Number(points[points.length-2]);
  return isFinite(current)&&isFinite(prior)&&prior!==0?((current-prior)/Math.abs(prior))*100:null;
 }
 function materialSeries(pattern){
  var rows=((deskData.material||{}).series)||[];
  for(var i=0;i<rows.length;i++)if(pattern.test(String(rows[i].name||'')))return rows[i];
  return null;
 }
 function seriesMove(row){
  if(!row||!Array.isArray(row.points))return null;
  var tenors=((deskData.material||{}).tenors)||[],now=tenors.indexOf('Now');
  if(now<1||!isFinite(Number(row.points[now]))||!isFinite(Number(row.points[now-1]))||Number(row.points[now-1])===0)return null;
  return ((Number(row.points[now])-Number(row.points[now-1]))/Math.abs(Number(row.points[now-1])))*100;
 }
 function metric(delta,label,kind,display){
  return {delta:delta,label:label||'No matched public series',kind:kind||'manual',display:display||''};
 }
 function materialMetric(name){
  var n=String(name||'').toLowerCase(),row=null,label='';
  if(/stainless|sus304|420j2|420 stainless/.test(n)){row=materialSeries(/Stainless 304/i);label='Stainless proxy';}
  else if(/aluminium|aluminum/.test(n)){row=materialSeries(/Aluminium/i);label='Aluminium proxy';}
  else if(/zinc|chrome|plating|e-coat|powder coating|black oxide|lacquer/.test(n)){row=materialSeries(/Zinc/i);label='Coating-metal proxy';}
  else if(/tpr|rubber|epdm|nbr|silicone|eva/.test(n)){row=materialSeries(/TPR|Rubber/i);label='Elastomer proxy';}
  else if(/wood|hardwood|ash|eucalyptus|timber/.test(n)){row=materialSeries(/Timber/i);label='Timber proxy';}
  else if(/paper|kraft|board|carton|pulp|honeycomb|glassine|tissue|bagasse|grass-fibre|jute|hemp|cotton/.test(n)){row=materialSeries(/Cartonboard/i);label='Packaging-fibre proxy';}
  else if(/polypropylene|\bpp\b|\bpe\b|pa6|pa12|pa66|nylon|abs|pom|pvc|pet|cellulose|ldpe|polymer|fibreglass|fiber|rpet/.test(n)){row=materialSeries(/PP\/PE resin/i);label='Polymer proxy';}
  else if(/steel|iron|alloy|forged|stamped|brass|metal/.test(n)){row=materialSeries(/Steel HRC/i);label=/brass/.test(n)?'Metal-input proxy':'Steel-input proxy';}
  return row?metric(seriesMove(row),label+' · vs 1M','modelled'):metric(null,'Manual supplier check','manual');
 }
 function observedIndex(pattern,label){
  var rows=deskData.indices||[];
  for(var i=0;i<rows.length;i++)if(pattern.test(String(rows[i].label||'')+' '+String(rows[i].short||'')))return metric(lastDistinctChange(rows[i].spark),label+' · latest observed','observed');
  return metric(null,label+' unavailable','unavailable');
 }
 function processMetric(item){
  var n=String(item[0]||'').toLowerCase();
  if(/heat|temperature/.test(n))return observedIndex(/Brent|Crude/i,'Energy driver');
  if(/print|adhesive/.test(n)){var c=materialSeries(/Cartonboard/i);return metric(seriesMove(c),'Packaging-fibre proxy · vs 1M','modelled');}
  if(/coat|finish|plat|passivat/.test(n)){var z=materialSeries(/Zinc/i);return metric(seriesMove(z),'Finish-input proxy · vs 1M','modelled');}
  if(/mould|thermoform|shell form/.test(n)){var p=materialSeries(/PP\/PE resin/i);return metric(seriesMove(p),'Polymer proxy · vs 1M','modelled');}
  if(/structural conversion|carton|die-cut|score|fold/.test(n)){var f=materialSeries(/Cartonboard/i);return metric(seriesMove(f),'Packaging-fibre proxy · vs 1M','modelled');}
  if(/test|validation|coverage|pressure|leak|cycle|load/.test(n))return metric(5.2,'TW/CN labour benchmarks · YoY','official','+3.0–5.2%');
  if(/form|forge|stamp|blade|grind|weld|joint|head/.test(n)){var s=materialSeries(/Steel HRC/i);return metric(seriesMove(s),'Steel-input proxy · vs 1M','modelled');}
  return metric(5.2,'TW/CN labour benchmarks · YoY','official','+3.0–5.2%');
 }
 function deltaText(m){
  if(!m||!isFinite(m.delta))return 'Manual';
  if(m.display)return m.display;
  var v=Math.abs(m.delta)<0.05?0:m.delta;
  return (v>0?'+':'')+v.toFixed(1)+'%';
 }
 function metricLabel(m){
  if(!m)return 'Status unavailable';
  return m.label+(m.kind==='modelled'?' · modelled':m.kind==='official'?' · official':m.kind==='observed'?' · observed':'');
 }
 function deltaClass(m){return !m||!isFinite(m.delta)||Math.abs(m.delta)<0.05?'cost-flat':m.delta>0?'cost-up':'cost-down';}
var PROC_TILE=[
 [/hardness|heat|temper|quench/,'heat'],[/grind|sharp/,'grind'],[/mould|moulding/,'mould'],
 [/shell forming|thermoform/,'thermoform'],[/structural conversion|die-cut|score|fold/,'diecut'],
 [/print|adhesive/,'print'],[/transit|drop|compression/,'transit'],
 [/pressure|leak/,'testpressure'],[/coverage|spray|distribution/,'testspray'],
 [/drive-cycle|cycle/,'inspect'],[/coat|finish|plat|passivat|anodis/,'finish'],
 [/assembly|socket|rivet|fit|calibrat/,'assembly'],[/test|validat|inspect|sampl/,'test'],
 [/form|forge|stamp|blade|head/,'forming']
];
function processTile(name){var n=String(name||'').toLowerCase();
 for(var i=0;i<PROC_TILE.length;i++)if(PROC_TILE[i][0].test(n))return PROC_TILE[i][1];
 return 'forming';}function swatchKind(name){
  var n=String(name||'').toLowerCase();
  if(/sk5/.test(n))return 'sk5';
  if(/65mn/.test(n))return '65mn';
  if(/420j2/.test(n))return '420j2';
  if(/s50c/.test(n))return 's50c';
  if(/stainless|sus304|420j2/.test(n))return 'stainless';
  if(/aluminium|aluminum/.test(n))return 'aluminium';
  if(/forged/.test(n))return 'forged';
  if(/ductile|cast iron/.test(n))return 'cast';
  if(/fibreglass|fiberglass/.test(n))return 'fibreglass';
  if(/zinc|chrome|plating|coat|finish/.test(n))return 'zinc';
  if(/wood|hardwood|ash|eucalyptus|timber/.test(n))return 'wood';
  if(/tpr|rubber|epdm|nbr|silicone|eva/.test(n))return 'rubber';
  if(/paper|kraft|board|carton|pulp|honeycomb|glassine|tissue|bagasse|grass-fibre/.test(n))return 'paper';
  if(/jute|hemp|cotton|twine|cord/.test(n))return 'fibre';
  if(/polypropylene|\bpp\b|\bpe\b|pa6|pa12|pa66|nylon|abs|pom|pvc|pet|cellulose|ldpe|polymer|fibreglass|rpet/.test(n))return 'resin';
  if(/steel|iron|alloy|forged|stamped/.test(n))return 'steel';
  return 'metal';
 }
 function relatedPdf(){
  var f=activeFamily(),words=f.key==='soil'?['rake','hoe','cultivat']:f.key==='digging'?['spade','shovel','trowel','fork']:f.key==='watering'?['water','spray','nozzle','hose']:f.key==='packaging'?['pack','catalog','retail','card','blister']:['prun','shear','lopper','cut'];
  for(var i=0;i<publicItems.length;i++){var hay=((publicItems[i].title||'')+' '+(publicItems[i].category||'')).toLowerCase();if(words.some(function(w){return hay.indexOf(w)>-1;}))return publicItems[i];}
  return publicItems[0]||null;
 }
 function setImpactState(id,label,tone){
  var el=document.getElementById(id);if(!el)return;
  el.textContent=label;el.className=tone||'';
 }
 function skuImpact(f,part,material,process){
  if(f.key==='packaging')return {
   title:'Treat this as a retail-pack / SKU revision',
   body:'Selecting '+material[0]+' for '+part.name+' can change pack dimensions, protection, artwork or claim evidence. Keep the route controlled until carton count, barcode position, recycled-content claims and transit performance are confirmed.'
  };
  if(f.key==='soil')return {
   title:'The head route changes the commercial SKU',
   body:activeModel()+' with '+material[0]+' at '+part.name+' defines geometry, weight, corrosion and handle-interface expectations. Keep it as a separate BOM or revision until fit, pull strength and retail positioning are confirmed.'
  };
  return {
   title:'Control this as a distinct BOM route',
   body:material[0]+' at '+part.name+' changes the construction or performance specification of the '+activeModel()+'. Do not merge it into an existing SKU until interchangeability, testing, finish and retailer-facing claims are confirmed.'
  };
 }
 function costImpact(materialMove,processMove,material,process){
  var vals=[];
  [materialMove,processMove].forEach(function(m){if(m&&isFinite(m.delta)&&!vals.some(function(v){return Math.abs(v-m.delta)<0.01;}))vals.push(m.delta);});
  var up=vals.some(function(v){return v>.05;}),down=vals.some(function(v){return v<-.05;}),title='Supplier confirmation required',stateLabel='CONFIRM',tone='confirm';
  if(up&&down){title='Mixed inputs — compare the whole cost bridge';stateLabel='WATCH';tone='watch';}
  else if(up){title='Selected inputs show upward pressure';stateLabel='WATCH';tone='watch';}
  else if(down){title='Input relief is visible, not automatic SKU savings';stateLabel='REVIEW';tone='';}
  else if(vals.length){title='Selected public inputs are broadly steady';stateLabel='REVIEW';tone='';}
  var body=material[0]+' is '+deltaText(materialMove)+' on its matched public proxy; '+process[0]+' is linked to '+deltaText(processMove)+'. These signals can overlap and must not be added together. Final SKU impact depends on BOM weight, yield, labour, quality, volume, amortisation and carrying time.';
  return {title:title,body:body,state:stateLabel,tone:tone};
 }
 function representativeFreight(destinationValue){
  var lanes=((deskData.shipping||{}).lanes)||[],pattern=null;
  if(destinationValue==='Europe'||destinationValue==='United Kingdom')pattern=/N\. Europe/i;
  else if(destinationValue==='North America')pattern=/US West Coast/i;
  if(!pattern)return {label:'No matched public lane',body:'No representative connected lane is used for this destination; confirm port, loadability and routing.'};
  for(var i=0;i<lanes.length;i++)if(pattern.test(String(lanes[i].lane||''))){
   var lane=lanes[i],change=isFinite(Number(lane.chg))?((Number(lane.chg)>0?'+':'')+Number(lane.chg).toFixed(1)+'%'):'change unavailable';
   return {label:lane.lane+' · '+change,body:'Representative '+lane.lane+' is '+change+' at '+Number(lane.rate||0).toLocaleString()+' '+(lane.unit||'')+' with '+(lane.transit||'transit unconfirmed')+'. Use the exact port and loading plan for a quote.'};
  }
  return {label:'Connected lane unavailable',body:'The current edition has no matched representative lane. Confirm port, loadability and routing.'};
 }
 function currentDeskSignal(material,process,destinationValue){
  var items=((deskData.procurement||{}).items)||[],n=(material[0]+' '+process[0]).toLowerCase(),pattern=/Container freight/i;
  if(/resin|poly|tpr|rubber|nylon|abs|pom|pvc|pet|epdm|eva/.test(n))pattern=/PP resin/i;
  else if(/steel|iron|metal|forg|stamp|grind|blade/.test(n))pattern=/Steel HRC/i;
  else if(/heat/.test(n))pattern=/Crude|fuel/i;
  else if(destinationValue==='Europe'||destinationValue==='United Kingdom')pattern=/EU compliance/i;
  for(var i=0;i<items.length;i++)if(pattern.test(String(items[i].input||'')))return {label:items[i].input+' · '+items[i].action,body:items[i].why||''};
  return {label:'Review current supply signals',body:'No directly matched current desk recommendation is available for this route.'};
 }
 function marketImpact(f,destinationValue){
  var fibre=f.key==='packaging'||/wood|ash|eucalyptus|paper|board|carton|pulp|jute|hemp|cotton/i.test(activeMaterial()[0]);
  if(destinationValue==='Europe')return {title:'EU evidence should be scoped before quotation',body:'Confirm the exact SKU’s product-safety, chemicals and packaging/EPR evidence. '+(fibre?'This wood or fibre route may also require chain-of-custody or due-diligence evidence; applicability must be checked.':'Material and finish declarations depend on the final construction and claims.')};
  if(destinationValue==='United Kingdom')return {title:'UK evidence should be scoped before quotation',body:'Confirm UK product-safety, chemicals, labelling and packaging obligations for the exact SKU and claims. '+(fibre?'Wood or fibre sourcing evidence may also be relevant.':'The required file must follow the final material and finish route.')};
  if(destinationValue==='North America')return {title:'State, retailer and claim review comes first',body:'Confirm destination/state product-safety, chemical, labelling and packaging requirements, plus retailer test protocols. California or recycled-content claims should be assessed only when applicable to the exact SKU.'};
  if(destinationValue==='Australia / New Zealand')return {title:'AU / NZ market and biosecurity review required',body:'Confirm product-safety, packaging-stewardship and retailer evidence. Timber or natural-fibre routes may add treatment, declaration or biosecurity checks depending on the destination and packaging.'};
  return {title:'Destination decision gates the evidence file',body:'Select the selling market before quotation so product-safety, chemicals, packaging, claims, testing and document ownership can be scoped without rework.'};
 }
 function priorityImpact(priority){
  if(priority==='Lead-time flexibility')return {title:'Approve alternates and lock dates',body:'Ask Birdland to identify qualified material/process alternates, the critical path, sampling gates and the last responsible date to reserve capacity or freight.'};
  if(priority==='Compliance readiness')return {title:'Request an evidence matrix before pricing',body:'Ask Birdland to map each selected material, process, pack claim and destination requirement to an owner, document and confirmation gate.'};
  return {title:'Compare equivalent cost routes',body:'Ask Birdland for a like-for-like cost bridge with material, conversion, labour, quality, packaging, freight and carrying time separated—without weakening the SKU specification.'};
 }
 /* ---- Shortlist and compare -----------------------------------------------

    Two things a buyer does on paper while reading this palette: star the
    routes worth asking about, and put two of them next to each other. Both
    were being done in a notebook and retyped into an email.

    The shortlist is keyed on the part and material *names*, not on their
    indexes. Indexes move whenever this table is edited; a buyer who pinned
    "SK5 high-carbon steel / Upper blade" last month should find that, or find
    nothing, rather than find whatever now sits at position 2.

    Nothing here composes an address. Draft enquiry hands the finished body to
    window.blMail.open — the same protected path the Buyer Brief button uses —
    so the address is still built only inside the click and never enters the
    DOM. */
 var SL_KEY='bd_shortlist',shortlist=[],compare=[];
 var slBox=document.getElementById('bd-shortlist'),slRows=document.getElementById('bd-shortlist-rows'),slCount=document.getElementById('bd-shortlist-count');
 var cmpBar=document.getElementById('bd-compare-bar'),cmpOpen=document.getElementById('bd-compare-open'),cmpModal=document.getElementById('bd-compare-modal'),cmpBody=document.getElementById('bd-compare-body'),cmpClose=document.getElementById('bd-compare-close');
 function slLoad(){
  try{
   var v=JSON.parse(localStorage.getItem(SL_KEY)||'[]');
   if(Array.isArray(v))shortlist=v.filter(function(r){return r&&r.material&&r.part;}).slice(0,24).map(function(r){
    return {family:String(r.family||''),part:String(r.part||''),material:String(r.material||''),note:String(r.note||''),qty:String(r.qty||'').slice(0,24)};
   });
  }catch(e){shortlist=[];}
 }
 function slSave(){try{localStorage.setItem(SL_KEY,JSON.stringify(shortlist));}catch(e){}}
 function slIndex(partName,mat){for(var i=0;i<shortlist.length;i++)if(shortlist[i].part===partName&&shortlist[i].material===mat)return i;return -1;}
 function isPinned(partName,mat){return slIndex(partName,mat)>-1;}
 function isTicked(mat){return compare.indexOf(mat)>-1;}
 /* The card is a <button>. A button may not contain a button or a checkbox, so
    the two controls are siblings inside a positioned cell, not children. */
 function matTools(partName,item,i){
  var pinned=isPinned(partName,item[0]),ticked=isTicked(item[0]);
  return '<div class="bd-mat-cell"><span class="bd-mat-tools'+(pinned||ticked?' has-state':'')+'">'+
   '<button type="button" class="bd-pin" data-pin="'+i+'" aria-pressed="'+(pinned?'true':'false')+'" aria-label="'+(pinned?'Remove ':'Add ')+esc(item[0])+(pinned?' from':' to')+' my shortlist"><span aria-hidden="true">'+(pinned?'★':'☆')+'</span></button>'+
   '<label class="bd-cmp"><input type="checkbox" data-compare="'+i+'"'+(ticked?' checked':'')+' aria-label="Compare '+esc(item[0])+'">Compare</label></span>';
 }
 function renderShortlist(){
  if(!slBox||!slRows)return;
  slBox.classList.toggle('on',shortlist.length>0);
  if(slCount)slCount.textContent=shortlist.length?shortlist.length+(shortlist.length===1?' route pinned':' routes pinned'):'';
  slRows.innerHTML=shortlist.map(function(r,i){
   return '<li><span><b>'+esc(r.material)+'</b><small>'+esc(r.part)+(r.family?' · '+esc(r.family):'')+'</small></span>'+
    '<input type="text" inputmode="numeric" data-qty="'+i+'" value="'+esc(r.qty)+'" placeholder="Qty" aria-label="Quantity for '+esc(r.material)+'">'+
    '<button type="button" class="bd-sl-drop" data-drop="'+i+'" aria-label="Remove '+esc(r.material)+' from my shortlist">×</button></li>';
  }).join('');
 }
 function togglePin(i){
  var f=activeFamily(),part=activePart(),item=part.materials[i];
  if(!item)return;
  var at=slIndex(part.name,item[0]);
  if(at>-1)shortlist.splice(at,1);
  else shortlist.push({family:f.label,part:part.name,material:item[0],note:item[1],qty:''});
  slSave();render();
 }
 function syncCompareBar(){
  if(!cmpBar||!cmpOpen)return;
  var names=activePart().materials.map(function(m){return m[0];});
  compare=compare.filter(function(n){return names.indexOf(n)>-1;});
  cmpOpen.textContent='Compare ('+compare.length+') →';
  cmpBar.classList.toggle('on',compare.length>=2);
  if(compare.length<2&&cmpModal&&cmpModal.classList.contains('on'))closeCompare();
 }
 function comparePicked(){
  var part=activePart(),out=[];
  compare.forEach(function(n){for(var i=0;i<part.materials.length;i++)if(part.materials[i][0]===n)out.push(part.materials[i]);});
  return out;
 }
 /* Only fields the cards themselves carry. There is no invented row here: a
    made-up tolerance or price in this table would read exactly like a quoted
    one. */
 function openCompare(){
  if(!cmpModal||!cmpBody)return;
  var items=comparePicked();
  if(items.length<2)return;
  var partName=activePart().name;
  function row(label,cells){return '<tr><th scope="row">'+label+'</th>'+cells.join('')+'</tr>';}
  cmpBody.innerHTML='<table><thead><tr><th scope="col">Field</th>'+items.map(function(it){return '<th scope="col">'+esc(it[0])+'</th>';}).join('')+'</tr></thead><tbody>'+
   row('Part',items.map(function(){return '<td>'+esc(partName)+'</td>';}))+
   row('Route note',items.map(function(it){return '<td>'+esc(it[1])+'</td>';}))+
   row('Input move',items.map(function(it){return '<td>'+esc(deltaText(materialMetric(it[0])))+'</td>';}))+
   row('Proxy basis',items.map(function(it){return '<td>'+esc(metricLabel(materialMetric(it[0])))+'</td>';}))+
   row('On my shortlist',items.map(function(it){return '<td>'+(isPinned(partName,it[0])?'Pinned':'—')+'</td>';}))+
   '</tbody></table>';
  cmpModal.hidden=false;cmpModal.classList.add('on');
  if(cmpClose)cmpClose.focus();
 }
 function closeCompare(){
  if(!cmpModal)return;
  cmpModal.classList.remove('on');cmpModal.hidden=true;
  if(cmpOpen&&cmpBar&&cmpBar.classList.contains('on'))cmpOpen.focus();
 }
 function draftEnquiry(){
  if(!shortlist.length||!window.blMail)return;
  var room=document.getElementById('room'),ctx=(window.blCtx&&window.blCtx.get())||{};
  var region=(room&&window.blMail.fromRoom[room.value])||window.blMail.recall('bl_mr_region','global');
  var lineId=ctx.line||window.blMail.recall('bl_mr_line','');
  var rows=shortlist.map(function(r,i){
   return (i+1)+'. '+line(r.material)+' · '+line(r.part)+' · qty '+(line(r.qty)||'to confirm')+(r.note?' — '+line(r.note):'');
  });
  var body=['Hello Birdland,','','These are the material routes I have shortlisted on the public AsiaSource workspace.','','Shortlist:']
   .concat(rows)
   .concat(['',
    'Product family in view: '+line(activeFamily().label),
    'Commercial region: '+line(ctx.room||'not set'),
    'Focus market: '+line(ctx.market||'not set'),
    'Product line: '+line(ctx.line||'Garden & field tools'),
    'Destination market: '+line(destination.value||'Global / undecided'),
    'Buying priority: '+line(state.priority),'',
    'Please confirm feasibility, material grade, hardness or finish, MOQ, tooling, timing, test plan and commercial terms for these routes. This public palette is conceptual and is not a customer drawing or a final specification.','',
    'No quote or order has been submitted. I will add confidential drawings, quantities, prices and specifications only in our normal Birdland email thread.','',
    'Public workspace: https://birdland.com.tw/partner.html#pd-builder'])
   .join('\n');
  window.blMail.open(region,lineId,'Birdland OEM enquiry — shortlist of '+shortlist.length+' material route'+(shortlist.length===1?'':'s'),body,(window.BL_DESK==='cost'?'cost':'brief'));
 }
 if(materials)materials.addEventListener('change',function(e){
  var box=e.target;
  if(!box||!box.getAttribute||!box.hasAttribute('data-compare'))return;
  var item=activePart().materials[Number(box.getAttribute('data-compare'))];
  if(!item)return;
  var at=compare.indexOf(item[0]);
  if(box.checked){if(at<0){if(compare.length>=3){box.checked=false;return;}compare.push(item[0]);}}
  else if(at>-1)compare.splice(at,1);
  render();
 });
 if(slRows)slRows.addEventListener('input',function(e){
  var f=e.target;
  if(!f||!f.getAttribute||!f.hasAttribute('data-qty'))return;
  var r=shortlist[Number(f.getAttribute('data-qty'))];
  if(!r)return;
  r.qty=String(f.value||'').slice(0,24);slSave();
 });
 /* position:fixed resolves against the nearest transformed or filtered
    ancestor, not the viewport, and this column has one — left inside the
    builder the backdrop covered only part of the screen. It is authored in
    place so the CostNow build can delete it with the rest of #overview, then
    moved to <body> here, after that deletion has already run. */
 if(cmpModal&&cmpModal.parentNode!==document.body)document.body.appendChild(cmpModal);
 if(cmpModal)cmpModal.addEventListener('click',function(e){if(e.target===cmpModal)closeCompare();});
 if(cmpClose)cmpClose.addEventListener('click',closeCompare);
 document.addEventListener('keydown',function(e){
  if((e.key==='Escape'||e.key==='Esc')&&cmpModal&&cmpModal.classList.contains('on'))closeCompare();
 });
 slLoad();

 function render(){
  var f=activeFamily(),mdl=activeModelObj(),part=activePart(),material=activeMaterial(),process=activeProcess(),materialMove=materialMetric(material[0]),processMove=processMetric(process);
  familyTabs.innerHTML=families.map(function(item,i){return '<button type="button" class="bd-family-tab '+(i===state.family?'on':'')+'" data-family="'+i+'" aria-pressed="'+(i===state.family?'true':'false')+'">'+esc(item.label)+'<small>'+esc(item.sub)+'</small></button>';}).join('');
  /* One family, one model, was the whole story until this catalogue grew a
     second and third route per platform. The chip row that used to be a
     single reference photo caption is now a model switcher — hidden when a
     family still carries only one model, so cutting/digging/soil grow a
     picker while watering and packaging read exactly as before. */
  if(modelTabs){
   var fmodels=f.models||[];
   modelTabs.hidden=fmodels.length<2;
   modelTabs.innerHTML=fmodels.map(function(item,i){return '<button type="button" class="bd-model-tab '+(i===state.model?'on':'')+'" data-model="'+i+'" aria-pressed="'+(i===state.model?'true':'false')+'">'+esc(item.name)+'</button>';}).join('');
  }
  /* Only the platform's reference model was ever photographed. A new model
     with no anatomy shot must not borrow another model's picture — that would
     misrepresent its construction — so the frame swaps for a plain notice
     instead of an <img> with the wrong src, and stays empty rather than
     stretched or cropped. */
  if(mdl.image){image.src=mdl.image;image.alt=mdl.alt||'';image.hidden=false;}else{image.removeAttribute('src');image.hidden=true;}
  partList.innerHTML=mdl.parts.map(function(item,i){return '<button type="button" class="bd-part '+(i===state.part?'on':'')+'" data-part="'+i+'" aria-pressed="'+(i===state.part?'true':'false')+'"><b>'+(i+1)+'</b><span>'+esc(item.name)+'</span></button>';}).join('');
  materials.innerHTML=part.materials.map(function(item,i){var m=materialMetric(item[0]);return matTools(part.name,item,i)+'<button type="button" class="bd-choice bd-material-choice '+(i===state.material?'on':'')+'" data-material="'+i+'" aria-pressed="'+(i===state.material?'true':'false')+'"><span class="bd-choice-top"><span class="bd-choice-visual"><i class="bd-swatch bd-swatch-'+swatchKind(item[0])+'" aria-hidden="true"></i><em class="bd-delta '+deltaClass(m)+'">'+deltaText(m)+'</em></span><span class="bd-choice-head"><b>'+esc(item[0])+'</b><small>'+esc(metricLabel(m))+'</small></span></span><span class="bd-choice-purpose">'+esc(item[1])+'</span></button></div>';}).join('');
  syncCompareBar();renderShortlist();
  processes.innerHTML=mdl.processes.map(function(item,i){var m=processMetric(item);return '<button type="button" class="bd-choice bd-process-choice '+(i===state.process?'on':'')+'" data-process="'+i+'" aria-pressed="'+(i===state.process?'true':'false')+'"><span class="bd-choice-top"><span class="bd-choice-visual">'+'<i class="bd-swatch bd-swatch-process" aria-hidden="true"><img src="images/desk/'+processTile(item[0])+'.webp" alt="" loading="lazy" decoding="async"></i>'+'<em class="bd-delta '+deltaClass(m)+'">'+deltaText(m)+'</em></span><span class="bd-choice-head"><b>'+esc(item[0])+'</b><small>'+esc(metricLabel(m))+'</small></span></span><span class="bd-choice-purpose">'+esc(item[1])+'</span></button>';}).join('');
  setText('bd-cost-method','Cost movement uses the current public input proxy against its prior reference point. Modelled cards are directional planning signals; process cards show a driver, not a supplier quotation. Edition '+line(deskData.updated||'status unavailable')+'.');
  setText('bb-summary-family',f.label);setText('bb-summary-model',activeModel());setText('bb-summary-part',part.name);setText('bb-summary-material',material[0]);setText('bb-summary-material-move',deltaText(materialMove)+' · '+metricLabel(materialMove));setText('bb-summary-process',process[0]);setText('bb-summary-process-move',deltaText(processMove)+' · '+metricLabel(processMove));setText('bb-summary-priority',state.priority);
  renderMaterialNotes(material[0],process[0]);
  var sku=skuImpact(f,part,material,process),cost=costImpact(materialMove,processMove,material,process),freight=representativeFreight(destination.value),signal=currentDeskSignal(material,process,destination.value),market=marketImpact(f,destination.value),next=priorityImpact(state.priority);
  setText('bb-impact-sku-title',sku.title);setText('bb-impact-sku',sku.body);
  setImpactState('bb-impact-sku-state','REVIEW','watch');
  setText('bb-impact-cost-title',cost.title);setText('bb-impact-cost',cost.body);setImpactState('bb-impact-cost-state',cost.state,cost.tone);
  setText('bb-impact-time-title',freight.label==='No matched public lane'||freight.label==='Connected lane unavailable'?'Route and timing need confirmation':'Use the representative lane as context only');
  setText('bb-impact-time',freight.body+' '+signal.body);setText('bb-impact-freight',freight.label);setText('bb-impact-signal',signal.label);
  setImpactState('bb-impact-time-state',freight.label.indexOf('unavailable')>-1||freight.label.indexOf('No matched')>-1?'CONFIRM':'PLAN',freight.label.indexOf('unavailable')>-1||freight.label.indexOf('No matched')>-1?'confirm':'');
  setText('bb-impact-market-title',market.title);setText('bb-impact-market',market.body);
  setText('bb-next-title',next.title);setText('bb-next-action',next.body);
  setText('bb-check-sku',part.name+' / '+material[0]+' is isolated as a controlled SKU or BOM route.');
  setText('bb-check-cost','Public input moves are separated from labour, carrying time and the finished quotation.');
  setText('bb-check-market',destination.value+' evidence remains subject to exact-SKU and claim confirmation.');
  var item=relatedPdf();
  if(pdf){var ptip=document.getElementById('bb-pdf-tip');
   function pdfLabel(t){if(ptip)ptip.textContent=t;pdf.setAttribute('aria-label',t);}
   if(item&&/^https:\/\//i.test(item.pdf_url||'')){pdf.href=item.pdf_url;pdf.target='_blank';pdf.rel='noopener';pdfLabel('Open the related view-only PDF');setText('bb-summary-references','Matched public PDF + Factory');}
   else{pdf.href='product-101.html';pdf.removeAttribute('target');pdfLabel('Open the related public information');setText('bb-summary-references','Product 101');}}
  var subject='Birdland OEM planning enquiry — '+f.label;
  var body=[
   'Hello Birdland,','','I would like to discuss an OEM programme using this public planning route.','',
   'Product family: '+line(f.label),'Reference model: '+line(activeModel()),'Part to discuss: '+line(part.name),'Material route: '+line(material[0])+' — '+line(material[1]),'Material input move: '+deltaText(materialMove)+' — '+line(metricLabel(materialMove)),'Process control point: '+line(process[0])+' — '+line(process[1]),'Process cost driver: '+deltaText(processMove)+' — '+line(metricLabel(processMove)),'Buying priority: '+line(state.priority),'Destination market: '+line(destination.value||'Global / undecided'),'',
   'Procurement impact summary:','SKU / BOM: '+line(sku.title)+' — '+line(sku.body),'Quote exposure: '+line(cost.title)+' — '+line(cost.body),'Timing / supply: '+line(freight.body)+' '+line(signal.label)+' — '+line(signal.body),'Market readiness: '+line(market.title)+' — '+line(market.body),'Requested next decision: '+line(next.title)+' — '+line(next.body),'',
   'Please confirm feasibility, material grade, hardness or finish, packaging compatibility, MOQ, timing, test plan and commercial terms. This reference anatomy is conceptual and is not a customer drawing or final specification.','',
   'No quote or order has been submitted. I will add confidential drawings, quantities, prices and specifications only in our normal Birdland email thread.','',
   'Public workspace: https://birdland.com.tw/partner.html#overview'
  ].join('\n');
  email.__mail={subject:subject,body:body};
 }
 root.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('button');
  if(!b)return;
  if(b.hasAttribute('data-pin')){togglePin(Number(b.getAttribute('data-pin')));return;}
  if(b.hasAttribute('data-drop')){var di=Number(b.getAttribute('data-drop'));if(di>-1&&di<shortlist.length){shortlist.splice(di,1);slSave();render();}return;}
  if(b.id==='bd-shortlist-draft'){draftEnquiry();return;}
  if(b.id==='bd-compare-open'){openCompare();return;}
  if(b.hasAttribute('data-family')){state.family=Number(b.getAttribute('data-family'));state.model=0;state.part=0;state.material=0;state.process=0;compare=[];render();return;}
  if(b.hasAttribute('data-model')){state.model=Number(b.getAttribute('data-model'));state.part=0;state.material=0;state.process=0;compare=[];render();return;}
  if(b.hasAttribute('data-part')){state.part=Number(b.getAttribute('data-part'));state.material=0;compare=[];render();return;}
  if(b.hasAttribute('data-material')){state.material=Number(b.getAttribute('data-material'));render();return;}
  if(b.hasAttribute('data-process')){state.process=Number(b.getAttribute('data-process'));render();return;}
  if(b.hasAttribute('data-priority')){state.priority=b.getAttribute('data-priority');[].forEach.call(document.querySelectorAll('[data-priority]'),function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false');});render();return;}
  if(b.hasAttribute('data-go')){var id=b.getAttribute('data-go'),a=document.querySelector('.toc > a[href="#'+id+'"]');if(a)a.click();return;}
  if(b.id==='reset-buyer-desk'){state={family:0,model:0,part:0,material:0,process:0,priority:'Cost stability'};compare=[];destination.selectedIndex=0;[].forEach.call(document.querySelectorAll('[data-priority]'),function(x,i){x.classList.toggle('on',i===0);x.setAttribute('aria-pressed',i===0?'true':'false');});render();}
 });
 destination.addEventListener('change',render);
 var feed=window.BirdlandProductFeed;
 if(feed)feed.then(function(data){publicItems=(data&&data.items)||[];render();}).catch(function(){publicItems=[];render();});

 /* The Terminal search sends people here with ?q=<material or process>, so the
    builder opens on the thing they searched for rather than on whatever was
    selected last. A model-name match is checked BEFORE a material match: the
    demand shelf's price-band ladder used to send ?q=<model name> here, and
    although the shelf has moved out to My Market, links of that shape are
    still out there in old mail and old bookmarks. A material and a model never
    share a string, so the order only decides a future coincidence, and it
    decides it in favour of the more specific link. Anything that does not
    match is ignored — a stale link should land on a working page, not an
    error, which is exactly what those old links now depend on. */
 (function(){
  var q="";try{q=decodeURIComponent((location.search.match(/[?&]q=([^&]*)/)||[])[1]||"");}catch(e){}
  if(!q)return;
  var want=q.toLowerCase();
  for(var fi=0;fi<families.length;fi++){
   var fam=families[fi],famModels=fam.models||[];
   for(var di=0;di<famModels.length;di++){
    if(String(famModels[di].name).toLowerCase()===want){
     state.family=fi;state.model=di;state.part=0;state.material=0;state.process=0;render();return;
    }
   }
  }
  for(var fi2=0;fi2<families.length;fi2++){
   var fam2=families[fi2],famModels2=fam2.models||[];
   for(var di2=0;di2<famModels2.length;di2++){
    var mdl2=famModels2[di2];
    for(var pi=0;pi<(mdl2.parts||[]).length;pi++){
     var part=mdl2.parts[pi];
     for(var mi=0;mi<(part.materials||[]).length;mi++){
      if(String(part.materials[mi][0]).toLowerCase()===want){
       state.family=fi2;state.model=di2;state.part=pi;state.material=mi;state.process=0;render();return;
      }
     }
    }
    for(var qi=0;qi<(mdl2.processes||[]).length;qi++){
     if(String(mdl2.processes[qi][0]).toLowerCase()===want){
      state.family=fi2;state.model=di2;state.part=0;state.material=0;state.process=qi;render();return;
     }
    }
   }
  }
 }());

 render();
})();