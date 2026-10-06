(function(){
 var installBtn=document.getElementById('install-app');
 var installNote=document.getElementById('install-note');
 if(!installBtn||!installNote)return;
 var deferredPrompt=null;
 function setNote(text){installNote.textContent=text;}
 function installed(){return window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches;}
 if(installed()){
   installBtn.hidden=true;
   setNote('AsiaSource is already installed on this device.');
 }
 if('serviceWorker' in navigator){
   navigator.serviceWorker.register('service-worker.js').catch(function(){setNote('Offline install support is unavailable in this browser session.');});
 }else{
   setNote('Secure install works best in Chrome or Edge; it stays on this device and can be removed anytime.');
 }
 window.addEventListener('beforeinstallprompt',function(e){
   e.preventDefault();
   deferredPrompt=e;
   installBtn.hidden=false;
   setNote('Secure one-click return visits on this device — no account change, remove anytime.');
 });
 window.addEventListener('appinstalled',function(){
   deferredPrompt=null;
   installBtn.hidden=true;
   setNote('AsiaSource securely installed. Reopen it from your desktop or app launcher.');
 });
 installBtn.addEventListener('click',function(){
   if(!deferredPrompt){
     setNote(installed()?'AsiaSource is already installed on this device.':'Use your browser menu to securely install or add this page to your home screen.');
     return;
   }
   deferredPrompt.prompt();
   deferredPrompt.userChoice.then(function(choice){
     if(choice&&choice.outcome!=='accepted')setNote('Install was dismissed. You can try again from this browser later.');
   });
 });
})();