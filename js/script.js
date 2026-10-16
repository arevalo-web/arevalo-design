/* arevalo.design — home interactions
   Every hook is null-guarded, so this is safe to keep in a shared
   script.js: on pages without these elements it simply does nothing. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  
  /* 3) Light / Dark theme switch — one button toggles the opposite (remembers choice) */
  var sw = document.querySelector('.theme-switch');
  if (sw) {
    var apply = function (dark) {
      root.classList.toggle('theme-dark', dark);
      sw.setAttribute('aria-pressed', dark ? 'true' : 'false');
      sw.setAttribute('aria-label', 'Dark mode');
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    };
    sw.addEventListener('click', function () {
      apply(!root.classList.contains('theme-dark'));
    });
    apply(root.classList.contains('theme-dark')); // sync with the theme set in <head>
  }
})();

/* =========================================================
   GALLERY — ledger + vertical popup: fixed square picture on top (CSS-sized,
   no JS resizing), all text underneath, controls at the bottom. Multi-image
   projects scroll with dots; click-to-zoom; one-time nudge; inert page; Tab loop.
   ========================================================= */
(function () {
  var grid = document.getElementById('gallery-grid');
  if (!grid || !Array.isArray(window.GALLERY)) return;

  var items = window.GALLERY;
  var COLS = 3;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cell = function (cls) {
    var d = document.createElement('div');
    d.className = 'g-cell' + (cls ? ' ' + cls : '');
    return d;
  };

  var tile = function (item, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'g-item reveal';
    b.style.setProperty('--d', ((i % COLS) * 0.1) + 's');
    b.setAttribute('data-index', i);
    b.setAttribute('data-id', item.id || String(i + 1));
    b.innerHTML =
      '<div class="g-media">' +
        '<img src="' + item.img + '" alt="' + (item.alt || item.title || '') + '" loading="lazy">' +      '</div>' +
      '<div class="g-label">' +
        '<span class="g-meta">' +
          '<span class="g-title h1">' + (item.title || 'Untitled') + '</span>' +
          '<span class="g-date">' + (item.date || '') + '</span>' +
        '</span>' +
      '</div>';
    return b;
  };

  var footerAnchor = document.getElementById('g-footer-cell');
  var frag = document.createDocumentFragment();
  var rows = Math.ceil(items.length / COLS);
  for (var r = 0; r < rows; r++) {
    frag.appendChild(cell('border-r border-b'));
    for (var c = 0; c < COLS; c++) {
      if (c > 0) frag.appendChild(cell('border-l border-r border-b'));
      var i = r * COLS + c;
      frag.appendChild(i < items.length ? tile(items[i], i) : cell('border-b'));
    }
    frag.appendChild(cell('border-l border-b'));
  }
  grid.insertBefore(frag, footerAnchor);
  var tiles = Array.prototype.slice.call(grid.querySelectorAll('.g-item'));

  /* ---------- Lightbox ---------- */
  var lb = document.createElement('div');
  lb.className = 'lightbox lightbox--gallery';
  lb.hidden = true;
  lb.innerHTML =
    '<div class="lightbox__backdrop"></div>' +
    '<div class="lightbox__panel" role="dialog" aria-modal="true" aria-label="Project detail">' +
      '<div class="lightbox__media">' +
        '<div class="lightbox__slides"></div>' +
        '<div class="lightbox__dots"></div>' +
        '<div class="lightbox__zoom" hidden><img alt=""></div>' +
      '</div>' +
      '<div class="lightbox__body">' +
        '<h2 class="lightbox__title h1"></h2>' +
        '<span class="lightbox__date"></span>' +
        '<span class="lightbox__meta thin"></span>' +
        '<p class="lightbox__summary"></p>' +
      '</div>' +
      '<div class="lightbox__bar">' +
        '<span class="lightbox__ctrl">' +
          '<button class="lightbox__prev h2" type="button" aria-label="Previous project">[&#10094;]</button>' +
          '<button class="lightbox__next h2" type="button" aria-label="Next project">[&#10095;]</button>' +
          '<button class="lightbox__close h2" type="button">[Close]</button>' +
        '</span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(lb);

  var panel    = lb.querySelector('.lightbox__panel');
  var lbMedia  = lb.querySelector('.lightbox__media');
  var lbSlides = lb.querySelector('.lightbox__slides');
  var lbDots   = lb.querySelector('.lightbox__dots');
  var lbZoom   = lb.querySelector('.lightbox__zoom');
  var zImg     = lbZoom.querySelector('img');
  var lbBody   = lb.querySelector('.lightbox__body');
  var lbTitle  = lb.querySelector('.lightbox__title');
  var lbDate   = lb.querySelector('.lightbox__date');
  var lbMeta   = lb.querySelector('.lightbox__meta');
  var lbSum    = lb.querySelector('.lightbox__summary');
  var lbClose  = lb.querySelector('.lightbox__close');
  var lbPrev   = lb.querySelector('.lightbox__prev');
  var lbNext   = lb.querySelector('.lightbox__next');
  var sheet    = document.querySelector('.sheet');
  var current = -1, lastFocus = null;
  var nudgeTimer;

  /* ---- multi-image dots follow the scroll ---- */
  function setDot(n) {
    Array.prototype.forEach.call(lbDots.children, function (d, k) { d.classList.toggle('is-on', k === n); });
  }
  lbSlides.addEventListener('scroll', function () {
    setDot(Math.round(lbSlides.scrollTop / (lbSlides.clientHeight || 1)));
  }, { passive: true });

  /* ---- click-to-zoom ---- */
  function zoomOut() { lbZoom.hidden = true; zImg.removeAttribute('src'); }
  function zoomIn(src, e) {
    var box = lbMedia.getBoundingClientRect();
    var px = (e.clientX - box.left) / box.width, py = (e.clientY - box.top) / box.height;
    zImg.onload = null;
    var place = function () {
      lbZoom.scrollLeft = px * Math.max(0, zImg.offsetWidth  - lbZoom.clientWidth);
      lbZoom.scrollTop  = py * Math.max(0, zImg.offsetHeight - lbZoom.clientHeight);
    };
    zImg.src = src;
    lbZoom.hidden = false;
    if (zImg.complete && zImg.naturalWidth) place(); else zImg.onload = place;
  }
  lbSlides.addEventListener('click', function (e) {
    var im = e.target.closest('img');
    if (im) zoomIn(im.currentSrc || im.src, e);
  });
  lbZoom.addEventListener('click', zoomOut);

  /* ---- one-time nudge (once per visit; stops if the visitor scrolls first) ---- */
  var nudged = false;
  try { nudged = sessionStorage.getItem('galleryNudged') === '1'; } catch (e) {}
  function markNudged() { nudged = true; try { sessionStorage.setItem('galleryNudged', '1'); } catch (e) {} }
  ['wheel', 'touchstart'].forEach(function (t) { lbSlides.addEventListener(t, markNudged, { passive: true }); });
  function nudge() {
    clearTimeout(nudgeTimer);
    if (reduce || nudged || lbDots.hidden) return;
    nudgeTimer = setTimeout(function () {
      if (lb.hidden || !lbZoom.hidden || lbSlides.scrollTop > 0 || nudged) return;
      markNudged();
      lbSlides.style.scrollSnapType = 'none';
      lbSlides.scrollTo({ top: 40, behavior: 'smooth' });
      setTimeout(function () {
        lbSlides.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(function () { lbSlides.style.scrollSnapType = ''; }, 450);
      }, 500);
    }, 900);
  }

  function fill(i) {
    var item = items[i]; if (!item) return;
    current = i;
    zoomOut();

    var imgs = (item.images && item.images.length) ? item.images : [item.img];
    lbSlides.innerHTML = '';
    lbDots.innerHTML = '';
    imgs.forEach(function (src, n) {
      var im = document.createElement('img');
      im.alt = (item.alt || item.title || '') + (imgs.length > 1 ? ' (' + (n + 1) + ' of ' + imgs.length + ')' : '');
      if (n > 0) im.loading = 'lazy';
      if (item.fit === 'contain') im.className = 'is-contain';   // optional per-item: show the whole picture, no crop
      im.src = src;
      lbSlides.appendChild(im);
      if (imgs.length > 1) {
        var d = document.createElement('button');
        d.type = 'button'; d.className = 'lightbox__dot';
        d.setAttribute('aria-label', 'Show image ' + (n + 1) + ' of ' + imgs.length);
        d.addEventListener('click', function () {
          lbSlides.scrollTo({ top: n * lbSlides.clientHeight, behavior: reduce ? 'auto' : 'smooth' });
        });
        lbDots.appendChild(d);
      }
    });
    lbSlides.scrollTop = 0;
    lbDots.hidden = imgs.length < 2;
    setDot(0);

    lbTitle.textContent = item.title || 'Untitled';
    lbDate.hidden = true;   // the date now lives in the meta line
    var meta = [item.date, item.medium, item.dimensions].filter(Boolean).map(function (s) { return s.trim(); }).join(' | ');    lbMeta.textContent = meta;
    lbMeta.hidden = !meta;
    lbSum.textContent = (item.summary || '').replace(/\s+(\S+)\s*$/, '\u00a0$1');   // no one-word last line
    lbBody.scrollTop = 0;

    nudge();
  }

  function open(btn) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    fill(parseInt(btn.getAttribute('data-index'), 10) || 0);
    if (sheet) sheet.inert = true;
    document.documentElement.classList.add('lb-open');

    if (reduce) { lb.classList.add('is-open'); lbClose.focus(); return; }

    var media = btn.querySelector('.g-media') || btn;
    var first = media.getBoundingClientRect();
    requestAnimationFrame(function () {
      var last = panel.getBoundingClientRect();
      var sx = first.width / last.width, sy = first.height / last.height;
      var tx = first.left - last.left, ty = first.top - last.top;
      panel.style.transformOrigin = 'top left';
      panel.style.transition = 'none';
      panel.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sx + ',' + sy + ')';
      requestAnimationFrame(function () {
        lb.classList.add('is-open');
        panel.style.transition = 'transform .3s cubic-bezier(.2,.7,.2,1)';
        panel.style.transform = '';
      });
    });
    lbClose.focus();
  }

  function go(delta) {
    if (lb.hidden) return;
    var n = items.length;
    fill((current + delta + n) % n);
  }

  function close() {
    if (lb.hidden) return;
    clearTimeout(nudgeTimer);
    zoomOut();
    panel.style.transition = ''; panel.style.transform = '';
    lb.classList.remove('is-open');
    lb.classList.add('is-closing');
    var done = function () {
      if (sheet) sheet.inert = false;
      lb.hidden = true;
      lb.classList.remove('is-closing');
      document.documentElement.classList.remove('lb-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    if (reduce) return done();
    setTimeout(done, 240);
  }

  tiles.forEach(function (t) { t.addEventListener('click', function () { open(t); }); });
  lb.addEventListener('click', function (e) {
    if (!e.target.closest('.lightbox__panel')) close();
  });
  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', function () { go(-1); });
  lbNext.addEventListener('click', function () { go(1); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') { if (!lbZoom.hidden) zoomOut(); else close(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      var btns = Array.prototype.filter.call(lb.querySelectorAll('button'), function (b) { return b.offsetWidth || b.offsetHeight; });
      var a = btns[0], z = btns[btns.length - 1];
      if (!lb.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
})();

/* =========================================================
   PROJECT LIGHTBOX — click a feed image OR the video to open it in a
   popup whose box is sized from the picture itself (so it hugs it: no
   bars, no slivers, never cropped, always inside the window — re-fitted
   on resize / browser zoom). Images: click to zoom. Video: [Play]/[Stop], no zoom. Prev/next ([<] [>] + arrow keys)
   moves through images and the video together, wraps around. Closes on
   click-outside / Esc / [Close]. Page behind is inert; Tab loops inside.
   Builds its own markup; null-guarded.
   ========================================================= */
(function () {
  var shots = Array.prototype.slice.call(document.querySelectorAll('.art-frame .shot'));
  if (!shots.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var lb = document.createElement('div');
  lb.className = 'lightbox lightbox--shot';
  lb.hidden = true;
  lb.innerHTML =
    '<div class="lightbox__backdrop"></div>' +
    '<div class="lightbox__panel" role="dialog" aria-modal="true" aria-label="Project viewer">' +
      '<div class="lightbox__media">' +
        '<img alt="">' +
        '<video class="lightbox__video" aria-label="Project video" loop muted playsinline preload="metadata" hidden></video>' +
        '<button class="lightbox__play h2" type="button" hidden>[Play]</button>' +
      '</div>' +
      '<div class="lightbox__bar">' +
        '<span class="lightbox__count"></span>' +
        '<span class="lightbox__cap thin"></span>' +
        '<span class="lightbox__ctrl">' +
          '<button class="lightbox__prev h2" type="button" aria-label="Previous">[&#10094;]</button>' +
          '<button class="lightbox__next h2" type="button" aria-label="Next">[&#10095;]</button>' +
          '<button class="lightbox__close h2" type="button">[Close]</button>' +
        '</span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(lb);

  var panel   = lb.querySelector('.lightbox__panel');
  var lbMedia = lb.querySelector('.lightbox__media');
  var lbImg   = lb.querySelector('.lightbox__media img');
  var lbVideo = lb.querySelector('.lightbox__video');
  var lbPlay  = lb.querySelector('.lightbox__play');
  var lbText  = lb.querySelector('.lightbox__cap');
  var lbClose = lb.querySelector('.lightbox__close');
  var lbPrev  = lb.querySelector('.lightbox__prev');
  var lbNext  = lb.querySelector('.lightbox__next');
  var sheet   = document.querySelector('.sheet');
  var bar     = lb.querySelector('.lightbox__bar');
  var current = -1, lastFocus = null;
  var natW = 0, natH = 0;      // natural size of whatever is showing

  /* Size the media box to the picture: biggest size that fits inside the window
     (minus popup padding, borders and the real height of the bottom bar).
     The box is exactly the picture's shape, so nothing can show around it. */
  function fit(nw, nh) {
    if (nw && nh) { natW = nw; natH = nh; }
    if (!natW || lb.hidden) return;
    var cs = getComputedStyle(lb);
    var padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    for (var k = 0; k < 2; k++) {                       // 2nd pass: the bar can re-wrap once the width changes
      var maxW = lb.clientWidth - padX - 2;             // 2px = panel border
      var maxH = lb.clientHeight - padY - 3 - bar.offsetHeight;   // 3px = panel border + media divider
      var sc = Math.min(maxW / natW, maxH / natH, 1.5);
      lbMedia.style.width  = Math.max(1, Math.floor(natW * sc)) + 'px';
      lbMedia.style.height = Math.max(1, Math.floor(natH * sc)) + 'px';
    }
  }
  lbImg.addEventListener('load', function () { fit(lbImg.naturalWidth, lbImg.naturalHeight); });
  lbVideo.addEventListener('loadedmetadata', function () { fit(lbVideo.videoWidth, lbVideo.videoHeight); });
  window.addEventListener('resize', function () { fit(); });

  function isVideo(i) { return shots[i].classList.contains('shot--video'); }

  /* ---- zoom (images only): media frame stays the same size and scrolls ---- */
  function zoomOut() {
    lbImg.classList.remove('zoomed');
    lbMedia.classList.remove('is-zoomed');
    lbMedia.scrollLeft = lbMedia.scrollTop = 0;
  }
  function toggleZoom(e) {
    if (lbImg.classList.contains('zoomed')) return zoomOut();
    var box = lbMedia.getBoundingClientRect();
    var px = (e.clientX - box.left) / box.width, py = (e.clientY - box.top) / box.height;
    lbMedia.classList.add('is-zoomed');
    lbImg.classList.add('zoomed');
    lbMedia.scrollLeft = px * Math.max(0, lbMedia.scrollWidth  - lbMedia.clientWidth);   // start the pan where you clicked
    lbMedia.scrollTop  = py * Math.max(0, lbMedia.scrollHeight - lbMedia.clientHeight);
  }
  lbImg.addEventListener('click', toggleZoom);

  /* ---- video: Play / Stop (Stop = pause + back to start) ---- */
  function setPlayLabel() {
    lbPlay.textContent = lbVideo.paused ? '[Play]' : '[Stop]';
    lbPlay.setAttribute('aria-label', lbVideo.paused ? 'Play video' : 'Pause video');
  }
  function stopVideo() {
    lbVideo.pause();
    lbVideo.removeAttribute('src');
    lbVideo.load();
  }
  lbPlay.addEventListener('click', function () {
    if (lbVideo.paused) { var p = lbVideo.play(); if (p && p.catch) p.catch(function () {}); }
    else { lbVideo.pause(); }
  });
  lbVideo.addEventListener('play', setPlayLabel);
  lbVideo.addEventListener('pause', setPlayLabel);

  function fill(i, fade) {
    var shot = shots[i];
    var cap = shot.querySelector('.shot__cap');
    current = i;
    zoomOut();
    stopVideo();

    if (isVideo(i)) {
      var v = shot.querySelector('video');
      if (v && !v.paused) v.pause();                 // don't play the page copy underneath
      lbImg.hidden = true; lbImg.removeAttribute('src');
      lbVideo.hidden = false; lbPlay.hidden = false;
      lbVideo.src = v ? (v.currentSrc || v.src) : '';
      fit((v && v.videoWidth) || 1920, (v && v.videoHeight) || 1080);   // refined on loadedmetadata
      setPlayLabel();
    } else {
      var img = shot.querySelector('img');
      lbVideo.hidden = true; lbPlay.hidden = true;
      lbImg.hidden = false;
      if (fade) lbImg.style.opacity = '0';
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || '';
      fit(img.naturalWidth || 1600, img.naturalHeight || 1200);          // refined on load
      var show = function () { requestAnimationFrame(function () { lbImg.style.opacity = ''; }); };
      if (lbImg.complete && lbImg.naturalWidth) show();
      else lbImg.addEventListener('load', show, { once: true });
    }
    lbText.textContent = cap ? cap.textContent.trim() : '';
  }

  function open(i, fromEl) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    fill(i, false);
    if (sheet) sheet.inert = true;
    document.documentElement.classList.add('lb-open');
    lbClose.focus();
    if (reduce) { lb.classList.add('is-open'); return; }

    var first = fromEl.getBoundingClientRect();
    requestAnimationFrame(function () {            // popup size is fixed, so it can be measured right away
      var last = panel.getBoundingClientRect();
      var sx = first.width / last.width, sy = first.height / last.height;
      var tx = first.left - last.left, ty = first.top - last.top;
      panel.style.transformOrigin = 'top left';
      panel.style.transition = 'none';
      panel.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sx + ',' + sy + ')';
      requestAnimationFrame(function () {
        lb.classList.add('is-open');
        panel.style.transition = 'transform .3s cubic-bezier(.2,.7,.2,1)';
        panel.style.transform = '';
      });
    });
  }

  function go(delta) {
    if (lb.hidden) return;
    var n = shots.length;
    fill((current + delta + n) % n, true);
  }

  function close() {
    if (lb.hidden) return;
    zoomOut();
    stopVideo();
    panel.style.transition = ''; panel.style.transform = '';
    lb.classList.remove('is-open');
    lb.classList.add('is-closing');
    var done = function () {
      if (sheet) sheet.inert = false;
      lb.hidden = true;
      lb.classList.remove('is-closing');
      document.documentElement.classList.remove('lb-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    if (reduce) return done();
    setTimeout(done, 240);
  }

  shots.forEach(function (s, i) {
    var el = s.querySelector('img') || s.querySelector('video');
    if (!el) return;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.addEventListener('click', function () { open(i, el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, el); }
    });
  });

  lb.addEventListener('click', function (e) {
    if (!e.target.closest('.lightbox__panel')) close();
  });
  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', function () { go(-1); });
  lbNext.addEventListener('click', function () { go(1); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') { if (lbImg.classList.contains('zoomed')) zoomOut(); else close(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      var btns = Array.prototype.filter.call(lb.querySelectorAll('button'), function (b) { return b.offsetWidth || b.offsetHeight; });
      var a = btns[0], z = btns[btns.length - 1];
      if (!lb.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
})();
/* LAZY LOAD — work cards + gallery tiles: wait for the picture, paint the hidden
   state for two frames, then fade/lift in. */
(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll('.card.reveal, .g-item.reveal, .about-photo.reveal, .shot.reveal'));
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in-view'); }); return; }

  function whenReady(img, cb) {
    if (!img) return cb();
    var fired = false;
    function fire() { if (fired) return; fired = true; cb(); }
    var t = setTimeout(fire, 1500);                       // never hang on a slow image
    function afterLoad() { clearTimeout(t); if (img.decode) img.decode().then(fire, fire); else fire(); }
    if (img.complete && img.naturalWidth) afterLoad();
    else { img.addEventListener('load', afterLoad, { once: true }); img.addEventListener('error', fire, { once: true }); }
  }
  function show(el) {
    whenReady(el.querySelector('img'), function () {
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in-view'); }); });
    });
  }

  void document.body.offsetHeight;                        // commit the hidden state first
  var io = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { obs.unobserve(e.target); show(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  els.forEach(function (el) { io.observe(el); });
})();
/* SITE HEADER — hides on scroll down, returns on scroll up and at the very top */
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var lastY = window.scrollY, ticking = false;

  function update() {
    ticking = false;
    var y = Math.max(window.scrollY, 0), dy = y - lastY;
    if (y <= header.offsetHeight) { header.classList.remove('is-hidden'); lastY = y; return; }  // near top: always shown
    if (Math.abs(dy) < 8) return;                                                                // ignore tiny jitters
    header.classList.toggle('is-hidden', dy > 0);
    lastY = y;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });  // keyboard users
})();
/* VIDEO shots — Play / Stop button */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.shot--video'), function (fig) {
    var v = fig.querySelector('video'), b = fig.querySelector('.shot__play');
    if (!v || !b) return;
    function sync() {
      b.textContent = v.paused ? '[Play]' : '[Stop]';
      b.setAttribute('aria-label', v.paused ? 'Play video' : 'Stop video');
    }
    b.addEventListener('click', function () {
      if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else { v.pause(); }
    });
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    sync();
  });
})();