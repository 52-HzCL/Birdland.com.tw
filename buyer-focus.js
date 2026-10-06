/* Public preferences shared by planning, reports and market comparisons. No buyer amounts. */
(function(){
'use strict';
var key='bl_buyer_focus',allowed=['pruners','hedge','loppers','saws','hoes','hand-tools','rakes','watering'],listeners=[];
function read(name){try{return JSON.parse(localStorage.getItem(name)||'null');}catch(e){return null;}}
var old=read(key)||{},catalogue=read('bl-cat')||{},legacy=read('bl_ctx')||{},state={category:allowed.includes(old.category)?old.category:allowed.includes(catalogue.axis)?catalogue.axis:'pruners',market:/^[a-z]{2}$/.test(old.market||'')?old.market:/^[a-z]{2}$/.test(legacy.market||'')?legacy.market:'de',product:typeof old.product==='string'?old.product:'',compare:Array.isArray(old.compare)?old.compare.filter(x=>/^[a-z]{2}$/.test(x)).slice(0,2):[]};
state.compareConfigured=old.compareConfigured===true;
if(state.market==='uk')state.market='gb';
function get(){return{...state,compare:state.compare.slice()};}
function set(next){if(allowed.includes(next.category))state.category=next.category;if(/^[a-z]{2}$/.test(next.market||''))state.market=next.market;if(typeof next.product==='string'&&next.product.length<100)state.product=next.product;if(Array.isArray(next.compare)){state.compareConfigured=next.compareConfigured!==false;state.compare=Array.from(new Set(next.compare.filter(x=>/^[a-z]{2}$/.test(x)))).slice(0,2);}try{localStorage.setItem(key,JSON.stringify(state));}catch(e){}if(window.blCtx)window.blCtx.set({market:state.market==='gb'?'uk':state.market});listeners.forEach(fn=>fn(get()));window.dispatchEvent(new CustomEvent('bl:focus',{detail:get()}));}
function clear(){try{['bl_buyer_focus','bl_buyer_seen'].forEach(k=>localStorage.removeItem(k));}catch(e){}state={category:'pruners',market:'de',product:'',compare:[],compareConfigured:false};if(window.blCtx)window.blCtx.set({market:'global'});listeners.forEach(fn=>fn(get()));}
window.BL_FOCUS={get,set,clear,on(fn){listeners.push(fn);}};
window.addEventListener('storage',e=>{if(e.key!==key)return;var v=read(key);if(v){state.category=allowed.includes(v.category)?v.category:'pruners';state.market=/^[a-z]{2}$/.test(v.market||'')?v.market:'de';state.product=typeof v.product==='string'?v.product:'';state.compare=Array.isArray(v.compare)?v.compare.filter(x=>/^[a-z]{2}$/.test(x)).slice(0,2):[];state.compareConfigured=v.compareConfigured===true;listeners.forEach(fn=>fn(get()));}});
})();
