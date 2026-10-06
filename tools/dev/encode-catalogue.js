'use strict';
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const {REPO}=require('./_env');
const directory=process.argv[2];if(!directory)throw Error('Usage: node tools/dev/encode-catalogue.js <reviewed-png-directory>');
(async()=>{const manifest=JSON.parse(fs.readFileSync(path.join(REPO,'data/catalogue-manifest.json')));const out=path.join(REPO,'images/catalogue');fs.mkdirSync(out,{recursive:true});for(const p of manifest.products)await sharp(path.join(directory,p.id+'.png')).flatten({background:'white'}).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(path.join(out,p.id+'.webp'));console.log('Encoded',manifest.products.length,'catalogue photos');})();
