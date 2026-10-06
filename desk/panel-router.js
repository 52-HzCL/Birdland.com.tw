(function(){/* single-panel router — Stripe-app behaviour: one feature at a time */
 var col=document.getElementById('p-col')||document.querySelector('main');
 var hero=document.querySelector('.hero')||document.getElementById('overview');
 var dash=document.getElementById('dash');
 var live=document.getElementById('p-live');
 var hint=document.getElementById('tab-hint');
 var refhd=document.querySelector('.refhd');
 var blks=[].slice.call(document.querySelectorAll('main .blk'));
 var toc=document.querySelector('.toc');
 if(toc&&window.BL_DESK!=='cost'&&!toc.querySelector('a[href="#overview"]')){var ov=document.createElement('a');ov.href='#overview';ov.textContent='Today';ov.setAttribute('data-icon','⌂');toc.insertBefore(ov,toc.firstChild);}
 function setActive(id){[].forEach.call(document.querySelectorAll('.toc a'),function(a){a.classList.toggle('on',(a.getAttribute('href')||'')==='#'+id);});}
 function showView(id){
   var viewId=(id==='pd-builder'&&window.BL_DESK==='cost')?'p-landed2':id;
   var overview=(viewId==='overview'||viewId==='pd-builder'||!viewId);
   document.body.classList.toggle('bd-overview-active',overview);
   if(hero)hero.style.display=overview?'':'none';
   if(dash)dash.style.display=overview?'':'none';
   if(live)live.classList.toggle('sk-off',!overview);
   if(hint)hint.style.display='none';
   if(refhd)refhd.style.display='none';
   blks.forEach(function(b){
     var hit=(!overview&&b.id===viewId);
     b.classList.toggle('sk-off',!hit);
     if(hit){b.setAttribute('data-open','1');var bb=b.querySelector('.blk-b');if(bb){bb.style.display='block';bb.style.maxHeight='none';bb.style.opacity='1';bb.style.overflow='visible';}}
   });
   setActive(viewId);
   /* history.pushState does not fire hashchange, so anything outside this
      router that needs to know which panel is showing — the rail's
      Information/Tools switch, most of all — has no event to listen for.
      This is that event. */
   try{window.dispatchEvent(new CustomEvent('bl:view',{detail:id}));}catch(e){}
   if(id==='pd-builder'){
     var builder=document.getElementById('pd-builder');
     var motion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
     setTimeout(function(){if(builder&&builder.scrollIntoView)builder.scrollIntoView({behavior:motion,block:'start'});},0);
   }else{
     var main=document.querySelector('main');if(main&&main.scrollIntoView)main.scrollIntoView({block:'start'});
     window.scrollTo(0,0);
   }
 }
 document.addEventListener('click',function(e){
   var a=e.target.closest&&e.target.closest('.toc a');if(!a)return;
   e.preventDefault();e.stopPropagation();
   var id=(a.getAttribute('href')||'').slice(1)||'overview',nextHash='#'+id;
   if(location.hash!==nextHash&&window.history&&history.pushState)history.pushState(null,'',nextHash);
   showView(id);
 },true);
 window.addEventListener('popstate',function(){var id=(location.hash||'').slice(1);showView(id&&document.getElementById(id)?id:(window.BL_DESK==='cost'?'p-landed2':'overview'));});
 window.addEventListener('hashchange',function(){var id=(location.hash||'').slice(1);showView(id&&document.getElementById(id)?id:(window.BL_DESK==='cost'?'p-landed2':'overview'));});
 var st=document.createElement('style');
 st.textContent='body.theme-light main .blk.sk-off,main .blk.sk-off{display:none!important}.blk-h .tog,.blk-h .lights{display:none!important}.blk-h{cursor:default!important}.blk{margin-top:0!important}main .blk:not(.sk-off){animation:skfade .22s ease}@keyframes skfade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}';
 document.head.appendChild(st);
 var initial=(location.hash||'').slice(1);
 /* CostNow used to open on #overview, which is AsiaSource shell —
    its masthead and its brief builder, neither of which belongs there. Its own
    front door is Cost & Origin: the panel that sets the market everything else
    on the page is priced against. */
 var home=window.BL_DESK==='cost'?'p-landed2':'overview';
 showView(initial&&document.getElementById(initial)?initial:home);
})();
