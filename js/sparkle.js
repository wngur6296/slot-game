/* 가벼운 배경 파티클 (transform 좌표만, 대형 영역 필터 없음) */
const Sparkle = (() => {
  const cv = document.getElementById('sparkle');
  if (!cv) return { start() {}, stop() {} };
  const g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, running = false, dots = [];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seed() {
    const n = W < 400 ? 36 : 48;
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.6 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.22, vy: -0.08 - Math.random() * 0.18,
      a: 0.15 + Math.random() * 0.45, tw: Math.random() * Math.PI * 2,
      c: Math.random() < 0.7 ? '#ffe27a' : (Math.random() < 0.5 ? '#ffffff' : '#ff8ec8')
    }));
  }
  function frame() {
    if (!running) return;
    if (document.hidden || reduce()) { g.clearRect(0, 0, W, H); running = false; return; }
    g.clearRect(0, 0, W, H);
    for (const p of dots) {
      p.x += p.vx; p.y += p.vy; p.tw += 0.03;
      if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
      if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6;
      g.globalAlpha = p.a * (0.65 + 0.35 * Math.sin(p.tw));
      g.fillStyle = p.c;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  function start() { if (reduce() || running) return; running = true; requestAnimationFrame(frame); }
  function stop() { running = false; g.clearRect(0, 0, W, H); }
  addEventListener('resize', () => { resize(); seed(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  resize(); seed(); start();
  return { start, stop };
})();
