(function(){
  var top=document.querySelector('.tb-right');if(!top)return;
  var groups=top.querySelectorAll('.sysgrp');
  if(groups[0]){groups[0].classList.add('sys-api');groups[0].setAttribute('title','High-Level API source connectivity');groups[0].innerHTML=groups[0].innerHTML.replace('Source&nbsp;Feeds','High-Level&nbsp;API');}
  if(groups[1]){groups[1].classList.add('sys-token');groups[1].setAttribute('title','AI Token budget and refresh meter');groups[1].innerHTML=groups[1].innerHTML.replace('Buyer&nbsp;Workspace','AI&nbsp;Token');}
  var hq=document.getElementById('tpk');if(hq){hq.classList.add('sys-hq');hq.setAttribute('title','Birdland Office availability: Taiwan office hours Mon-Fri 09:00-17:30 (GMT+8)');}
  var tm=document.querySelector('.tpk-time');if(tm)tm.classList.add('sys-time');
})();