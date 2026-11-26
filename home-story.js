(() => {
  'use strict';
  const rail = document.querySelector('.story-rail');
  if (!rail) return;
  const steps = Array.from(rail.querySelectorAll('.story-steps > li'));
  const images = steps.map(step => step.querySelector('.story-art'));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const panel = document.createElement('div');
  panel.className = 'story-panel';
  panel.innerHTML = '<div class="story-screen"><div class="story-folio"><div class="story-copy" aria-hidden="true"></div><div class="story-invitation"></div></div><div class="story-film" aria-hidden="true"></div></div><div class="story-controls"><nav class="story-progress" aria-labelledby="story-title"></nav></div>';

  const copy = panel.querySelector('.story-copy');
  const invitation = panel.querySelector('.story-invitation');
  const film = panel.querySelector('.story-film');
  const poster = new Image();
  poster.alt = '';
  poster.width = 1152;
  poster.height = 768;
  poster.src = images[0].src;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.tabIndex = -1;
  const formats = [
    ['studio.mp4','video/mp4; codecs="avc1.640020"'],
    ['studio.webm','video/webm; codecs="vp9"']
  ].filter(([,type]) => video.canPlayType(type));
  film.append(poster, video);
  const progress = panel.querySelector('nav');
  const links = steps.map(step => {
    const link = document.createElement('a');
    link.href = '#' + step.id;
    link.setAttribute('aria-label', step.querySelector('h2').textContent);
    if (step === steps[0]) link.addEventListener('click',event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null,'',link.hash);
      window.scrollTo({top:0,behavior:'instant'});
    });
    progress.append(link);
    return link;
  });
  panel.querySelector('.story-controls').append(document.querySelector('.story-skip').cloneNode(true));
  rail.prepend(panel);

  let active = -1;
  let inView = true;
  let animation = 0;
  let requested = 0;
  let sourceIndex = -1;
  let loaded = false;
  let wholeFile = null;
  let fileRequest = null;

  function showCopy(index) {
    if (index === active) return;
    const source = steps[index].querySelector('.story-step-copy');
    copy.replaceChildren(...Array.from(source.children)
      .filter(item => !item.matches('a')).map(item => item.cloneNode(true)));
    const action = source.querySelector('.story-project');
    invitation.replaceChildren(...(action ? [action.cloneNode(true)] : []));
    links.forEach((link,i) => {
      if (i === index) link.setAttribute('aria-current','step');
      else link.removeAttribute('aria-current');
    });
    poster.src = images[index].src;
    active = index;
  }

  function openNextFormat() {
    if (fileRequest) fileRequest.abort();
    fileRequest = null;
    if (wholeFile) URL.revokeObjectURL(wholeFile);
    wholeFile = null;
    sourceIndex++;
    loaded = false;
    film.classList.remove('has-film');
    if (sourceIndex >= formats.length) {
      layout();
      return;
    }
    video.src = new URL(formats[sourceIndex][0],images[0].src).href;
  }

  // A static host can deliver a valid movie with HTTP 200 yet expose a zero
  // seekable range. Decode one complete same-origin file in that case.
  async function loadSeekableFile() {
    if (fileRequest || wholeFile) return;
    const controller = new AbortController();
    fileRequest = controller;
    loaded = false;
    film.classList.remove('has-film');
    try {
      const response = await fetch(video.currentSrc,{signal:controller.signal});
      if (!response.ok) throw new Error('Movie unavailable');
      const data = await response.blob();
      if (fileRequest !== controller) return;
      wholeFile = URL.createObjectURL(data);
      video.src = wholeFile;
    } catch (error) {
      if (error.name !== 'AbortError' && fileRequest === controller) openNextFormat();
    } finally {
      if (fileRequest === controller) fileRequest = null;
    }
  }
  function seek() {
    if (!loaded || video.seeking || !rail.classList.contains('is-interactive')) return;
    // One second of the paused 24 fps film corresponds to one chapter.
    // Never play on a timer. The visitor can stop or reverse at any point.
    if (requested > 0 && !wholeFile && (!video.seekable.length || video.seekable.end(video.seekable.length-1) < .01)) {
      loadSeekableFile();
      return;
    }
    if (Math.abs(video.currentTime - requested) > .018) {
      video.currentTime = requested;
    } else {
      film.classList.add('has-film');
    }
  }
  video.addEventListener('loadeddata', () => { loaded = true; schedule(); });
  video.addEventListener('seeked', () => {
    if (Math.abs(video.currentTime - requested) <= .025) film.classList.add('has-film');
    seek();
  });
  video.addEventListener('error', openNextFormat);

  function paint() {
    animation = 0;
    if (!inView || !rail.classList.contains('is-interactive')) return;
    const stride = steps[0].getBoundingClientRect().height;
    const top = rail.getBoundingClientRect().top;
    const origin = Math.max(0,top + scrollY);
    const elapsed = -top / stride;
    const position = Math.min(steps.length-1, Math.max(0,
      elapsed < 1 ? scrollY / (stride + origin) : elapsed));
    const index = Math.round(position);
    showCopy(index);
    const pen = Math.round(position * 24);
    requested = pen / 24;
    // Keep the same single render at rest. Only letterpress and annotation ink
    // change opacity at a chapter boundary; the underlying film is continuous.
    const distance = Math.abs(position-index);
    copy.style.setProperty('--chapter-ink',String(Math.min(1,.38 + (.5-distance)*5)));
    const reply = Math.max(0,Math.min(1,index === 0 ? position/.28 : (position-index+.5)/.5));
    copy.style.setProperty('--reply-ink',String(reply));
    copy.style.setProperty('--reply-rise',((1-reply)*5)+'px');
    if (sourceIndex < 0 && (position > 0 || document.readyState === 'complete')) openNextFormat();
    seek();
  }
  function schedule() {
    if (!animation && inView) animation = requestAnimationFrame(paint);
  }
  function layout() {
    const header = document.querySelector('.bj-nav') || document.querySelector('.bl-header');
    if (header) rail.style.setProperty('--home-nav-height',Math.ceil(header.getBoundingClientRect().height)+'px');
    const fit = innerHeight >= (innerWidth <= 760 ? 575 : 490) && innerWidth >= 300;
    const mediaOK = formats.length && sourceIndex < formats.length;
    const enabled = fit && mediaOK && !motion.matches && !navigator.connection?.saveData;
    rail.classList.toggle('is-interactive',Boolean(enabled));
    const originalAction = rail.querySelector('.story-steps .story-project');
    if (enabled) originalAction.tabIndex = -1;
    else originalAction.removeAttribute('tabindex');
    schedule();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) schedule();
    },{rootMargin:'160px'}).observe(rail);
  }
  showCopy(0);
  motion.addEventListener('change',layout);
  addEventListener('pageshow',layout);
  addEventListener('load',layout,{once:true});
  addEventListener('resize',layout);
  addEventListener('scroll',schedule,{passive:true});
  layout();
})();
