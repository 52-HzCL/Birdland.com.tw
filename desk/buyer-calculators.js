(function(){/* buyer tools: My orders, Price alerts, Retail margin, Reorder timing, Seasonal windows */
var D={};try{D=JSON.parse(document.getElementById('outlook-data').textContent)||{};}catch(e){}
var $=function(id){return document.getElementById(id);};
function LSget(k,d){try{var v=localStorage.getItem('bd_p_'+k);return v?JSON.parse(v):d;}catch(e){return d;}}
function LSset(k,v){try{localStorage.setItem('bd_p_'+k,JSON.stringify(v));}catch(e){}}
function esc(x){return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function money(n){return 'US$'+Number(n).toLocaleString(undefined,{maximumFractionDigits:2});}
function addWeeks(d,w){var x=new Date(d.getTime());x.setDate(x.getDate()+Math.round(w*7));return x;}
function fmtDate(d){return d.toISOString().slice(0,10);}
var TODAY=new Date();
function mailtoDraft(to,subject,body){var href='mailto:'+encodeURIComponent(to||'')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);window.location.href=href;}
function copyText(text,btn){function done(ok){if(!btn)return;var old=btn.textContent;btn.textContent=ok?'Copied ✓':'Copy failed';setTimeout(function(){btn.textContent=old;},1600);}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){done(true);},function(){done(false);});}
 else{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done(true);}catch(e){done(false);}document.body.removeChild(ta);}}

/* ---- 1b) Supply Brief + return state ---- */
(function(){
 var brief=$('sb-text'),briefStatus=$('sb-status'),briefMeta=$('sb-meta'),mailInput=$('sb_email');
 var rvStatus=$('rv-status'),rvText=$('rv-text'),rvSignals=$('rv-signals');
 var roomSel=$('room'),regionSel=$('region');
 if(!brief||!briefStatus||!roomSel||!regionSel)return;
 function labelOf(sel){return sel&&sel.options&&sel.selectedIndex>=0?(sel.options[sel.selectedIndex].textContent||'').trim():'';}
 function workflowLine(){var wf=((D.status||{}).workflow)||{},state=((wf.state||'')+'').toLowerCase();if(state==='ok'||state==='current')return 'Workflow completed · '+(wf.run_at||D.updated||'—');if(state==='warning'||state==='delayed')return 'Workflow completed with partial data · '+(wf.run_at||D.updated||'—');return 'Workflow status unavailable · '+(wf.run_at||D.updated||'—');}
 function buildBrief(){
   var roomLabel=labelOf(roomSel)||'Global',regionCode=regionSel.value||'global',regionLabel=labelOf(regionSel)||'Global';
   var region=(D.regions&&D.regions[regionCode])||(D.regions&&D.regions.global)||{};
   var lines=['Supply Brief · '+roomLabel+' / '+regionLabel];
   if(region.summary&&region.summary.changed)lines.push('Changed: '+region.summary.changed);
   if(region.summary&&region.summary.action)lines.push('Action: '+region.summary.action);
   var proc=((D.procurement&&D.procurement.items)||[]).slice(0,2).map(function(x){return (x.input?x.input+': ':'')+(x.action||'');});
   if(proc.length)lines.push('Queue: '+proc.join(' · '));
   var td=((D.teamdesk||{}).advice||{}).en;
   if(roomSel.value==='asia'&&td)lines.push(td.replace(/^\[Birdland Supply-Chain Brief\]\s*/,''));
   var watch=(D.market_news||[]).slice(0,2).map(function(n){return n.title;});
   if(watch.length)lines.push('Watch: '+watch.join(' / '));
   lines.push(workflowLine());
   return lines.join('\n\n');
 }
 function currentSnapshot(){return {
   updated:D.updated||'',
   room:roomSel.value||'global',
   roomLabel:labelOf(roomSel)||'Global',
   region:regionSel.value||'global',
   regionLabel:labelOf(regionSel)||'Global',
   seenAt:(new Date()).toISOString(),
   actions:((D.procurement&&D.procurement.items)||[]).slice(0,3).map(function(x){return (x.input?x.input+': ':'')+(x.action||'');}),
   news:(D.market_news||[]).slice(0,6).map(function(x){return x.title;})
 };}
 function renderReturn(){
   if(!rvStatus||!rvText||!rvSignals)return;
   var snap=LSget('return_snapshot',null),signals=[];
   if(!snap){
     rvStatus.textContent='First visit on this browser';
     rvText.textContent='Save a checkpoint after you read the brief and this desk will call out new workflow runs, action-queue changes and headlines next time.';
     rvSignals.innerHTML='';
     return;
   }
   var seen=snap.seenAt?new Date(snap.seenAt):null;
   rvStatus.textContent='Last checked '+(seen&&isFinite(seen)?seen.toLocaleString():'earlier on this browser');
   if((snap.updated||'')===(D.updated||'')){
     rvText.textContent='No new workflow completion since your last check-in. Your saved room is still '+(snap.roomLabel||snap.room||'Global')+' / '+(snap.regionLabel||snap.region||'Global')+'.';
   }else{
     rvText.textContent='The desk has new data since your last visit. Start with the room summary, then review the updated queue and headlines below.';
   }
   var latestActions=((D.procurement&&D.procurement.items)||[]).slice(0,3).map(function(x){return (x.input?x.input+': ':'')+(x.action||'');});
   var newActions=latestActions.filter(function(x){return (snap.actions||[]).indexOf(x)<0;});
   if(newActions.length)signals.push({title:'Action queue',body:newActions.slice(0,2).join(' · ')});
   var latestNews=(D.market_news||[]).slice(0,6).map(function(x){return x.title;});
   var newNews=latestNews.filter(function(x){return (snap.news||[]).indexOf(x)<0;});
   if(newNews.length)signals.push({title:'New headlines',body:newNews.slice(0,2).join(' / ')});
   signals.push({title:'Saved room',body:(snap.roomLabel||snap.room||'Global')+' / '+(snap.regionLabel||snap.region||'Global')});
   rvSignals.innerHTML=signals.slice(0,3).map(function(item){return '<div class="brief-signal"><b>'+esc(item.title)+'</b><span>'+esc(item.body)+'</span></div>';}).join('');
 }
 function renderBrief(){
   brief.textContent=buildBrief();
   briefStatus.textContent=workflowLine();
   if(briefMeta)briefMeta.textContent=(labelOf(roomSel)||'Global')+' · '+(D.updated||'—');
   renderReturn();
 }
 var copyBtn=$('sb_copy'),mailBtn=$('sb_mail'),markBtn=$('rv_mark'),resumeBtn=$('rv_resume');
 if(copyBtn)copyBtn.addEventListener('click',function(){copyText(buildBrief(),copyBtn);});
 if(mailBtn)mailBtn.addEventListener('click',function(){
   var roomLabel=labelOf(roomSel)||'Global';
   var to=(mailInput&&mailInput.value.trim())||'';
   mailtoDraft(to,"This week's Supply Brief — "+roomLabel,buildBrief());
 });
 if(markBtn)markBtn.addEventListener('click',function(){LSset('return_snapshot',currentSnapshot());renderReturn();});
 if(resumeBtn)resumeBtn.addEventListener('click',function(){var a=document.querySelector('.toc > a[href="#p-mkt"]');if(a)a.click();});
 roomSel.addEventListener('change',renderBrief);
 regionSel.addEventListener('change',renderBrief);
 renderBrief();
})();

/* ---- 2) Share with a colleague ---- */
(function(){var list=$('shr_list'),preview=$('shr_preview');if(!list)return;
 function rc(arr){if(!arr||arr.length<2)return null;var a=arr[arr.length-2],b=arr[arr.length-1],i=arr.length-2;while(i>0&&a===b){i--;a=arr[i];}if(!a)return null;return (b-a)/Math.abs(a)*100;}
 var ITEMS=[];
 (D.indices||[]).forEach(function(ix){var c=rc(ix.spark);ITEMS.push({grp:'Indices',id:'ix:'+ix.short,label:(ix.short||ix.label),detail:Number(ix.value).toLocaleString()+(ix.unit?' '+ix.unit:'')+(c!=null?' ('+(c>0?'+':'')+c.toFixed(1)+'%)':'')});});
 (D.macro||[]).forEach(function(m){var c=rc(m.spark);ITEMS.push({grp:'Macro & FX',id:'mc:'+m.short,label:m.label+' ('+m.short+')',detail:Number(m.value).toLocaleString()+(m.unit?' '+m.unit:'')+(c!=null?' ('+(c>0?'+':'')+c.toFixed(1)+'%)':'')});});
 var P2=D.partner||{};
 ((P2.material&&P2.material.series)||[]).forEach(function(s){var pts=(s.points||[]).map(function(p){return typeof p==='object'?p.v:p;});var c=rc(pts);var last=pts.length?pts[pts.length-1]:null;
   ITEMS.push({grp:'Raw materials',id:'mt:'+s.name,label:s.name,detail:(last!=null?'index '+Number(last).toFixed(1):'')+(c!=null?' ('+(c>0?'+':'')+c.toFixed(1)+'%)':'')});});
 (D.news||[]).slice(0,6).forEach(function(n,i){ITEMS.push({grp:'News',id:'nw:'+i,label:n.title,detail:n.date});});
 var byGroup={};ITEMS.forEach(function(it){(byGroup[it.grp]=byGroup[it.grp]||[]).push(it);});
 var GROUP_ORDER=['Indices','Macro & FX','Raw materials','News'];
 list.innerHTML=GROUP_ORDER.filter(function(g){return byGroup[g];}).map(function(g){
   return '<div class="shr-grp">'+g+'</div>'+byGroup[g].map(function(it){
     return '<label class="shr-row"><input type="checkbox" class="shr-cb" data-id="'+it.id+'"><span class="shr-t">'+esc(it.label)+'</span><span class="shr-d">'+esc(it.detail)+'</span></label>';
   }).join('');
 }).join('');
 var checks=[].slice.call(list.querySelectorAll('.shr-cb'));
 function selected(){return ITEMS.filter(function(it){var cb=checks.filter(function(c){return c.getAttribute('data-id')===it.id;})[0];return cb&&cb.checked;});}
 function clause(it){
   if(it.grp==='News')return it.label+(it.detail?' ('+it.detail+')':'')+'.';
   return it.label+' is currently '+it.detail+'.';
 }
 function buildText(){var sel=selected();
   var lines=['BIRDLAND PARTNER DESK — Shared update','Data as of: '+(D.updated||'—')+' · sent '+(new Date()).toISOString().slice(0,16).replace('T',' ')+' UTC',''];
   if(!sel.length){lines.push('No items selected yet — tick a few above to put together a quick note for a colleague.');}
   else{
     var byG={};sel.forEach(function(it){(byG[it.grp]=byG[it.grp]||[]).push(it);});
     Object.keys(byG).forEach(function(g){
       lines.push(g+': '+byG[g].map(clause).join(' '));lines.push('');
     });
   }
   lines.push('Indicative planning data — not trade or legal advice.');
   return lines.join('\n');
 }
 function refresh(){if(preview)preview.textContent=buildText();try{LSset('shr_sel',selected().map(function(it){return it.id;}));}catch(e){}}
 checks.forEach(function(cb){cb.addEventListener('change',refresh);});
 var saved=LSget('shr_sel',[]);checks.forEach(function(cb){if(saved.indexOf(cb.getAttribute('data-id'))>=0)cb.checked=true;});
 var all=$('shr_all'),none=$('shr_none');
 if(all)all.addEventListener('click',function(){checks.forEach(function(c){c.checked=true;});refresh();});
 if(none)none.addEventListener('click',function(){checks.forEach(function(c){c.checked=false;});refresh();});
 var copy=$('shr_copy'),mail=$('shr_mail');
 if(copy)copy.addEventListener('click',function(){copyText(buildText(),copy);});
 if(mail)mail.addEventListener('click',function(){mailtoDraft($('shr_email').value.trim(),'Birdland AsiaSource — shared update',buildText());});
 refresh();
})();

/* ---- 3) Retail margin planner ---- */
(function(){var ids=['mg_cost','mg_margin','mg_fx','mg_qty'],out=$('mg_out');if(!out)return;
 function calc(){var cost=+$('mg_cost').value||0,mg=Math.min(95,Math.max(0,+$('mg_margin').value||0)),fx=+$('mg_fx').value||1,qty=+$('mg_qty').value||0;
   var retail=cost/(1-mg/100),gpU=retail-cost,markup=cost>0?gpU/cost*100:0,orderGP=gpU*qty;
   out.innerHTML=''+
     '<div class="calc-row"><span class="lab">Landed cost / unit</span><span class="val">'+money(cost*fx)+'</span></div>'+
     '<div class="calc-row"><span class="lab">Suggested retail / unit</span><span class="val mg-retail">'+money(retail*fx)+'</span></div>'+
     '<div class="calc-row"><span class="lab">Markup on cost</span><span class="val">'+markup.toFixed(0)+'%</span></div>'+
     '<div class="calc-row"><span class="lab">Gross profit / unit</span><span class="val">'+money(gpU*fx)+'</span></div>'+
     '<div class="calc-row tot"><span class="lab">Gross profit / order</span><span class="val mg-gp">'+money(orderGP*fx)+'</span></div>';
 }
 ids.forEach(function(id){var e=$(id);if(e)e.addEventListener('input',calc);});calc();
})();

/* ---- 4) Reorder timing ---- */
(function(){var ids=['ro_stock','ro_rate','ro_lead','ro_transit','ro_safety'],out=$('ro_out');if(!out)return;
 function calc(){var stock=+$('ro_stock').value||0,rate=+$('ro_rate').value||0,lead=+$('ro_lead').value||0,transit=+$('ro_transit').value||0,safety=+$('ro_safety').value||0;
   var cover=rate>0?stock/rate:999, pipeline=lead+transit, reorderInWk=cover-(pipeline+safety);
   var stockoutDate=addWeeks(TODAY,cover), reorderDate=addWeeks(TODAY,Math.max(0,reorderInWk));
   var qty=Math.round(rate*(pipeline+safety+12)); // land + 12 weeks cover
   var due=reorderInWk<=0;
   out.innerHTML=''+
     '<div class="calc-row"><span class="lab">Weeks of cover left</span><span class="val">'+cover.toFixed(1)+' wk</span></div>'+
     '<div class="calc-row"><span class="lab">Order-to-shelf pipeline</span><span class="val">'+pipeline+' wk (+'+safety+' safety)</span></div>'+
     '<div class="calc-row '+(due?'':'')+'"><span class="lab">Reorder by</span><span class="val ro-when" style="color:'+(due?'var(--kb-red)':'var(--kb-ink)')+'">'+(due?'Order now':fmtDate(reorderDate))+'</span></div>'+
     '<div class="calc-row"><span class="lab">Projected stock-out</span><span class="val">'+fmtDate(stockoutDate)+'</span></div>'+
     '<div class="calc-row tot"><span class="lab">Suggested order qty</span><span class="val ro-qty">'+qty.toLocaleString()+' pcs</span></div>';
 }
 ids.forEach(function(id){var e=$(id);if(e)e.addEventListener('input',calc);});calc();
})();
})();