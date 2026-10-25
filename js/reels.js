/* 릴 렌더링/애니메이션 (Web Animations API). 블러 + 오버슈트 바운스 + 니어미스 감속 */
const Reels = (() => {
  const C = SLOT_CONFIG; let engine, reelEls, cellH = 0;
  const img = (s) => `<div class="cell" data-s="${s}"><img src="assets/img/${C.symbols[s].img}.webp" alt="${C.symbols[s].name}" draggable="false"></div>`;
  function init(eng) {
    engine = eng; reelEls = [...document.querySelectorAll('.reel')];
    measure(); addEventListener('resize', measure);
    reelEls.forEach((el, i) => { const s = engine.strips[i], st = Math.floor(Math.random() * s.length);
      el.querySelector('.track').innerHTML = [0, 1, 2, 3, 4].map((k) => img(s[(st + k) % s.length])).join(''); });
  }
  function measure() { const h = reelEls[0].clientHeight; cellH = h / C.rows; document.documentElement.style.setProperty('--cell', cellH + 'px'); }
  // 트랙 구조: [숨김 위 1칸][보이는 3칸][숨김 아래 1칸] (CSS .track top:-1칸)
  const vis = (track) => [...track.querySelectorAll('.cell')].slice(1, 4);
  function current(i) { return vis(reelEls[i].querySelector('.track')).map((c) => c.dataset.s); }
  function randSym(i) { const s = engine.strips[i]; return s[Math.floor(Math.random() * s.length)]; }
  // 한 릴을 돌려 final(위→아래 3개)로 멈춤
  function spinReel(i, final, dur, opts = {}) {
    const el = reelEls[i], track = el.querySelector('.track');
    const filler = Math.max(8, Math.round(dur / 55));
    const cur = vis(track).map((c) => c.dataset.s);
    const syms = [randSym(i), ...final, ...Array.from({ length: filler }, () => randSym(i)), ...cur, randSym(i)];
    track.innerHTML = syms.map(img).join('');
    const dist = (syms.length - 5) * cellH;
    track.style.transform = `translateY(${-dist}px)`; track.classList.add('blur');
    const anim = track.animate([
      { transform: `translateY(${-dist}px)` },
      { transform: `translateY(${-dist - cellH * 0.22}px)`, offset: 0.06, easing: 'ease-in' },  // 살짝 위로 당겼다가
      { transform: `translateY(${-cellH * 0.6}px)`, offset: 0.8, easing: 'ease-out' },
      { transform: `translateY(${cellH * 0.14}px)`, offset: 0.93, easing: 'ease-out' },   // 오버슈트
      { transform: 'translateY(0px)' }], { duration: dur, easing: 'linear', fill: 'forwards' });
    setTimeout(() => track.classList.remove('blur'), dur * 0.78);
    return anim.finished.then(() => { track.style.transform = 'translateY(0px)'; anim.cancel();
      track.innerHTML = [syms[0], ...final, randSym(i)].map(img).join(''); opts.onStop && opts.onStop(i); });
  }
  async function spin(grid, { turbo, nearMiss, onStop, onAnticipate }) {
    const T = C.timing, k = turbo ? T.turbo : 1; clearWins();
    const ps = grid.map((col, i) => { let d = (T.spinBase + i * T.reelGap) * k;
      if (i === 2 && nearMiss) { d += T.nearMissExtra; setTimeout(() => { reelEls[2].classList.add('anticipate'); onAnticipate && onAnticipate(); }, (T.spinBase + T.reelGap) * k); }
      return spinReel(i, col, d, { onStop: (r) => { if (r === 2) reelEls[2].classList.remove('anticipate'); onStop && onStop(r); } }); });
    await Promise.all(ps);
  }
  const LINE_COLORS = ['#ffd34d', '#ff3d9a', '#4de1ff', '#7dff7a', '#b266ff'];
  function showWins(wins) {
    const svg = document.getElementById('lines'); const W = svg.clientWidth, H = svg.clientHeight; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
    const colW = W / 3, gap = 6, rowH = H / 3; const hl = new Set();
    wins.forEach((w) => { w.cells.forEach(([r, row]) => hl.add(r + ':' + row));
      if (w.line >= 0) { const pl = C.paylines[w.line]; const pts = pl.map((row, r) => [colW * r + colW / 2, rowH * row + rowH / 2]);
        const d = `M2 ${pts[0][1]} L${pts.map((p) => p.join(' ')).join(' L')} L${W - 2} ${pts[2][1]}`;
        svg.insertAdjacentHTML('beforeend', `<path d="${d}" stroke="${LINE_COLORS[w.line]}" style="color:${LINE_COLORS[w.line]}"/>`); } });
    reelEls.forEach((el, r) => vis(el).forEach((c, row) => { c.classList.toggle('win', hl.has(r + ':' + row)); c.classList.toggle('dim', wins.length > 0 && !hl.has(r + ':' + row)); }));
    return [...hl].map((k) => { const [r, row] = k.split(':').map(Number); const b = vis(reelEls[r])[row].getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  }
  function clearWins() { const svg = document.getElementById('lines'); svg.innerHTML = ''; document.querySelectorAll('.cell.win,.cell.dim').forEach((c) => c.classList.remove('win', 'dim')); }
  return { init, spin, showWins, clearWins, current };
})();
