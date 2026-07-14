// Sanguine — A-tier features
// 1. WebGL hero shader (violet plasma + cursor reactive)
// 2. Sound design (gong, paper, click) with mute toggle
// 3. Wax-seal loading state on route changes
// 4. Idle-state cursor constellation
// 5. Live admin: count-up KPIs + chart draw-in
// 6. Kinetic typography (split + drift on hero subline)
// 7. Scroll-driven set piece (pinned product showcase)
// 8. Shared-element flight on card→PDP

(function() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // ============ 1. WEBGL HERO SHADER (DISABLED 2026-05-03) ============
  // The hero is now painted by `<HeroTide>` (SVG, three-layer parallax). The
  // WebGL violet shader below was the original treatment but it overlays
  // `mix-blend-mode: screen` at opacity 0.85 *on top* of HeroTide, washing
  // out the SVG. Per EXECUTION-PLAN.md Phase 1.2 we keep the SVG-only
  // register from AESTHETIC-DIRECTION.md.
  //
  // Code retained but bypassed; remove entirely in Phase 5 cleanup.
  function mountShader() { return; }
  // Original implementation kept below for reference / restoration.
  function _mountShaderOriginal() {
    const hero = document.querySelector('.hero');
    if (!hero || hero.querySelector('canvas.ssg-shader')) return;
    if (reduced) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'ssg-shader';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;mix-blend-mode:screen;opacity:0.85;pointer-events:none;';
    hero.style.position = 'relative';
    hero.insertBefore(canvas, hero.firstChild);

    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
    if (!gl) { canvas.remove(); return; }

    const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
    const fs = `
      precision highp float;
      uniform vec2 r; uniform float t; uniform vec2 m;
      // Hash + value noise
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){
        vec2 i=floor(p), f=fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x),
                   mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p){
        float s=0., a=0.5;
        for(int i=0;i<5;i++){ s+=a*n(p); p*=2.05; a*=0.5; }
        return s;
      }
      void main(){
        vec2 uv = (gl_FragCoord.xy - 0.5*r) / r.y;
        vec2 mo = (m - 0.5*r) / r.y;
        float dM = length(uv - mo);
        // Domain warp around cursor
        vec2 q = uv + 0.4 * vec2(fbm(uv*1.2 + t*0.05), fbm(uv*1.2 - t*0.04));
        q += 0.15 * (uv - mo) / (0.05 + dM*dM);
        float v = fbm(q*1.6 + t*0.03);
        v = pow(v, 1.8);
        // Color: deep violet to gold highlight
        vec3 deep = vec3(0.07, 0.03, 0.13);
        vec3 mid  = vec3(0.27, 0.10, 0.45);
        vec3 hi   = vec3(0.96, 0.78, 0.32); // gold
        vec3 col = mix(deep, mid, v);
        float glint = smoothstep(0.62, 0.78, v) * smoothstep(0.5, 0.0, dM*1.4);
        col = mix(col, hi, glint*0.85);
        // Vignette
        col *= 1.0 - 0.3 * length(uv);
        // Subtle film grain
        col += (h(gl_FragCoord.xy + t)*0.02 - 0.01);
        gl_FragColor = vec4(col, 1.0);
      }`;

    function compile(src, type) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); }
      return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(vs, gl.VERTEX_SHADER));
    gl.attachShader(prog, compile(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const ploc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(ploc);
    gl.vertexAttribPointer(ploc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'r');
    const uT = gl.getUniformLocation(prog, 't');
    const uM = gl.getUniformLocation(prog, 'm');

    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = e => {
      const rect = canvas.getBoundingClientRect();
      tx = e.clientX - rect.left;
      ty = rect.height - (e.clientY - rect.top);
    };
    window.addEventListener('mousemove', onMove);

    const dpr = Math.min(devicePixelRatio || 1, 1.6);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let alive = true;
    const t0 = performance.now();
    const tick = () => {
      if (!alive || !document.body.contains(canvas)) return;
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, (performance.now() - t0) / 1000);
      gl.uniform2f(uM, mx * dpr, my * dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(tick);
    };
    tick();
  }
  setTimeout(mountShader, 400);

  // ============ 2. SOUND DESIGN ============
  // Audio is gated on cookie consent. Until the visitor clicks "Accept all"
  // on the consent banner, `audioAllowed` stays false and every tone() /
  // noiseBurst() call early-returns. The mute toggle is still mounted but
  // its unmute path is also gated. Existing visitors who already toggled
  // sound on get grandfathered via `localStorage.ssg-muted === 'false'`
  // — that legacy preference is treated as implicit consent for audio
  // since the toggle pre-dated the consent banner.
  function readConsent() {
    try {
      const raw = localStorage.getItem('ssg-cookie-consent-v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.choice ? parsed.choice : null;
    } catch { return null; }
  }
  function audioPermitted() {
    // No audio on touch: the mute toggle no longer mounts there (it fought
    // the cookie banner and sticky Add-to-Bag for the same corner), and
    // sound without a mute control is worse than silence.
    if (isTouch) return false;
    const consent = readConsent();
    if (consent === 'accept') return true;
    // Grandfather: someone who previously unmuted before consent was a thing.
    if (localStorage.getItem('ssg-muted') === 'false') return true;
    return false;
  }
  let muted = !audioPermitted() || localStorage.getItem('ssg-muted') !== 'false';
  // Re-evaluate when the consent banner persists a choice (it dispatches a
  // storage event same-tab). Once allowed, leave the mute toggle in the
  // user's hands.
  window.addEventListener('storage', e => {
    if (e.key === 'ssg-cookie-consent-v1' && audioPermitted()) {
      // Don't auto-unmute — just allow it. User still has to press the toggle.
      document.querySelectorAll('.ssg-mute').forEach(el => el.removeAttribute('data-locked'));
    }
  });
  let actx = null;
  function ensureAudio() {
    if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function tone(freq, dur, type, gain, slide) {
    if (muted || !actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, actx.currentTime + dur);
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain || 0.06, actx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur + 0.05);
  }
  function noiseBurst(dur, gain, filterFreq) {
    if (muted || !actx) return;
    const buf = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/d.length);
    const src = actx.createBufferSource(); src.buffer = buf;
    const filt = actx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = filterFreq || 4000; filt.Q.value = 0.9;
    const g = actx.createGain(); g.gain.value = gain || 0.08;
    src.connect(filt).connect(g).connect(actx.destination);
    src.start();
  }
  // Curated audio (admin-uploaded via /admin/audio) takes precedence over
  // the synth tones for the three signature sounds. The locale layout
  // injects `window.SSG_AUDIO_URLS = { gong, chime, seal }` inline before
  // this script runs. ANY playback failure — 404, decode error, autoplay
  // rejection — falls back to the synth so the cue is never silently lost.
  // click/rustle stay synth-only by design (sub-50ms cues, files add lag).
  const synthTones = {
    gong() { tone(110, 2.0, 'sine', 0.18, 80); tone(220, 1.8, 'sine', 0.06, 165); tone(440, 1.6, 'sine', 0.03, 330); },
    chime() { tone(1320, 0.4, 'sine', 0.08, 1760); tone(1760, 0.5, 'sine', 0.04, 2200); },
    seal() { tone(80, 0.25, 'sine', 0.15, 50); noiseBurst(0.15, 0.04, 1500); },
  };
  const audioFiles = {};
  function fileOrSynth(kind) {
    // Gate on BOTH the mute toggle and cookie consent, matching tone()'s
    // effective gating (muted starts true whenever consent is absent, but
    // restating it here keeps the PDPO guarantee independent of that
    // initialisation invariant).
    if (muted || !audioPermitted()) return;
    const url = (window.SSG_AUDIO_URLS || {})[kind];
    if (!url) return synthTones[kind]();
    try {
      let el = audioFiles[kind];
      if (!el || el.src !== url) {
        el = new Audio(url);
        el.preload = 'auto';
        el.volume = 0.55;
        audioFiles[kind] = el;
      }
      el.currentTime = 0;
      const p = el.play();
      if (p && p.catch) p.catch(() => synthTones[kind]());
    } catch { synthTones[kind](); }
  }
  window.SSG_SOUND = {
    gong() { fileOrSynth('gong'); },
    click() { tone(2400, 0.04, 'square', 0.03); },
    rustle() { noiseBurst(0.18, 0.05, 5000); },
    chime() { fileOrSynth('chime'); },
    seal() { fileOrSynth('seal'); },
  };
  function setMuted(m) {
    muted = m;
    localStorage.setItem('ssg-muted', m ? 'true' : 'false');
    document.querySelectorAll('.ssg-mute').forEach(el => el.setAttribute('data-muted', m));
  }
  function mountMuteToggle() {
    if (document.querySelector('.ssg-mute')) return;
    const b = document.createElement('button');
    b.className = 'ssg-mute';
    b.setAttribute('data-muted', muted);
    if (!audioPermitted()) b.setAttribute('data-locked', 'true');
    b.title = 'Sound';
    b.setAttribute('aria-label', 'Toggle sound');
    b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path class="on" d="M5 9v6h4l5 4V5L9 9zm12 0a4 4 0 0 1 0 6"/><path class="off" d="M5 9v6h4l5 4V5L9 9zM18 9l4 6m-4 0 4-6"/></svg>`;
    b.addEventListener('click', () => {
      // Block unmute until cookie consent is given. The button stays visible
      // but no-ops with a brief hint so the visitor knows where to look.
      if (!audioPermitted()) {
        b.title = 'Accept cookies to enable sound';
        return;
      }
      ensureAudio();
      setMuted(!muted);
      if (!muted) window.SSG_SOUND.chime();
    });
    document.body.appendChild(b);
  }
  // No mute toggle on touch: it sat fixed bottom-right on top of the cookie
  // banner's Accept button and the PDP sticky Add-to-Bag — taps aimed at the
  // buy CTA hit a pre-consent no-op instead. Audio is gesture-gated anyway.
  if (!isTouch) mountMuteToggle();
  // Click-driven cues (button feedback, card hover) — gated on consent and mute.
  // Bail on the element test FIRST: this capture listener runs ahead of every
  // React handler on the page, so the common case (a click anywhere else)
  // must not touch localStorage or the audio pipeline at all.
  document.addEventListener('click', e => {
    const t = e.target;
    const wantsClick = !!(t.closest && t.closest('.btn-primary, .btn-gold'));
    const wantsRustle = !wantsClick && !!(t.closest && t.closest('.cat-tile, .card'));
    if (!wantsClick && !wantsRustle) return;
    if (!audioPermitted()) return;
    ensureAudio();
    if (wantsClick) window.SSG_SOUND.click();
    else window.SSG_SOUND.rustle();
  }, true);
  // First gong on first user gesture — gated on consent. Pre-consent
  // visitors get a silent first paint, which is what PDPO/WCAG expect.
  let gongPlayed = false;
  const playGong = () => {
    if (gongPlayed) return;
    if (!audioPermitted()) return;
    gongPlayed = true;
    ensureAudio();
    setTimeout(() => window.SSG_SOUND.gong(), 100);
  };
  window.addEventListener('pointerdown', playGong, { once: true });
  window.addEventListener('keydown', playGong, { once: true });

  // ============ 3. WAX-SEAL LOADING STATE ============
  function showSeal() {
    if (reduced) return;
    let s = document.querySelector('.ssg-seal-loader');
    if (s) return s;
    s = document.createElement('div');
    s.className = 'ssg-seal-loader';
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('role', 'presentation');
    s.innerHTML = `
      <div class="seal-disc">
        <svg viewBox="0 0 100 100" width="100" height="100">
          <circle class="seal-ring" cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="251" stroke-dashoffset="251"/>
          <circle class="seal-fill" cx="50" cy="50" r="34" fill="currentColor" opacity="0"/>
          <text x="50" y="58" text-anchor="middle" font-family="Cormorant Garamond" font-size="34" font-style="italic" font-weight="500" class="seal-letter">S</text>
        </svg>
      </div>`;
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add('in'));
    return s;
  }
  function hideSeal() {
    const s = document.querySelector('.ssg-seal-loader');
    if (!s) return;
    s.classList.add('out');
    setTimeout(() => s.remove(), 500);
  }
  window.SSG_SEAL_LOAD = { show: showSeal, hide: hideSeal };

  // Page-load seal
  if (!reduced) {
    const initial = showSeal();
    if (initial) setTimeout(hideSeal, 300);
  }

  // ============ 4. IDLE CONSTELLATION (DISABLED 2026-05-03) ============
  // The constellation was a hold-over from the violet/dusk register. With
  // HeroTide + cursor ripple already providing ambient motion, the canvas
  // dots-and-lines layer on top of everything else read as visual noise.
  // Per EXECUTION-PLAN.md Phase 1.5. Code retained, listeners short-circuited.
  let idleTimer = null, idlePts = [], idleCanvas = null, idleCtx = null;
  function ensureIdleCanvas() {
    if (idleCanvas) return;
    idleCanvas = document.createElement('canvas');
    idleCanvas.className = 'ssg-idle';
    idleCanvas.width = innerWidth; idleCanvas.height = innerHeight;
    document.body.appendChild(idleCanvas);
    idleCtx = idleCanvas.getContext('2d');
    addEventListener('resize', () => { idleCanvas.width = innerWidth; idleCanvas.height = innerHeight; });
  }
  let idleX = 0, idleY = 0;
  function idleTick() {
    if (!idleCanvas) return;
    idleCtx.clearRect(0,0,idleCanvas.width,idleCanvas.height);
    idleCtx.fillStyle = 'oklch(0.85 0.13 85)';
    idleCtx.strokeStyle = 'oklch(0.85 0.13 85 / 0.25)';
    idleCtx.lineWidth = 0.5;
    for (let i = 0; i < idlePts.length; i++) {
      const p = idlePts[i];
      p.life -= 0.003;
      if (p.life <= 0) { idlePts.splice(i, 1); i--; continue; }
      idleCtx.globalAlpha = p.life;
      idleCtx.beginPath(); idleCtx.arc(p.x, p.y, 1.4, 0, 6.3); idleCtx.fill();
      // connect to neighbors
      for (let j = i+1; j < idlePts.length; j++) {
        const q = idlePts[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 90) {
          idleCtx.globalAlpha = Math.min(p.life, q.life) * (1 - d/90) * 0.5;
          idleCtx.beginPath(); idleCtx.moveTo(p.x, p.y); idleCtx.lineTo(q.x, q.y); idleCtx.stroke();
        }
      }
    }
    idleCtx.globalAlpha = 1;
    if (idlePts.length) requestAnimationFrame(idleTick);
    else { idleCanvas.remove(); idleCanvas = null; idleCtx = null; }
  }
  function resetIdle() { return; /* disabled — see Phase 1.5 */ }
  // No mousemove / keydown / scroll listeners — idle constellation off.

  // ============ 5. LIVE ADMIN — count-up + chart draw ============
  function liveAdmin() {
    document.querySelectorAll('.stat .v:not(.counted)').forEach(el => {
      el.classList.add('counted');
      const txt = el.textContent.trim();
      const m = txt.match(/^([^\d.,-]*)([\d.,]+)([%kKM]?)(.*)$/);
      if (!m) return;
      const prefix = m[1], num = parseFloat(m[2].replace(/,/g,'')), suffix = m[3] + m[4];
      let cur = 0;
      const dur = 900;
      const start = performance.now();
      const fmt = (n) => {
        if (txt.includes(',')) return Math.round(n).toLocaleString();
        if (Number.isInteger(num)) return Math.round(n);
        return n.toFixed(1);
      };
      const step = (t) => {
        const k = Math.min(1, (t - start)/dur);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = prefix + fmt(num * e) + suffix;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    // Animate bars
    document.querySelectorAll('.barchart:not(.animated)').forEach(bc => {
      bc.classList.add('animated');
      bc.querySelectorAll('.bar').forEach((b, i) => {
        const h = b.style.height;
        b.style.height = '0';
        setTimeout(() => { b.style.transition = 'height 0.7s cubic-bezier(.2,.9,.3,1.1)'; b.style.height = h; }, 100 + i*40);
      });
    });
    // Animate donuts
    document.querySelectorAll('.donut:not(.animated)').forEach(d => {
      d.classList.add('animated');
      d.querySelectorAll('circle[stroke-dasharray]').forEach((c, i) => {
        const orig = c.getAttribute('stroke-dasharray');
        c.setAttribute('stroke-dasharray', '0 999');
        setTimeout(() => { c.style.transition = 'stroke-dasharray 0.8s ease'; c.setAttribute('stroke-dasharray', orig); }, 200 + i*120);
      });
    });
    // Animate line chart polylines
    document.querySelectorAll('.chart polyline:not(.animated)').forEach(p => {
      p.classList.add('animated');
      const len = p.getTotalLength ? p.getTotalLength() : 200;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      setTimeout(() => { p.style.transition = 'stroke-dashoffset 1.2s ease'; p.style.strokeDashoffset = 0; }, 200);
    });
    // Pulsing live status pill — only on processing order status, not on every .pill-warn
    document.querySelectorAll('.pill-warn:not(.pulsing)').forEach(p => {
      if ((p.textContent || '').trim().toLowerCase() === 'processing') p.classList.add('pulsing');
    });
  }
  setTimeout(liveAdmin, 500);

  // ============ 6. KINETIC TYPOGRAPHY — hero subline ============
  function kineticSubline() {
    const p = document.querySelector('.hero p');
    if (!p || p.dataset.kinetic) return;
    p.dataset.kinetic = '1';
    const words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map((w, i) => `<span class="kw" style="transition-delay:${1600 + i*40}ms">${w}</span>`).join(' ');
    requestAnimationFrame(() => p.querySelectorAll('.kw').forEach(s => s.classList.add('in')));
  }
  setTimeout(kineticSubline, 200);

  // ============ 7. SHARED-ELEMENT FLIGHT (DISABLED 2026-05-03) ============
  // The FLIP card flight overlapped with `<RouteTransition>`'s fade — both
  // fired on card→PDP navigation, producing two competing transitions.
  // RouteTransition wins (per EXECUTION-PLAN.md Phase 1.5). The View
  // Transitions API will replace this properly in Phase 3 (cross-document
  // shared elements between PLP and PDP).

  // ============ 8. SCROLL-DRIVEN PINNED SHOWCASE ============
  function pinShowcase() {
    document.querySelectorAll('[data-pin-showcase]:not(.pin-init)').forEach(host => {
      host.classList.add('pin-init');
      const stickyInner = host.querySelector('.pin-inner');
      if (!stickyInner) return;
      const frames = stickyInner.querySelectorAll('.pin-frame');
      const counter = host.querySelector('.pin-counter');
      const bar = host.querySelector('.pin-progress-bar');
      const onScroll = () => {
        const r = host.getBoundingClientRect();
        const range = host.offsetHeight - innerHeight;
        const prog = Math.max(0, Math.min(1, -r.top / range));
        const idx = Math.min(frames.length - 1, Math.floor(prog * frames.length * 0.999));
        frames.forEach((f, i) => f.classList.toggle('active', i === idx));
        const hl = stickyInner.querySelector('.pin-headline');
        if (hl) hl.style.transform = `translateY(${prog * -30}px)`;
        if (bar) bar.style.setProperty('--pin-prog', (prog * 100) + '%');
        if (counter) counter.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(frames.length).padStart(2, '0');
      };
      addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    });
  }
  setTimeout(pinShowcase, 600);

  // ============ 9. MOBILE MOTION ============
  if (isTouch) {
    // Tap burst
    document.addEventListener('pointerdown', e => {
      if (reduced) return;
      const t = e.target;
      if (!t.closest || !t.closest('.btn, .card, .cat-tile, .swatch, .filter-pill, .pdp-thumb')) return;
      const b = document.createElement('div');
      b.className = 'tap-burst';
      b.style.left = e.clientX + 'px';
      b.style.top  = e.clientY + 'px';
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 600);
    }, true);

    // Swipe-to-dismiss cart drawer. The React drawer renders as `.drawer`
    // only while open (conditional render) — the old `.cart-drawer.open`
    // selector matched nothing, so this entire feature was dead.
    const attachDrawerSwipe = () => {
      const drawer = document.querySelector('.drawer');
      if (!drawer || drawer.dataset.swipeBound) return;
      drawer.dataset.swipeBound = '1';
      // inject handle
      if (!drawer.querySelector('.drawer-handle')) {
        const h = document.createElement('div'); h.className = 'drawer-handle';
        drawer.insertBefore(h, drawer.firstChild);
      }
      let sy = 0, dy = 0, dragging = false;
      drawer.addEventListener('touchstart', e => {
        // The drawer itself never scrolls — .drawer-body is the scroll
        // container. Guarding on the wrong element let drags start while the
        // cart list was mid-scroll, dismissing the drawer on scroll-up.
        const scroller = drawer.querySelector('.drawer-body');
        if (scroller && scroller.scrollTop > 0) return;
        sy = e.touches[0].clientY; dragging = true; dy = 0;
        drawer.classList.add('dragging');
      }, { passive: true });
      drawer.addEventListener('touchmove', e => {
        if (!dragging) return;
        dy = Math.max(0, e.touches[0].clientY - sy);
        drawer.style.transform = `translateY(${dy}px)`;
      }, { passive: true });
      drawer.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        drawer.classList.remove('dragging');
        if (dy > 120) {
          drawer.style.transform = 'translateY(100%)';
          const close = document.querySelector('.overlay');
          if (close) close.click();
          setTimeout(() => drawer.style.transform = '', 400);
        } else {
          drawer.style.transform = '';
        }
      });
    };
    const drawerMo = new MutationObserver(attachDrawerSwipe);
    drawerMo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // ============ 10. ORRERY + CELESTIAL ARCH ANIMATION ============
  function mountOrrery() {
    if (reduced) return;
    const frame = document.querySelector('.hs-frame');
    if (!frame || frame.querySelector('.ssg-orrery')) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'ssg-orrery';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    frame.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let W, H, CX, CY, OR;

    const STARS = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.3 + 0.3,
      a: Math.random() * 0.5 + 0.2,
      phase: Math.random() * 6.28,
    }));

    // Planets: [radius_fraction, inclination, angular_speed, color, dot_size, starting_angle]
    const PLANETS = [
      { rf: 0.22, inc: 0.38, spd: 0.00090, col: 'rgba(201,168,76,1)',   sz: 4.5, ph: 0 },
      { rf: 0.38, inc: 0.36, spd: 0.00055, col: 'rgba(160,195,255,0.9)',sz: 3.5, ph: 1.3 },
      { rf: 0.54, inc: 0.40, spd: 0.00032, col: 'rgba(240,200,120,0.9)',sz: 4.0, ph: 2.5 },
      { rf: 0.72, inc: 0.34, spd: 0.00019, col: 'rgba(200,155,210,0.9)',sz: 3.0, ph: 4.1 },
      { rf: 1.00, inc: 0.37, spd: 0.00011, col: 'rgba(140,210,185,0.9)',sz: 3.5, ph: 0.8 },
    ];

    // Armillary sphere rings: radius multiplier, ry/rx ratio, base rotation, drift speed
    const SPHERE = [
      { rf: 1.22, inc: 0.20, rot: 0.0,  spd: 0.000038 },
      { rf: 1.10, inc: 0.62, rot: 0.5,  spd: 0.000055 },
      { rf: 1.16, inc: 0.38, rot: 1.0,  spd: 0.000047 },
      { rf: 1.05, inc: 0.82, rot: 1.5,  spd: 0.000065 },
      { rf: 0.96, inc: 0.48, rot: 2.0,  spd: 0.000042 },
      { rf: 1.28, inc: 0.30, rot: 2.6,  spd: 0.000033 },
    ];

    // Constellation reference points and edges (normalized 0–1)
    const CPTS = [
      [0.28,0.14],[0.52,0.09],[0.74,0.20],[0.82,0.38],
      [0.18,0.30],[0.42,0.38],[0.62,0.44],[0.22,0.58],
      [0.72,0.62],[0.46,0.67],[0.14,0.75],[0.84,0.72],
    ];
    const CLINES = [[0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[7,8],[8,9],[9,10],[6,8],[5,9]];

    const G = (a) => `rgba(201,168,76,${a})`;

    function resize() {
      const r = frame.getBoundingClientRect();
      W = r.width * dpr; H = r.height * dpr;
      canvas.width = W; canvas.height = H;
      CX = W / 2; CY = H * 0.44;
      OR = W * 0.22;
    }
    resize();
    window.addEventListener('resize', resize);

    let alive = true;
    function draw(t) {
      if (!alive || !document.body.contains(canvas)) return;

      ctx.clearRect(0, 0, W, H);

      // Space background
      const bg = ctx.createRadialGradient(CX, CY * 0.9, 0, CX, CY, W * 0.9);
      bg.addColorStop(0, 'rgba(14,9,38,1)');
      bg.addColorStop(0.55, 'rgba(5,12,28,1)');
      bg.addColorStop(1, 'rgba(2,7,18,1)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Nebula glow
      const neb = ctx.createRadialGradient(CX, CY, 0, CX, CY, OR * 1.4);
      neb.addColorStop(0, 'rgba(55,22,95,0.28)');
      neb.addColorStop(0.55, 'rgba(28,16,72,0.12)');
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);

      // Stars with subtle twinkle
      for (const s of STARS) {
        const tw = s.a * (0.65 + 0.35 * Math.sin(t * 0.00085 + s.phase));
        ctx.globalAlpha = tw;
        ctx.fillStyle = s.r > 1.1 ? 'rgba(255,252,228,1)' : 'rgba(195,218,255,1)';
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r * dpr, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Constellation lines
      ctx.strokeStyle = G(0.09); ctx.lineWidth = 0.5 * dpr;
      for (const [a, b] of CLINES) {
        ctx.beginPath();
        ctx.moveTo(CPTS[a][0] * W, CPTS[a][1] * H);
        ctx.lineTo(CPTS[b][0] * W, CPTS[b][1] * H);
        ctx.stroke();
      }
      for (const [x, y] of CPTS) {
        ctx.fillStyle = G(0.18);
        ctx.beginPath(); ctx.arc(x * W, y * H, 1.4 * dpr, 0, 6.28); ctx.fill();
      }

      // Armillary sphere rings (slowly rotating, behind orrery)
      for (const ring of SPHERE) {
        const rx = OR * ring.rf, ry = rx * ring.inc;
        const angle = ring.rot + t * ring.spd;
        ctx.save(); ctx.translate(CX, CY); ctx.rotate(angle);
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = G(0.17); ctx.lineWidth = 0.65 * dpr; ctx.stroke();
        ctx.restore();
      }

      // Orbital ring guides (orrery)
      const INC = 0.40;
      ctx.strokeStyle = G(0.22); ctx.lineWidth = 0.55 * dpr;
      for (const p of PLANETS) {
        ctx.beginPath();
        ctx.ellipse(CX, CY, OR * p.rf, OR * p.rf * INC, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Planets + glow
      for (const p of PLANETS) {
        const rx = OR * p.rf, ry = rx * INC;
        const angle = p.ph + t * p.spd;
        const px = CX + rx * Math.cos(angle);
        const py = CY + ry * Math.sin(angle);
        const glow = ctx.createRadialGradient(px, py, 0, px, py, p.sz * 2.2 * dpr);
        glow.addColorStop(0, p.col); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(px, py, p.sz * 2.2 * dpr, 0, 6.28); ctx.fill();
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(px, py, p.sz * 0.52 * dpr, 0, 6.28); ctx.fill();
      }

      // Central sun
      const sun = ctx.createRadialGradient(CX, CY, 0, CX, CY, OR * 0.14);
      sun.addColorStop(0, G(1)); sun.addColorStop(0.45, G(0.5)); sun.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sun;
      ctx.beginPath(); ctx.arc(CX, CY, OR * 0.16, 0, 6.28); ctx.fill();

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // Alive check happens in the draw loop (document.body.contains check already present).
  }

  setTimeout(mountOrrery, 300);

  // Single consolidated MutationObserver for all mount-on-route-change work.
  // One rAF-debounced callback instead of five independent body-subtree observers
  // firing synchronously on every React DOM commit.
  let atierRafPending = false;
  const sharedObs = new MutationObserver(() => {
    if (atierRafPending) return;
    atierRafPending = true;
    requestAnimationFrame(() => {
      atierRafPending = false;
      mountShader();
      kineticSubline();
      pinShowcase();
      mountOrrery();
      if (document.querySelector('.admin-body')) liveAdmin();
    });
  });
  sharedObs.observe(document.body, { childList: true, subtree: true });
})();
