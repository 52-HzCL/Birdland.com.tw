(function(){
 window.__bo=function(sec,open){var b=sec.querySelector('.blk-b');if(!b)return;b.style.overflow='hidden';
   if(open){sec.setAttribute('data-open','1');b.style.display='block';var h=b.scrollHeight;b.style.transition='none';b.style.maxHeight='0px';b.style.opacity='0';b.offsetHeight;b.style.transition='max-height .3s cubic-bezier(.33,1,.68,1),opacity .24s ease';b.style.maxHeight=h+'px';b.style.opacity='1';var f=function(e){if(e.propertyName!=='max-height')return;b.style.maxHeight='none';b.style.transition='';b.removeEventListener('transitionend',f);};b.addEventListener('transitionend',f);}
   else{var h2=b.scrollHeight;b.style.transition='none';b.style.maxHeight=h2+'px';b.style.opacity='1';b.offsetHeight;b.style.transition='max-height .26s cubic-bezier(.33,1,.68,1),opacity .18s ease';b.style.maxHeight='0px';b.style.opacity='0';sec.setAttribute('data-open','0');var f2=function(e){if(e.propertyName!=='max-height')return;b.style.transition='';b.removeEventListener('transitionend',f2);};b.addEventListener('transitionend',f2);}};
 [].forEach.call(document.querySelectorAll('.blk-h'),function(h){if(h.querySelector('.lights'))return;var l=document.createElement('span');l.className='lights';l.innerHTML='<span class="lt r" title="Close"></span><span class="lt y" title="Minimise"></span><span class="lt gn" title="Expand"></span>';h.insertBefore(l,h.firstChild);var sec=h.parentNode;
   l.querySelector('.lt.r').addEventListener('click',function(e){e.stopPropagation();sec.style.transition='opacity .3s ease, transform .3s ease';sec.style.opacity='0';sec.style.transform='scale(.98)';setTimeout(function(){sec.style.display='none';sec.style.opacity='';sec.style.transform='';},300);});
   l.querySelector('.lt.y').addEventListener('click',function(e){e.stopPropagation();window.__bo(sec,false);});
   l.querySelector('.lt.gn').addEventListener('click',function(e){e.stopPropagation();window.__bo(sec,true);});});
 (function(){var links=[].slice.call(document.querySelectorAll('.toc a')),hint=document.getElementById('tab-hint');
  function refresh(){var any=false;links.forEach(function(a){var id=(a.getAttribute('href')||'').slice(1),sec=document.getElementById(id),vis=sec&&sec.style.display==='block';a.classList.toggle('on',!!vis);if(vis)any=true;});if(hint)hint.style.display=any?'none':'';}
  function showSec(id){var t=document.getElementById(id);if(!t)return;t.style.display='block';if(window.__bo){window.__bo(t,true);}else{t.setAttribute('data-open','1');}refresh();}
  links.forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var id=(a.getAttribute('href')||'').slice(1);showSec(id);var t=document.getElementById(id);if(t&&t.scrollIntoView)t.scrollIntoView({behavior:'smooth',block:'start'});});});
  // red traffic-light hides one card (accumulate model); refresh tab/hint state
  [].forEach.call(document.querySelectorAll('.blk-h .lights .lt.r'),function(r){r.addEventListener('click',function(){setTimeout(refresh,360);});});
 })();
 var bars=[].slice.call(document.querySelectorAll('.tokmeter i'));
 function tick(){var m=Math.random();bars.forEach(function(b){var hh;if(m<0.13)hh=8+Math.random()*16;else if(m>0.85)hh=72+Math.random()*28;else hh=22+Math.random()*68;hh+=(Math.random()-0.5)*18;hh=Math.max(8,Math.min(100,hh));b.style.height=hh.toFixed(0)+'%';b.style.opacity=(0.55+hh/250).toFixed(2);});setTimeout(tick,70+Math.random()*430);}
 if(bars.length)tick();
 (function(){var w1=document.querySelector('.api-ic .w1'),w2=document.querySelector('.api-ic .w2'),w3=document.querySelector('.api-ic .w3');if(!w1)return;function aTick(){var lvl=Math.random();w1.style.opacity=lvl>0.06?1:0.2;w2.style.opacity=lvl>0.42?1:0.2;w3.style.opacity=lvl>0.72?1:0.2;setTimeout(aTick,210+Math.random()*1290);}aTick();})();
 (function(){var t=document.querySelector('.toc');if(!t)return;var dir=0,raf;
  function loop(){if(dir){t.scrollLeft+=dir*9;raf=requestAnimationFrame(loop);}}
  t.addEventListener('mousemove',function(e){var r=t.getBoundingClientRect(),x=e.clientX-r.left,edge=72,nd=x<edge?-1:(x>r.width-edge?1:0);if(nd!==dir){dir=nd;cancelAnimationFrame(raf);if(dir)raf=requestAnimationFrame(loop);}});
  t.addEventListener('mouseleave',function(){dir=0;cancelAnimationFrame(raf);});})();
})();