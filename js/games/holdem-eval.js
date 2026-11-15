/* 텍사스 홀덤 핸드 평가 (5~7장 중 베스트 5장). 순수 함수, 테스트 가능 */
(function (root) {
  const CAT = { HIGH: 0, PAIR: 1, TWOPAIR: 2, TRIPS: 3, STRAIGHT: 4, FLUSH: 5, FULL: 6, QUADS: 7, SFLUSH: 8, ROYAL: 9 };
  const NAMES = ['하이카드', '원페어', '투페어', '트리플', '스트레이트', '플러시', '풀하우스', '포카드', '스트레이트 플러시', '로열 플러시'];
  const rnk = (c) => (c.r === 1 ? 14 : c.r);

  function straightHigh(ranks) { // unique ranks (A=14), returns high or 0
    const set = new Set(ranks);
    if (set.has(14)) set.add(1);
    for (let h = 14; h >= 5; h--) {
      if ([0, 1, 2, 3, 4].every((d) => set.has(h - d))) return h;
    }
    return 0;
  }

  function counts(ranks) {
    const m = {};
    ranks.forEach((r) => { m[r] = (m[r] || 0) + 1; });
    return Object.entries(m).map(([r, n]) => ({ r: +r, n })).sort((a, b) => b.n - a.n || b.r - a.r);
  }

  function rank5(cards) {
    const ranks = cards.map(rnk);
    const suits = cards.map((c) => c.s);
    const flush = suits.every((s) => s === suits[0]);
    const sh = straightHigh(ranks);
    const g = counts(ranks);
    if (flush && sh === 14) return { cat: CAT.ROYAL, name: NAMES[9], key: [9] };
    if (flush && sh) return { cat: CAT.SFLUSH, name: NAMES[8], key: [8, sh] };
    if (g[0].n === 4) {
      const kicker = g.find((x) => x.n === 1).r;
      return { cat: CAT.QUADS, name: NAMES[7], key: [7, g[0].r, kicker] };
    }
    if (g[0].n === 3 && g[1] && g[1].n >= 2) return { cat: CAT.FULL, name: NAMES[6], key: [6, g[0].r, g[1].r] };
    if (flush) {
      const ks = ranks.slice().sort((a, b) => b - a);
      return { cat: CAT.FLUSH, name: NAMES[5], key: [5, ...ks] };
    }
    if (sh) return { cat: CAT.STRAIGHT, name: NAMES[4], key: [4, sh] };
    if (g[0].n === 3) {
      const kick = g.filter((x) => x.n === 1).map((x) => x.r).sort((a, b) => b - a);
      return { cat: CAT.TRIPS, name: NAMES[3], key: [3, g[0].r, ...kick] };
    }
    if (g[0].n === 2 && g[1] && g[1].n === 2) {
      const high = Math.max(g[0].r, g[1].r), low = Math.min(g[0].r, g[1].r);
      const k = (g[2] && g[2].r) || 0;
      return { cat: CAT.TWOPAIR, name: NAMES[2], key: [2, high, low, k] };
    }
    if (g[0].n === 2) {
      const kick = g.filter((x) => x.n === 1).map((x) => x.r).sort((a, b) => b - a);
      return { cat: CAT.PAIR, name: NAMES[1], key: [1, g[0].r, ...kick] };
    }
    const ks = ranks.slice().sort((a, b) => b - a);
    return { cat: CAT.HIGH, name: NAMES[0], key: [0, ...ks] };
  }

  function compareKeys(a, b) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const d = (a[i] || 0) - (b[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  function bestOf(cards) { // 5–7 cards
    if (cards.length < 5) return null;
    if (cards.length === 5) return Object.assign({ cards: cards.slice() }, rank5(cards));
    // 6/7: 모든 5장 조합
    let best = null;
    const n = cards.length;
    const pick = (start, chosen) => {
      if (chosen.length === 5) {
        const r = rank5(chosen);
        r.cards = chosen.slice();
        if (!best || compareKeys(r.key, best.key) > 0) best = r;
        return;
      }
      for (let i = start; i <= n - (5 - chosen.length); i++) {
        chosen.push(cards[i]); pick(i + 1, chosen); chosen.pop();
      }
    };
    pick(0, []);
    return best;
  }

  function describe(res) {
    if (!res) return '';
    const lab = (r) => ({ 14: 'A', 13: 'K', 12: 'Q', 11: 'J' }[r] || String(r));
    const k = res.key;
    if (res.cat === CAT.ROYAL) return '로열 플러시';
    if (res.cat === CAT.SFLUSH) return `스트레이트 플러시 ${lab(k[1])}`;
    if (res.cat === CAT.QUADS) return `포카드 ${lab(k[1])}`;
    if (res.cat === CAT.FULL) return `풀하우스 ${lab(k[1])} 풀 ${lab(k[2])}`;
    if (res.cat === CAT.FLUSH) return `플러시 ${lab(k[1])} 하이`;
    if (res.cat === CAT.STRAIGHT) return `스트레이트 ${lab(k[1])} 하이`;
    if (res.cat === CAT.TRIPS) return `트리플 ${lab(k[1])}`;
    if (res.cat === CAT.TWOPAIR) return `투페어 ${lab(k[1])}와 ${lab(k[2])}`;
    if (res.cat === CAT.PAIR) return `원페어 ${lab(k[1])}`;
    return `하이카드 ${lab(k[1])}`;
  }

  // 사이드 팟: invested[i], folded[i] (폴드는 자격 없음). 반환 [{amount, seats[]}]
  function sidePots(players) {
    // players: {id, invested, folded, allIn or still eligible if not folded}
    const alive = players.filter((p) => p.invested > 0 || !p.folded);
    const levels = [...new Set(players.map((p) => p.invested).filter((x) => x > 0))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    for (const lv of levels) {
      const layer = lv - prev;
      const contrib = players.filter((p) => p.invested >= lv);
      const amount = layer * contrib.length;
      const elig = players.filter((p) => p.invested >= lv && !p.folded).map((p) => p.id);
      if (amount > 0) pots.push({ amount, seats: elig, level: lv });
      prev = lv;
    }
    // also include folded money already in layers via contrib.length
    return pots;
  }

  function settlePots(players, board) {
    const pots = sidePots(players);
    const evals = {};
    players.forEach((p) => {
      if (!p.folded && p.hole && p.hole.length) evals[p.id] = bestOf(p.hole.concat(board));
    });
    return pots.map((pot) => {
      let winKey = null;
      pot.seats.forEach((id) => {
        const ev = evals[id];
        if (!ev) return;
        if (!winKey || compareKeys(ev.key, winKey) > 0) winKey = ev.key;
      });
      const winners = pot.seats.filter((id) => evals[id] && winKey && compareKeys(evals[id].key, winKey) === 0);
      // 칩은 정수로 나누고 나머지는 버튼에 가까운 승자에게 — 엔진에서 처리, 여기선 균등+나머지
      const share = winners.length ? Math.floor(pot.amount / winners.length) : 0;
      const rem = winners.length ? pot.amount - share * winners.length : pot.amount;
      return { amount: pot.amount, seats: pot.seats, winners, share, rem, hand: winners[0] && evals[winners[0]] };
    });
  }

  // 몬테카를로 에쿼티. heroHole, board(0-5), nOpp, usedCards, iters. 상대 핸드/남은 보드만 랜덤 (히든 카드 사용 안 함)
  function equity(heroHole, board, nOpp, dead, iters, rng) {
    rng = rng || Math.random;
    const used = new Set();
    const mark = (c) => used.add(c.r + c.s);
    heroHole.forEach(mark); board.forEach(mark); (dead || []).forEach(mark);
    const deck = [];
    const SUITS = ['s', 'h', 'd', 'c'];
    for (const s of SUITS) for (let r = 1; r <= 13; r++) {
      if (!used.has(r + s)) deck.push({ r, s });
    }
    const needBoard = 5 - board.length;
    const needOpp = nOpp * 2;
    if (deck.length < needBoard + needOpp) return 0;
    let win = 0, tie = 0, n = 0;
    const take = (arr, k, i0) => {
      // Fisher-Yates partial from i0
    };
    for (let t = 0; t < iters; t++) {
      // shuffle copy suffix
      const d = deck.slice();
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = d[i]; d[i] = d[j]; d[j] = tmp;
      }
      let i = 0;
      const brd = board.concat(d.slice(i, i + needBoard)); i += needBoard;
      const hero = bestOf(heroHole.concat(brd));
      let hBest = 1, ties = 0; // 1=winning so far
      let ok = true;
      for (let o = 0; o < nOpp; o++) {
        const hole = [d[i++], d[i++]];
        const ev = bestOf(hole.concat(brd));
        const cmp = compareKeys(ev.key, hero.key);
        if (cmp > 0) { ok = false; hBest = 0; break; }
        if (cmp === 0) ties++;
      }
      n++;
      if (!ok) continue;
      if (ties) tie += 1 / (ties + 1); else win += 1;
    }
    return n ? (win + tie) / n : 0;
  }

  const Eval = { CAT, NAMES, rnk, rank5, bestOf, compareKeys, describe, sidePots, settlePots, equity, straightHigh };
  if (typeof module !== 'undefined' && module.exports) module.exports = Eval;
  else root.HoldemEval = Eval;
})(typeof globalThis !== 'undefined' ? globalThis : this);
