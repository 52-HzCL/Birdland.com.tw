/* Needs-first entry; the original engineering desk remains a reference workspace. */
(function () {
  'use strict';
  const host=document.getElementById('overview');
  if(!host)return;
if(window.BL_ENQUIRY_MOUNT){window.BL_ENQUIRY_MOUNT(host);return;}
  const state={mode:'idea',category:'',use:'',model:'',priorities:[],recommend:true,material:'',process:'',part:'',referenceRoute:null};
  let restoringReference=false;const catalog=JSON.parse(document.getElementById('studio-catalog').textContent).products;
  const categories=[['pruners','catPruners'],['hedge','catHedge'],['loppers','catLoppers'],['saws','catSaws'],['hoes','catHoes'],['hand-tools','catHandTools'],['rakes','catRakes'],['watering','catWatering']];
  const priorities=['Rust','Durability','Weight','Appearance','Packaging','Simple'];
  const restored=window.BL_BRIEF?.items('Product Studio')[0]?.inputs.studio;if(restored){Object.assign(state,restored);if(!catalog.some(p=>p.id===state.model))state.model='';if(!categories.some(c=>c[0]===state.category))state.category='';if(!['garden','professional','retail'].includes(state.use))state.use='';state.priorities=state.priorities.filter(k=>priorities.includes(k));}
  const text=()=>{let id='en';try{id=localStorage.getItem('bl_lang')||id;}catch(_){}return(window.BL_SITE.languages.find(l=>l.id===id)||window.BL_SITE.languages[0]).text;};
  const t=k=>text()[k]||window.BL_SITE.languages[0].text[k]||k;
  const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
  const engineering=el('details','sn-secondary sn-engineering');
  engineering.id='sn-engineering';const engineeringSummary=el('summary');engineering.append(engineeringSummary);
  const engineeringGuide=el('div','sn-reference-guide'),engineeringHelp=el('p','sn-small'),backNeeds=el('button','sn-back-needs');backNeeds.type='button';backNeeds.addEventListener('click',()=>{root.querySelector('#sn-specify').focus({preventScroll:true});root.querySelector('.sn-recommend').scrollIntoView({block:'center',behavior:'auto'});});engineeringGuide.append(engineeringHelp,backNeeds);engineering.append(engineeringGuide);const grid=host.querySelector('.bd-grid');if(grid)engineering.append(grid);document.getElementById('bd-family-tabs')?.before(engineeringGuide);
  const library=el('details','sn-secondary');const librarySummary=el('summary');library.append(librarySummary);
  const reference=document.getElementById('bl-cat');if(reference)library.append(reference);
  const bottom=host.querySelector('.bd-bottom');if(bottom)library.append(bottom);
  const privacy=host.querySelector('.bd-privacy');if(privacy)library.append(privacy);
  const root=el('section','sn-entry');root.id='studio-needs';
  host.append(root,engineering,library);
  const labelled=(label,html)=>'<label class="sn-field"><span>'+escape(t(label))+'</span>'+html+'</label>';
  const options=(values,selected)=>values.map(([value,label])=>'<option value="'+escape(value)+'"'+(value===selected?' selected':'')+'>'+escape(t(label))+'</option>').join('');
  function draw(){
    const edition=window.BL_SITE.languages.find(l=>l.text===text())||window.BL_SITE.languages[0];
    document.querySelectorAll('a[href$="configurator.html"]').forEach(a=>{a.href=(edition.id==='en'?'':edition.id+'/')+'configurator.html';});
    engineeringSummary.textContent=t('snEngineering');librarySummary.textContent=t('snReferences');engineeringHelp.textContent=t('snSpecifyHelp');backNeeds.textContent=t('snBackNeeds');
    root.innerHTML='<div class="sn-intro"><p class="sn-eyebrow">'+escape(t('snSteps'))+'</p><h1>'+escape(t('snTitle'))+'</h1><p>'+escape(t('snIntro'))+'</p><p class="sn-capability">'+escape(t('snMetal')+' '+t('catSupport'))+'</p></div><div class="sn-layout"><div class="sn-input"><div class="sn-switch" role="group" aria-label="'+escape(t('snStart'))+'"><button type="button" data-mode="model" aria-pressed="'+(state.mode==='model')+'">'+escape(t('snModel'))+'</button><button type="button" data-mode="idea" aria-pressed="'+(state.mode==='idea')+'">'+escape(t('snIdea'))+'</button></div><div class="sn-fields"></div><fieldset class="sn-priorities"><legend>'+escape(t('snPriority'))+'</legend><p>'+escape(t('snPickTwo'))+'</p><div>'+priorities.map(k=>'<button type="button" data-need="'+k+'" aria-pressed="'+state.priorities.includes(k)+'">'+escape(t('sn'+k))+'</button>').join('')+'</div><p id="sn-priority-status" role="status"></p></fieldset><label class="sn-recommend"><input type="checkbox" id="sn-recommend"'+(state.recommend?' checked':'')+'> <span>'+escape(t('snRecommend'))+'</span></label><p class="sn-small">'+escape(t('snHumanReview'))+'</p><div class="sn-specify-actions"><button type="button" id="sn-specify" aria-controls="sn-engineering" aria-expanded="'+engineering.open+'">'+escape(t('snSpecify'))+'</button><button type="button" id="sn-clear-reference">'+escape(t('snClearReference'))+'</button></div><p class="sn-small">'+escape(t('snSpecifyHelp'))+'</p><div id="sn-product"></div></div><aside class="sn-brief" aria-labelledby="sn-brief-title"><p class="sn-eyebrow">'+escape(t('snBrief'))+'</p><h2 id="sn-brief-title">'+escape(t('snClear'))+'</h2><div id="sn-summary"></div><button type="button" id="sn-copy" class="sn-primary">'+escape(t('snCopy'))+'</button><p id="sn-copy-status" role="status"></p><details class="sn-preview"><summary>'+escape(t('snPreview'))+'</summary><pre id="sn-plain"></pre></details><a id="sn-plan" href="buying-tools.html">'+escape(t('snPlan'))+' →</a><p class="sn-small">'+escape(t('snPrivate'))+'</p></aside></div>';
    if(window.BL_BRIEF){const review=el('button','br-entry');review.textContent=t('brReview');review.type='button';review.addEventListener('click',()=>window.BL_BRIEF.open('Product Studio'));root.querySelector('.sn-brief').append(review);}
    const fields=root.querySelector('.sn-fields');
    if(state.mode==='model'){
      fields.innerHTML=labelled('snKnownModel','<select id="sn-model"><option value="">'+escape(t('snSelect'))+'</option>'+catalog.map(p=>'<option value="'+escape(p.id)+'"'+(p.id===state.model?' selected':'')+'>'+escape(p.sku+' · '+p.name)+'</option>').join('')+'</select>')+'<a class="sn-catalog-link" href="products.html">'+escape(t('snCatalog'))+' →</a>';
    }else fields.innerHTML=labelled('snTool','<select id="sn-category">'+options([['','snUndecided'],...categories],state.category)+'</select>');
    fields.insertAdjacentHTML('beforeend',labelled('snUse','<select id="sn-use">'+options([['','snUndecided'],['garden','snGarden'],['professional','snProfessional'],['retail','snRetail']],state.use)+'</select>'));
    update();
  }
  function chosen(){return catalog.find(p=>p.id===state.model);}
  function categoryLabel(){const row=categories.find(c=>c[0]===state.category);return row?t(row[1]):t('snUndecided');}
  function lines(){
    const product=state.mode==='model'?chosen():null;
    const use=({garden:'snGarden',professional:'snProfessional',retail:'snRetail'})[state.use];
    const selected=[],pending=[];
    (state.category?selected:pending).push(t('snTool')+': '+categoryLabel());
    (use?selected:pending).push(t('snUse')+': '+(use?t(use):t('snUndecided')));
    (state.priorities.length?selected:pending).push(t('snPriority')+': '+(state.priorities.length?state.priorities.map(k=>t('sn'+k)).join(', '):t('snUndecided')));
    if(product)selected.unshift(t('snKnownModel')+': '+product.sku+' · '+product.name+' · '+(product.origin==='TW'?t('snTaiwan'):t('snChina')));
    if(!product)pending.push(t('snKnownModel')+': '+t('snUndecided'));
    (state.material?selected:pending).push(t('snMaterial')+': '+(state.material?state.material+' '+t('snReferenceSuffix'):t('snUndecided')));(state.process?selected:pending).push(t('snProcess')+': '+(state.process?state.process+' '+t('snReferenceSuffix'):t('snUndecided')));
    if(state.part)pending.push(t('snReferencePart')+': '+state.part);
    if(state.recommend)pending.push(t('snRecommend'));
    return {selected:selected.length?selected:[t('snUndecided')],pending};
  }
  function snapshot(){const l=lines();return [{id:state.mode==='model'&&chosen()?chosen().id:'purpose',source:'Product Studio',title:state.mode==='model'&&chosen()?chosen().sku+' · '+chosen().name:t('snIdea'),inputs:{studio:{...state,priorities:state.priorities.slice()}},selected:l.selected.filter(s=>s!==t('snUndecided')),unknown:l.pending,examples:[t('snReviewText')]}];}
  if(window.BL_BRIEF)window.BL_BRIEF.register('Product Studio',{snapshot,remove(){Object.assign(state,{mode:'idea',category:'',use:'',model:'',priorities:[],recommend:true,material:'',process:'',part:'',referenceRoute:null});draw();},clear(){Object.assign(state,{mode:'idea',category:'',use:'',model:'',priorities:[],recommend:true,material:'',process:'',part:'',referenceRoute:null});draw();}});
  function brief(){if(window.BL_BRIEF)return window.BL_BRIEF.format({version:1,items:snapshot(),note:''});const l=lines();return t('snBrief')+'\n\n'+t('snSelected')+'\n'+l.selected.join('\n')+'\n\n'+t('snPending')+'\n'+l.pending.join('\n')+'\n\n'+t('snReview')+'\n'+t('snReviewText');}
  function update(){
    const l=lines();root.querySelector('#sn-clear-reference').disabled=!(state.material||state.process||state.part);root.querySelector('#sn-clear-reference').hidden=root.querySelector('#sn-clear-reference').disabled;
    root.querySelector('#sn-summary').innerHTML=[[t('snSelected'),l.selected],[t('snPending'),l.pending],[t('snReview'),[t('snReviewText')]]].map(([heading,items])=>'<section><h3>'+escape(heading)+'</h3><ul>'+items.map(v=>'<li>'+escape(v)+'</li>').join('')+'</ul></section>').join('');
    root.querySelector('#sn-plain').textContent=brief();
    const product=state.mode==='model'?chosen():null;
    root.querySelector('#sn-product').innerHTML=product?'<figure><img src="'+escape(product.img)+'" alt="'+escape(product.sku+' '+product.name)+'"><figcaption><strong>'+escape(product.sku)+'</strong> · '+escape(product.origin==='TW'?t('snTaiwan'):t('snChina'))+'<br>'+escape(t('snNoMapping'))+'</figcaption></figure>':'';
    root.querySelector('#sn-copy-status').textContent='';
  }
  root.addEventListener('change',e=>{
    if(e.target.id==='sn-model'){state.model=e.target.value;state.category=chosen()?.axis||'';state.material=state.process=state.part='';state.referenceRoute=null;}
    if(e.target.id==='sn-category'){state.category=e.target.value;state.material=state.process=state.part='';state.referenceRoute=null;}
    if(e.target.id==='sn-use')state.use=e.target.value;
    if(e.target.id==='sn-recommend')state.recommend=e.target.checked;
    update();
  });
  root.addEventListener('click',async e=>{
    if(e.target.closest('#sn-specify')){engineering.open=true;backNeeds.focus({preventScroll:true});engineeringGuide.scrollIntoView({block:'start',behavior:'auto'});return;}if(e.target.closest('#sn-clear-reference')){state.material=state.process=state.part='';state.referenceRoute=null;update();root.querySelector('#sn-specify').focus({preventScroll:true});return;}const mode=e.target.closest('[data-mode]');
    if(mode){state.mode=mode.dataset.mode;state.model='';state.category='';state.material=state.process=state.part='';state.referenceRoute=null;draw();root.querySelector('[data-mode="'+state.mode+'"]').focus({preventScroll:true});return;}
    const priority=e.target.closest('[data-need]');
    if(priority){const k=priority.dataset.need;const i=state.priorities.indexOf(k);if(i>=0)state.priorities.splice(i,1);else if(state.priorities.length<2)state.priorities.push(k);else{root.querySelector('#sn-priority-status').textContent=t('snPickTwo');return;}priority.setAttribute('aria-pressed',String(state.priorities.includes(k)));root.querySelector('#sn-priority-status').textContent='';update();}
    if(e.target.closest('#sn-copy')){
      const value=window.BL_BRIEF?window.BL_BRIEF.format({version:1,items:snapshot(),note:''}):brief();
      try{await navigator.clipboard.writeText(value);root.querySelector('#sn-copy-status').textContent=t('snCopied');}
      catch(_){const preview=root.querySelector('.sn-preview');preview.open=true;const range=document.createRange();range.selectNodeContents(root.querySelector('#sn-plain'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);root.querySelector('#sn-copy-status').textContent=t('snCopyFallback');}
    }
    if(e.target.closest('#sn-plan')&&window.BL_FOCUS){window.BL_FOCUS.set({category:state.category,product:chosen()?.id||''});}
  });
  // Original engineering defaults are examples. Only deliberate choices enter the new brief.
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.id==='reset-buyer-desk'){Object.assign(state,{mode:'idea',category:'',use:'',model:'',priorities:[],recommend:true,material:'',process:'',part:'',referenceRoute:null});draw();return;}
    if(!e.composedPath().includes(engineering)||restoringReference)return;
    if(button.hasAttribute('data-family')||button.hasAttribute('data-model')||button.hasAttribute('data-part')){state.material=state.process=state.part='';state.referenceRoute=null;}
    if(button.hasAttribute('data-material')){state.material=document.getElementById('bb-summary-material')?.textContent||'';state.part=document.getElementById('bb-summary-part')?.textContent||'';}
    if(button.hasAttribute('data-process')){state.process=document.getElementById('bb-summary-process')?.textContent||'';state.part=document.getElementById('bb-summary-part')?.textContent||'';}
    if(button.hasAttribute('data-material')||button.hasAttribute('data-process'))state.referenceRoute=Object.fromEntries(['family','model','part','material','process'].map(key=>[key,Number(engineering.querySelector('[data-'+key+'][aria-pressed="true"],[data-'+key+'].on')?.getAttribute('data-'+key)||0)]));
    update();for(const attr of ['data-family','data-model','data-part','data-material','data-process'])if(button.hasAttribute(attr)){engineering.querySelector('['+attr+'="'+button.getAttribute(attr)+'"]')?.focus({preventScroll:true});break;}
  });
  function route(){
    const id=location.hash.slice(1),legacy=['p-landed2','p-margin','p-reorder','p-sail','p-cduty'];
    if(legacy.includes(id)&&!document.getElementById(id)){location.replace('buying-tools.html'+location.search+'#'+(['p-reorder','p-sail'].includes(id)?'reorder-planning':'landed-cost'));return;}
    document.body.classList.toggle('studio-needs-active',getComputedStyle(host).display!=='none');if(id==='pd-builder'){engineering.open=true;setTimeout(()=>document.getElementById('pd-builder')?.scrollIntoView({block:'start'}),40);}
  }
  window.addEventListener('bl:view',route);window.addEventListener('hashchange',route);
  window.addEventListener('bl:lang',draw);window.addEventListener('storage',e=>{if(e.key==='bl_lang')draw();});
  const query=new URLSearchParams(location.search).get('sku');
  if(query){const p=catalog.find(p=>p.sku.toLowerCase()===query.toLowerCase());if(p){if(state.model!==p.id){state.material=state.process=state.part='';state.referenceRoute=null;}state.mode='model';state.model=p.id;state.category=p.axis;}}
  engineering.addEventListener('toggle',()=>root.querySelector('#sn-specify')?.setAttribute('aria-expanded',String(engineering.open)));draw();route();if(state.referenceRoute){restoringReference=true;for(const key of ['family','model','part','material','process']){const value=state.referenceRoute[key];if(Number.isInteger(value)&&value>=0)engineering.querySelector('[data-'+key+'="'+value+'"]')?.click();}restoringReference=false;}
})();
