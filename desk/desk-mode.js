
/* Two pages, one template.
   partner.html is AsiaSource — the reading surface. cost-desk.html is the
   CostNow — the six calculators. build_news.py renders this file twice and
   substitutes __DESKMODE__, and this block then removes whatever does not
   belong to the page being shown.
   The calculators are wired through the same shared helpers as everything else
   on the desk — $, money, esc, LSget, bentofy, the router, the rail. Cutting
   them out into a separate template would mean unpicking all of that; rendering
   twice and dropping the other half costs page weight instead, which is the
   cheaper mistake to make and the easy one to reverse. */
window.BL_DESK=(document.body.classList.contains('desk-cost')?'cost':'buyer');
/* The one copy of the advice sentence. The footer (both desk variants) and
   the printed cost sheet all end with it; keeping a single source is what
   stops three drifting rewordings of the same legal caveat. */
window.BL_ADVICE='not legal, customs or trade advice. Confirm with your customs broker or counsel before acting.';
(function(){
 var TOOLS=['p-landed2','p-margin','p-reorder','p-sail','p-cduty'];
 /* p-mkt belongs to both pages. It is the Origin & Destination panel — cost
    content in its own right — and it owns the #room and #region selects the
    whole context system reads. Dropping it took the buying context off the Cost
    Desk entirely, which is the one thing CostNow has to carry across. */
 var BOTH=['p-mkt'];
 var isCost=window.BL_DESK==='cost',drop=[];
 [].forEach.call(document.querySelectorAll('main .blk'),function(sec){
  if(BOTH.indexOf(sec.id)>=0)return;
  var tool=TOOLS.indexOf(sec.id)>=0;
  if(tool!==isCost)drop.push(sec);
 });
 if(isCost){
  /* The whole #overview shell is AsiaSource — its masthead, its brief
     builder, its published-PDF shelf. None of it is cost work, so the shell
     goes rather than being shown with most of its contents removed. The Cost
     Desk's front door is Cost & Origin, set as home in the router below. */
  var shell=document.getElementById('overview');
  // Products now has its own template. Rescue the original engineering options
  // so existing material deep links still work without loading the whole desk there.
  var builder=document.getElementById('pd-builder');
  var engineeringHome=document.querySelector('#p-landed2 .blk-b');
  if(builder&&engineeringHome){
   var engineering=document.createElement('details');engineering.id='engineering-options';
   var label=document.createElement('summary');label.textContent='Manufacturing options';engineering.appendChild(label);
   engineering.appendChild(builder);engineering.open=location.hash==='#pd-builder';engineeringHome.appendChild(engineering);
   window.addEventListener('hashchange',function(){if(location.hash==='#pd-builder')engineering.open=true;});
  }
  // #install-app/#install-note live inside that shell, and the wiring script
  // further down finds them purely by id — it does not care which parent
  // holds them. So the card is rescued into the surviving front door before
  // the shell it came from is thrown away, rather than rebuilding a second
  // install flow from scratch. Without this CostNow shipped a valid manifest
  // (cost-desk.webmanifest) with no on-page way to install it at all — the
  // button existed in the markup and was deleted by this exact branch before
  // a reader ever saw it.
  var installCard=document.querySelector('.bd-install-card');
  var costHome=document.getElementById('p-landed2');
  if(installCard&&costHome){
   var body=costHome.querySelector('.blk-b')||costHome;
   body.insertBefore(installCard,body.firstChild);
   var installBtn=installCard.querySelector('#install-app');
   if(installBtn){
    installBtn.textContent='Install CostNow safely';
    installBtn.title='Install CostNow on this device. No account is created and it can be removed from your browser.';
   }
  }
  /* The page's only h1 — #bd-title, "Build your buying plan before the quote."
     — is AsiaSource copy and lives inside that same shell, so throwing the
     shell away left CostNow with no h1 at all. The static file still has one,
     which is why a crawler saw a heading and a screen reader did not: this
     branch runs after the HTML is parsed. Rather than invent a title the
     design has nowhere to put, the section that IS this page's subject is
     promoted in place. Attributes and text are carried over and .blk-h h1 is
     styled identically to .blk-h h1,.blk-h h2, so nothing moves. */
  if(costHome){
   var oldH=costHome.querySelector('.blk-h h1,.blk-h h2');
   if(oldH){
    var h1=document.createElement('h1');
    [].forEach.call(oldH.attributes,function(a){h1.setAttribute(a.name,a.value);});
    h1.innerHTML=oldH.innerHTML;
    oldH.parentNode.replaceChild(h1,oldH);
   }
  }
  if(shell)drop.push(shell);
 }
 drop.forEach(function(s){if(s.parentNode)s.parentNode.removeChild(s);});
 // The menu must lose the same entries, or it lists panels that are not here.
 var toc=document.querySelector('.toc');
 if(toc)[].forEach.call(toc.querySelectorAll('a'),function(a){
  var id=(a.getAttribute('href')||'').slice(1);
  if(!id)return;
  if(!document.getElementById(id)&&a.parentNode)a.parentNode.removeChild(a);
 });
 if(isCost){
  document.title='Birdland CostNow';
  var crumb=document.querySelector('.crumbs span:last-child, .pd-crumb');
  if(crumb&&/AsiaSource/i.test(crumb.textContent))crumb.textContent='CostNow';
  // The brand in the topbar is shared markup, so the page renames itself.
  var vip=document.querySelector('.brand .vip');
  if(vip)vip.textContent='COST';
  // The browser toolbar takes the ledger green, matching cost-desk.webmanifest.
  var themeMeta=document.querySelector('meta[name="theme-color"]');
  if(themeMeta)themeMeta.setAttribute('content','#0A3D2B');
  // The nameplate this page briefly grew is gone: main.wrap is a flex row, so
  // it docked beside the rail at x=292 instead of spanning the width. The app
  // bar says which desk this is, which is what the nameplate was for.
 }
}());
