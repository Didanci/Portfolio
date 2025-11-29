/* particles.js — lightweight background particle canvas
   - Renders subtle particles behind content using the existing #particle-bg canvas
   - Respects prefers-reduced-motion: if user prefers reduced motion, the animation is disabled
   - DevicePixelRatio-aware and resizes with the window
   - Performance-conscious: moderate particle count and cheap drawing
*/
(function () {
  function qs(sel) { return document.querySelector(sel); }
  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var canvas = qs('#particle-bg');
    if (!canvas) return;

    // if there's a background VFX video, keep a handle to pause it when reduced motion is requested
    var bgVideo = qs('#bg-vfx');
    if (bgVideo && prefersReducedMotion()) {
      try { bgVideo.pause(); bgVideo.style.display = 'none'; } catch (e) { /* ignore */ }
    } else if (bgVideo) {
      // slightly slow the background video for a more cinematic feel
      try { bgVideo.playbackRate = 0.9; } catch (e) { /* ignore */ }
    }

    // keep canvas non-interactive
    canvas.style.pointerEvents = 'none';

    var ctx = canvas.getContext('2d');
    var dpr = Math.max(1, window.devicePixelRatio || 1);

    var w = 0, h = 0;
    var particles = [];
    var rafId = null;
    var particleCount = 70; // moderate count — responsive below

    function resize() {
      var rectW = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      var rectH = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      w = rectW;
      h = rectH;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // adapt particle count a bit by viewport size (smaller screens: fewer particles)
      var area = (w * h) / (1280 * 720);
      particleCount = Math.round(60 * Math.min(Math.max(area, 0.5), 2));
      if (particleCount < 25) particleCount = 25;
      if (particleCount > 120) particleCount = 120;

      initParticles();
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function initParticles() {
      particles.length = 0;
      for (var i = 0; i < particleCount; i++) {
        particles.push({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(0.6, 3.6),
          vx: rand(-0.15, 0.15),
          vy: rand(-0.05, 0.05),
          alpha: rand(0.12, 0.7),
          hue: rand(20, 40) // warm orange-ish hue range
        });
      }
    }

    function draw() {
      if (!ctx) return;

      ctx.clearRect(0, 0, w, h);

      // faint radial vignette to add depth (cheap)
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(4,4,4,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // draw particles
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        // soft circular glow
        var radial = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        // pick a warm gradient using hue and alpha
        var c1 = 'hsla(' + Math.round(p.hue) + ', 95%, 60%, ' + (p.alpha * 0.9) + ')';
        var c2 = 'hsla(' + Math.round(p.hue + 10) + ', 85%, 46%, ' + (p.alpha * 0.06) + ')';
        radial.addColorStop(0, c1);
        radial.addColorStop(0.5, c2);
        radial.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function step() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // slight drift and wrap
        if (p.x < -50) p.x = w + 50;
        if (p.x > w + 50) p.x = -50;
        if (p.y < -50) p.y = h + 50;
        if (p.y > h + 50) p.y = -50;

        // gentle oscillation
        p.vx += Math.sin((i + Date.now() * 0.0002)) * 0.0006;
        p.vy += Math.cos((i + Date.now() * 0.00015)) * 0.0004;

        // clamp velocities
        p.vx = Math.max(Math.min(p.vx, 0.6), -0.6);
        p.vy = Math.max(Math.min(p.vy, 0.6), -0.6);
      }

      draw();
      rafId = requestAnimationFrame(step);
    }

    // If the user prefers reduced motion, render a single static soft glow (or no animation)
    if (prefersReducedMotion()) {
      // fill a few large soft glows and stop
      resize();
      ctx.clearRect(0, 0, w, h);
      var staticParticles = [
        {x: w*0.2, y: h*0.25, r: 60, hue: 28, alpha: 0.12},
        {x: w*0.75, y: h*0.35, r: 40, hue: 34, alpha: 0.08},
        {x: w*0.5, y: h*0.7, r: 90, hue: 30, alpha: 0.06}
      ];
      ctx.globalCompositeOperation = 'lighter';
      for (var j=0;j<staticParticles.length;j++){
        var sp = staticParticles[j];
        var rgrad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r*6);
        rgrad.addColorStop(0, 'hsla('+Math.round(sp.hue)+',90%,60%,'+(sp.alpha*0.95)+')');
        rgrad.addColorStop(0.6, 'hsla('+Math.round(sp.hue+6)+',85%,46%,'+(sp.alpha*0.06)+')');
        rgrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rgrad;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r*6, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      return; // no animation
    }

    // normal animated path
    resize();
    window.addEventListener('resize', function () { clearTimeout(window._particleResizeTimer); window._particleResizeTimer = setTimeout(resize, 120); });

    initParticles();
    rafId = requestAnimationFrame(step);

    // cleanup when page unloads
    window.addEventListener('beforeunload', function () { if (rafId) cancelAnimationFrame(rafId); });
  });
})();
