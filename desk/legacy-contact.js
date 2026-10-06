(function(){try{var D=JSON.parse(document.getElementById('outlook-data').textContent);var BB=(D.partner&&D.partner.birdbot)||{};
// One calm static line per section (replaces the old scripted fake-AI chat)
Object.keys(BB).forEach(function(id){var sec=document.getElementById(id);if(!sec)return;var body=sec.querySelector('.blk-b');if(!body)return;var b=BB[id]||{};
 if(!b.simple)return;var d=document.createElement('div');d.className='plain';
 d.innerHTML='<b>In plain terms</b>';d.appendChild(document.createTextNode(b.simple));
 body.insertBefore(d,body.firstChild);});}catch(e){}})();