
   (() => {
    'use strict';
    const CLS = 'zeno-dichotomy';
    const C = { bg: '#000000', ink: '#f2f2f2', soft: '#a3a3a3', green: '#00ff41', gsoft: '#1e8a3d' };
    const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    const DISPLAY = "'Josefin Sans', 'Century Gothic', Futura, sans-serif";
    const SERIF = "'Times New Roman', Times, serif";
    const LABEL = 'A founder runs along the number line from 0 to 1 without stopping. From 0, 1 is infinitely far: ' +
      'each time the founder passes half of what is left, the end leaps further away, and there is one more task. ' +
      'At last the view pulls back out and the founder is at ONE: from 1, 0 is just 1 away. Under the line: the sum ' +
      'of 1 over 2 to the power i, for i from 1 to infinity, equals 1.';
  
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const ease = (x) => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    const SIGMA = '\u03a3', INF = '\u221e', DOTS = '\u2026', MINUS = '\u2212', SUP_I = '\u2071';
    const SUP = '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079';   // superscript 0 to 9
    const sup = (n) => String(n).split('').map((c) => SUP[+c]).join('');
    const point = (k) => (k === 0 ? '0' : k <= 12 ? (2 ** k - 1) + '/' + 2 ** k : '1 ' + MINUS + ' 1/2' + sup(k));   // 1 - 1/2^k
  
    
    const T = 45, OUT = 3.6, REST = 4, CYCLE = T + OUT + REST, A = 24.75, RMAX = 4000, CLOSE = 9.35;
    function founderAt(time) {
      const tt = time % CYCLE;
      if (tt < T) {
        const r = Math.min(RMAX, A * tt / (T - tt)), rate = A * T / ((T - tt) * (T - tt));   // halves so far, halves a second
        const leap = 1 - smooth(1, 2.6, rate);            // the leap after each half shows while the halves are slow
        const stairs = Math.floor(r) + smoother(r - Math.floor(r));
        const close = 0.35 + (CLOSE - 0.35) * smooth(T - 1.3, T, tt);   // in the last moments the founder closes on the end
        return { phase: 'run', tt, r, rate, leap, s: Math.max(0, (1 - leap) * r + leap * stairs - close) };
      }
      if (tt < T + OUT) {                                 // the jump: back out through every scale to the whole line
        const v = tt - T, x = v / OUT, speed = (RMAX - CLOSE) * 12 * Math.pow(Math.min(x, 1 - x), 2) / OUT;
        return { phase: 'jump', tt, v, r: Infinity, rate: speed, leap: 0, s: (RMAX - CLOSE) * (1 - ease(x)) };
      }
      return { phase: 'one', tt, v: tt - T, r: Infinity, rate: 0, leap: 0, s: 0 };
    }
  
    function mount(host) {
      host.setAttribute('data-zeno', '');
      host.setAttribute('role', 'img');
      host.setAttribute('aria-label', LABEL);
      const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
      cv.setAttribute('aria-hidden', 'true');
      host.appendChild(cv);
  
      let t = 0, seen = true, last = 0, raf = 0, W = 0, H = 0, D = 0, n = false, Y = {};
  
      function layout() {
        n = W < 520;
        const cap = n ? 12.5 : 15.5, fh = n ? 34 : 44, big = n ? 28 : 32;
        const capY = cap + 3, y = Math.round(capY + fh + 50);
        const yb = Math.round(y + 62 + big * 0.8 + 2);   
        const ySub = yb + (n ? 13 : 15), yt = ySub + (n ? 22 : 26);
        Y = { cap, capY, fh, big, y, yb, ySub, yt };
        return yt + (n ? 5 : 6);
      }
      function resize() {
        const w = host.clientWidth, dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (!w || (w === W && dpr === D)) return;
        W = w; D = dpr; H = layout();
        cv.style.height = H + 'px';
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      }
      const pad = () => clamp(W * 0.06, 24, 64);
      const small = () => (n ? 11 : 12.5);
  
      function axis(xa, xb, y, fadeLeft) {
        const g = ctx.createLinearGradient(xa, 0, xb, 0), f = 40 / Math.max(1, xb - xa);
        g.addColorStop(0, fadeLeft ? 'rgba(0,255,65,0)' : C.green);
        g.addColorStop(Math.min(0.5, f), C.green); g.addColorStop(1, C.green);
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
      }
      function tick(x, y, h, color, w) {
        ctx.strokeStyle = color; ctx.lineWidth = w || 1.5;
        ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y + h); ctx.stroke();
      }
      function text(s, x, y, color, size, align, font) {
        ctx.font = font || '500 ' + size + 'px ' + MONO;
        ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(s, x, y);
        return ctx.measureText(s).width;
      }
      function labels(list, y, size, minX, maxX) {       
        ctx.font = '500 ' + size + 'px ' + MONO;          
        let right = -Infinity;
        for (const l of list.sort((a, b) => a.x - b.x)) {
          const w = ctx.measureText(l.s).width, a = l.x - w / 2, b = l.x + w / 2;
          if (a < minX || b > maxX) continue;
          if (a > right + 8) { text(l.s, l.x, y, l.color, size); right = b; }
        }
      }
      function ends(x, y, word, s) {                      
        tick(x, y, 14, C.ink, 2);
        text(s, x, y + 34, C.ink, 16);
        text(word, x, y + 52, C.gsoft, 10, 'center', '600 10px ' + DISPLAY);
      }
      function runner(x, yg, h, o) {                      
        const run = o.run, ph = o.ph, lean = o.lean, up = o.up, s = h;
        const hip = [x, yg - 0.47 * s];
        const sh = [hip[0] + Math.sin(lean) * 0.32 * s, hip[1] - Math.cos(lean) * 0.32 * s];
        const head = [sh[0] + Math.sin(lean) * 0.15 * s, sh[1] - Math.cos(lean) * 0.15 * s];
        const sw = Math.sin(ph), cs = Math.cos(ph);
        const fA = [x + run * 0.24 * s * sw - (1 - run) * 0.11 * s, yg - run * 0.07 * s * Math.max(0, cs)];   // standing: feet apart
        const fB = [x - run * 0.24 * s * sw + (1 - run) * 0.11 * s, yg - run * 0.07 * s * Math.max(0, -cs)];
        const knee = (f) => [(hip[0] + f[0]) / 2 + 0.05 * s * (0.4 + run), (hip[1] + f[1]) / 2];
        const hand = (sgn) => [
          sh[0] + (1 - up) * (sgn * (0.05 + 0.08 * (1 - run)) * s - sgn * 0.17 * s * run * sw) + up * sgn * 0.2 * s,
          sh[1] + (1 - up) * 0.27 * s - up * 0.26 * s];
        const elbow = (hd, sgn) => [(sh[0] + hd[0]) / 2 + sgn * 0.04 * s, (sh[1] + hd[1]) / 2 + 0.02 * s];
        const hA = hand(-1), hB = hand(1), kA = knee(fA), kB = knee(fB), eA = elbow(hA, -1), eB = elbow(hB, 1);
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(255,255,255,0.35)'; ctx.shadowBlur = 6;
        ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.6, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(head[0], head[1] + 0.1 * s); ctx.lineTo(hip[0], hip[1]);
        ctx.moveTo(hip[0], hip[1]); ctx.lineTo(kA[0], kA[1]); ctx.lineTo(fA[0], fA[1]);
        ctx.moveTo(hip[0], hip[1]); ctx.lineTo(kB[0], kB[1]); ctx.lineTo(fB[0], fB[1]);
        ctx.moveTo(sh[0], sh[1]); ctx.lineTo(eA[0], eA[1]); ctx.lineTo(hA[0], hA[1]);
        ctx.moveTo(sh[0], sh[1]); ctx.lineTo(eB[0], eB[1]); ctx.lineTo(hB[0], hB[1]);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(head[0], head[1], 0.1 * s, 0, Math.PI * 2);
        ctx.fillStyle = C.bg; ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // The sum, static, under the number line: sigma from i = 1 to infinity of 1/2^i = 1, and then term by term.
      function drawSum() {
        const big = Y.big, fs = n ? 14 : 16, eqs = n ? 16 : 18, gap = 10, yb = Y.yb;
        ctx.font = '400 ' + big + 'px ' + SERIF; const wSig = ctx.measureText(SIGMA).width;
        ctx.font = '500 ' + fs + 'px ' + MONO; const wFrac = ctx.measureText('2' + SUP_I).width + 12;
        ctx.font = '500 ' + eqs + 'px ' + MONO; const wEq = ctx.measureText('= 1').width;
        let x = W / 2 - (wSig + gap + wFrac + gap + wEq) / 2;
        text(SIGMA, x + wSig / 2, yb, C.ink, big, 'center', '400 ' + big + 'px ' + SERIF);
        text(INF, x + wSig / 2, yb - big * 0.8 - 2, C.soft, n ? 12 : 14);
        text('i = 1', x + wSig / 2, Y.ySub, C.soft, n ? 10.5 : 11.5);
        x += wSig + gap;
        const ym = yb - big * 0.3;                         // the fraction bar, at the middle of the sigma
        text('1', x + wFrac / 2, ym - 6, C.ink, fs);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, ym); ctx.lineTo(x + wFrac, ym); ctx.stroke();
        text('2' + SUP_I, x + wFrac / 2, ym + fs + 1, C.ink, fs);
        x += wFrac + gap;
        text('= 1', x, ym + eqs * 0.36, C.green, eqs, 'left');
        const terms = n ? ['1/2', '1/4', '1/8', '1/16', '1/32'] : ['1/2', '1/4', '1/8', '1/16', '1/32', '1/64', '1/128'];
        const pieces = [];
        terms.forEach((s, i) => { if (i) pieces.push([' + ', C.soft]); pieces.push([s, C.ink]); });
        pieces.push([' + ', C.soft], [DOTS, C.ink], [' = 1', C.green]);
        const ts = n ? 12 : 15, font = '400 ' + ts + 'px ' + MONO;
        ctx.font = font;
        let tx = W / 2 - pieces.reduce((a, [p]) => a + ctx.measureText(p).width, 0) / 2;
        for (const [p, col] of pieces) tx += text(p, tx, Y.yt, col, ts, 'left', font);
      }
  
      function draw() {
        if (!W) return;
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        const st = founderAt(t), r = st.r, s = st.s, there = r === Infinity;
        const K = 1.1 + 1.1 * smooth(0, 1.2, s);          // the screen shows K gaps' worth of line
        const P = pad(), x1 = W - P, L = x1 - P, y = Y.y, size = small();
        const X = (k) => x1 - Math.pow(2, s - k) / K * L;
        const x0 = X(0);
        axis(Math.max(-2, x0), x1, y, x0 < 0);
        const glow = ctx.createRadialGradient(x1, y, 0, x1, y, 60);   // the end the founder sees: a soft glow at 1
        glow.addColorStop(0, 'rgba(0,255,65,0.15)'); glow.addColorStop(1, 'rgba(0,255,65,0)');
        ctx.fillStyle = glow; ctx.fillRect(x1 - 60, y - 60, 120, 120);
        const ls = [], marks = 1 - smooth(25, 80, st.rate); // while the zoom races, the marks fade and the line streams
        if (marks > 0.01) {
          ctx.globalAlpha = marks;
          for (let k = Math.max(1, Math.floor(s - Math.log2(K * 1.5))); k < s + 60; k++) {
            const x = X(k);
            if (x < -2) continue;
            if (x1 - x < 1.2) break;
            const done = k <= r + 1e-9;
            tick(x, y, k <= s + 3 ? 9 : 5, done ? C.green : C.gsoft, 1.5);
            if (k <= Math.floor(s) + 3) ls.push({ x, s: point(k), color: done ? C.green : C.soft });
          }
          labels(ls, y + 30, size, x0 >= P - 1 ? x0 + 12 : -Infinity, x1 - 12);
          ctx.globalAlpha = 1;
        }
        if (marks < 0.99) {                               // at full speed: streaks rushing past along the line
          const v = 700 + 1100 * (1 - marks);
          ctx.strokeStyle = 'rgba(242,242,242,' + (0.4 * (1 - marks)).toFixed(3) + ')'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 26; i++) {
            const x = x1 - ((i * 97.3 + t * v * (0.7 + 0.6 * ((i * 37) % 10) / 10)) % (L + 40)), dy = (i % 2 ? -1 : 1) * (5 + (i * 13) % 9);
            ctx.moveTo(x, y + dy); ctx.lineTo(Math.min(x1, x + 14 + (i * 7) % 16), y + dy);
          }
          ctx.stroke();
        }
        if (x0 >= P - 1) ends(x0, y, 'ZERO', '0');
        ends(x1, y, 'ONE', '1');
        const xr = there ? x1 : X(r);
        if (!there && st.leap > 0.02) {                   // the one more task that waits halfway to 1
          ctx.globalAlpha = st.leap;
          const xh = X(Math.floor(r + 1e-9) + 1);
          ctx.setLineDash([3, 4]); tick(xh, y - 22, 12, C.ink, 1); ctx.setLineDash([]);
          if (!n) text('one more task', xh, y - 40, C.ink, size);   // drawn before the founder, so it goes behind
          ctx.globalAlpha = 1;
        }
        if (there) {                                      // ONE, lit
          ctx.globalAlpha = st.phase === 'one' ? 1 : smooth(0.6, 1, st.v / OUT);
          text('ONE', x1, y + 52, C.green, 12, 'center', '600 12px ' + DISPLAY); ctx.globalAlpha = 1;
        }
        const up = st.phase === 'one' ? 1 : st.phase === 'jump' ? smooth(0, 0.35, st.v / OUT) : 0;
        runner(xr, y - 2, Y.fh, { run: there ? 1 - up : 1, ph: t * 11 + 2.5 * Math.log1p(there ? RMAX : r), lean: there ? 0.2 * (1 - up) : 0.2, up });
        text('founder', xr, y - Y.fh - 14, C.ink, 10.5);
        text(st.phase === 'run' ? 'from 0, 1 is infinitely far' : 'from 1, 0 is just 1 away', W / 2, Y.capY, C.green, Y.cap);
        drawSum();
        const dark = Math.max(t >= CYCLE ? 1 - smooth(0, 0.7, st.tt) : 0, smooth(CYCLE - 0.7, CYCLE, st.tt));   // the loop: fade to black
        if (dark > 0.002) { ctx.fillStyle = 'rgba(0,0,0,' + dark.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      }
      function frame(ms) {
        raf = 0;
        if (!seen) { last = 0; return; }
        if (last) t += Math.min(0.1, (ms - last) / 1000);
        last = ms;
        draw();
        raf = requestAnimationFrame(frame);
      }
      const go = () => { if (seen && !raf) raf = requestAnimationFrame(frame); };
  
      new ResizeObserver(resize).observe(host);
      if (window.IntersectionObserver) {                  // runs only while it is on screen
        new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; go(); }).observe(host);
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
      resize();
      go();
    }
  
    if (!document.getElementById(CLS + '-style')) {       // first in <head>, so the page's own CSS can change it
      const css = document.createElement('style');
      css.id = CLS + '-style';
      css.textContent = '.' + CLS + '{display:block;max-width:720px;margin:0 auto;background:#000}' +
        '.' + CLS + ' canvas{display:block;width:100%}';
      (document.head || document.documentElement).prepend(css);
    }
    const init = () => document.querySelectorAll('div.' + CLS + ':not([data-zeno])').forEach(mount);
    init();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  })();
  