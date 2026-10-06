/* Market references and an explicit buyer-entered sensitivity model. */
(function(){
'use strict';
var root=document.querySelector('[data-buyer-planning]');if(!root)return;
var language='en';try{language=localStorage.getItem('bl_lang')||'en';}catch(e){}
var editions=window.BL_SITE.languages,edition=editions.find(function(l){return l.id===language;})||editions[0];
function t(k){return edition.text[k]||editions[0].text[k]||k;}
var output=document.getElementById('bp-result'),fields=Array.from(root.querySelectorAll('[data-cost-share],[data-cost-change]'));
function calculate(){
 var shares=[],changes=[];
 ['material','processing','freight'].forEach(function(key){var share=root.querySelector('[data-cost-share="'+key+'"]'),change=root.querySelector('[data-cost-change="'+key+'"]');shares.push(share.value===''?NaN:Number(share.value));changes.push(change.value===''?NaN:Number(change.value));});
 var sum=shares.reduce(function(a,b){return a+b;},0);
 if(shares.some(function(v){return !Number.isFinite(v)||v<0||v>100;})||changes.some(function(v){return !Number.isFinite(v)||v<-100||v>1000;})||Math.abs(sum-100)>.001){output.textContent=t('bpEnterShares');return;}
 var index=shares.reduce(function(total,share,i){return total+share*(1+changes[i]/100);},0),change=index-100;
 output.textContent=t('bpResult')+': '+index.toFixed(1)+' · '+(change>0?'+':'')+change.toFixed(1)+'%';
}
fields.forEach(function(input){input.addEventListener('input',calculate);});calculate();
document.getElementById('bp-reset').addEventListener('click',function(){root.querySelectorAll('[data-cost-share]').forEach(function(i){i.value='';});root.querySelectorAll('[data-cost-change]').forEach(function(i){i.value='0';});calculate();});
// Feed status is a fetch-attempt status, never the date of a market observation.
var context=window.BL_BUYER_CONTEXT||{},sources=context.sources||{};
['materials','freight'].forEach(function(kind){if(kind==='materials'&&context.materials&&context.materials.series&&context.materials.series.length)return;var source=sources[kind==='materials'?'twelvedata':'fred'],node=document.getElementById('bp-'+kind+'-status');
 node.textContent=t('bpUnverified');
 if(source&&source.updated){var stamp=new Date(source.updated);if(!isNaN(stamp.getTime())){var date=document.createElement('span');date.className='bp-checked';date.textContent=t('bpChecked')+' '+stamp.toISOString().slice(0,10);node.appendChild(date);}}
 // Existing AI summaries are not re-published as observed price series.
});
var materials=context.materials;
if(materials&&materials.series&&materials.series.length){
 var wrap=document.getElementById('bp-metal-trend'),picker=document.createElement('select');picker.setAttribute('aria-label',t('bpMaterial'));
 materials.series.forEach(function(series){var option=document.createElement('option');option.value=series.id;option.textContent=t(series.id==='aluminum'?'bpAluminum':'bpNickel');picker.appendChild(option);});wrap.appendChild(picker);
 var chart=document.createElement('div');chart.className='bp-chart';wrap.appendChild(chart);
 function plot(){var series=materials.series.find(function(s){return s.id===picker.value;}),points=series.points;if(points.length<2||points.some(function(p){return !Number.isFinite(p.value)||p.value<=0;}))return;
 var values=points.map(function(p){return p.value/points[0].value*100;}),low=Math.min(...values),high=Math.max(...values),span=high-low||1;
 var line=values.map(function(v,i){return (10+i/(values.length-1)*300).toFixed(1)+','+(90-(v-low)/span*70).toFixed(1);}).join(' ');
 var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 320 110');svg.setAttribute('role','img');svg.setAttribute('aria-label',picker.selectedOptions[0].textContent+' '+points[0].month+'–'+points.at(-1).month);
 var path=document.createElementNS(svg.namespaceURI,'polyline');path.setAttribute('points',line);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2.5');svg.appendChild(path);
 var change=(points.at(-1).value/points.at(-2).value-1)*100,description=document.createElement('p');description.className='bp-observed';description.textContent=points.at(-1).month+' · '+(change>0?'+':'')+change.toFixed(1)+'% '+t('bpMonthChange');
 description.dataset.direction=change>0?'up':change<0?'down':'flat';
 var baseline=document.createElement('p');baseline.className='bp-status';baseline.textContent=t('bpIndex')+' '+points[0].month+' = 100 · '+t('bpLatestIndex')+' '+values.at(-1).toFixed(1);
 var history=document.createElement('details'),summary=document.createElement('summary');summary.textContent=t('bpMonthlyHistory');history.appendChild(summary);
 var table=document.createElement('table');table.className='bp-history';var caption=document.createElement('caption');caption.textContent=t('bpIndex')+' '+points[0].month+' = 100';table.appendChild(caption);
 points.forEach(function(p,i){var row=table.insertRow();row.insertCell().textContent=p.month;row.insertCell().textContent=values[i].toFixed(1);});history.appendChild(table);chart.replaceChildren(description,svg,baseline,history);
 }
 picker.addEventListener('change',plot);plot();
 var status=document.getElementById('bp-materials-status');status.textContent=materials.provider+' · '+t('bpObserved')+' '+materials.observed_month;
 var age=(new Date().getUTCFullYear()-Number(materials.observed_month.slice(0,4)))*12+new Date().getUTCMonth()+1-Number(materials.observed_month.slice(5));
 if(age>3)status.textContent+=' · '+t('bpOlderData');
}
})();
