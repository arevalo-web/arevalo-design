/* arevalo.design — site script
   Every section is null-guarded, so this one file is safe to load on every
   page: where a page lacks the elements, that section simply does nothing. */
(function () {
  'use strict';

  var root = document.documentElement;
  var sheet = document.querySelector('.sheet');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE_MAX = 760;   // keep in sync with the CSS @media (max-width: 760px) breakpoint

  // Lets the inline <head> fallback know this script loaded (see the head script on every page).
  root.classList.add('js-ready');

  /* =========================================================
     LIGHT / DARK THEME SWITCH — one button toggles the opposite.
     The choice is saved only when the visitor actually clicks.
     ========================================================= */
  var sw = document.querySelector('.theme-switch');
  if (sw) {
    var apply = function (dark, remember) {
      root.classList.toggle('theme-dark', dark);
      sw.setAttribute('aria-pressed', dark ? 'true' : 'false');
      if (remember) {
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
      }
    };
    sw.addEventListener('click', function () {
      apply(!root.classList.contains('theme-dark'), true);
    });
    apply(root.classList.contains('theme-dark'), false); // sync aria-pressed with the theme set in <head>
  }

  /* =========================================================
     SHARED LIGHTBOX PLUMBING — used by the gallery popup and the project popup:
     open (with the grow-from-thumbnail animation), close, focus trap, inert page.
     ========================================================= */
  function lightboxCore(lb) {
    var panel = lb.querySelector('.lightbox__panel');
    var closeBtn = lb.querySelector('.lightbox__close');
    var lastFocus = null;
    var core = { onClose: null };

    // hidden, or in the middle of its close animation
    core.isBusy = function () {
      return lb.hidden || lb.classList.contains('is-closing');
    };

    // fromEl: the element the popup grows out of. fill: builds the popup content (runs once the popup is un-hidden).
    core.open = function (fromEl, fill) {
      lastFocus = document.activeElement;
      lb.hidden = false;
      fill();
      if (sheet) sheet.inert = true;
      root.classList.add('lb-open');
      closeBtn.focus();
      if (reduce) { lb.classList.add('is-open'); return; }

      var first = fromEl.getBoundingClientRect();
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
    };

    core.close = function () {
      if (core.isBusy()) return;
      if (core.onClose) core.onClose();
      panel.style.transition = ''; panel.style.transform = '';
      lb.classList.remove('is-open');
      lb.classList.add('is-closing');
      var done = function () {
        if (sheet) sheet.inert = false;
        lb.hidden = true;
        lb.classList.remove('is-closing');
        root.classList.remove('lb-open');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      };
      if (reduce) return done();
      setTimeout(done, 240);
    };

    // keep Tab inside the popup
    core.trapTab = function (e) {
      var items = Array.prototype.filter.call(
        lb.querySelectorAll('button, [tabindex="0"]'),
        function (n) { return n.offsetWidth || n.offsetHeight; }
      );
      if (!items.length) return;
      var a = items[0], z = items[items.length - 1];
      if (!lb.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };

    lb.addEventListener('click', function (e) {
      if (!e.target.closest('.lightbox__panel')) core.close();
    });
    closeBtn.addEventListener('click', core.close);
    return core;
  }

  /* =========================================================
     GALLERY — ledger + vertical popup: fixed square picture on top (CSS-sized),
     all text underneath, controls at the bottom. Multi-image projects scroll
     with dots; click/Enter to zoom; one-time nudge; inert page; Tab loop.
     ========================================================= */
  (function () {
    var grid = document.getElementById('gallery-grid');
    if (!grid || !Array.isArray(window.GALLERY)) return;

    var items = window.GALLERY;
    var COLS = 3;

    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    var cell = function (cls) { return el('div', 'g-cell' + (cls ? ' ' + cls : '')); };

    // built with the DOM (not innerHTML) so quotes or & in the data can't break the markup.
    // Spans, not divs: a <button> may only contain phrasing content.
    var tile = function (item, i) {
      var b = el('button', 'g-item reveal');
      b.type = 'button';
      b.style.setProperty('--d', ((i % COLS) * 0.1) + 's');

      var media = el('span', 'g-media');
      var img = document.createElement('img');
      img.loading = i < COLS ? 'eager' : 'lazy';   // first row is above the fold
      img.alt = item.alt || item.title || '';
      img.src = item.img;
      media.appendChild(img);

      var label = el('span', 'g-label');
      var meta = el('span', 'g-meta');
      meta.appendChild(el('span', 'g-title h1', item.title || 'Untitled'));
      meta.appendChild(el('span', 'g-date', item.date || ''));
      label.appendChild(meta);

      b.appendChild(media);
      b.appendChild(label);
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

    var core     = lightboxCore(lb);
    var lbMedia  = lb.querySelector('.lightbox__media');
    var lbSlides = lb.querySelector('.lightbox__slides');
    var lbDots   = lb.querySelector('.lightbox__dots');
    var lbZoom   = lb.querySelector('.lightbox__zoom');
    var zImg     = lbZoom.querySelector('img');
    var lbBody   = lb.querySelector('.lightbox__body');
    var lbTitle  = lb.querySelector('.lightbox__title');
    var lbMeta   = lb.querySelector('.lightbox__meta');
    var lbSum    = lb.querySelector('.lightbox__summary');
    var lbPrev   = lb.querySelector('.lightbox__prev');
    var lbNext   = lb.querySelector('.lightbox__next');
    var current = -1;

    /* ---- multi-image dots follow the scroll ---- */
    function setDot(n) {
      Array.prototype.forEach.call(lbDots.children, function (d, k) { d.classList.toggle('is-on', k === n); });
    }
    lbSlides.addEventListener('scroll', function () {
      setDot(Math.round(lbSlides.scrollTop / (lbSlides.clientHeight || 1)));
    }, { passive: true });

    /* ---- one-time nudge (once per visit; stops if the visitor scrolls first) ---- */
    var nudged = false;
    var nudgeTimers = [];
    try { nudged = sessionStorage.getItem('galleryNudged') === '1'; } catch (e) {}
    function markNudged() { nudged = true; try { sessionStorage.setItem('galleryNudged', '1'); } catch (e) {} }
    ['wheel', 'touchstart'].forEach(function (t) { lbSlides.addEventListener(t, markNudged, { passive: true }); });
    function later(fn, ms) { nudgeTimers.push(setTimeout(fn, ms)); }
    function clearNudge() {
      nudgeTimers.forEach(clearTimeout);
      nudgeTimers = [];
      lbSlides.style.scrollSnapType = '';
    }
    function nudge() {
      clearNudge();
      if (reduce || nudged || lbDots.hidden) return;
      later(function () {
        if (lb.hidden || !lbZoom.hidden || lbSlides.scrollTop > 0 || nudged) return;
        markNudged();
        lbSlides.style.scrollSnapType = 'none';
        lbSlides.scrollTo({ top: 40, behavior: 'smooth' });
        later(function () {
          lbSlides.scrollTo({ top: 0, behavior: 'smooth' });
          later(function () { lbSlides.style.scrollSnapType = ''; }, 450);
        }, 500);
      }, 900);
    }

    /* ---- wheel / trackpad: one picture per scroll (replaces CSS snap on desktop) ---- */
    var lastWheel = 0, lockUntil = 0;
    lbSlides.addEventListener('wheel', function (e) {
      var n = lbSlides.children.length;
      if (n < 2 || e.ctrlKey || !lbZoom.hidden) return;   // single image, pinch-zoom, or zoom open: leave alone
      e.preventDefault();
      var h = lbSlides.clientHeight || 1;
      // normalise units: Firefox reports mouse-wheel notches in lines (1) or pages (2), not pixels (0)
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * h : e.deltaY;
      var now = Date.now();
      var quiet = now - lastWheel > 100;                  // a new gesture, not the tail of a trackpad swipe
      lastWheel = now;
      if (!quiet || now < lockUntil || Math.abs(dy) < 4) return;
      lockUntil = now + 450;
      var cur = Math.round(lbSlides.scrollTop / h);
      var next = Math.max(0, Math.min(n - 1, cur + (dy > 0 ? 1 : -1)));
      lbSlides.scrollTo({ top: next * h, behavior: reduce ? 'auto' : 'smooth' });
      markNudged();
    }, { passive: false });

    /* ---- zoom (click or Enter on a picture) ---- */
    function zoomOut() { lbZoom.hidden = true; zImg.removeAttribute('src'); }
    function zoomIn(src, e) {
      var box = lbMedia.getBoundingClientRect();
      var px = e ? (e.clientX - box.left) / box.width : 0.5;    // keyboard: start centred
      var py = e ? (e.clientY - box.top) / box.height : 0.5;
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
        im.decoding = 'async';
        im.tabIndex = 0;
        im.setAttribute('role', 'button');
        im.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomIn(im.currentSrc || im.src, null); }
        });
        im.src = src;
        if (im.decode) im.decode().catch(function () {});   // decode now, not in the middle of scrolling
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
      var meta = [item.date, item.medium, item.dimensions].filter(Boolean).map(function (s) { return s.trim(); }).join(' | ');
      lbMeta.textContent = meta;
      lbMeta.hidden = !meta;
      lbSum.textContent = (item.summary || '').replace(/\s+(\S+)\s*$/, '\u00a0$1');   // no one-word last line
      lbBody.scrollTop = 0;

      nudge();
    }

    function go(delta) {
      if (core.isBusy()) return;
      var n = items.length;
      fill((current + delta + n) % n);
    }

    core.onClose = function () { clearNudge(); zoomOut(); };

    tiles.forEach(function (t, i) {
      t.addEventListener('click', function () {
        core.open(t.querySelector('.g-media') || t, function () { fill(i); });
      });
    });
    lbPrev.addEventListener('click', function () { go(-1); });
    lbNext.addEventListener('click', function () { go(1); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') { if (!lbZoom.hidden) zoomOut(); else core.close(); return; }
      if (core.isBusy()) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab') core.trapTab(e);
    });
  })();

  /* =========================================================
     PROJECT LIGHTBOX — click a feed image OR the video to open it in a
     popup whose box is sized from the picture itself (so it hugs it: no
     bars, no slivers, never cropped, always inside the window — re-fitted
     on resize / browser zoom). Images: click/Enter to zoom. Video: [Play]/[Stop]
     (Stop = pause, keeps position; resets to 0 when the video ends), no zoom. Prev/next ([<] [>] + arrow keys)
     moves through images and the video together, wraps around.
     ========================================================= */
  (function () {
    var shots = Array.prototype.slice.call(document.querySelectorAll('.art-frame .shot'));
    if (!shots.length) return;

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
          '<span class="lightbox__cap thin"></span>' +
          '<span class="lightbox__ctrl">' +
            '<button class="lightbox__prev h2" type="button" aria-label="Previous">[&#10094;]</button>' +
            '<button class="lightbox__next h2" type="button" aria-label="Next">[&#10095;]</button>' +
            '<button class="lightbox__close h2" type="button">[Close]</button>' +
          '</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(lb);

    var core    = lightboxCore(lb);
    var lbMedia = lb.querySelector('.lightbox__media');
    var lbImg   = lb.querySelector('.lightbox__media img');
    var lbVideo = lb.querySelector('.lightbox__video');
    var lbPlay  = lb.querySelector('.lightbox__play');
    var lbText  = lb.querySelector('.lightbox__cap');
    var lbPrev  = lb.querySelector('.lightbox__prev');
    var lbNext  = lb.querySelector('.lightbox__next');
    var bar     = lb.querySelector('.lightbox__bar');
    var current = -1;
    var natW = 0, natH = 0;      // natural size of whatever is showing

    lbImg.tabIndex = 0;
    lbImg.setAttribute('role', 'button');

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
      var px = e && e.clientX != null ? (e.clientX - box.left) / box.width : 0.5;    // keyboard: start centred
      var py = e && e.clientY != null ? (e.clientY - box.top) / box.height : 0.5;
      lbMedia.classList.add('is-zoomed');
      lbImg.classList.add('zoomed');
      lbMedia.scrollLeft = px * Math.max(0, lbMedia.scrollWidth  - lbMedia.clientWidth);   // start the pan where you clicked
      lbMedia.scrollTop  = py * Math.max(0, lbMedia.scrollHeight - lbMedia.clientHeight);
    }
    lbImg.addEventListener('click', toggleZoom);
    lbImg.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleZoom(null); }
    });

    /* ---- video: Play / Stop (Stop = pause, keeps position; resets to 0 when the video ends) ---- */
    function setPlayLabel() {
      lbPlay.textContent = lbVideo.paused ? '[Play]' : '[Stop]';
      lbPlay.setAttribute('aria-label', lbVideo.paused ? 'Play video' : 'Stop video');
    }
    function stopVideo() {
      lbVideo.pause();
      lbVideo.removeAttribute('src');
      lbVideo.load();
    }
    lbPlay.addEventListener('click', function () {
      if (lbVideo.paused) { var p = lbVideo.play(); if (p && p.catch) p.catch(function () {}); }
      else lbVideo.pause();                            // keeps its position
    });
    lbVideo.addEventListener('ended', function () { lbVideo.currentTime = 0; });  // finished -> back to start
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

    function go(delta) {
      if (core.isBusy()) return;
      var n = shots.length;
      fill((current + delta + n) % n, true);
    }

    core.onClose = function () { zoomOut(); stopVideo(); };

    shots.forEach(function (s, i) {
      var el = s.querySelector('img') || s.querySelector('video');
      if (!el) return;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      if (el.tagName === 'VIDEO') {      // a <video> has no alt text, so give it an accessible name
        var capEl = s.querySelector('.shot__cap');
        el.setAttribute('aria-label', 'Open video' + (capEl ? ': ' + capEl.textContent.trim() : ''));
      }
      var openIt = function () { core.open(el, function () { fill(i, false); }); };
      el.addEventListener('click', openIt);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIt(); }
      });
    });

    lbPrev.addEventListener('click', function () { go(-1); });
    lbNext.addEventListener('click', function () { go(1); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') { if (lbImg.classList.contains('zoomed')) zoomOut(); else core.close(); return; }
      if (core.isBusy()) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab') core.trapTab(e);
    });
  })();

  /* =========================================================
     LAZY LOAD — work cards, gallery tiles, about portrait and project figures:
     wait for the picture, paint the hidden state for two frames, then fade in.
     ========================================================= */
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

  /* =========================================================
     SITE HEADER — hides on scroll down, returns on scroll up and at the very top
     ========================================================= */
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

  /* =========================================================
     VIDEO shots — Play / Stop button (Stop = pause, keeps position; resets to 0 when the video ends)
     ========================================================= */
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
        else v.pause();                                // keeps its position
      });
      v.addEventListener('ended', function () { v.currentTime = 0; });  // finished -> back to start
      v.addEventListener('play', sync);
      v.addEventListener('pause', sync);
      sync();
    });
  })();

  /* =========================================================
     MOBILE MENU — burger toggles .is-open; closes on link tap, Esc, outside tap,
     or when the window gets wide
     ========================================================= */
  (function () {
    var header = document.querySelector('.site-header');
    var btn = header && header.querySelector('.menu-toggle');
    if (!btn) return;
    function setOpen(open) {
      header.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    btn.addEventListener('click', function () { setOpen(!header.classList.contains('is-open')); });
    header.addEventListener('click', function (e) { if (e.target.closest('.hero-nav a')) setOpen(false); });
    document.addEventListener('click', function (e) { if (!header.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); btn.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > MOBILE_MAX) setOpen(false); });
  })();
})();