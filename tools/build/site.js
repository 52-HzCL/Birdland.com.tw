'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = file => JSON.parse(read(file));
const registry = { ...json('config/routes.json'), languages: require('./brief-labels').labels(require('./repair-labels').labels(require('./studio-labels').labels(json('config/languages.json').languages))) };
const scriptJSON = value => JSON.stringify(value).replace(/</g, '\\u003c');
const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function enhancePage(html, prefix = '') {
  if (html.includes('data-buyer-shell')) return html.includes('buyer-brief.js')?html:html.replace('</head>','<link rel="stylesheet" href="'+prefix+'buyer-brief.css"><script src="'+prefix+'buyer-brief.js"></script></head>');
  const assets = '<link rel="stylesheet" href="' + prefix + 'buyer-journey.css" data-buyer-shell>\n' +
    '<script src="' + prefix + 'site-registry.js"></script>\n' +
    (!html.includes('terminal.css') ? '<link rel="stylesheet" href="' + prefix + 'terminal.css">\n' : '') +
    (!html.includes('terminal.js') ? '<script defer src="' + prefix + 'terminal.js"></script>\n' : '') +
    '<script defer src="' + prefix + 'buyer-navigation.js"></script>\n' + '<link rel="stylesheet" href="'+prefix+'buyer-brief.css"><script src="'+prefix+'buyer-brief.js"></script>\n';
  return html.replace('</head>', assets + '</head>');
}
function enhanceOriginalApp(html, prefix = '') {
  // Preserved apps own their app-bar and reading layout. The corporate shell
  // hides those controls and restructures content, so must not run here.
  const assets = '<script src="' + prefix + 'site-registry.js"></script>\n' +
    '<link rel="stylesheet" href="' + prefix + 'buyer-brief.css"><script src="' + prefix + 'buyer-brief.js"></script>\n';
  return html.replace('</head>', assets + '</head>');
}
function renderSite() {
  const outputs = new Map();
  outputs.set('buyer-enquiry-locales.js','// Generated from tools/build/enquiry-copy.js.\nwindow.BL_ENQUIRY_TRANSLATIONS = '+scriptJSON(require('./enquiry-copy').dictionaries())+';\n');
  const catalogue = require('./catalogue').catalogue();
  outputs.set('catalog.json',JSON.stringify(catalogue,null,2)+'\n');
  outputs.set('site-registry.js', '// Generated from config/routes.json and config/languages.json.\nwindow.BL_SITE = ' + scriptJSON(registry) + ';\n');
  const data = scriptJSON(json('outlook-data.json'));
  outputs.set('buyer-intelligence.json',JSON.stringify(require('./intelligence').intelligence(json('outlook-data.json')),null,2)+'\n');
  const families = scriptJSON(json('data/manufacturing-options.json'));
  const catalog = '\n' + read('tools/catalog_partial.html').split('__CATALOGDATA__').join(scriptJSON(catalogue));
  for (const job of json('config/build.json').jobs) {
    let html = read(job.source);
    const cardHTML = tools => '<div class="bj-cards">' + tools.map(t=>{
      const r=registry.routes.find(r=>r.id===t.route),words=registry.languages[0].text;
      return '<a class="bj-card" href="'+escapeHTML(r.file+(t.hash?'#'+t.hash:''))+'"><strong>'+escapeHTML(words[t.label])+'</strong><span>'+escapeHTML(words[t.detail])+'</span></a>';
    }).join('')+'</div>';
    const toolCards = cardHTML(registry.tools.filter(t=>t.group==='reference'));
    const values = { __STUDIOREFERENCES__: scriptJSON(json('data/studio-illustrations.json')), __STUDIOCATALOG__: scriptJSON(catalogue), __DATA__: data, __DESKMODE__: job.mode || '', __CATALOG__: job.originalCatalog ? read('tools/restored-catalog_partial.html').split('__CATALOGDATA__').join(scriptJSON(json('data/restored-catalog.json'))) : job.catalog ? catalog : '', __FAMILIES__: families, __TOOLCARDS__: toolCards, __BUYERCONTEXT__: scriptJSON({sources:json('outlook-data.json').status?.sources || {},materials:fs.existsSync(path.join(ROOT,'data/buyer-materials.json'))?json('data/buyer-materials.json'):null}) };
    Object.assign(values,{__INTELMODE__:job.intel||'',__INTELTITLE__:job.intel==='market'?'Market Compare':'Supply Updates',__INTELKEY__:job.intel==='market'?'market':'news',__INTELINTRO__:job.intel==='market'?'biMarketIntro':'biNewsIntro'});
    for (const [token, value] of Object.entries(values)) html = html.split(token).join(value);
    if (job.output === 'buying-tools.html' || job.intel) {
      // Meaningful English text is present before runtime language enhancement.
      const words = registry.languages[0].text;
      html = html.replace(/(<([a-z][a-z0-9]*)\b[^>]*data-journey-key="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (all,open,tag,key,content,close) => words[key] ? open+escapeHTML(words[key])+close : all);
    }
    if (/__(?:DATA|DESKMODE|CATALOG|CATALOGDATA|FAMILIES|TOOLCARDS|BUYERCONTEXT)__/.test(html)) throw Error('Unresolved token: ' + job.output);
    outputs.set(job.output, job.originalApp ? enhanceOriginalApp(html) : enhancePage(html));
  }
  return outputs;
}
function buildSite(out = ROOT) {
  for (const [file, content] of renderSite()) {
    fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
    fs.writeFileSync(path.join(out, file), content, 'utf8');
    console.log('built', file);
  }
}
module.exports = { ROOT, registry, renderSite, buildSite, enhancePage };
if (require.main === module) buildSite(process.argv[2] ? path.resolve(process.argv[2]) : ROOT);
