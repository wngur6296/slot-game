/* 파티클 연출 (캔버스): 코인비, 컨페티, 스파클 버스트, 화면 흔들림, 숫자 카운트업 */
const FX = (() => {
  const cv = document.getElementById('fx'), g = cv.getContext('2d'); let W, H, dpr; const P = []; let running = false;
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener('resize', resize); resize();
  const rnd = (a, b) => a + Math.random() * (b - a);
  let CONF = ['#ffd34d', '#ff3d9a', '#4de1ff', '#7dff7a', '#ffffff', '#b266ff'], SHAPE = 'rect';
  function setStyle(st) { if (!st) return; CONF = st.colors; SHAPE = st.shape; } // 상점 '당첨 이펙트'
  function shapePath(w, h) { g.beginPath();
    if (SHAPE === 'star') { for (let i = 0; i < 10; i++) { const r = i % 2 ? w * .4 : w, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } }
    else if (SHAPE === 'heart') { g.moveTo(0, h * .35); g.bezierCurveTo(-w * 1.2, -h * .2, -w * .4, -h * .9, 0, -h * .3); g.bezierCurveTo(w * .4, -h * .9, w * 1.2, -h * .2, 0, h * .35); }
    else if (SHAPE === 'gem') { g.moveTo(0, -h * .6); g.lineTo(w * .6, -h * .1); g.lineTo(0, h * .6); g.lineTo(-w * .6, -h * .1); }
    g.closePath(); g.fill(); }
  function coin(x, y, vx, vy) { P.push({ k: 'coin', x, y, vx, vy, r: rnd(9, 15), a: rnd(0, 6.28), va: rnd(.1, .3), life: 1, g: .35 }); }
  function coinRain(n = 60, dur = 1500) {
    let made = 0; const iv = setInterval(() => { for (let i = 0; i < 4 && made < n; i++, made++) coin(rnd(0, W), -20, rnd(-1, 1), rnd(2, 6)); if (made >= n) clearInterval(iv); }, dur / (n / 4)); loop();
  }
  function coinBurst(x, y, n = 24) { for (let i = 0; i < n; i++) { const a = rnd(-Math.PI, 0), s = rnd(5, 13); coin(x, y, Math.cos(a) * s, Math.sin(a) * s); } loop(); }
  function confetti(n = 120) { for (let i = 0; i < n; i++) P.push({ k: 'conf', x: rnd(0, W), y: rnd(-H * .5, -10), vx: rnd(-2, 2), vy: rnd(2, 5), w: rnd(6, 10), h: rnd(10, 16), a: rnd(0, 6), va: rnd(-.2, .2), c: CONF[i % CONF.length], life: 1, g: .05, sway: rnd(0, 6) }); loop(); }
  function sparkle(x, y, n = 20, color = '#fff6c8') { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(1, 6); P.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(1.5, 3.5), c: color, life: 1, decay: rnd(.015, .035), g: .04 }); } loop(); }
  function fireworks(n = 5) { for (let i = 0; i < n; i++) setTimeout(() => sparkle(rnd(W * .15, W * .85), rnd(H * .15, H * .5), 50, CONF[i % CONF.length]), i * 280); }
  function drawCoin(p) {
    const sx = Math.abs(Math.cos(p.a)) * .9 + .1; g.save(); g.translate(p.x, p.y); g.scale(sx, 1);
    const gr = g.createRadialGradient(-p.r * .3, -p.r * .3, 1, 0, 0, p.r); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.4, '#ffd84d'); gr.addColorStop(.85, '#d48a0b'); gr.addColorStop(1, '#7a4300');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, p.r, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(255,240,170,.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, p.r * .68, 0, 6.283); g.stroke(); g.restore();
  }
  function frame() {
    g.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.vy += p.g; p.x += p.vx; p.y += p.vy;
      if (p.k === 'coin') { p.a += p.va; if (p.y > H + 30) { P.splice(i, 1); continue; } drawCoin(p); }
      else if (p.k === 'conf') { p.a += p.va; p.sway += .08; p.x += Math.sin(p.sway) * .8; p.vy = Math.min(p.vy, 4); if (p.y > H + 20) { P.splice(i, 1); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.cos(p.sway)); g.fillStyle = p.c; if (SHAPE === 'rect') g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); else { if (SHAPE === 'gem') { g.shadowColor = p.c; g.shadowBlur = 8; } shapePath(p.w * .9, p.h); } g.restore(); }
      else { p.life -= p.decay; p.vx *= .97; if (p.life <= 0) { P.splice(i, 1); continue; }
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = p.life; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + (1 - p.life)), 0, 6.283); g.fill(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    }
    if (P.length) requestAnimationFrame(frame); else { running = false; g.clearRect(0, 0, W, H); }
  }
  function loop() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function shake(hard) { const a = document.getElementById('app'); a.classList.remove('shake', 'shake-hard'); void a.offsetWidth; a.classList.add(hard ? 'shake-hard' : 'shake'); }
  function countUp(el, from, to, ms, onTick) {
    return new Promise((res) => { const t0 = performance.now(); let last = -1;
      (function step(t) { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3), v = Math.round(from + (to - from) * e);
        el.textContent = (el._fmt || ((x) => x.toLocaleString()))(v); if (onTick && v !== last) onTick(v); last = v; if (k < 1 && !el._skip) requestAnimationFrame(step); else { el.textContent = (el._fmt || ((x) => x.toLocaleString()))(to); el._skip = false; res(); } })(t0); });
  }
  return { setStyle, coinRain, coinBurst, confetti, sparkle, fireworks, shake, countUp };
})();
