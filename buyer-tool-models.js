/* Buyer-entered planning arithmetic. No rates, quotes, forecasts or storage. */
(function(root){
'use strict';
function number(value,minimum=0,maximum=Infinity){if(value===''||value==null)return null;var n=Number(value);return Number.isFinite(n)&&n>=minimum&&n<=maximum?n:null;}
function cost(v){
 var fob=number(v.fob),quantity=number(v.quantity,1),freight=number(v.freight),insurance=number(v.insurance||0),fees=number(v.fees||0),duty=number(v.duty||0,0,100),tax=number(v.tax||0,0,100);
 if([fob,quantity,freight,insurance,fees,duty,tax].includes(null)||fob<=0||!Number.isSafeInteger(quantity)||!['cif','fob'].includes(v.basis))return null;
 var cif=fob+freight+insurance,dutyAmount=(v.basis==='fob'?fob:cif)*duty/100,preTax=cif+dutyAmount+fees,taxAmount=(cif+dutyAmount)*tax/100,total=preTax+taxAmount,margin=number(v.margin,0,99.9);
 if(![preTax,total].every(Number.isFinite))return null;
 return{unit:preTax/quantity,preTax,total,taxAmount,dutyAmount,price:margin===null?null:(v.includeTax==='on'?total:preTax)/quantity/(1-margin/100)};
}
function stock(v){
 var stock=number(v.stock),weekly=number(v.weekly),production=number(v.production),transit=number(v.transit),safety=number(v.safety),now=new Date(v.now);
 if(v.mode==='total'){production=number(v.totalLead);transit=0;safety=0;}
 if([stock,weekly,production,transit,safety].includes(null)||weekly<=0||!Number.isFinite(now.getTime()))return null;
 var cover=stock/weekly,pipeline=production+transit+safety,wait=cover-pipeline;
 if(![cover,pipeline,wait].every(Number.isFinite))return null;
 var date=new Date(now);date.setUTCDate(date.getUTCDate()+Math.floor(Math.max(0,wait)*7));
 if(!Number.isFinite(date.getTime()))return null;
 return{cover,pipeline,now:wait<=0,date:date.toISOString().slice(0,10),threshold:Math.ceil(pipeline*weekly),shortfall:Math.max(0,Math.ceil(pipeline*weekly-stock))};
}
var models={cost,stock};if(typeof module==='object'&&module.exports)module.exports=models;else root.BL_BUYER_MODELS=models;
})(typeof window==='object'?window:globalThis);
