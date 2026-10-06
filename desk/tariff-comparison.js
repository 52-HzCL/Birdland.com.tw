(function(){var D;try{D=JSON.parse(document.getElementById('outlook-data').textContent);}catch(e){return;}
 (function(){var T=D.tariff_calc;if(!T)return;var dst=document.getElementById('pcDest'),org=document.getElementById('pcOrigin'),val=document.getElementById('pcVal'),out=document.getElementById('pcalcOut');
   var note=document.getElementById('pcalc-note');if(note)note.textContent=T.note||'';
   Object.keys(T.destinations).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k;dst.appendChild(o);});
   function calc(){var dd=T.destinations[dst.value]||{},v=parseFloat(val.value)||0,o=org.value,lines=[],totPct=dd.mfn||0;
     lines.push(['MFN base duty',(dd.mfn||0).toFixed(1)+'%',v*(dd.mfn||0)/100]);
     (dd.addons||[]).forEach(function(a){var applies=(a.origin==='ANY')||(a.origin===o);if(a.optional)applies=false;
       if(applies){totPct+=a.pct;lines.push([a.label,a.pct.toFixed(1)+'%',v*a.pct/100]);}else{lines.push([a.label+' (n/a for '+(o==='TW'?'Taiwan':'China')+')','0.0%',0]);}});
     var h='';lines.forEach(function(l){h+='<div class="calc-row"><span class="lab">'+l[0]+'</span><span class="val">'+l[1]+' · US$'+l[2].toFixed(0)+'</span></div>';});
     h+='<div class="calc-row tot"><span class="lab">Estimated duty ('+(o==='TW'?'Taiwan':'China')+' origin)</span><span class="val">'+totPct.toFixed(1)+'% · US$'+(v*totPct/100).toFixed(0)+'</span></div>';
     out.innerHTML=h;}
   dst.addEventListener('change',calc);org.addEventListener('change',calc);val.addEventListener('input',calc);calc();
   // Workspace card: the same comparison, driven by the workspace inputs.
   (function(){var out=document.getElementById('ws_duty_out');if(!out)return;
     var MAP={us:'United States',ca:'Canada',de:'European Union',fr:'European Union',nl:'European Union',es:'European Union',pl:'European Union',uk:'United Kingdom',au:'Australia'};
     function keyFor(code){var want=(MAP[code]||code||'').toLowerCase(),ks=Object.keys(T.destinations),i;
       for(i=0;i<ks.length;i++)if(ks[i].toLowerCase()===want)return ks[i];
       for(i=0;i<ks.length;i++)if(want&&ks[i].toLowerCase().indexOf(want.split(' ')[0])===0)return ks[i];
       return null;}
     function pct(dd,o){var p=dd.mfn||0;(dd.addons||[]).forEach(function(a){if(a.optional)return;if(a.origin==='ANY'||a.origin===o)p+=a.pct;});return p;}
     function draw(){var co=document.getElementById('bc_co'),fobEl=document.getElementById('bc_fob');if(!co||!fobEl)return;
       var v=parseFloat(fobEl.value)||0,k=keyFor(co.value),tw=document.getElementById('ws_tw'),cn=document.getElementById('ws_cn'),note=document.getElementById('ws_dnote');
       if(!k){tw.textContent='—';cn.textContent='—';note.textContent='no tariff data for this destination';out.innerHTML='';return;}
       var dd=T.destinations[k],pTW=pct(dd,'TW'),pCN=pct(dd,'CN'),aTW=v*pTW/100,aCN=v*pCN/100;
       window.__wsDuty={tw:aTW,cn:aCN};
       var fm=function(x){return 'US$'+Math.round(x).toLocaleString('en-US');};tw.textContent=fm(aTW);cn.textContent=fm(aCN);
       note.textContent=aCN>aTW?('Taiwan origin saves '+fm(aCN-aTW)):'same duty either origin';
       out.innerHTML='<div class="bcrow"><span>'+k+' · Taiwan origin</span><b>'+pTW.toFixed(1)+'% · '+fm(aTW)+'</b></div>'+
         '<div class="bcrow"><span>'+k+' · China origin</span><b>'+pCN.toFixed(1)+'% · '+fm(aCN)+'</b></div>'+
         '<div class="bcrow tot"><span>Difference on this shipment</span><b>'+fm(Math.abs(aCN-aTW))+'</b></div>';}
     document.addEventListener('ws:landed',draw);draw();})();})();
})();