/* 순수 게임 로직 (DOM 없음) — 브라우저와 node(simulate.js) 공용 */
(function (root) {
  function makeRng(seed) { // mulberry32 (시뮬레이션용). 게임은 crypto 사용
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function cryptoRng() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const b = new Uint32Array(1); return () => (crypto.getRandomValues(b), b[0] / 4294967296);
    } return Math.random;
  }
  // 가중치 -> 골고루 섞인 릴 스트립 (결정적)
  function buildStrip(weights, seed) {
    const list = []; for (const [s, n] of Object.entries(weights)) for (let i = 0; i < n; i++) list.push(s);
    const r = makeRng(seed); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    // 같은 심볼이 붙어있지 않게 살짝 정리
    for (let k = 0; k < 4; k++) for (let i = 0; i < list.length; i++) {
      const n = (i + 1) % list.length; if (list[i] === list[n]) { const j = (i + 3 + k) % list.length; [list[n], list[j]] = [list[j], list[n]]; }
    }
    return list;
  }
  function createEngine(C, rng) {
    rng = rng || cryptoRng();
    const strips = C.reelWeights.map((w, i) => buildStrip(w, 1000 + i * 77));
    const lineCount = C.paylines.length;
    function spin() {
      const stops = strips.map((s) => Math.floor(rng() * s.length));
      const grid = strips.map((s, r) => Array.from({ length: C.rows }, (_, row) => s[(stops[r] + row) % s.length]));
      return { stops, grid };
    }
    const F = C.features || {};
    function lineSymbol(cells) {
      if (cells.some((s) => C.symbols[s].scatter)) return null;
      const base = cells.find((s) => !C.symbols[s].wild);
      if (!base) return 'wild';
      if (C.symbols[base].noWild) return cells.every((s) => s === base) ? base : null; // 와일드 대체 불가 심볼
      return cells.every((s) => s === base || C.symbols[s].wild) ? base : null;
    }
    function evaluate(grid, bet, opts = {}) {
      let expanded = null;
      if (F.expandWild) { const r = F.expandWild.reel; if (grid[r].some((s) => C.symbols[s].wild)) { grid = grid.map((c) => c.slice()); grid[r] = grid[r].map(() => 'wild'); expanded = r; } }
      const lineBet = bet / lineCount; const wins = []; let total = 0; let jackpot = false, progressive = false;
      const isWild = (s) => C.symbols[s].wild;
      C.paylines.forEach((pl, li) => {
        const cells = pl.map((row, reel) => grid[reel][row]); const pos = pl.map((row, reel) => [reel, row]);
        const sym = lineSymbol(cells);
        if (sym) {
          let p = (C.paytable[sym] || 0) * lineBet;
          if (F.wildMultiplier && sym !== 'wild') p *= Math.pow(F.wildMultiplier, cells.filter(isWild).length);
          if (F.progressive && sym === F.progressive.sym) progressive = true;
          if (sym === C.jackpotSymbol) jackpot = true;
          wins.push({ line: li, sym, pay: p, cells: pos }); total += p; return;
        }
        const two = C.twoKind && Object.entries(C.twoKind).find(([k]) => cells[0] === k && (cells[1] === k || isWild(cells[1])));
        if (two) { const p = two[1] * lineBet; wins.push({ line: li, sym: two[0], pay: p, cells: pos.slice(0, 2) }); total += p; return; }
        if (C.mixPay && cells.every((s) => C.symbols[s].fruit || isWild(s))) { const p = C.mixPay * lineBet; wins.push({ line: li, sym: 'mix', pay: p, cells: pos }); total += p; }
      });
      const scat = []; grid.forEach((col, r) => { const row = col.findIndex((s) => C.symbols[s].scatter); if (row >= 0) scat.push([r, row]); }); // 릴당 최대 1개
      const sc = Math.min(scat.length, 3); let freeSpins = 0;
      if (C.scatter.pay[sc]) { const p = C.scatter.pay[sc] * bet; total += p; wins.push({ line: -1, sym: 'scatter', pay: p, cells: scat }); }
      if (sc >= C.scatter.freeSpinsAt) freeSpins = C.scatter.freeSpins;
      let mult = 1;
      if (opts.freeSpin) mult *= C.scatter.freeSpinMultiplier;
      return { grid, wins, base: total, mult, total, freeSpins, jackpot, progressive, expanded, scatterCount: scat.length };
    }
    function streakMult(streak) { const a = C.streakMultipliers; return a[Math.min(streak, a.length) - 1] || 1; }
    // 니어미스: 1·2번 릴만 보고 3번 릴에서 터질 수 있는지
    function nearMiss(grid) {
      if (grid[0].concat(grid[1]).filter((s) => C.symbols[s].scatter).length >= 2) return true;
      return C.paylines.some((pl) => { const a = grid[0][pl[0]], b = grid[1][pl[1]];
        if (C.symbols[a].scatter || C.symbols[b].scatter) return false;
        const hi = (s) => C.symbols[s].tier === 'high';
        return hi(a) && hi(b) && (a === b || C.symbols[a].wild || C.symbols[b].wild); });
    }
    return { strips, spin, evaluate, streakMult, nearMiss, lineCount };
  }
  const api = { createEngine, makeRng, buildStrip };
  if (typeof module !== 'undefined') module.exports = api; else root.SlotEngine = api;
})(this);
