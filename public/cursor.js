// Ssanguine — Cursor System & Motion Layer
// Custom cursor that morphs per section + scroll reveal utility + page transition curtain.
// Respects prefers-reduced-motion and disables itself on touch devices.

(function() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // ===== Scroll reveal — runs on ALL devices (touch + pointer) =====
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('reveal-in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

  const observeAll = () => {
    document.querySelectorAll('[data-reveal]:not(.reveal-init)').forEach(el => {
      el.classList.add('reveal-init');
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        requestAnimationFrame(() => el.classList.add('reveal-in'));
      } else {
        io.observe(el);
      }
    });
  };
  observeAll();
  const mo = new MutationObserver(observeAll);
  mo.observe(document.body, { childList: true, subtree: true });

  if (isTouch) return; // custom cursor + effects only on pointer devices

  // ===== Mount cursor DOM =====
  const root = document.createElement('div');
  root.id = 'ssg-cursor-root';
  root.innerHTML = `
    <div id="ssg-cursor" class="cur" data-mode="default">
      <!-- default ring -->
      <div class="cur-ring"></div>
      <div class="cur-dot"></div>
      <!-- magnify "ENTER" -->
      <div class="cur-enter">ENTER</div>
      <!-- loupe -->
      <div class="cur-loupe"></div>
      <!-- wax seal -->
      <div class="cur-seal"><span>S</span></div>
      <!-- crosshair -->
      <svg class="cur-cross" viewBox="0 0 40 40" width="40" height="40">
        <line x1="20" y1="0" x2="20" y2="14" stroke="currentColor" stroke-width="1"/>
        <line x1="20" y1="26" x2="20" y2="40" stroke="currentColor" stroke-width="1"/>
        <line x1="0" y1="20" x2="14" y2="20" stroke="currentColor" stroke-width="1"/>
        <line x1="26" y1="20" x2="40" y2="20" stroke="currentColor" stroke-width="1"/>
        <circle cx="20" cy="20" r="3" stroke="currentColor" stroke-width="1" fill="none"/>
      </svg>
      <!-- inkwell drop -->
      <div class="cur-ink"></div>
      <!-- sparkle -->
      <svg class="cur-sparkle" viewBox="0 0 40 40" width="40" height="40">
        <path d="M20 4 L22 18 L36 20 L22 22 L20 36 L18 22 L4 20 L18 18 Z" fill="currentColor"/>
      </svg>
      <!-- HUD coords (admin) -->
      <div class="cur-hud"><span class="cur-hud-x">000</span> · <span class="cur-hud-y">000</span></div>
      <!-- floating label -->
      <div class="cur-label"></div>
    </div>
    <canvas id="ssg-cursor-trail"></canvas>
  `;
  document.body.appendChild(root);

  const cur = document.getElementById('ssg-cursor');
  const label = cur.querySelector('.cur-label');
  const hudX = cur.querySelector('.cur-hud-x');
  const hudY = cur.querySelector('.cur-hud-y');
  const canvas = document.getElementById('ssg-cursor-trail');
  const ctx = canvas.getContext('2d');

  // ===== Mouse tracking with lerp =====
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let cx = mx, cy = my;
  let vx = 0, vy = 0;
  let lastX = mx, lastY = my;
  let mode = 'default';
  let down = false;
  let visible = false;

  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (!visible) { cx = mx; cy = my; visible = true; cur.classList.add('visible'); }
  });
  window.addEventListener('mousedown', (e) => {
    down = true; cur.classList.add('down');
    if (mode === 'seal') {
      // Defer DOM mutation to next rAF so it doesn't block the pointer-down frame.
      const sx = e.clientX, sy = e.clientY;
      requestAnimationFrame(() => {
        const im = document.createElement('div');
        im.className = 'wax-imprint';
        im.style.left = sx + 'px';
        im.style.top = sy + 'px';
        document.body.appendChild(im);
        setTimeout(() => im.remove(), 1500);
      });
    }
  });
  window.addEventListener('mouseup',   () => { down = false; cur.classList.remove('down'); });
  document.addEventListener('mouseleave', () => { cur.classList.remove('visible'); visible = false; });

  // Resize canvas
  const resize = () => {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);
  };
  resize();
  window.addEventListener('resize', resize);

  // ===== Particles for trails =====
  const particles = [];
  const MAX_PARTICLES = 80;
  const spawnParticle = (x, y, type) => {
    if (particles.length > MAX_PARTICLES) particles.shift();
    particles.push({ x, y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5 - 0.3, life: 1, type });
  };

  // ===== Hover detection — find nearest section with data-cursor =====
  let hoverEl = null;
  const updateHover = () => {
    const el = document.elementFromPoint(mx, my);
    hoverEl = el;
    let mode_ = 'default';
    let lbl = '';
    let cur_el = el;
    while (cur_el && cur_el !== document.body) {
      const m = cur_el.getAttribute && cur_el.getAttribute('data-cursor');
      const l = cur_el.getAttribute && cur_el.getAttribute('data-cursor-label');
      if (m && !mode_ || mode_ === 'default') mode_ = m || mode_;
      if (m) { mode_ = m; if (l) lbl = l; break; }
      cur_el = cur_el.parentElement;
    }
    // Special: hovering interactive
    if (el) {
      const tag = el.tagName;
      const isLink = el.closest && (el.closest('a, button, [role="button"], .card, .cat-tile, .cat-chip, .nav-link, .filter-pill, .swatch, .pay-opt'));
      if (isLink) cur.classList.add('hover-link'); else cur.classList.remove('hover-link');
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (isInput) mode_ = 'text';
    }
    if (mode_ !== mode) {
      cur.setAttribute('data-mode', mode_);
      mode = mode_;
    }
    label.textContent = lbl;
    label.style.opacity = lbl ? '1' : '0';
  };

  // ===== Animation loop =====
  let lastT = 0;
  const tick = (t) => {
    const dt = Math.min((t - lastT) / 16, 3) || 1;
    lastT = t;

    // lerp cursor toward mouse — multiply by dt so it's frame-rate independent
    // (without dt a 144 Hz screen gets ~0.09 effective ease vs 0.22 at 60 Hz)
    const ease = Math.min((mode === 'admin' ? 1 : 0.28) * dt, 1);
    cx += (mx - cx) * ease;
    cy += (my - cy) * ease;
    vx = cx - lastX; vy = cy - lastY;
    lastX = cx; lastY = cy;
    const speed = Math.hypot(vx, vy);

    cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;

    // Hover detection every other frame (~30fps) inside the rAF loop so it
    // doesn't compete with pointer events via a separate setInterval timer.
    if (++hoverFrame % 2 === 0) updateHover();

    // HUD coords for admin
    if (mode === 'admin') {
      hudX.textContent = String(Math.round(cx)).padStart(4, '0');
      hudY.textContent = String(Math.round(cy)).padStart(4, '0');
    }

    // Watch hand rotation = velocity direction
    if (mode === 'watches') {
      const ang = Math.atan2(vy, vx) * 180 / Math.PI;
      cur.style.setProperty('--ang', ang + 'deg');
    }

    // Particle trails
    if (!reduced && visible) {
      if (mode === 'flowers' && speed > 1) spawnParticle(cx, cy, 'petal');
      else if (mode === 'perfume' && speed > 0.5) {
        for (let i = 0; i < 2; i++) spawnParticle(cx, cy, 'smoke');
      }
      else if (mode === 'jewelry' && (down || (speed > 4 && Math.random() < 0.3))) {
        for (let i = 0; i < 3; i++) spawnParticle(cx, cy, 'sparkle');
      }
      else if (mode === 'anime' && speed > 2) spawnParticle(cx, cy, 'tone');
      else if (mode === 'inkwell' && speed > 1.5) spawnParticle(cx + (Math.random()-0.5)*4, cy + 6, 'ink');
    }

    // Render trails
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= p.type === 'smoke' ? 0.012 : p.type === 'sparkle' ? 0.04 : p.type === 'tone' ? 0.05 : 0.02;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.type === 'petal') {
        ctx.fillStyle = `oklch(${0.55 + p.life*0.2} 0.18 320)`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 4, 6, p.life * 6, 0, Math.PI*2);
        ctx.fill();
      } else if (p.type === 'smoke') {
        const r = (1 - p.life) * 14 + 4;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `oklch(0.6 0.06 300 / ${p.life * 0.4})`);
        g.addColorStop(1, `oklch(0.6 0.06 300 / 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - r, p.y - r, r*2, r*2);
        p.vy -= 0.05;
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = 'oklch(0.85 0.15 85)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.life * 2.5, 0, Math.PI*2);
        ctx.fill();
      } else if (p.type === 'tone') {
        ctx.fillStyle = `oklch(0.4 0.18 300 / ${p.life})`;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      } else if (p.type === 'ink') {
        ctx.fillStyle = `oklch(0.25 0.15 300 / ${p.life * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.life * 3, 0, Math.PI*2);
        ctx.fill();
        p.vy += 0.15;
      }
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // updateHover runs inside the rAF loop every other frame (~30fps equivalent)
  // to avoid a competing setInterval forcing layout on a separate timer.
  let hoverFrame = 0;

  // ===== Page transition curtain =====
  window.SSG_TRANSITION = function(cb) {
    if (reduced) { cb && cb(); return; }
    const c = document.createElement('div');
    c.className = 'ssg-curtain';
    document.body.appendChild(c);
    requestAnimationFrame(() => c.classList.add('in'));
    setTimeout(() => {
      cb && cb();
      requestAnimationFrame(() => c.classList.add('out'));
      setTimeout(() => c.remove(), 500);
    }, 380);
  };

  // (Scroll reveal is registered above the isTouch guard so it runs on all devices.)

  // ===== Magnetic effect for buttons =====
  // Cache both elements and their rects. Rects are refreshed on resize/scroll
  // so getBoundingClientRect is never called inside the hot mousemove path.
  let magneticCache = [];
  const refreshMagnetic = () => {
    magneticCache = Array.from(document.querySelectorAll('[data-magnetic]')).map((el) => ({
      el,
      rect: el.getBoundingClientRect(),
    }));
  };
  refreshMagnetic();
  const magObs = new MutationObserver(refreshMagnetic);
  magObs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', refreshMagnetic, { passive: true });
  window.addEventListener('scroll', refreshMagnetic, { passive: true });

  document.addEventListener('mousemove', (e) => {
    for (const { el, rect } of magneticCache) {
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < 80) {
        const f = (1 - dist / 80) * 0.3;
        el.style.transform = `translate(${dx * f}px, ${dy * f}px)`;
      } else {
        el.style.transform = '';
      }
    }
  }, { passive: true });

  // ===== Card tilt on cursor proximity =====
  // Track the single currently-hovered card via mouseover/mouseout delegation
  // instead of querySelectorAll('.card:hover') on every mousemove, which forces
  // a style recalculation pass across the entire document.
  let tiltCard = null;
  document.addEventListener('mouseover', (e) => {
    const card = e.target.closest?.('.card, .cat-tile');
    tiltCard = card || null;
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    const card = e.target.closest?.('.card, .cat-tile');
    if (card) {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
      if (tiltCard === card) tiltCard = null;
    }
  }, { passive: true });
  document.addEventListener('mousemove', (e) => {
    if (!tiltCard) return;
    const r = tiltCard.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tiltCard.style.setProperty('--tilt-x', `${py * -3}deg`);
    tiltCard.style.setProperty('--tilt-y', `${px * 3}deg`);
  }, { passive: true });
})();
