/* Curated source-linked assembly concepts; catalogue photos remain separate. */
(function(){
  'use strict';
  let current=null, refs=null;
  function t(key){let id='en';try{id=localStorage.getItem('bl_lang')||id;}catch(_){}const languages=window.BL_SITE?.languages||[];return(languages.find(l=>l.id===id)?.text[key])||languages[0]?.text[key]||key;}
  function render(model){
    current=model;
    const host=document.getElementById('bd-reference-caption');
    if(!host)return;
    if(!refs){const node=document.getElementById('studio-references');if(!node)return;refs=JSON.parse(node.textContent).references;}
    const reference=refs.find(r=>r.model===model.name);
    host.replaceChildren();host.hidden=!reference;
    const empty=document.querySelector('.bd-anatomy-empty');if(empty)empty.textContent=t('srNoImage');
    if(!reference)return;
    const image=document.getElementById('bd-anatomy-image');if(image)image.alt=t(reference.caption);
    const title=document.createElement('strong');title.textContent=t('srTitle');host.append(title);
    const caption=document.createElement('p');caption.textContent=t(reference.caption);host.append(caption);
    const scope=document.createElement('p');scope.className='sr-scope';scope.textContent=t('srScope');host.append(scope);
    const sources=document.createElement('div');sources.className='sr-sources';
    const label=document.createElement('span');label.textContent=t('srSources');sources.append(label);
    reference.sources.forEach(source=>{const a=document.createElement('a');a.href=source.url;a.textContent=source.title;a.target='_blank';a.rel='noopener noreferrer';sources.append(a);});host.append(sources);
    const options=document.createElement('p');options.className='sr-options';options.textContent=t('srOptions');host.append(options);
  }
  window.BL_STUDIO_REFERENCE={render};
  window.addEventListener('bl:lang',()=>{if(current)render(current);});
  window.addEventListener('storage',e=>{if(e.key==='bl_lang'&&current)render(current);});
})();
