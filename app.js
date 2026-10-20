(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     AUDIO (Web Audio API)
  ========================================================= */
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function playTone({ freq, duration = 0.2, type = 'sine', volume = 0.08, delay = 0, attack = 0.01 }) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      // autoplay bloqueado — segue em silêncio
    }
  }

  // chime suave: Dó5 → Sol5 → Dó6
  function playPreloaderComplete() {
    playTone({ freq: 523.25, duration: 0.35, type: 'sine', volume: 0.06, delay: 0,    attack: 0.02 });
    playTone({ freq: 783.99, duration: 0.55, type: 'sine', volume: 0.07, delay: 0.18, attack: 0.02 });
    playTone({ freq: 1046.5, duration: 0.6,  type: 'sine', volume: 0.04, delay: 0.32, attack: 0.02 });
  }

  /* =========================================================
     1. PRELOADER
  ========================================================= */
  const preloader = document.getElementById('preloader');
  const counter = document.getElementById('counter');
  const barFill = document.getElementById('barFill');

  let pageLoaded = false;
  let progress = 0;
  let preloaderDone = false;

  window.addEventListener('load', () => { pageLoaded = true; });

  body.classList.add('is-loading');

  function tickPreloader() {
    if (preloaderDone) return;

    if (progress >= 100) {
      finishPreloader();
      return;
    }

    // trava em 95% até a página carregar
    if (!pageLoaded && progress >= 95) {
      setTimeout(tickPreloader, 100);
      return;
    }

    const step = pageLoaded
      ? Math.random() * 4 + 3
      : Math.random() * 2.5 + 1;

    progress = Math.min(progress + step, pageLoaded ? 100 : 95);
    counter.textContent = Math.floor(progress);
    barFill.style.width = progress + '%';

    setTimeout(tickPreloader, 55 + Math.random() * 65);
  }

  function finishPreloader() {
    preloaderDone = true;

    // chime suave ao chegar em 100%
    playPreloaderComplete();

    // pausa dramática → painéis sobem
    setTimeout(() => {
      preloader.classList.add('is-done');

      // 900ms depois: painéis quase saindo, libera a coreografia
      setTimeout(() => {
        body.classList.remove('is-loading');
        body.classList.add('is-ready');
      }, 900);

      // 1200ms: esconde o preloader
      setTimeout(() => {
        preloader.classList.add('is-gone');
      }, 1200);
    }, 400);
  }

  if (reduced) {
    preloader.classList.add('is-gone');
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
  } else {
    setTimeout(tickPreloader, 150);
  }

  /* =========================================================
     2. DARK MODE (dark é o padrão)
  ========================================================= */
  const themeBtn = document.getElementById('themeToggle');
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  function updateMetaTheme(theme) {
    if (metaTheme) metaTheme.content = theme === 'light' ? '#f7f6f2' : '#0b0b10';
  }

  updateMetaTheme(root.dataset.theme === 'light' ? 'light' : 'dark');

  async function toggleTheme(e) {
    const isLight = root.dataset.theme === 'light';
    const next = isLight ? 'dark' : 'light';

    const apply = () => {
      if (next === 'light') root.dataset.theme = 'light';
      else root.removeAttribute('data-theme');
      localStorage.setItem('theme', next);
      updateMetaTheme(next);
    };

    if (!document.startViewTransition || reduced) {
      apply();
      return;
    }

    root.style.setProperty('--tx', (e?.clientX ?? innerWidth / 2) + 'px');
    root.style.setProperty('--ty', (e?.clientY ?? innerHeight / 2) + 'px');

    const vt = document.startViewTransition(apply);
    await vt.finished;
  }

  themeBtn?.addEventListener('click', toggleTheme);

  /* =========================================================
     3. REVEAL ON SCROLL
  ========================================================= */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* =========================================================
     4. SKILLS BARS
  ========================================================= */
  const skillsSection = document.getElementById('skills');
  if (skillsSection) {
    if ('IntersectionObserver' in window && !reduced) {
      const skillIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            skillsSection.classList.add('is-visible');
            skillIO.unobserve(skillsSection);
          }
        });
      }, { threshold: 0.25 });
      skillIO.observe(skillsSection);
    } else {
      skillsSection.classList.add('is-visible');
    }
  }

  /* =========================================================
     5. FILTRO DE PROJETOS
  ========================================================= */
  const filters = document.querySelectorAll('.filter');
  const projectCards = document.querySelectorAll('.project-card');

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const filter = btn.dataset.filter;
      projectCards.forEach((card) => {
        const categories = card.dataset.category.split(' ');
        const show = filter === 'all' || categories.includes(filter);
        card.classList.toggle('is-hidden', !show);
        if (show) {
          card.style.animation = 'none';
          void card.offsetWidth;
          card.style.animation = '';
        }
      });
    });
  });

  /* =========================================================
     6. ANO NO FOOTER
  ========================================================= */
  const year = new Date().getFullYear();
  const footer = document.querySelector('.footer p');
  if (footer) footer.textContent = `© ${year} — Mateus Maziero. Feito com HTML, CSS e JS.`;

})();