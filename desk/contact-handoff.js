
  // AsiaSource already asks for a commercial region and drives the whole
  // desk from it, so the enquiry follows that choice rather than asking twice.
  // Nothing composes an address until the button is actually pressed.
  document.addEventListener('DOMContentLoaded',function(){
   var btn=document.getElementById('bb-email'),room=document.getElementById('room'),label=document.getElementById('bb-desk');
   if(!btn||!window.blMail)return;
   function regionNow(){return (room&&window.blMail.fromRoom[room.value])||window.blMail.recall('bl_mr_region','global');}
   function syncLabel(){if(label)label.textContent=window.blMail.deskName(regionNow(),'','full');}
   if(room)room.addEventListener('change',syncLabel);
   btn.addEventListener('click',function(){
    var m=btn.__mail||{};
    window.blMail.open(regionNow(),window.blMail.recall('bl_mr_line',''),m.subject||'Birdland OEM enquiry',m.body||'',(window.BL_DESK==='cost'?'cost':'brief'));
   });
   syncLabel();
  });
