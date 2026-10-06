
/* Stage A groundwork for linking the four surfaces together.
   1) Tools accept their inputs from the URL, so a link can carry a number
      rather than just a destination: partner.html?mg_cost=9.2#p-margin opens
      the margin planner already holding that cost. Input ids are stable and
      already unique, so no per-tool wiring is needed.
   2) Each tool names the Product 101 section that explains its inputs, so the
      encyclopedia and the calculator stop being two separate places. */
(function(){
 function prefill(){
  var q=null;try{q=new URLSearchParams(location.search);}catch(e){return;}
  var any=false;q.forEach(function(v,k){
   var el=document.getElementById(k);
   if(!el||!("value" in el))return;
   el.value=v;any=true;
   el.dispatchEvent(new Event("input",{bubbles:true}));
   el.dispatchEvent(new Event("change",{bubbles:true}));
  });
  return any;
 }
 var P101={
  "p-landed2":["s-cost","Cost structure — the four blocks"],
  "p-margin":["s-cost","Cost structure — what sits behind a landed cost"],
  "p-cduty":["s-oem","OEM routes — origin, tooling and who owns it"],
  "p-sail":["s-pack","Packaging — cube decides freight, not weight"],
  "p-reorder":["s-route","Production route — the seven gates ahead of a delivery"]
 };
 /* 3) Each tool names the two panels a buyer normally reaches for next. A
       calculator that answers one question and then leaves you at a dead end
       is where the desk used to lose people. Only panels that are actually
       rendered may appear here — several sections are display:none on this
       skin, and a chip that scrolls to nothing is worse than no chip. */
 var NEXT={
  "p-landed2":[["Retail margin","p-margin"],["Taiwan vs China duty","p-cduty"]],
  "p-margin":[["My landed cost","p-landed2"],["Product Finder","p-offers"]],
  "p-cduty":[["My landed cost","p-landed2"],["Cost &amp; Origin","p-mkt"]],
  "p-sail":[["Reorder timing","p-reorder"],["Cost &amp; Origin","p-mkt"]],
  "p-reorder":[["Plan a sailing","p-sail"],["Buy Queue","p-alerts"]]
 };
 function addLinks(){
  Object.keys(P101).forEach(function(id){
   var sec=document.getElementById(id);if(!sec)return;
   var body=sec.querySelector(".blk-b");if(!body||body.querySelector(".tool-explain"))return;
   var a=document.createElement("a");
   a.className="tool-explain";
   a.href="product-101.html#"+P101[id][0];
   a.innerHTML="<span>What these inputs mean</span>"+P101[id][1]+" &rarr;";
   body.appendChild(a);
   /* Reachability is decided by the menu, not by computed style: this is a
      single-panel router, so every panel that is not the active one is
      display:none right now. The permanently retired sections are the ones
      parked in .pd-hidden-nav — and since the desks split in two, a target may
      simply live on the other page, in which case the chip becomes a normal
      link there rather than disappearing. */
   function reachable(target){
    var link=document.querySelector('.toc a[href="#'+target+'"]');
    return (link&&!link.closest(".pd-hidden-nav"))?link:null;
   }
   var OTHER=window.BL_DESK==="cost"?"partner.html":"cost-desk.html";
   var next=(NEXT[id]||[]).filter(function(p){
    return reachable(p[1])||!document.querySelector('.pd-hidden-nav a[href="#'+p[1]+'"]');});
   if(!next.length)return;
   var row=document.createElement("div");row.className="tool-links";
   row.innerHTML='<span class="tool-links-h">Next</span>'+next.map(function(p){
    return reachable(p[1])
     ?'<button type="button" class="tool-links-a" data-go="'+p[1]+'">'+p[0]+' &rarr;</button>'
     :'<a class="tool-links-a" href="'+OTHER+'#'+p[1]+'">'+p[0]+' &rarr;</a>';}).join("");
   row.addEventListener("click",function(e){
    var b=e.target.closest("[data-go]");if(!b)return;
    var link=reachable(b.getAttribute("data-go"));
    if(link)link.click();});
   body.appendChild(row);
  });
 }
 function boot(){prefill();addLinks();}
 function late(){setTimeout(boot,0);setTimeout(prefill,260);setTimeout(prefill,900);}
 if(document.readyState==="complete")late();else window.addEventListener("load",late);
 window.addEventListener("hashchange",addLinks);window.addEventListener("bl:view",addLinks);
}());
