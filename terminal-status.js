// The Taipei clock, the office light and the header's scroll behaviour.
//
// This file used to build a language <select> too: thirty-seven entries that
// opened a machine translator in a new tab and changed nothing on this site,
// because the widget script behind it was never loaded. It is gone. Language
// is one mechanism everywhere now — a folder per edition on the static pages,
// a stored preference read by i18n.js in the built ones — and this file has no
// part in it.
(function(){
  var TAIWAN_HOLIDAYS={
    '2026-01-01':1,'2026-02-16':1,'2026-02-17':1,'2026-02-18':1,'2026-02-19':1,'2026-02-27':1,'2026-02-28':1,'2026-04-03':1,'2026-04-04':1,'2026-04-05':1,'2026-04-06':1,'2026-05-01':1,'2026-06-19':1,'2026-09-25':1,'2026-09-28':1,'2026-10-09':1,'2026-10-10':1,'2026-10-26':1,'2026-12-25':1,'2027-01-01':1
  };
  function parts(){
    var values=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),out={};
    values.forEach(function(part){out[part.type]=part.value;});
    return out;
  }
  function tick(){
    var now=parts(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),holidays=window.__TWHOL||TAIWAN_HOLIDAYS,minutes=parseInt(now.hour,10)*60+parseInt(now.minute,10),online=['Mon','Tue','Wed','Thu','Fri'].indexOf(now.weekday)>=0&&minutes>=540&&minutes<1050&&!holidays[date],time=now.hour+':'+now.minute;
    document.querySelectorAll('[data-taipei-time]').forEach(function(el){el.textContent=time+' Taipei';});
    document.querySelectorAll('[data-hq-status]').forEach(function(el){el.classList.toggle('is-online',online);el.classList.toggle('is-offline',!online);});
    document.querySelectorAll('[data-hq-label]').forEach(function(el){el.textContent=online?'Working':'Resting';});
  }
  tick();setInterval(tick,30000);

  // The banner shows only while the page sits at the very top. Once the reader
  // scrolls away it leaves the viewport entirely rather than shrinking, so
  // nothing competes with the content. Any open nav panel is closed on the way
  // out so a detached menu cannot be left floating over the page.
  var header=document.querySelector('.bl-header');
  function headerScroll(){
    if(!header)return;
    var away=window.scrollY>18;
    header.classList.toggle('is-scrolled',away);
    header.classList.toggle('is-hidden',away);
    if(away)document.querySelectorAll('.bl-menu[open]').forEach(function(menu){menu.removeAttribute('open');});
  }
  window.addEventListener('scroll',headerScroll,{passive:true});headerScroll();
}());
