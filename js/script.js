// =============================================================
// Syncs the sticky left-column text blocks (Problem / Solution / Result)
// to whichever gallery "stage" is currently centered in the viewport.
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  const textBlocks      = Array.from(document.querySelectorAll('.text-block'));
  const stageGroups     = Array.from(document.querySelectorAll('.stage-group'));
  const galleryImgs     = Array.from(document.querySelectorAll('.gallery-img, .gallery-video'));
  const lightboxTargets = Array.from(document.querySelectorAll('.gallery-img'));

  // =============================================================
  // Projects tab group — click the label to collapse/expand the row.
  // Starts open; the label itself never restyles, only the row animates.
  // =============================================================
  const tabToggle = document.getElementById('tabToggle');
  const tabCollapse = document.getElementById('tabCollapse');

  if (tabToggle && tabCollapse) {
    tabToggle.addEventListener('click', () => {
      const isCollapsed = tabCollapse.classList.toggle('collapsed');
      tabToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
    document.addEventListener('click', (e) => {
  const isOpen = !tabCollapse.classList.contains('collapsed');
  const clickedOutside = !e.target.closest('.tabgroup');

  if (isOpen && clickedOutside) {
    tabCollapse.classList.add('collapsed');
    tabToggle.setAttribute('aria-expanded', 'false');
  }
});
  }

  // How far "back" a passed block sits in the fan, in px per step — large
  // enough that the caption + heading of a peeking card are legible, not
  // just a sliver of its edge.
  const STACK_OFFSET = 72;

  const nextProject = document.getElementById('nextProject');
  const textStack = document.querySelector('.text-stack');

  // Card stack stays invisible until the user actually scrolls — otherwise
  // it can peek in above the fold alongside the hero intro.
  if (textStack) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) textStack.classList.add('visible');
    }, { passive: true });
  }

  const setActive = (activeIndex) => {
    textBlocks.forEach((block) => {
      const i = Number(block.dataset.index);
      const diff = activeIndex - i; // 0 = active, >0 = passed, <0 = upcoming

      block.classList.remove('active', 'passed', 'upcoming');

      if (diff === 0) {
        block.classList.add('active');
        block.style.transform = 'translateY(0)';
        block.style.opacity = '1';
        block.style.zIndex = 50;
        block.setAttribute('tabindex', '0');
      } else if (diff > 0) {
        block.classList.add('passed');
        block.style.transform = `translateY(${-diff * STACK_OFFSET}px)`;
        block.style.opacity = '1';
        block.style.zIndex = String(50 - diff);
        block.setAttribute('tabindex', '0');
      } else {
        block.classList.add('upcoming');
        block.style.transform = 'translateY(20px)';
        block.style.opacity = '0';
        block.style.zIndex = '0';
        block.setAttribute('tabindex', '-1'); // not yet visible — skip in tab order
      }
    });
  };

  // Resume download — spark burst feedback
  const resumeBtn = document.querySelector('a[download]');

  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      const rect = resumeBtn.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;

      const burst = document.createElement('div');
      burst.className = 'spark-burst';
      burst.style.left = `${originX}px`;
      burst.style.top = `${originY}px`;

      const sparkCount = 12;
      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('span');
        spark.className = 'spark';
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.3;
        const distance = 40 + Math.random() * 30;
        spark.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        spark.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
        burst.appendChild(spark);
      }

      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 700);
    });
  }

  // Paint the first block in immediately, don't wait on the observer's first tick.
  setActive(0);

  // --- Clicking a peeking (passed) card scrolls back up to that section ---
  textBlocks.forEach((block) => {
    block.setAttribute('role', 'button');

    const jumpToStage = () => {
      if (!block.classList.contains('passed')) return;
      const index = Number(block.dataset.index);
      const target = stageGroups.find(
        (group) => group.dataset.stage === block.dataset.index
      );
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActive(index);
    };

    block.addEventListener('click', jumpToStage);
    block.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        jumpToStage();
      }
    });
  });

  // --- Watch each stage group; the one crossing the vertical center wins ---
  const stageObserver = new IntersectionObserver(
    (entries) => {
      let winner = null;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!winner || entry.intersectionRatio > winner.intersectionRatio) {
            winner = entry;
          }
        }
      });

      if (winner) {
        setActive(Number(winner.target.dataset.stage));
      }
    },
    {
      root: null,
      rootMargin: '-45% 0px -45% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    }
  );

  stageGroups.forEach((group) => stageObserver.observe(group));

  // --- Failsafe: force the final "Result" block when the user has
  //     scrolled all the way to the bottom of the page. Next Project
  //     only appears here too — once you've truly reached the end. ---
  const lastIndex = textBlocks.length - 1;

  window.addEventListener('scroll', () => {
    const scrolledToBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

    if (scrolledToBottom) {
      setActive(lastIndex);
      if (nextProject) nextProject.classList.add('visible');
    }
  }, { passive: true });

  // --- Fade/rise-in for gallery images AND videos as they enter view ---
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
  );

  galleryImgs.forEach((el) => imageObserver.observe(el));

  // =============================================================
  // Scroll-to-top — glass button, appears once you've scrolled down.
  // =============================================================
  const scrollTopBtn = document.getElementById('scrollTopBtn');

  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      const pastHero = window.scrollY > window.innerHeight * 0.6;
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300;

      scrollTopBtn.classList.toggle('visible', pastHero && !nearBottom);
    }, { passive: true });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // =============================================================
  // Scroll hint — fades out once the user starts scrolling.
  // =============================================================
  const scrollHint = document.getElementById('scrollHint');

  if (scrollHint) {
    window.addEventListener('scroll', () => {
      scrollHint.classList.toggle('hidden', window.scrollY > 40);
    }, { passive: true });
  }

  // =============================================================
  // Lightbox — click any gallery IMAGE (not video) to open it
  // full-window, click again to zoom, close via the × button,
  // clicking the backdrop, or Escape. Videos are excluded here —
  // they use their own native controls, not this lightbox.
  // =============================================================
  const lightbox      = document.getElementById('lightbox');
  const lightboxImg   = document.getElementById('lightboxImg');
  const lightboxStage = document.getElementById('lightboxStage');
  const lightboxClose = document.getElementById('lightboxClose');

  if (lightbox && lightboxImg && lightboxStage && lightboxClose) {
    const openLightbox = (src, alt) => {
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightboxImg.classList.remove('zoomed');
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.classList.remove('zoomed');
      document.body.style.overflow = '';
    };

    lightboxTargets.forEach((img) => {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.addEventListener('click', () => openLightbox(img.src, img.alt));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(img.src, img.alt);
        }
      });
    });

    lightboxImg.addEventListener('click', (e) => {
      e.stopPropagation();
      lightboxImg.classList.toggle('zoomed');
    });

    lightboxStage.addEventListener('click', (e) => {
      if (e.target === lightboxStage) closeLightbox();
    });

    lightboxClose.addEventListener('click', closeLightbox);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  }
});