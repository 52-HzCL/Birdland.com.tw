(function(){
  var clocks=[].slice.call(document.querySelectorAll('[data-taipei-time]'));
  function tick(){var now=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Taipei'}));var v=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});clocks.forEach(function(el){el.textContent=v+' Taipei';});}
  tick(); setInterval(tick,60000);
}());
