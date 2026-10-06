/* Focused market comparison, using the original desk's data and actions. */
(function () {
  'use strict';
  let api, root, selectors, metrics, table, meaning, source, period, more, sheet, since;
  let comparisons = [], comparisonsConfigured=false;
  try { const raw=localStorage.getItem('bl_mm_compare'),saved=JSON.parse(raw||'[]'); if(Array.isArray(saved)){comparisons=saved.slice(0,2).map(k=>/^[a-z]{2}$/.test(k||'')?k:'');if(comparisons[0]&&comparisons[0]===comparisons[1])comparisons[1]='';comparisonsConfigured=raw!==null;} } catch (_) {}
  const words=()=>{let language='en';try{language=localStorage.getItem('bl_lang')||language;}catch(_){}const site=window.BL_SITE;return(site.languages.find(l=>l.id===language)||site.languages[0]).text;};
  const t=key=>words()[key]||window.BL_SITE.languages[0].text[key]||key;
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const number=(value,change)=>typeof value==='number'&&Number.isFinite(value)?(change&&value>0?'+':'')+value+'%':'—';
  const paint=(n,value)=>{if(typeof value==='number')n.classList.add(value>0?'mc-up':value<0?'mc-down':'mc-flat');};
  const button=(text,action,cls)=>{const n=node('button',cls,text);n.type='button';n.addEventListener('click',action);return n;};
  function accordion(id,key){const d=node('details','mc-disclosure');d.id=id;const title=node('summary','',t(key));title.dataset.mcLabel=key;d.append(title);return d;}
  function interpret(c){if(!c||!Number.isFinite(c.uv_change_pct)||!Number.isFinite(c.vol_change_pct))return t('biUnavailable');if(c.vol_change_pct>0&&c.uv_change_pct<0)return t('biReadGrowth');if(c.vol_change_pct<0&&c.uv_change_pct>0)return t('biReadDemand');return t('biReadNeutral');}
  function setup(){
    document.body.classList.add('mc-reading');
    const desk=document.getElementById('deskView');
    root=node('section','mc-main');root.id='mc-reading';desk.prepend(root);
    const intro=node('div','mc-intro');intro.append(node('h1','',t('mcTitle')),node('p','',t('mcSubtitle')));root.append(intro);
    selectors=node('div','mc-controls');root.append(selectors);
    const heading=node('h2','mc-selection');heading.id='mc-selection';root.append(heading);
    metrics=node('div','mc-metrics');root.append(metrics);meaning=node('p','mc-meaning');root.append(meaning);
    table=node('section','mc-comparison');root.append(table);
    root.append(node('p','mc-caveat',t('biDataNote')));
    const lower=node('div','mc-lower'),edition=node('div','mc-edition-preview');
    edition.append(node('span','mc-kicker',t('mcEdition')),node('h3','',t('mcReadContext')),node('p','',t('mcContextCopy')),button(t('mcOpenEdition')+' →',()=>api.actions.view('brief')));
    const extras=node('div','mc-extras');more=accordion('mc-other','mcOther');sheet=accordion('mc-sheet','mcSheet');source=accordion('mc-source','biSources');since=accordion('mc-since','biSince');extras.append(more,sheet,source,since);lower.append(edition,extras);root.append(lower);
    more.append(document.querySelector('#deskView>.bar2'),document.querySelector('#deskView>.body'));
    sheet.append(document.getElementById('sheetChip'),document.getElementById('sheetTray'));
    since.append(document.getElementById('sinceWrap'));
    const foot=document.querySelector('#deskView>.foot');source.append(node('p','mc-source-info'),foot);
    const actions=node('div','mc-actions'),plan=node('a','mc-primary',t('srOpenPlan')+' →');plan.href='buying-tools.html#landed-cost';plan.addEventListener('click',()=>{try{localStorage.setItem('bd_bc_co',api.anchor);}catch(_){}if(window.BL_FOCUS){const category={'820150':'pruners','820160':'hedge','820110':'hand-tools','820130':'hoes','820210':'saws'}[api.selected];window.BL_FOCUS.set({market:api.anchor,...(category?{category}:{})});}});
    actions.append(plan,button(t('mcCopy'),async event=>{const control=event.currentTarget,text=copyText();try{await navigator.clipboard.writeText(text);control.textContent=t('mcCopied');}catch(_){const fallback=node('textarea','mc-copy-fallback');fallback.value=text;fallback.setAttribute('aria-label',t('mcCopy'));actions.append(fallback);fallback.focus();fallback.select();}}));root.append(actions);
    period=node('div','mc-period');document.querySelector('.mm-head').append(period);
    document.getElementById('vDesk').replaceChildren(document.createTextNode(t('mcCompare')));document.getElementById('vBrief').replaceChildren(document.createTextNode(t('mcEdition')));
    document.getElementById('briefPick').addEventListener('click',()=>{more.open=true;});
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&document.getElementById('vDesk').getAttribute('aria-pressed')==='true'){more.open=true;document.getElementById('dq').focus();}});
    if(new URLSearchParams(location.search).get('sheet')==='1')sheet.open=true;
    // App header keeps the original icons; auxiliary controls remain available.
    const compactHeader=()=>{const bar=document.getElementById('app-bar');if(!bar)return;const aux=document.querySelector('.mc-header-extras')||node('details','mc-header-extras');if(!aux.parentNode){aux.append(node('summary','',t('mcOptions')));source.append(aux);}['.bl-textsize','.ab-verwrap','.ab-status','.ab-chips'].forEach(selector=>{const item=bar.querySelector(selector);if(item&&!aux.contains(item))aux.append(item);});};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',compactHeader,{once:true});else compactHeader();window.addEventListener('load',compactHeader,{once:true});
  }
  function observations(c){return api.valid(c)&&Number.isFinite(c.uv_change_pct)&&Number.isFinite(c.vol_change_pct)&&['piece','kg'].includes(c.basis);}
  function comparable(k){const base=api.markets[api.anchor]?.cells[api.selected],c=api.markets[k]?.cells[api.selected];const reference=observations(base)?base:[...comparisons,...(api.neighbors||[]),...Object.keys(api.markets)].map(iso=>api.markets[iso]?.cells[api.selected]).find(observations);return k!==api.anchor&&observations(c)&&c.basis===reference?.basis;}
  function pickComparisons(){const eligible=Object.keys(api.markets).filter(comparable);comparisons=comparisons.map(k=>eligible.includes(k)?k:'');if(!comparisonsConfigured){comparisons=[];for(const k of [...(api.neighbors||[]),...eligible])if(comparisons.length<2&&eligible.includes(k)&&!comparisons.includes(k))comparisons.push(k);}try{localStorage.setItem('bl_mm_compare',JSON.stringify(comparisons));}catch(_){}return comparisons;}
  function select(label,id,entries,value,action){const wrap=node('label','mc-field');wrap.append(node('span','',label));const input=node('select');input.id=id;for(const [key,text] of entries){const option=node('option','',text);option.value=key;input.append(option);}input.value=value||'';input.addEventListener('change',()=>action(input.value));wrap.append(input);return wrap;}
  function renderControls(){
    const focused=selectors.contains(document.activeElement)?document.activeElement.id:null;
    selectors.replaceChildren();selectors.append(select(t('biCategory'),'mc-category',api.families.map(f=>[f,api.label(f)+' · '+t(Object.values(api.markets).some(m=>observations(m.cells[f]))?'fxDataAvailable':'fxDataMissing')]),api.selected,value=>api.actions.category(value)));
    const marketField=select(t('biYourMarket'),'mc-market',[],api.anchor,value=>{try{localStorage.setItem('bl_market_choice',value);}catch(e){}api.actions.market(value);}),marketInput=marketField.querySelector('select');
    [true,false].forEach(available=>{const group=node('optgroup');group.label=t(available?'fxDataAvailable':'fxDataMissing');Object.entries(api.markets).filter(([,m])=>observations(m.cells[api.selected])===available).sort((a,b)=>a[1].name.localeCompare(b[1].name)).forEach(([k,m])=>{const option=node('option','',m.name+(available?'':' · '+t('fxDataMissing')));option.value=k;option.dataset.available=String(available);group.append(option);});if(group.children.length)marketInput.append(group);});marketInput.value=api.anchor;selectors.append(marketField);let own='';try{own=localStorage.getItem('bl_market_choice')||'';}catch(e){}if(own!==api.anchor)marketField.append(node('small','mc-availability-note',t('brInitial')));
    const group=node('fieldset','mc-peers');group.append(node('legend','',t('biCompareWith')));
    const choices=Object.keys(api.markets).filter(comparable).sort((a,b)=>api.markets[a].name.localeCompare(api.markets[b].name));
    [0,1].forEach(index=>{const input=select(t('biCompareWith')+' '+(index+1),'mc-peer-'+index,[[ '',t('biNone')],...choices.filter(k=>k!==comparisons[1-index]).map(k=>[k,api.markets[k].name])],comparisons[index],value=>{comparisons[index]=value;comparisonsConfigured=true;try{localStorage.setItem('bl_mm_compare',JSON.stringify(comparisons));}catch(_){}render(api,false);});group.append(input);});selectors.append(group,node('p','mc-availability-note',t('fxMarketsNote')));
    if(focused)document.getElementById(focused)?.focus({preventScroll:true});
  }
  function metric(label,value,detail,key){const n=node('div','mc-metric');n.append(node('h3','',label));const figure=node('strong','',number(value,true));figure.dataset.metric=key;paint(figure,value);n.append(figure);if(detail)n.append(node('small','',detail));metrics.append(n);}
  function periods(){const p=api.trade.periods;return p&&p.current!=null&&p.previous!=null?t('biPeriod')+': '+p.current+' / '+p.previous+' · '+(p.frequency==='annual'?t('mcAnnual'):p.frequency||t('biUnavailable')):t('biPeriodUnknown');}
  function render(state,auto=true){
    api=state;if(!root)setup();if(auto)pickComparisons();renderControls();
    const m=api.markets[api.anchor],c=m?.cells[api.selected],valid=observations(c);
    document.getElementById('mc-selection').textContent=(m?.name||'')+' · '+api.label(api.selected);
    metrics.replaceChildren();metric(t('biVolume'),valid?c.vol_change_pct:null,'','volume');metric(t('biUnitValue'),valid?c.uv_change_pct:null,t('mcNotQuote'),'unit');
    const origins=node('div','mc-metric');origins.append(node('h3','',t('mcOrigin')),node('strong','mc-origins',valid?'Taiwan '+number(c.share_tw)+' · China '+number(c.share_cn):'—'));
    if(valid){const delta=(current,previous)=>Number.isFinite(current)&&Number.isFinite(previous)?(current-previous>0?'+':'')+(current-previous)+' pp':'—';origins.append(node('small','',delta(c.share_tw,c.share_tw_prev)+' / '+delta(c.share_cn,c.share_cn_prev)));}metrics.append(origins);
    meaning.textContent=valid?interpret(c):t('biUnavailable');
    const markets=[api.anchor,...comparisons].filter(k=>api.markets[k]);table.replaceChildren(node('h2','',t('mcTable')));
    if(!Object.keys(api.markets).length){table.append(node('p','mc-empty',t('biUnavailable')));}else{
      const grid=node('table','mc-table'),caption=node('caption','',api.label(api.selected)+' · '+periods());grid.append(caption);const head=node('thead'),row=node('tr');row.append(node('th','',t('mcMetric')));
      markets.forEach((k,index)=>{const th=node('th',index===0?'mc-own':'');th.scope='col';th.append(node('span','mc-country',api.markets[k].name),node('abbr','mc-country-short',k.toUpperCase()));th.querySelector('abbr').title=api.markets[k].name;if(index===0)th.append(node('small','',t('biYourMarket')));row.append(th);});head.append(row);grid.append(head);
      const body=node('tbody');[['biVolume','vol_change_pct',true],['biUnitValue','uv_change_pct',true],['biTWShare','share_tw',false],['biCNShare','share_cn',false]].forEach(([key,field,change])=>{const r=node('tr'),h=node('th','',t(key));h.scope='row';r.append(h);markets.forEach((k,index)=>{const value=api.markets[k].cells[api.selected],present=observations(value)&&(!valid||value.basis===c.basis),td=node('td',index===0?'mc-own':'',number(present?value[field]:null,change));if(change&&present)paint(td,value[field]);r.append(td);});body.append(r);});grid.append(body);table.append(grid);if(markets.length===1)table.append(node('p','mc-empty',t('fxNoComparisons')));
    }
    period.textContent=periods();source.querySelector('.mc-source-info').textContent=periods()+'\n'+t('biBasis')+': '+(valid?(c.basis==='piece'?t('biPiece'):c.basis==='kg'?t('biKg'):t('biUnavailable')):t('biUnavailable'))+'\n'+[...new Set(markets.map(k=>api.markets[k].src==='eurostat'?api.trade.sources?.eu:api.trade.sources?.world).filter(Boolean))].join(' · ')+'\n'+t('biDataNote');
    document.getElementById('edLine').textContent=t('mcEditionLabel')+': '+(api.trade.edition||'—');
    const volume=document.getElementById('briefVol');volume.textContent=periods()+' · '+t('mcEditionLabel')+': '+(api.trade.edition||'—');
    document.body.dataset.marketReadingReady='true';
  }
  function copyText(){const lines=['Market Compare',api.label(api.selected),periods()];for(const k of [api.anchor,...comparisons]){const m=api.markets[k],c=m?.cells[api.selected];if(!m)continue;lines.push(m.name+': '+(observations(c)?t('biVolume')+' '+number(c.vol_change_pct,true)+'; '+t('biUnitValue')+' '+number(c.uv_change_pct,true)+'; Taiwan '+number(c.share_tw)+'; China '+number(c.share_cn):t('biUnavailable')));}lines.push(t('mcNotQuote'));return lines.join('\n');}
  window.BLMarketReading={render,interpret,openSheet(){if(sheet)sheet.open=true;},openMore(){if(more)more.open=true;}};
})();
