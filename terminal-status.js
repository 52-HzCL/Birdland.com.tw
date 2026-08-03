(function(){
  var LANGUAGES=[
    ['ar','العربية'],['bg','Български'],['zh-CN','简体中文'],['zh-TW','繁體中文'],['hr','Hrvatski'],['cs','Čeština'],['da','Dansk'],['nl','Nederlands'],['en','English'],['et','Eesti'],['fi','Suomi'],['fr','Français'],['de','Deutsch'],['el','Ελληνικά'],['he','עברית'],['hi','हिन्दी'],['hu','Magyar'],['id','Bahasa Indonesia'],['it','Italiano'],['ja','日本語'],['ko','한국어'],['lv','Latviešu'],['lt','Lietuvių'],['ms','Bahasa Melayu'],['no','Norsk'],['pl','Polski'],['pt','Português'],['ro','Română'],['ru','Русский'],['sk','Slovenčina'],['sl','Slovenščina'],['es','Español'],['sv','Svenska'],['th','ไทย'],['tr','Türkçe'],['uk','Українська'],['vi','Tiếng Việt']
  ];
  var TAIWAN_HOLIDAYS={
    '2026-01-01':1,'2026-02-16':1,'2026-02-17':1,'2026-02-18':1,'2026-02-19':1,'2026-02-27':1,'2026-02-28':1,'2026-04-03':1,'2026-04-04':1,'2026-04-05':1,'2026-04-06':1,'2026-05-01':1,'2026-06-19':1,'2026-09-25':1,'2026-09-28':1,'2026-10-09':1,'2026-10-10':1,'2026-10-26':1,'2026-12-25':1,'2027-01-01':1
  };
  function parts(){
    var values=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),out={};
    values.forEach(function(part){out[part.type]=part.value;});
    return out;
  }
  function setPicker(select){
    if(select.dataset.ready)return;
    select.innerHTML='<option value="">Choose language…</option>'+LANGUAGES.map(function(item){return '<option value="'+item[0]+'">'+item[1]+'</option>';}).join('');
    select.dataset.ready='1';
    select.addEventListener('change',function(){
      if(!select.value)return;
      window.open('https://translate.google.com/translate?sl=auto&tl='+encodeURIComponent(select.value)+'&u='+encodeURIComponent(location.href),'_blank','noopener');
      select.value='';
    });
  }
  function tick(){
    var now=parts(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),holidays=window.__TWHOL||TAIWAN_HOLIDAYS,minutes=parseInt(now.hour,10)*60+parseInt(now.minute,10),online=['Mon','Tue','Wed','Thu','Fri'].indexOf(now.weekday)>=0&&minutes>=540&&minutes<1050&&!holidays[date],time=now.hour+':'+now.minute;
    document.querySelectorAll('[data-taipei-time]').forEach(function(el){el.textContent=time+' Taipei';});
    document.querySelectorAll('[data-hq-status]').forEach(function(el){el.classList.toggle('is-online',online);el.classList.toggle('is-offline',!online);});
    document.querySelectorAll('[data-hq-label]').forEach(function(el){el.textContent=online?'Working':'Resting';});
    document.querySelectorAll('[data-translate-select]').forEach(setPicker);
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
