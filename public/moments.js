// Sanguine — Signature Moments
// 1. Hero gold-dust headline assembly (canvas particles -> letterforms)
// 2. Scroll-velocity coupled marquee
// 3. Scroll-driven hero parallax (depth layers)
// 4. Text mask-reveal on section headings
// 5. Magnetic + flying add-to-bag arc

(function() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  // ===== 1. SCROLL-VELOCITY MARQUEE =====
  let lastScrollY = window.scrollY;
  let scrollVel = 0;
  let baseSpeed = 1;
  const updateScrollVel = () => {
    const dy = window.scrollY - lastScrollY;
    scrollVel = scrollVel * 0.85 + dy * 0.15;
    lastScrollY = window.scrollY;
  };
  window.addEventListener('scroll', updateScrollVel, { passive: true });

  // Replace marquee CSS animation with JS-driven transform
  const driveMarquee = () => {
    const tracks = document.querySelectorAll('.marquee-track');
    let offset = 0;
    const tick = () => {
      const speed = baseSpeed + Math.abs(scrollVel) * 0.4 * Math.sign(scrollVel || 1);
      offset -= speed * (scrollVel < -2 ? -1 : 1);
      tracks.forEach(t => {
        if (!t.dataset.width) t.dataset.width = t.scrollWidth / 2;
        const w = +t.dataset.width;
        const o = ((offset % w) + w) % w;
        t.style.transform = `translateX(${-o}px)`;
        t.style.animation = 'none';
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  setTimeout(driveMarquee, 100);

  // ===== 2. HERO PARALLAX =====
  const parallax = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const visual = hero.querySelector('.hero-visual') || hero.querySelector('.hero-still');
    const text = hero.querySelector('.hero-inner > div:first-child');
    const onScroll = () => {
      const y = window.scrollY;
      if (y > window.innerHeight) return;
      if (visual) visual.style.transform = `translateY(${y * 0.18}px) scale(${1 + y * 0.0002})`;
      if (text) text.style.transform = `translateY(${y * 0.08}px)`;
      hero.style.setProperty('--hero-fade', Math.max(0, 1 - y / 700));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };
  parallax();

  // ===== 3. HERO GOLD-DUST HEADLINE =====
  const goldDust = () => {
    const h1 = document.querySelector('.hero h1');
    if (!h1) return;
    const text = h1.innerText;
    const rect = h1.getBoundingClientRect();
    if (rect.width < 50) { setTimeout(goldDust, 200); return; }

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-dust-canvas';
    canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;`;
    const dpr = devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // wrap h1 in a relatively positioned container if not already
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-block;width:100%;';
    h1.parentNode.insertBefore(wrap, h1);
    wrap.appendChild(h1);
    wrap.appendChild(canvas);

    // Render text into off-screen canvas to extract pixel positions
    const off = document.createElement('canvas');
    off.width = rect.width; off.height = rect.height;
    const octx = off.getContext('2d');
    const computed = getComputedStyle(h1);
    octx.fillStyle = '#fff';
    octx.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    octx.textBaseline = 'top';
    // Multi-line aware
    const lines = text.split('\n');
    const lh = parseInt(computed.lineHeight) || parseInt(computed.fontSize) * 1.05;
    lines.forEach((ln, i) => octx.fillText(ln, 0, i * lh));

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const targets = [];
    const step = 4;
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const a = data[(y * off.width + x) * 4 + 3];
        if (a > 128) targets.push({ tx: x, ty: y });
      }
    }

    // Particles — capped well below the old 1200: the per-frame physics loop
    // saturated low-end main threads exactly during first click attempts.
    const N = Math.min(targets.length, 400);
    const particles = [];
    for (let i = 0; i < N; i++) {
      const t = targets[Math.floor(Math.random() * targets.length)];
      particles.push({
        x: rect.width / 2 + (Math.random() - 0.5) * rect.width * 1.4,
        y: rect.height + Math.random() * 200,
        tx: t.tx, ty: t.ty,
        vx: 0, vy: 0,
        size: Math.random() * 1.4 + 0.4,
        delay: Math.random() * 600,
        settled: false,
      });
    }

    // Hide the actual h1 text until particles settle, then crossfade
    h1.style.color = 'transparent';
    h1.style.transition = 'color 0.6s ease';

    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allSettled = true;
      for (const p of particles) {
        if (elapsed < p.delay) { allSettled = false; continue; }
        const dx = p.tx - p.x, dy = p.ty - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.5) {
          allSettled = false;
          p.vx = p.vx * 0.88 + dx * 0.04;
          p.vy = p.vy * 0.88 + dy * 0.04;
          p.x += p.vx; p.y += p.vy;
        } else { p.x = p.tx; p.y = p.ty; p.settled = true; }
        const alpha = p.settled ? Math.max(0, 1 - (elapsed - p.delay - 800) / 600) : 1;
        ctx.fillStyle = `oklch(0.82 0.13 85 / ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (!p.settled) {
          ctx.fillStyle = `oklch(0.95 0.12 85 / ${alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (allSettled && elapsed > 1800) {
        h1.style.color = '';
        canvas.style.transition = 'opacity 0.8s ease';
        canvas.style.opacity = '0';
        setTimeout(() => canvas.remove(), 1000);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  // Desktop-with-headroom only, and deferred to idle: the getImageData scan +
  // particle loop are pure decoration — they must never delay the user's
  // first interaction on the landing page.
  const dustCapable =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    (navigator.hardwareConcurrency || 8) >= 4 &&
    (navigator.deviceMemory || 8) >= 4;
  if (dustCapable) {
    if ('requestIdleCallback' in window) requestIdleCallback(() => goldDust(), { timeout: 1500 });
    else setTimeout(goldDust, 600);
  }

  // ===== 4. TEXT MASK-REVEAL on section headings =====
  const maskReveal = () => {
    // Bengali is a complex script: conjuncts and dependent vowel signs must
    // shape with adjacent characters. Splitting into per-code-unit inline
    // blocks renders dotted circles and broken letterforms — skip the effect
    // entirely on the bn locale (headings appear normally).
    if ((document.documentElement.lang || '').toLowerCase().startsWith('bn')) return;
    document.querySelectorAll('.section-hd h2:not(.mask-init)').forEach(h => {
      h.classList.add('mask-init');
      const text = h.textContent;
      h.innerHTML = '';
      text.split('').forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'mask-char';
        s.textContent = ch === ' ' ? '\u00A0' : ch;
        s.style.transitionDelay = `${i * 25}ms`;
        h.appendChild(s);
      });
    });
    // Observe — when parent .section-hd reveals, animate chars
    document.querySelectorAll('.section-hd[data-reveal]').forEach(s => {
      const obs = new MutationObserver(() => {
        if (s.classList.contains('reveal-in')) {
          s.querySelectorAll('.mask-char').forEach(c => c.classList.add('mask-in'));
          obs.disconnect();
        }
      });
      obs.observe(s, { attributes: true, attributeFilter: ['class'] });
      // Already revealed?
      if (s.classList.contains('reveal-in')) {
        s.querySelectorAll('.mask-char').forEach(c => c.classList.add('mask-in'));
      }
    });
  };
  setTimeout(maskReveal, 300);
  // Re-run on route changes — debounce to one rAF to avoid firing synchronously
  // on every React DOM commit (which would call querySelectorAll + innerHTML on each).
  let maskPending = false;
  const mo = new MutationObserver(() => {
    if (maskPending) return;
    maskPending = true;
    requestAnimationFrame(() => { maskReveal(); maskPending = false; });
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // ===== 5. FLYING ADD-TO-BAG =====
  window.SSG_FLY_TO_BAG = (originX, originY) => {
    const bag = document.querySelector('[data-bag]') || document.querySelector('.icon-btn[aria-label="Cart"]');
    if (!bag) return;
    const r = bag.getBoundingClientRect();
    const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
    const dot = document.createElement('div');
    dot.style.cssText = `position:fixed;left:${originX}px;top:${originY}px;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 30%,oklch(0.85 0.15 85),oklch(0.55 0.15 75));box-shadow:0 4px 12px oklch(0.7 0.15 75 / 0.5);z-index:9500;pointer-events:none;transform:translate(-50%,-50%);transition:left .8s cubic-bezier(.4,-.1,.3,1.1),top .8s cubic-bezier(.4,-.1,.3,1.1),transform .8s cubic-bezier(.4,-.1,.3,1.1),opacity .3s .55s;`;
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.left = tx + 'px';
      dot.style.top = ty + 'px';
      dot.style.transform = 'translate(-50%,-50%) scale(0.3)';
      dot.style.opacity = '0';
    });
    setTimeout(() => {
      dot.remove();
      bag.classList.add('bag-pulse');
      setTimeout(() => bag.classList.remove('bag-pulse'), 600);
    }, 850);
  };

  // Hook into add-to-bag clicks
  document.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const txt = btn.textContent || '';
    if (txt.includes('Add to Bag')) {
      window.SSG_FLY_TO_BAG(e.clientX, e.clientY);
    }
  }, true);
})();
