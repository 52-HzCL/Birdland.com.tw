(function(){
  var nav=document.querySelector('.shell-nav');if(!nav)return;
  var path=location.pathname.split('/').pop()||'index.html';
  function item(h,label){return '<a href="'+h+'"'+(path===h?' aria-current="page"':'')+'>'+label+'</a>';}
  nav.innerHTML='<details class="shell-group"'+(['guide.html','about.html','product-101.html','why-birdland.html','contact.html'].indexOf(path)>-1?' data-active="true"':'')+'><summary>Data Desk</summary><div class="shell-pop">'+item('guide.html','Guide')+item('about.html','About')+item('product-101.html','Factory')+item('cost-desk.html','Cost Desk')+item('contact.html','Contact')+'</div></details><details class="shell-group"'+(['partner.html','executive.html','team.html'].indexOf(path)>-1?' data-active="true"':'')+'><summary>SaaS Terminal</summary><div class="shell-pop">'+item('partner.html','Buyer Desk')+item('executive.html','Daily Supply News')+item('team.html','Team')+'</div></details>'+item('contact.html','Contact');
  var groups=[].slice.call(nav.querySelectorAll('.shell-group'));
  document.addEventListener('click',function(e){groups.forEach(function(d){if(d.open&&!d.contains(e.target))d.open=false;});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')groups.forEach(function(d){d.open=false;});});
}());
