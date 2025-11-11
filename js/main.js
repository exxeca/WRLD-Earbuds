(() => {
  /* =============================
   *  DOM HOOKS & ENV FLAGS
   * ============================= */
  const mv = document.querySelector('model-viewer');      // first/hero model-viewer (progress bar)
  const interactiveBlob = document.querySelector('.interactive');
  const menuToggleBtn = document.querySelector('#menuToggle');
  const menuDrawerEl  = document.querySelector('#menuDrawer');
  const menuScrimEl   = menuDrawerEl ? menuDrawerEl.querySelector('.menu-scrim') : null;
  const menuClosers   = menuDrawerEl ? menuDrawerEl.querySelectorAll('[data-close]') : [];
  const reduceMotion  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP       = !!window.gsap;

  // mouse-follow state for interactive blob
  let ix = 0, iy = 0, tx = 0, ty = 0;

  /* =============================
   *  MODEL-VIEWER: PROGRESS BAR
   * ============================= */
  function handleModelProgress(event) {
    const progressBar = event.target.querySelector('.progress-bar');
    const updatingBar = event.target.querySelector('.update-bar');
    if (!progressBar || !updatingBar) return;

    const pct = (event.detail.totalProgress || 0) * 100;
    updatingBar.style.width = `${pct}%`;

    if (event.detail.totalProgress === 1) {
      progressBar.classList.add('hide');
      event.target.removeEventListener('progress', handleModelProgress);
    } else {
      progressBar.classList.remove('hide');
    }
  }

  /* =============================
   *  BACKGROUND / BLOBS / HUE
   * ============================= */
  function startBackgroundAnimation() {
    if (!hasGSAP || reduceMotion) return;

    gsap.to('.g1', { yPercent: 10, duration: 15, repeat: -1, yoyo: true, ease: 'power1.inOut' });
    gsap.to('.g4', { xPercent: 10, duration: 20, repeat: -1, yoyo: true, ease: 'power1.inOut' });
    gsap.to('.g2', { rotation: -360, duration: 20, repeat: -1, ease: 'none' });
    gsap.to('.g3', { rotation:  360, duration: 40, repeat: -1, ease: 'none' });
    gsap.to('.g5', { rotation:  360, duration: 20, repeat: -1, ease: 'none' });

    gsap.fromTo('.gradient-bg',
      { filter: 'hue-rotate(0deg) brightness(.95) contrast(1.05)' },
      { filter: 'hue-rotate(360deg) brightness(.95) contrast(1.05)', duration: 24, repeat: -1, ease: 'none' }
    );
  }

  // subtle mouse-follow for the “interactive” blob
  function tickInteractive() {
    if (!interactiveBlob) return;
    ix += (tx - ix) / 20;
    iy += (ty - iy) / 20;
    interactiveBlob.style.transform = `translate(${Math.round(ix)}px, ${Math.round(iy)}px)`;
    requestAnimationFrame(tickInteractive);
  }

  function handleMouseMove(e) {
    tx = e.clientX;
    ty = e.clientY;
  }

  function handleVisibilityChange() {
    if (!hasGSAP) return;
    const action = document.hidden ? 'pause' : 'play';
    gsap.globalTimeline[action]();
  }

  /* =============================
   *  MENU: OPEN/CLOSE + POSITION
   * ============================= */
  function openMenu() {
    if (!menuDrawerEl || !menuToggleBtn) return;
    menuDrawerEl.hidden = false;
    requestAnimationFrame(() => {
      menuDrawerEl.classList.add('open');
    });
    menuToggleBtn.setAttribute('aria-expanded', 'true');
    placeDropdown(); // position on open
  }

  function closeMenu() {
    if (!menuDrawerEl || !menuToggleBtn) return;
    menuDrawerEl.classList.remove('open');
    menuToggleBtn.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => { menuDrawerEl.hidden = true; }, 380);
  }

  function toggleMenu() {
    const isOpen = menuDrawerEl && menuDrawerEl.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  }

  // Position the dropdown panel under the trigger (using CSS custom props as “tokens”)
  function placeDropdown() {
    const panel = document.querySelector('.menu-panel');
    if (!menuToggleBtn || !panel) return;

    const r  = menuToggleBtn.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);

    const gap      = parseFloat(cs.getPropertyValue('--menu-gap')) || 0;
    const gutter   = parseFloat(cs.getPropertyValue('--menu-gutter')) || 0;
    const topOff   = parseFloat(cs.getPropertyValue('--menu-top-offset')) || 0;
    const rightOff = parseFloat(cs.getPropertyValue('--menu-right-offset')) || 0;

    const top   = r.bottom + gap + topOff;
    const right = Math.max(gutter, window.innerWidth - r.right) + rightOff;

    panel.style.top   = `${top}px`;
    panel.style.right = `${right}px`;
  }

  // Use rAF to avoid spamming layout on resize/scroll
  let needsPlace = false;
  function schedulePlaceDropdown() {
    if (needsPlace) return;
    needsPlace = true;
    requestAnimationFrame(() => {
      needsPlace = false;
      placeDropdown();
    });
  }

  /* =============================
   *  SCROLL WORD REVEAL (GSAP)
   * ============================= */
  function splitIntoWords(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';

    const frag = document.createDocumentFragment();
    text.split(/(\s+)/).forEach(part => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = part;
      frag.appendChild(span);
    });
    el.appendChild(frag);
  }

  function initWordReveal() {
    if (!hasGSAP || !window.ScrollTrigger || reduceMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('.reveal-words').forEach(block => {
      splitIntoWords(block);
      const words = block.querySelectorAll('.word');

      gsap.set(words, { color: '#9aa0a6', opacity: 0.35, yPercent: 25, scale: 0.98 });

      gsap.timeline({
        defaults: { ease: 'power2.out', duration: 0.35 },
        scrollTrigger: {
          trigger: block,
          start: 'top 80%',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true
        }
      })
      .to(words, {
        color: '#ffffff',
        opacity: 1,
        yPercent: 0,
        scale: 1,
        stagger: { each: 0.01, from: 'start' }
      })
      .to(block, {}, '+=0.15'); // small coast
    });
  }

  /* =============================
   *  HOTSPOT INTRO ANIMATION
   * ============================= */
  function animateHotspotsOnLoad(evt) {
    if (!hasGSAP || reduceMotion) return;
    const hotspots = evt.target.querySelectorAll('.Hotspot');
    let i = 0;
    hotspots.forEach(btn => {
      gsap.fromTo(btn,
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out', delay: i * 0.12 }
      );
      i += 1;
    });
  }

  /* =============================
   *  LISTENERS & INIT
   * ============================= */
  // model-viewer progress
  if (mv) mv.addEventListener('progress', handleModelProgress, { passive: true });

  // background anims
  startBackgroundAnimation();

  // interactive blob
  if (interactiveBlob) {
    tickInteractive();
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
  }

  // pause/resume GSAP on tab visibility
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // menu interactions
  if (menuToggleBtn) menuToggleBtn.addEventListener('click', toggleMenu);
  if (menuScrimEl)   menuScrimEl.addEventListener('click', closeMenu);
  menuClosers.forEach(el => el.addEventListener('click', closeMenu));

  // place dropdown initially + on layout changes
  placeDropdown();
  window.addEventListener('resize', schedulePlaceDropdown, { passive: true });
  window.addEventListener('scroll', schedulePlaceDropdown, { passive: true });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // word reveal
  initWordReveal();

  // hotspot entrance after the *hotspot* model loads
  // (If you have multiple <model-viewer>, consider scoping this to the hotspots instance)
 const hotspotMV = document.getElementById('buds') || mv;
  hotspotMV?.addEventListener('load', animateHotspotsOnLoad);

  const hotspots = [
  { id: "anc", title: "Adaptive ANC", desc: "Reduces ambient noise in real time", icon: "icons/Transparency.svg" },
  { id: "transparency", title: "Transparency", desc: "Lets outside sound in naturally", icon: "icons/Transparency.svg" },
  { id: "mics", title: "Beamforming Mics", desc: "Focus on your voice", icon: "icons/BeaformingMic.svg" },
  { id: "charging", title: "Fast Charging", desc: "5 min = 1 hour play", icon: "icons/FastCharging.svg" },
  { id: "driver", title: "Custom Driver", desc: "Low distortion & deep bass", icon: "icons/CustomDriver.svg" }
];


})();
