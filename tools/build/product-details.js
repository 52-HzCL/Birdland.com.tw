'use strict';
// This projection is public-only. Never forward internal order/source objects.
function publicDetails(product,record={},campaigns=[],now=Date.now()){
 record=record.publication==='public'?record:{};
 const text=v=>v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k,x])=>/^(en|nl|de|fr|es|pt-br|pl|it|ja|zh-tw)$/.test(k)&&typeof x==='string')):{};
 const asset=v=>typeof v==='string'&&/^images\/[a-zA-Z0-9_./-]+\.(webp|png|jpe?g)$/.test(v)&&!v.includes('..')?v:null;
 const active=campaigns.filter(c=>c.publication==='public'&&c.productSkus?.includes(product.sku)&&Number.isFinite(Date.parse(c.validFrom))&&Number.isFinite(Date.parse(c.validUntil))&&Date.parse(c.validFrom)<=now&&now<=Date.parse(c.validUntil)).map(c=>({id:c.id,version:c.version,title:text(c.title),terms:text(c.terms),validFrom:c.validFrom,validUntil:c.validUntil}));
 const gallery=(record.gallery||[]).filter(g=>g.publication==='public'&&asset(g.asset)).map(g=>({id:g.id,asset:asset(g.asset),caption:text(g.caption)}));
 const specs=Object.entries(product.specs||{}).map(([id,value])=>({id,labelKey:id,value,status:'catalogue-reference',evidence:{source:product.source,page:product.page}}));
 for(const x of record.specifications||[])if(x.publication==='public'&&typeof x.id==='string'&&typeof x.value==='string')specs.push({id:x.id,label:text(x.label),value:x.value,unit:typeof x.unit==='string'?x.unit:'',status:x.status==='catalogue-reference'?'catalogue-reference':'pending-confirmation',evidence:x.evidence?.publication==='public'?{source:x.evidence.source,page:x.evidence.page}:null});
 return {version:Number.isInteger(record.version)?record.version:1,descriptions:text(record.descriptions),features:(record.features||[]).filter(f=>f.publication==='public').map(f=>({id:f.id,text:text(f.text)})),gallery:gallery.length?gallery:[{id:product.id+'-catalogue',asset:'images/catalogue/'+product.id+'.webp',caption:{}}],specifications:specs,collections:(record.collections||[]).filter(c=>['new','featured'].includes(c)),packagingVariants:(record.packagingVariants||[]).filter(v=>v.publication==='public'&&typeof v.id==='string'&&Number.isInteger(v.version)).map(v=>({id:v.id,version:v.version,title:text(v.title),description:text(v.description),format:v.format||'',material:v.material||'',status:'reference-to-confirm'})),campaigns:active};
}
module.exports={publicDetails};
