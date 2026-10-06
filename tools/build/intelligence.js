'use strict';
const {createHash}=require('crypto');
function clean(value){return String(value||'').replace(/@@|\*\*/g,'').replace(/&amp;/g,'&').trim();}
function newsKey(item){return clean(item.title).toLowerCase().replace(/\s+[-–—]\s+[^-–—]+$/,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function intelligence(data){
 const seen=new Set(),stories=[];
 for(const item of data.market_news||[]){if(!item||!item.title||!/^https:\/\//i.test(item.url||'')||!/^\d{4}-\d{2}-\d{2}$/.test(item.date||''))continue;
  const topic=String(item.topic||'context').toLowerCase();if(!['shipping','tariff','taiwan','china','materials'].includes(topic))continue;
  const rawTitle=clean(item.title),source=clean(item.source),suffix=rawTitle.match(/\s+[-–—]\s+([^-–—]+)$/),normal=v=>v.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  const title=suffix&&normal(suffix[1])===normal(source)?rawTitle.slice(0,suffix.index):rawTitle,key=newsKey(item);
  // Group repeated publisher reports about the same PMI release; preserve alternatives as sources.
  const event=topic==='china'&&/manufactur|factory|pmi/i.test(title)&&/expansion|50\.1|pmi/i.test(title)?'china-pmi-'+item.date.slice(0,7):key;
  if(seen.has(event)){const previous=stories.find(s=>s.event===event);if(previous&&previous.links.length<3)previous.links.push({source:clean(item.source),url:item.url});continue;}
  // Industrial headlines outside the traditional-tool supply chain are not promoted.
  if(/wind turbine|electric vehicle|semiconductor/i.test(title))continue;
  seen.add(event);stories.push({id:createHash('sha256').update(event+'|'+item.date+'|'+title).digest('hex').slice(0,16),event,title,topic,date:item.date,source:clean(item.source||'Publisher'),source_tier:item.source_tier||'context',links:[{source:clean(item.source||'Publisher'),url:item.url}]});
 }
 stories.sort((a,b)=>b.date.localeCompare(a.date));
 return{version:1,edition:data.updated||'',news_status:data.status?.sources?.market_news?.state||'unavailable',stories};
}
module.exports={intelligence,newsKey};
