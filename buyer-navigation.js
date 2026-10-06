(function () {
  'use strict';
  var site = window.BL_SITE;
  if (!site) return;
  function init() {
    var segments = location.pathname.split('/').filter(Boolean);
    var folder = segments.length > 1 ? segments[segments.length - 2] : '';
    var file = segments[segments.length - 1] || 'index.html';
    if (!/\.html$/.test(file)) file += '.html';
    var route = site.routes.find(function (r) { return r.file === file; });
    if (!route || !route.public) return;
    var edition = site.languages.find(function (l) { return l.id === folder; });
    var root = edition ? '../' : '';
    var preference = 'en';
    try { preference = localStorage.getItem('bl_lang') || 'en'; } catch (e) {}
    var language = edition || site.languages.find(function (l) { return l.id === preference; }) || site.languages[0];
    var words = language.text;
    if (route.language === 'runtime') document.documentElement.lang = language.tag;
    var nav;
    function text(key) { return words[key] || site.languages[0].text[key] || key; }
    function destination(r, hash) {
      var localized = r.language === 'facade' || r.language === 'static';
      return root + (localized && language.id !== 'en' ? language.id + '/' : '') + r.file + (hash ? '#' + hash : '');
    }
    // Several public pages are dedicated tools inside a larger site section.
    // Keep the site route indicator stable while moving between them.
    var navSection = { studio: 'products', configurator: 'products', cost: 'tools', news: 'tools', market: 'tools' };
    function link(r, key, hash) {
      var a = document.createElement('a'); a.href = destination(r, hash); a.textContent = text(key || r.label || r.id);
      if (r.id === (navSection[route.id] || route.id)) a.setAttribute('aria-current', 'page');
      return a;
    }
    nav = document.createElement('nav'); nav.className = 'bj-nav'; nav.setAttribute('aria-label', 'Birdland'); nav.setAttribute('translate', 'no');
    var inner = document.createElement('div'); inner.className = 'bj-nav-in';
    var brand = link(site.routes[0], 'home'); brand.textContent = 'BIRDLAND'; brand.className = 'bj-brand'; inner.appendChild(brand);
    var links = document.createElement('div'); links.className = 'bj-links';
    site.navigation.forEach(function (id) { var r = site.routes.find(function (x) { return x.id === id; }); links.appendChild(link(r, r.label, r.hash)); });
    inner.appendChild(links);
    var actions = document.createElement('div'); actions.className = 'bj-nav-actions';
    var search = document.createElement('button'); search.type = 'button'; search.dataset.terminal = ''; search.textContent = text('search'); actions.appendChild(search);
    var picker = document.createElement('details'); picker.className = 'bj-language';
    var summary = document.createElement('summary'); summary.textContent = language.name; picker.appendChild(summary);
    var choices = document.createElement('div');
    site.languages.forEach(function (l) {
      var a = document.createElement('a'); a.textContent = l.name; a.lang = l.tag;
      a.href = root + ((route.language === 'facade' || route.language === 'static') && l.id !== 'en' ? l.id + '/' : '') + route.file + location.search + location.hash;
      a.addEventListener('click', function (event) {
        try { localStorage.setItem('bl_lang', l.id); } catch (e) {}
        // Runtime editions share the same URL; an anchor to it does not reload.
        if (route.language === 'runtime') { event.preventDefault(); location.reload(); }
      });
      choices.appendChild(a);
    });
    picker.appendChild(choices); actions.appendChild(picker); inner.appendChild(actions); nav.appendChild(inner); document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add('bj-ready');
    var appTitle = document.querySelector('#app-bar .ab-id b');
    if (appTitle && route.label) appTitle.textContent = text(route.label);
    // Existing app status controls remain wired; the site shell owns language/navigation.
    var oldPicker = document.querySelector('#app-bar [data-language-picker], #app-bar .ab-lang'); if (oldPicker) oldPicker.hidden = true;
    function cards(items) {
      var grid = document.createElement('div'); grid.className = 'bj-cards'; grid.setAttribute('translate', 'no');
      items.forEach(function (item) {
        var r = site.routes.find(function (x) { return x.id === item.route; });
        var a = link(r, item.label, item.hash); a.className = 'bj-card'; a.textContent = '';
        var title = document.createElement('strong'); title.textContent = text(item.label); a.appendChild(title);
        var detail = document.createElement('span'); detail.textContent = text(item.detail); a.appendChild(detail); grid.appendChild(a);
      }); return grid;
    }
    document.querySelectorAll('[data-journey-key]').forEach(function (el) { el.textContent = text(el.dataset.journeyKey); });
    document.querySelectorAll('[data-buying-tools]').forEach(function (el) {
      if (el.closest('[data-guided-tools]')) { el.replaceChildren(cards(site.tools.filter(function(t){return t.group==='reference';}))); return; }
      var references = document.createElement('details'); references.className = 'bj-references';
      var summary = document.createElement('summary'); summary.textContent = text('references'); summary.setAttribute('translate','no');
      references.appendChild(summary);
      references.appendChild(cards(site.tools.filter(function(t){return t.group==='reference';})));
      el.replaceChildren(cards(site.tools.filter(function(t){return t.group==='primary';})), references);
    });
    if (route.id === 'home') {
      var start = document.createElement('section'); start.className = 'bj-start'; start.setAttribute('translate', 'no');
      var h = document.createElement('h2'); h.textContent = text('choice'); start.appendChild(h);
      var focus = document.createElement('p'); focus.textContent = text('catMetalIntro'); start.appendChild(focus);
      start.appendChild(cards([{route:'products',label:'browse',detail:'productDetail',hash:'bl-cat'},{route:'studio',label:'custom',detail:'capabilities',hash:'studio-needs'}]));
      var hero = document.querySelector('main section, main .hero, .hero');
      if (hero) {hero.insertAdjacentElement('afterend', start);var actions=document.createElement('div');actions.className='bj-hero-actions';actions.appendChild(link(site.routes.find(r=>r.id==='products'),'products','bl-cat'));actions.appendChild(link(site.routes.find(r=>r.id==='manufacturing'),'manufacturing'));hero.insertAdjacentElement('beforebegin',actions);} else (document.querySelector('main') || document.body).appendChild(start);
    }
    if (route.id === 'products') {
      var disclosure = document.querySelector('.cat-legacy');
      if (disclosure) {
        var catalog = document.getElementById('bl-cat');
        if (catalog) disclosure.parentNode.insertBefore(catalog,disclosure);
        disclosure.id = 'buyer-materials';
        var label = disclosure.querySelector('summary'); label.textContent = text('productDetail'); label.setAttribute('translate', 'no');
        var note = disclosure.querySelector('.cat-legacy-note'); if (note) note.hidden = true;
        function reveal() { if (location.hash && location.hash !== '#bl-cat') disclosure.open = true; }
        reveal(); window.addEventListener('hashchange', reveal);
        // Existing catalogue/context handoff can select a material without changing the hash.
        document.addEventListener('click', function (e) { if (e.target.closest('a[href*="#pd-"]')) disclosure.open = true; });
      }
    }
    if (route.id === 'manufacturing') {
      // Preserve the original Wiki structure, section numbering and reading tracker.
      var toc=document.querySelector('.wk-toc');if(toc){var holder=document.createElement('details');holder.className='bj-wiki-directory';var summary=document.createElement('summary');summary.textContent=toc.querySelector('b')?.textContent||text('guide');holder.appendChild(summary);toc.parentNode.insertBefore(holder,toc);holder.appendChild(toc);var mobile=matchMedia('(max-width:650px)');holder.open=!mobile.matches;mobile.addEventListener('change',()=>holder.open=!mobile.matches);toc.addEventListener('click',e=>{if(mobile.matches&&e.target.closest('a'))holder.open=false;});}
    }
    if (route.id === 'guide') {
      var main = document.querySelector('main');
      var sections = Array.from(main.querySelectorAll('.proof-section'));
      var entry = document.createElement('section'); entry.className = 'bj-start'; entry.setAttribute('translate','no');
      var title = document.createElement('h1'); title.textContent = text('choice'); entry.appendChild(title);
      entry.appendChild(cards([{route:'products',label:'browse',detail:'productDetail',hash:'bl-cat'},{route:'studio',label:'custom',detail:'capabilities',hash:'studio-needs'}]));
      entry.appendChild(link(site.routes.find(function(r){return r.id==='tools';}), 'tools'));
      main.insertBefore(entry, main.firstChild);
      var full = document.createElement('details'); full.className = 'bj-detail';
      var caption = document.createElement('summary'); caption.textContent = text('guide'); caption.setAttribute('translate','no'); full.appendChild(caption);
      main.appendChild(full); sections.forEach(function(section){full.appendChild(section);});
    }
    if(route.id==='guide'){var oldHeader=document.querySelector('header.shell-header');if(oldHeader)oldHeader.hidden=true;}
    if(route.id==='configurator'){document.body.classList.add('bj-configurator-page');document.title=text('custom')+' | Birdland';var menu=document.getElementById('menu');if(menu){var chooser=document.createElement('details');chooser.className='bj-config-products';var heading=document.createElement('summary');heading.textContent=text('products');chooser.appendChild(heading);menu.parentNode.insertBefore(chooser,menu);chooser.appendChild(menu);var mobile=matchMedia('(max-width:650px)');chooser.open=!mobile.matches;mobile.addEventListener('change',()=>chooser.open=!mobile.matches);menu.addEventListener('click',e=>{if(mobile.matches&&e.target.closest('[data-pid]'))chooser.open=false;});}}
    if(route.id==='contact'){
      document.body.classList.add('bj-contact-page');var copy=document.querySelector('.ledger-copy');
      if(copy){copy.querySelector('h1').textContent=text('ctDiscuss');copy.querySelector('p').textContent=text('ctIntro');}
      var handoff=document.querySelector('[aria-labelledby="handoff-title"]');if(handoff){var disclosure=document.createElement('details');disclosure.className='bj-detail';var caption=document.createElement('summary');caption.textContent=text('ctPrivate');disclosure.appendChild(caption);handoff.parentNode.insertBefore(disclosure,handoff);disclosure.appendChild(handoff);}
      var address=document.getElementById('mr-addr'),reveal=document.getElementById('mr-reveal'),region=document.getElementById('mr-region'),line=document.getElementById('mr-line');
      if(address&&window.blMail){address.hidden=false;reveal.hidden=true;function showAddress(){address.textContent=window.blMail.addr(region.value,line.value);if(button)button.textContent=text('ctCopy');}showAddress();region.addEventListener('change',showAddress);line.addEventListener('change',showAddress);var button=document.createElement('button');button.type='button';button.className='bl-button bj-copy-address';button.textContent=text('ctCopy');button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(address.textContent);button.textContent=text('ctCopied');}catch(e){var range=document.createRange();range.selectNodeContents(address);var selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}});document.querySelector('.mail-route .bl-actions').appendChild(button);var shortlist=link(site.routes.find(r=>r.id==='products'),'catEnquiry','enquiry');shortlist.className='bj-contact-shortlist';document.querySelector('.mail-route').appendChild(shortlist);}
    }
    if(['products','news','market','tools'].includes(route.id)){
      document.body.classList.add('bj-app-page');document.body.dataset.app=route.id;
      var heading=document.querySelector('.bi-header h1,.bt-header h1,#cat-title');
      if(heading){var badge=document.createElement('img');badge.className='bj-app-badge';badge.alt='';badge.width=56;badge.height=56;badge.src=root+(route.icon||'images/apps/cost.svg');heading.insertAdjacentElement('beforebegin',badge);if(route.id==='products')heading.textContent=text('products');}
      document.querySelectorAll('[data-insight-navigation]').forEach(nav=>nav.dataset.appNavigation='');
      if(route.id==='products'){var scope=document.querySelector('.cat-scope');if(scope){var custom=link(site.routes.find(r=>r.id==='studio'),'custom','studio-needs');custom.className='bj-custom-entry';scope.appendChild(custom);}}
      document.querySelectorAll('[data-app-navigation]').forEach(nav=>{nav.innerHTML='';site.tools.forEach(item=>{var r=site.routes.find(r=>r.id===item.route);var a=link(r,item.label,item.hash);a.textContent='';if(r.id===route.id)a.setAttribute('aria-current','page');var image=document.createElement('img');image.src=root+r.icon;image.width=32;image.height=32;image.alt='';a.appendChild(image);var strong=document.createElement('strong');strong.textContent=text(item.label);a.appendChild(strong);nav.appendChild(a);});});
    }
    // Direct links and existing table-of-contents links reveal their target before scrolling.
    function revealHash() {
      if (!location.hash) return;
      var target; try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { return; }
      if (!target) return;
      if (target.tagName === 'DETAILS') target.open = true;
      var node = target.parentElement;
      while (node) { if (node.tagName === 'DETAILS') node.open = true; node = node.parentElement; }
      requestAnimationFrame(function () { target.scrollIntoView({block:'start'}); });
    }
    revealHash(); window.addEventListener('hashchange', revealHash);
    if (route.app && route.public && !document.querySelector('[data-intelligence]')) {
      var next = document.createElement('section'); next.className = 'bj-start bj-next'; next.setAttribute('translate','no');
      var nextTitle = document.createElement('h2'); nextTitle.textContent = text('next'); next.appendChild(nextTitle);
      var nextDetail = document.createElement('p'); nextDetail.textContent = text('nextDetail'); next.appendChild(nextDetail);
      next.appendChild(link(site.routes.find(function(r){return r.id==='contact';}),'contact'));
      var footer=document.querySelector('body>footer');
      if(footer)footer.insertAdjacentElement('beforebegin',next);else document.body.appendChild(next);
    }
  }
  // Run after every deferred legacy script has finished assembling its layout.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
}());
