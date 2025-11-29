(function(){
  'use strict';
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));

  // THEME TOGGLE
  const themeBtn = qs('#theme-toggle');
  const stored = localStorage.getItem('theme');
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = stored || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', initial);

  function toggleTheme(){
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeBtn.setAttribute('aria-pressed', next === 'light');
  }

  if(themeBtn){
    themeBtn.addEventListener('click', toggleTheme);
    themeBtn.setAttribute('aria-pressed', document.documentElement.getAttribute('data-theme') === 'light');
  }

  // SHIMMER: Attach shimmer to media and remove on load
  function wireShimmer(){
    // images
    qsa('img[loading="lazy"]').forEach(img => {
      img.classList.add('shimmer');
      if(img.complete){
        img.classList.remove('shimmer');
      } else {
        img.addEventListener('load', ()=> img.classList.remove('shimmer'), {once:true});
        img.addEventListener('error', ()=> img.classList.remove('shimmer'), {once:true});
      }
    });

    // videos
    qsa('video').forEach(video => {
      // don't add shimmer to background bg-vfx
      if(video.id === 'bg-vfx') return;
      video.classList.add('shimmer');
      const remove = () => video.classList.remove('shimmer');
      video.addEventListener('loadedmetadata', remove, {once:true});
      video.addEventListener('canplay', remove, {once:true});
      video.addEventListener('error', remove, {once:true});
    });
  }

  // PROJECT HOVER PREVIEW
  function wireHoverPreviews(){
    qsa('.project-thumbnail').forEach(th => {
      let previewEl = null;
      const previewSrc = th.dataset.preview || th.dataset.previewWebm || th.dataset.previewSrc;

      function showPreview(){
        if(!previewSrc) return; // nothing to show
        if(previewEl) return;
        previewEl = document.createElement('video');
        previewEl.className = 'thumbnail-preview';
        previewEl.muted = true;
        previewEl.loop = true;
        previewEl.playsInline = true;
        previewEl.autoplay = true;
        previewEl.src = previewSrc;
        // keep it non-interactive
        previewEl.setAttribute('aria-hidden','true');
        th.appendChild(previewEl);
        // try to play (handle promise rejection silently)
        const p = previewEl.play();
        if(p && p.catch){ p.catch(()=>{}); }
        th.classList.add('show-preview');
      }

      function hidePreview(){
        if(!previewEl) return;
        try{ previewEl.pause(); }catch(e){}
        th.removeChild(previewEl);
        previewEl = null;
        th.classList.remove('show-preview');
      }

      th.addEventListener('mouseenter', showPreview);
      th.addEventListener('focus', showPreview);
      th.addEventListener('mouseleave', hidePreview);
      th.addEventListener('blur', hidePreview);
      // on touch, toggle a tap
      th.addEventListener('touchstart', function onTouch(e){
        // toggle preview on touchstart
        if(previewEl) hidePreview(); else showPreview();
        // allow click to propagate
      }, {passive: true});
    });
  }

  // Initialize after DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { wireShimmer(); wireHoverPreviews(); });
  } else {
    wireShimmer(); wireHoverPreviews();
  }

})();
