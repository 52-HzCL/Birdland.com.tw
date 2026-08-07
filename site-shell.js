(function(){
  var nav=document.querySelector('.shell-nav');if(!nav)return;
  var path=location.pathname.split('/').pop()||'index.html';
  function item(h,label){return '<a href="'+h+'"'+(path===h?' aria-current="page"':'')+'>'+label+'</a>';}
  // Data Desk is the site; SaaS Terminal is the apps. CostNow used to sit in
  // the first group, which put a desk app in the company menu — and all three
  // apps were still under the names they were shipped with in 2025.
  var APPS=['partner.html','executive.html','cost-desk.html','my-market.html','team.html'];
  nav.innerHTML='<details class="shell-group"'+(['guide.html','about.html','product-101.html','why-birdland.html','contact.html'].indexOf(path)>-1?' data-active="true"':'')+'><summary>Data Desk</summary><div class="shell-pop">'+item('guide.html','Guide')+item('about.html','About')+item('product-101.html','Factory')+item('contact.html','Contact')+'</div></details><details class="shell-group"'+(APPS.indexOf(path)>-1?' data-active="true"':'')+'><summary>SaaS Terminal</summary><div class="shell-pop">'+item('executive.html','ABrief')+item('my-market.html','My Market')+item('partner.html','AsiaSource')+item('cost-desk.html','CostNow')+item('team.html','Team')+'</div></details>'+item('contact.html','Contact');
  var groups=[].slice.call(nav.querySelectorAll('.shell-group'));
  document.addEventListener('click',function(e){groups.forEach(function(d){if(d.open&&!d.contains(e.target))d.open=false;});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')groups.forEach(function(d){d.open=false;});});
}());
