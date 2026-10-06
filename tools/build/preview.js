'use strict';
// Complete portable public snapshot. Never copy credentials, tool sources or node_modules.
const fs=require('fs'),path=require('path');
const {ROOT,registry}=require('./site');
const destination=path.resolve(process.argv[2] || path.join(ROOT,'../preview'));
fs.mkdirSync(destination,{recursive:true});
const assetDir=new Set(['images','calendars','feeds','desk','p','i18n',...registry.languages.filter(l=>l.id!=='en').map(l=>l.id)]);
for(const entry of fs.readdirSync(ROOT,{withFileTypes:true})) {
  if(entry.isDirectory() && assetDir.has(entry.name)) fs.cpSync(path.join(ROOT,entry.name),path.join(destination,entry.name),{recursive:true});
  else if(entry.isFile() && /\.(html|css|js|json|svg|webmanifest|ico|xml|txt)$/.test(entry.name) && !['package.json','package-lock.json'].includes(entry.name)) fs.copyFileSync(path.join(ROOT,entry.name),path.join(destination,entry.name));
}
console.log('Portable preview:',destination);
