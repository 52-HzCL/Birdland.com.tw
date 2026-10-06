(function(){
 /* Built from the live DOM, and deliberately late: CostNow is this same file
    with #overview and the reading panels deleted at load, so an index taken
    any earlier would list panels that are not on the page. Reading the rail
    after the drop means each desk indexes exactly what it actually has. */
 function boot(){
  var toc=document.querySelector('.toc');
  if(!toc)return;

  var index=[];
  /* Panels: the rail's own direct links, which is what the desk considers
     navigable. .pd-hidden-nav entries are nested, so > keeps them out — the
     same selector the router uses to resolve a data-go. */
  [].forEach.call(toc.children,function(a){
   if(a.tagName!=='A')return;
   var id=(a.getAttribute('href')||'').slice(1),label=(a.textContent||'').trim();
   if(!id||(a.getAttribute('href')||'').charAt(0)!=='#'||!label||!document.getElementById(id))return;
   index.push({t:'PANEL',n:label,d:'Desk panel',go:id});
  });

  /* Materials: the brief builder's own families table, published as
     window.BL_FAMILIES. gen-terminal.js harvests the same table out of this
     file to build terminal.json, so a material that exists in one exists in
     the other. */
  var fams=window.BL_FAMILIES||[],seen={};
  fams.forEach(function(f){
   (f.models||[]).forEach(function(mdl){
   (mdl.parts||[]).forEach(function(p){
    (p.materials||[]).forEach(function(m){
     var name=String(m&&m[0]||'');
     if(!name||seen[name])return;seen[name]=1;
     index.push({t:'MATERIAL',n:name,d:(f.label?f.label+' · ':'')+(p.name||''),q:name});
    });
   });
   });
  });
  if(!index.length)return;

  /* The palette itself. Nothing is rendered until it is first opened, so a
     reader who never presses "/" pays nothing for it beyond this listener. */
  var wrap=document.createElement('div');
  wrap.className='pd-omni';wrap.id='pd-omni';wrap.hidden=true;
  wrap.innerHTML='<div class="pd-omni-back" data-omni-close></div>'+
   '<div class="pd-omni-card" role="dialog" aria-modal="true" aria-label="Search this desk">'+
    '<div class="pd-omni-top"><span class="pd-omni-k">FIND</span>'+
     '<input id="pd-omni-q" type="text" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Panel or material…" aria-label="Search panels and materials" role="combobox" aria-expanded="true" aria-controls="pd-omni-list">'+
     '<button type="button" class="pd-omni-esc" data-omni-close>ESC</button></div>'+
    '<ul class="pd-omni-list" id="pd-omni-list" role="listbox" aria-label="Results"></ul>'+
    '<div class="pd-omni-foot">↑ ↓ MOVE · ENTER OPEN · ESC CLOSE</div>'+
   '</div>';
  document.body.appendChild(wrap);
  var input=wrap.querySelector('#pd-omni-q'),list=wrap.querySelector('#pd-omni-list');

  var shown=[],sel=0,lastFocus=null;

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function filter(q){
   q=String(q||'').trim().toLowerCase();
   var hits=q?index.filter(function(x){return (x.n+' '+x.d).toLowerCase().indexOf(q)>-1;}):index.slice();
   /* An exact-ish prefix on the name beats a match buried in the context line,
      so typing a grade lands on the grade. */
   if(q)hits.sort(function(a,b){return (a.n.toLowerCase().indexOf(q)===0?0:1)-(b.n.toLowerCase().indexOf(q)===0?0:1);});
   return hits.slice(0,40);
  }
  function draw(){
   if(!shown.length){list.innerHTML='<li class="pd-omni-none">Nothing on this desk matches that.</li>';return;}
   list.innerHTML=shown.map(function(x,i){
    return '<li class="pd-omni-row'+(i===sel?' on':'')+'" role="option" aria-selected="'+(i===sel?'true':'false')+'" data-i="'+i+'">'+
     '<span class="t">'+esc(x.t)+'</span><span><span class="n">'+esc(x.n)+'</span><span class="d">'+esc(x.d)+'</span></span></li>';
   }).join('');
   var on=list.querySelector('.pd-omni-row.on');
   if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest'});
  }
  function run(q){shown=filter(q);sel=0;draw();}

  function open(){
   if(!wrap.hidden)return;
   lastFocus=document.activeElement;
   wrap.hidden=false;input.value='';run('');
   input.focus();
  }
  function close(){
   if(wrap.hidden)return;
   wrap.hidden=true;
   /* Focus goes back where it came from rather than to the top of the page. */
   try{if(lastFocus&&lastFocus.focus&&document.contains(lastFocus))lastFocus.focus();}catch(e){}
   lastFocus=null;
  }
  function choose(x){
   if(!x)return;
   if(x.go){
    /* The rail link is the router — clicking it is how every other control on
       this desk changes panel, hash included. */
    var a=document.querySelector('.toc > a[href="#'+x.go+'"]');
    close();
    if(a)a.click();else location.hash='#'+x.go;
    return;
   }
   /* Materials open the builder on the thing that was searched for, through
      the same ?q= deep link terminal.json writes. It is read at load, so this
      is a navigation on both desks — and on CostNow the builder lives on the
      other page anyway. */
   close();
   location.href='partner.html?q='+encodeURIComponent(x.q)+'#pd-builder';
  }

  list.addEventListener('click',function(e){
   var row=e.target.closest&&e.target.closest('.pd-omni-row');
   if(!row)return;
   choose(shown[Number(row.getAttribute('data-i'))]);
  });
  wrap.addEventListener('click',function(e){
   if(e.target.closest&&e.target.closest('[data-omni-close]'))close();
  });
  input.addEventListener('input',function(){run(input.value);});
  input.addEventListener('keydown',function(e){
   if(e.key==='ArrowDown'){e.preventDefault();if(shown.length){sel=(sel+1)%shown.length;draw();}return;}
   if(e.key==='ArrowUp'){e.preventDefault();if(shown.length){sel=(sel-1+shown.length)%shown.length;draw();}return;}
   if(e.key==='Enter'){e.preventDefault();choose(shown[sel]);return;}
   if(e.key==='Escape'){e.preventDefault();close();}
  });

  /* "/" is the shortcut every reading surface uses, but only when the reader
     is not already typing — otherwise it eats the slash out of a lane code. */
  document.addEventListener('keydown',function(e){
   if(e.key==='Escape'&&!wrap.hidden){close();return;}
   if(e.key!=='/'||e.metaKey||e.ctrlKey||e.altKey)return;
   var t=e.target,tag=t&&t.tagName;
   if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable))return;
   e.preventDefault();open();
  });

  var btn=document.createElement('button');
  btn.type='button';btn.className='pd-omni-btn';
  btn.setAttribute('aria-haspopup','dialog');
  btn.innerHTML='<span aria-hidden="true">⌕</span><span>SEARCH</span><kbd>/</kbd>';
  btn.setAttribute('aria-label','Search panels and materials');
  btn.addEventListener('click',open);

  /* One button, two homes. AsiaSource hides the rail while the overview shell
     is showing (body.bd-overview-active #p-rail{display:none}), so a button
     parked in the rail is invisible on the page the desk actually opens on.
     It rides the view instead: the overview masthead while that is up, the
     rail menu once a panel is. CostNow has no overview shell at all, so there
     it simply lives in the rail. */
  var mast=document.querySelector('#overview .bd-mast');
  function placeBtn(){
   var home=(mast&&document.body.classList.contains('bd-overview-active'))?mast:toc;
   if(btn.parentNode===home)return;
   if(home===toc){
    var firstLink=[].filter.call(toc.children,function(n){return n.tagName==='A';})[0];
    if(firstLink)toc.insertBefore(btn,firstLink);else toc.appendChild(btn);
   }else home.appendChild(btn);
  }
  placeBtn();
  window.addEventListener('bl:view',placeBtn);
  window.addEventListener('hashchange',function(){setTimeout(placeBtn,0);});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
}());
