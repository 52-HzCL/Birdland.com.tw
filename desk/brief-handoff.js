(function(){
  var toolIds=['p-landed2','p-margin','p-reorder','p-sail','p-cduty'];
  var brief=document.getElementById('bd-brief');
  if(brief)brief.setAttribute('data-share-print-target','buyer-brief');
  toolIds.forEach(function(id){
    var sec=document.getElementById(id);if(!sec||sec.querySelector('.bd-tool-share'))return;
    sec.setAttribute('data-share-print-target',id);
    var body=sec.querySelector('.blk-b');if(!body)return;
    body.insertAdjacentHTML('afterbegin','<div class="bd-tool-share" aria-label="Keep this result"><button type="button" class="bd-act" data-share-action="share" data-share-target="'+id+'" aria-label="Share this result"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.4V3.8"/><path d="m8 7.6 4-3.8 4 3.8"/><path d="M5 12.8v5.9a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-5.9"/></svg><span class="bd-act-tip">Share</span></button><button type="button" class="bd-act" data-share-action="print" data-share-target="'+id+'" aria-label="Print this result or save it as a PDF"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9.4V3.5h10v5.9"/><path d="M7 18H5.2A1.7 1.7 0 0 1 3.5 16.3v-5.2A1.7 1.7 0 0 1 5.2 9.4h13.6a1.7 1.7 0 0 1 1.7 1.7v5.2A1.7 1.7 0 0 1 18.8 18H17"/><rect x="7" y="14.4" width="10" height="6.1" rx="1.1"/></svg><span class="bd-act-tip">Print · save PDF</span></button><span class="bd-share-status" aria-live="polite"></span></div>');
  });
  function status(btn,msg){var bar=btn.closest('.bd-actbar,.bd-tool-share'),out=bar&&bar.querySelector('.bd-share-status');if(out)out.textContent=msg;}
  function textFor(target){var el=document.getElementById(target);if(!el)return '';var title=(el.querySelector('h1,h2')||{}).textContent||'Birdland AsiaSource';return title.trim()+'\n\n'+el.innerText.replace(/\s+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()+'\n\nSource: birdland.com.tw/partner.html';}
  function printTarget(target,btn){var el=document.getElementById(target);if(!el)return;var sheet=el.cloneNode(true);sheet.removeAttribute('id');sheet.classList.add('bd-print-sheet');document.body.appendChild(sheet);document.body.classList.add('bd-printing');status(btn,'Print dialog opened — choose Save as PDF.');var done=function(){document.body.classList.remove('bd-printing');if(sheet&&sheet.parentNode)sheet.parentNode.removeChild(sheet);window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);window.setTimeout(function(){window.print();},40);}
  document.addEventListener('click',function(e){var btn=e.target.closest&&e.target.closest('[data-share-action]');if(!btn)return;var target=btn.getAttribute('data-share-target'),txt=textFor(target),action=btn.getAttribute('data-share-action');
    if(action==='print'){printTarget(target,btn);return;}
    var url=location.origin+location.pathname+(target==='bd-brief'?'#overview':'#'+target),title=(document.getElementById(target)&&document.getElementById(target).querySelector('h1,h2')||{}).textContent||'Birdland AsiaSource';
    if(navigator.share){navigator.share({title:title.trim(),text:txt,url:url}).then(function(){status(btn,'Shared from this device.');}).catch(function(err){if(err&&err.name!=='AbortError')status(btn,'Share was not completed.');});}
    else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt+'\n\n'+url).then(function(){status(btn,'Copied a share-ready result.');}).catch(function(){status(btn,'Copy was blocked; use your browser menu to share.');});}
    else{status(btn,'Use your browser menu to share this result.');}
  });
})();