'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
function publicCatalogue(manifest,policy,details,categories,legacy){
 const products=manifest.products.filter(p=>!p.customerConfidential&&(p.visibility==='public'||!p.visibility&&policy.publicBaselineSkus.includes(p.sku))&&policy.publicSourceIds.includes(p.source));
 return {version:2,purpose:'manufacturing-capability',access:{public:true,oem:{enabled:false}},sources:manifest.sources.filter(s=>products.some(p=>p.source===s.id)).map(s=>({id:s.id,title:s.title})),categories,
  products:products.map(p=>({id:p.id,sku:p.sku,name:p.name,axis:p.axis,origin:p.origin,specs:p.specs,sizes:p.sizes,source:p.source,page:p.page,img:'images/catalogue/'+p.id+'.webp',details:require('./product-details').publicDetails(p,details.products[p.sku],details.campaigns)})),
  legacy};
}
function catalogue(){return publicCatalogue(read('data/catalogue-manifest.json'),read('data/catalogue-access.json'),read('data/product-details.json'),read('data/catalogue-categories.json'),read('data/legacy-catalog-selections.json'));}
module.exports={catalogue,publicCatalogue};
