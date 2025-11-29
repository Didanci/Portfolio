// Lightweight modal wiring for project thumbnails
// - Opens #project-modal when a .project-thumbnail is activated (click/Enter/Space)
// - Loads the data-video URL into #project-video and fills description
// - Adds keyboard support (Esc to close) and clicking outside to close

(function () {
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  document.addEventListener('DOMContentLoaded', function () {
    var thumbnails = qsa('.project-thumbnail');
    var modal = qs('#project-modal');
    var videoEl = qs('#project-video');
    var descEl = qs('.description-container');
    var closeBtn = qs('#close-modal');

    if (!modal || !videoEl || !closeBtn) return;

    var _prevActive = null;
    var _focusHandler = null;

    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      var focusable = Array.from(modal.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])')).filter(function(el){ return !el.hasAttribute('disabled'); });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function openModal(videoSrc, description, title) {
      try {
        console.log('[project-modal] opening modal for', videoSrc);
        // set video source in a straightforward way (works more reliably across browsers)
        videoEl.pause();
        videoEl.removeAttribute('src');
        // remove child <source> nodes if any
        while (videoEl.firstChild) videoEl.removeChild(videoEl.firstChild);

        // assign src directly and load
        videoEl.src = videoSrc;
        videoEl.load();

        // fill description
        if (descEl) descEl.innerHTML = '<h3 style="margin-top:0;">'+(title || '')+'</h3><p>'+ (description || '') +'</p>';

        // show modal with an 'opening' class to run CSS animation
        modal.classList.add('visible', 'opening');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');

        // when animation finishes, remove the opening class
        var onAnim = function () {
          modal.classList.remove('opening');
          modal.removeEventListener('animationend', onAnim);
        };
        modal.addEventListener('animationend', onAnim);

  // focus close btn for accessibility
  _prevActive = document.activeElement;
  closeBtn.focus();
  // add focus trap
  _focusHandler = function(e){ trapFocus(e); };
  document.addEventListener('keydown', _focusHandler);

        // play (may be blocked by autoplay policies)
        videoEl.play().catch(function(err){
          console.warn('[project-modal] autoplay blocked or play failed:', err && err.message);
        });
      } catch (err) {
        console.error('[project-modal] failed to open modal for', videoSrc, err);
      }
    }

    function closeModal() {
      modal.classList.remove('visible', 'opening');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      try { videoEl.pause(); } catch(e){}
      try {
        // unset src and load empty to stop network activity
        videoEl.removeAttribute('src');
        while (videoEl.firstChild) videoEl.removeChild(videoEl.firstChild);
        videoEl.load();
      } catch (e) { /* ignore */ }
      if (descEl) descEl.innerHTML = '';
      // remove focus trap and restore previous focus
      try { document.removeEventListener('keydown', _focusHandler); } catch(e){}
      try { if (_prevActive && typeof _prevActive.focus === 'function') _prevActive.focus(); } catch(e){}
    }

    // attach an error handler to provide useful debug info if a file fails to load
    videoEl.addEventListener('error', function (ev) {
      var err = videoEl.error;
      console.error('[project-modal] video element error', err);
      // show a friendly message inside the modal description area
      if (descEl) descEl.innerHTML = '<p style="color:#f8d7da;background:#3a1313;padding:12px;border-radius:8px;">Could not load the video. Check the file exists and the browser supports its codec. See console for details.</p>';
    });

    function guessMime(url) {
      if (!url) return 'video/mp4';
      var u = url.split('?')[0];
      var ext = u.split('.').pop().toLowerCase();
      if (ext === 'webm') return 'video/webm';
      if (ext === 'ogv' || ext === 'ogg') return 'video/ogg';
      return 'video/mp4';
    }

    // click & keyboard handlers on thumbnails
    thumbnails.forEach(function (thumb) {
      // allow Enter/Space to open as well
      thumb.addEventListener('click', function (e) {
        var videoSrc = thumb.dataset.video;
        var desc = thumb.dataset.description || '';
        var title = (thumb.querySelector('.hover-text') && thumb.querySelector('.hover-text').textContent) || thumb.getAttribute('aria-label') || '';
        if (videoSrc) openModal(videoSrc, desc, title);
      });

      thumb.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          thumb.click();
        }
      });
    });

    // scroll-triggered reveal for thumbnails (IntersectionObserver)
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var t = entry.target;
          var idx = thumbnails.indexOf(t);
          var delay = Math.min(6, Math.max(0, idx)) * 80; // stagger based on index (clamped)
          if (entry.isIntersecting) {
            // staggered delay so items animate in sequence
            try { t.style.transitionDelay = delay + 'ms'; } catch(e){}
            t.classList.add('in-view');
          } else {
            // remove class and reset delay so it can replay cleanly
            t.classList.remove('in-view');
            try { t.style.transitionDelay = '0ms'; } catch(e){}
          }
        });
      }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      thumbnails.forEach(function (t) { io.observe(t); });
    } else {
      // fallback: make them visible (no replay capability)
      thumbnails.forEach(function (t) { t.classList.add('in-view'); });
    }

    // close button
    closeBtn.addEventListener('click', function () { closeModal(); });

    // click outside to close (click on modal background but not on .modal-content)
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    // ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('visible')) closeModal();
    });

  });
})();
