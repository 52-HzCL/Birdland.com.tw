(function(){
 var $=function(i){return document.getElementById(i);};
 function n(i){return parseFloat(($(i)||{}).value)||0;}
 function money(x){return 'US$'+Math.round(x).toLocaleString();}
 // ===== Buyer landed cost (after our FOB) =====
 var CO={us:['USA',0,0,'','fob','US customs value = FOB; no VAT. Instead MPF 0.3464% (US$33.58–651.50, FY2026) + HMF 0.125%. Rates vary by HS/FTA — verify with customs.'],
  de:['Germany',1.7,19,'VAT','cif','EU customs value = CIF; VAT on CIF + duty. Hand-tool duty ~0–2.7% by HS — verify with customs.'],
  nl:['Netherlands',1.7,21,'VAT','cif','EU customs value = CIF; VAT on CIF + duty.'],
  it:['Italy',1.7,22,'VAT','cif','EU customs value = CIF; VAT on CIF + duty.'],
  fr:['France',1.7,20,'VAT','cif','EU customs value = CIF; VAT on CIF + duty.'],
  es:['Spain',1.7,21,'VAT','cif','EU customs value = CIF; VAT on CIF + duty.'],
  pl:['Poland',1.7,23,'VAT','cif','EU customs value = CIF; VAT on CIF + duty.'],
  uk:['United Kingdom',0,20,'VAT','cif','UK customs value = CIF; VAT on CIF + duty.'],
  au:['Australia',5,10,'GST','cif','GST on CIF + duty; often reduced under FTA — verify with customs.'],
  nz:['New Zealand',0,15,'GST','cif','GST on CIF + duty.'],
  jp:['Japan',0,10,'Consumption tax','cif','Consumption tax on CIF + duty.']};
 function syncDest(iso){try{if(window.blCtx){var m=window.blCtx.marketOf(iso);if(m){window.blCtx.set({market:m});return;}}localStorage.setItem('bd_bc_co',iso);}catch(e){}}
 var sel=$('bc_co');if(sel){Object.keys(CO).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=CO[k][0];sel.appendChild(o);});
  // The "Cost it" link from the demand shelf can name a market this table
  // has no duty rate for — the shelf covers the full mechanical roster
  // (~133 markets), this table covers the 11 the calculator has rates for.
  // The destination still carries across as a named option, but duty/VAT
  // are left blank rather than guessed, with a note pointing at the desk
  // instead of a wrong number presented as a right one.
  var qsDest=null,qsName=null;
  try{var qs=new URLSearchParams(location.search);qsDest=qs.get('dest');qsName=qs.get('destName');}catch(e){}
  if(qsDest&&!CO[qsDest]){
   CO._other_=[qsName||qsDest,'','','','cif','Duty for this market: ask the desk'];
   var oo=document.createElement('option');oo.value='_other_';oo.textContent=qsName||qsDest;
   sel.insertBefore(oo,sel.firstChild);
   sel.value='_other_';sel.dataset.otherIso=qsDest;
   syncDest(qsDest);
  }else{
   // The desk already asked which market this buyer sells into, so the
   // destination comes from that answer rather than from a second question.
   var _sv=null;try{_sv=(window.blCtx&&window.blCtx.destCountry())||localStorage.getItem('bd_bc_co');}catch(e){}
   sel.value=(qsDest&&CO[qsDest])?qsDest:((_sv&&CO[_sv])?_sv:'de');
   if(qsDest&&CO[qsDest])syncDest(qsDest);
  }}
 function applyCo(){var c=CO[sel.value];$('bc_duty').value=c[1];$('bc_tax').value=c[2];$('bc_taxL').textContent=(c[3]||'Import tax')+' %';$('bc_note').textContent=c[5];}
 function landed(){if(!sel)return;var c=CO[sel.value],fob=n('bc_fob'),qty=n('bc_qty'),frt=n('bc_frt'),insR=n('bc_ins')/100,duty=n('bc_duty')/100,tax=n('bc_tax')/100;
   var ins=(fob+frt)*insR,cif=fob+frt+ins,custVal=c[4]==='fob'?fob:cif,dutyAmt=custVal*duty,taxAmt;
   if(sel.value==='us'){var mpf=Math.min(651.50,Math.max(33.58,fob*0.003464)),hmf=fob*0.00125;taxAmt=mpf+hmf;}else{taxAmt=(cif+dutyAmt)*tax;}
   var fees=n('bc_brk')+n('bc_inl')+n('bc_oth');
   var total=fob+frt+ins+dutyAmt+taxAmt+fees,per=qty>0?total/qty:0,up=fob>0?(total-fob)/fob*100:0;
   var segs=[['FOB value',fob,'#0E6652'],['Freight',frt,'#B95B12'],['Insurance',ins,'#A6372D'],['Duty',dutyAmt,'#B95B12'],[(c[3]||'Import tax'),taxAmt,'#1F6B49'],['Fees',fees,'#858B88']];
   var bh='';segs.forEach(function(x){var w=total>0?x[1]/total*100:0;if(w>0)bh+='<i style="width:'+w+'%;background:'+x[2]+'">'+(w>9?x[0]:'')+'</i>';});$('bc_bar').innerHTML=bh;
   $('bc_leg').innerHTML=segs.map(function(x){return '<span><i style="background:'+x[2]+'"></i>'+x[0]+' '+money(x[1])+'</span>';}).join('');
   $('bc_total').textContent=money(total);$('bc_unit').textContent=qty>0?'US$'+per.toFixed(3):'—';$('bc_uplift').textContent='+'+up.toFixed(1)+'% vs FOB';
   $('bc_out').innerHTML='<div class="bcrow"><span>CIF value</span><b>'+money(cif)+'</b></div>'+
     '<div class="bcrow"><span>Customs value ('+(c[4]==='fob'?'FOB':'CIF')+' basis)</span><b>'+money(custVal)+'</b></div>'+
     '<div class="bcrow"><span>Duty ('+(duty*100).toFixed(1)+'%)</span><b>'+money(dutyAmt)+'</b></div>'+
     '<div class="bcrow"><span>'+(sel.value==='us'?'MPF + HMF':(c[3]||'Import tax')+' ('+(tax*100).toFixed(1)+'%)')+'</span><b>'+money(taxAmt)+'</b></div>'+
     '<div class="bcrow"><span>Brokerage + inland + other</span><b>'+money(fees)+'</b></div>'+
     '<div class="bcrow tot"><span>Total landed cost</span><b>'+money(total)+'</b></div>'+
     '<div class="bcrow"><span>Landed cost / unit</span><b>'+(qty>0?'US$'+per.toFixed(3):'—')+'</b></div>'+
     '<div class="bcrow"><span>Uplift vs FOB</span><b>+'+up.toFixed(1)+'%</b></div>';
   // Retail card: same shipment, priced at the buyer's target margin.
   var mgEl=$('ws_retail');
   if(mgEl){var mgP=Math.min(95,Math.max(0,n('ws_mg'))),retail=per>0?per/(1-mgP/100):0,gpU=retail-per,orderGP=gpU*qty;
     mgEl.textContent=per>0?'US$'+retail.toFixed(2):'—';
     $('ws_gp').textContent=per>0?money(orderGP):'—';
     $('ws_mgnote').textContent='at '+mgP.toFixed(0)+'% margin';
     window.__wsMg={retail:retail,gp:orderGP};
     $('ws_mg_out').innerHTML='<div class="bcrow"><span>Landed cost / unit</span><b>US$'+per.toFixed(3)+'</b></div>'+
       '<div class="bcrow"><span>Markup on cost</span><b>'+(per>0?(gpU/per*100).toFixed(0):'0')+'%</b></div>'+
       '<div class="bcrow"><span>Gross profit / unit</span><b>US$'+gpU.toFixed(2)+'</b></div>'+
       '<div class="bcrow tot"><span>Gross profit / order ('+qty.toLocaleString()+' pcs)</span><b>'+money(orderGP)+'</b></div>';}
   window.__ws={per:per,total:total,qty:qty};
   try{document.dispatchEvent(new CustomEvent('ws:landed'));}catch(e){}}
 ['bc_fob','bc_qty','bc_frt','bc_ins','bc_duty','bc_tax','bc_brk','bc_inl','bc_oth','ws_mg'].forEach(function(i){var e=$(i);if(e)e.addEventListener('input',landed);});
 if(sel){
  sel.addEventListener('change',function(){
    applyCo();landed();
    // Changing the destination here is the buyer telling us their market, so
    // it flows back through the same shared memory the demand shelf reads —
    // but only when the country names a market the desk covers. Japan and
    // New Zealand have no desk market; silently moving the whole desk to
    // somewhere else would be worse than leaving it alone.
    if(sel.value!=='_other_')delete sel.dataset.otherIso;
    syncDest(sel.value==='_other_'?sel.dataset.otherIso:sel.value);
  });
  if(window.blCtx)window.blCtx.on(function(st){var d=window.blCtx.destCountry();if(d&&CO[d]&&sel.value!==d){sel.value=d;applyCo();landed();}});
  applyCo();landed();}
 // ===== Sailing simulator =====
 var OPORT=[['Kaohsiung',0],['Taichung',1],['Keelung',1],['Shanghai',0],['Ningbo',0],['Shenzhen',0],['Xiamen',0]];
 var DPORT={'Rotterdam':['NEU',32,3200],'Hamburg':['NEU',33,3200],'Bremerhaven':['NEU',33,3150],'Felixstowe':['NEU',31,3100],'Southampton':['NEU',32,3100],'Genoa':['MED',26,2900],'La Spezia':['MED',26,2900],'Los Angeles/Long Beach':['USWC',16,2600],'New York':['USEC',30,4200],'Sydney':['AU',18,2400],'Melbourne':['AU',19,2400],'Brisbane':['AU',18,2350],'Auckland':['NZ',22,2700],'Lyttelton':['NZ',24,2750],'Tokyo':['JP',4,700],'Osaka':['JP',5,720],'Sohar (Oman)':['ME',20,2200]};
 var so=$('s_o'),sd=$('s_d'),etd=$('s_etd'),sct=$('s_ct');
 if(so&&sd){OPORT.forEach(function(pp,i){var o=document.createElement('option');o.value=i;o.textContent=pp[0];so.appendChild(o);});
  Object.keys(DPORT).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k;sd.appendChild(o);});sd.value='Rotterdam';
  etd.value=new Date(Date.now()+10*864e5).toISOString().slice(0,10);}
 function fmt(d){return d.getFullYear()+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+('0'+d.getDate()).slice(-2);}
 function hashN(x){var h=0;for(var i=0;i<x.length;i++)h=(h*31+x.charCodeAt(i))>>>0;return h;}
 function sail(){if(!so||!sd)return;var op=OPORT[+so.value],d=DPORT[sd.value],ctv=sct.value;
   var ctMult=ctv==='20'?0.65:(ctv==='40h'?1.02:1),ctName=ctv==='20'?"20'GP":(ctv==='40h'?"40'HC":"40'GP");
   var etdD=etd.value?new Date(etd.value):new Date(),mo=etdD.getMonth()+1,peak=(mo>=8&&mo<=10),peakMult=peak?1.15:1,peakDays=peak?[3,8]:[1,4];
   var base=hashN(op[0]+'>'+sd.value+mo);
   var OPT=[['Direct (express)',0,1.2,18],['Standard (1 transship)',6,1.0,4],['Eco (slow)',3,0.78,-8]];
   var cards=OPT.map(function(O){var days=d[1]+op[1]+O[1],eta=new Date(etdD.getTime()+days*864e5),late=new Date(eta.getTime()+peakDays[1]*864e5);
     var frt=Math.round(d[2]*ctMult*O[2]*peakMult/10)*10,util=Math.min(96,Math.max(40,60+(base%18)+O[3]+(peak?14:0)));
     var fb=util>80?['fb-tight','🔴 Tight']:(util>=56?['fb-norm','🟡 Normal']:['fb-loose','🟢 Open']);
     return '<div class="sailcard"><h4>'+O[0]+'</h4><div class="sd">'+ctName+' · '+op[0]+' → '+sd.value+'</div><div class="big">'+fmt(etdD)+' → '+fmt(eta)+'</div>'+
       '<div class="row"><span>Transit</span><b>'+days+' days</b></div>'+
       '<div class="row"><span>Likely delay</span><b>+'+peakDays[0]+'–'+peakDays[1]+' days</b></div>'+
       '<div class="row"><span>Latest arrival</span><b>'+fmt(late)+'</b></div>'+
       '<div class="row"><span>Freight (indic.)</span><b>US$'+frt.toLocaleString()+'/ctr</b></div>'+
       '<div class="row"><span>Space</span><b><span class="full-badge '+fb[0]+'">'+fb[1]+' '+util+'%</span></b></div></div>';}).join('');
   $('s_cards').innerHTML=cards+(peak?'<div class="cot" style="grid-column:1/-1">⚠ Month '+mo+' is peak season — tight space and a peak surcharge (PSS) apply; book 2–3 weeks ahead.</div>':'');}
 [so,sd,etd,sct].forEach(function(e){if(e)e.addEventListener('change',sail);});if(etd)etd.addEventListener('input',sail);
 sail();
})();