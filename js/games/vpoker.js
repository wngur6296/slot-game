/* 비디오 포커 Jacks or Better 9/6 페이테이블 */
(function (root) {
  const Cards = (typeof require === 'function' && typeof document === 'undefined') ? require('../cards.js') : root.Cards;
  const PAY = [
    { id: 'rf', name: '로열 플러시', odd: 800, test: (h) => h.flush && h.straight && h.high === 14 && h.low === 10 },
    { id: 'sf', name: '스트레이트 플러시', odd: 50, test: (h) => h.flush && h.straight },
    { id: '4k', name: '포카드', odd: 25, test: (h) => h.counts[0] === 4 },
    { id: 'fh', name: '풀하우스', odd: 9, test: (h) => h.counts[0] === 3 && h.counts[1] === 2 },
    { id: 'fl', name: '플러시', odd: 6, test: (h) => h.flush },
    { id: 'st', name: '스트레이트', odd: 4, test: (h) => h.straight },
    { id: '3k', name: '트리플', odd: 3, test: (h) => h.counts[0] === 3 },
    { id: '2p', name: '투페어', odd: 2, test: (h) => h.counts[0] === 2 && h.counts[1] === 2 },
    { id: 'jp', name: '잭 이상 원페어', odd: 1, test: (h) => h.counts[0] === 2 && h.pairHigh >= 11 },
  ];
  const DEF = {
    id: 'vpoker', name: '비디오 포커', level: 1, minBetIdx: 0, order: 23,
    cats: ['card', 'instant'], kind: 'instant',
    theme: { bgm: 'table_loop', cover: 'g_vpoker', vars: { f1: '#e056c2', f2: '#1a0830' } },
    lobby: { blurb: '잭스 오어 베터 9/6 · 추천 홀드', rtp: 99.54, volatility: 3, tag: '카드',
      pros: ['9/6 잭스 오어 베터 최적 전략 RTP 99.54%', '어떤 카드를 홀드할지 직접 선택', '로열 플러시 x800'],
      cons: ['최적 전략을 벗어나면 환수율이 떨어짐', '로열은 매우 희귀'],
      features: ['홀드/드로우', '9/6 페이테이블'] }
  };

  function ranks(c) { return c.r === 1 ? 14 : c.r; } // A high, plus wheel straight handled separately
  function analyze(cards) {
    const rs = cards.map(ranks).sort((a, b) => a - b);
    const suits = cards.map((c) => c.s);
    const flush = suits.every((s) => s === suits[0]);
    const uniq = [...new Set(rs)];
    const wheel = uniq.length === 5 && rs[0] === 2 && rs[1] === 3 && rs[2] === 4 && rs[3] === 5 && rs[4] === 14;
    const straight = wheel || (uniq.length === 5 && rs[4] - rs[0] === 4);
    const map = {}; cards.forEach((c) => { const k = ranks(c); map[k] = (map[k] || 0) + 1; });
    const groups = Object.entries(map).map(([r, n]) => ({ r: +r, n })).sort((a, b) => b.n - a.n || b.r - a.r);
    return { flush, straight: !!straight, counts: groups.map((g) => g.n), pairHigh: groups.find((g) => g.n === 2)?.r || 0, high: rs[4], low: wheel ? 10 : rs[0], groups, rs, cards };
  }
  function rankHand(cards) { const h = analyze(cards); return PAY.find((p) => p.test(h)) || null; }
  function payout(cards, bet) { const r = rankHand(cards); return r ? bet * r.odd : 0; }

  // 9/6 Jacks or Better 최적 홀드 (Wizard of Odds 36줄 차트, 이론 RTP 99.543%)
  const rnk = (c) => c.r === 1 ? 14 : c.r;
  const holdI = (idx) => { const h = Array(5).fill(false); idx.forEach((i) => { if (i >= 0) h[i] = true; }); return h; };
  function idxWhere(cards, pred) { return cards.map((c, i) => pred(c, i) ? i : -1).filter((i) => i >= 0); }
  function isOS(rs) { // 4 unique ranks, open-ended straight (no ace)
    const u = [...new Set(rs)].sort((a, b) => a - b);
    return u.length === 4 && u[3] - u[0] === 3 && u[0] >= 2 && u[3] <= 13; // 2-3-4-5 .. T-J-Q-K (A-high is inside)
  }
  function isInside4(rs) {
    const u = [...new Set(rs)].sort((a, b) => a - b);
    if (u.length !== 4) return false;
    if (u[0] === 2 && u.includes(14) && u[2] <= 5) return true; // wheel A234/A235/A245/A345
    if (u.includes(14) && u[0] >= 10 && u.filter((x)=>x>=11||x===10).length>=3 && u[3]- (u[0]===10?10:u.filter(x=>x<14)[0]||u[0]) <= 4) {
      // broadway inside: AJQK, ATJQ, ATJK, ATQK, etc.
      const b = u.map((x)=>x===14?1:x).sort((a,b)=>a-b);
      // handle as AKQJ = 11,12,13,14 spread 3 but ace high = inside (only 10)
      if (u[0] >= 11 && u[3] === 14 && u[3] - u[0] === 3) return true; // JQKA
    }
    // one gap in 4 cards: spread 4 with 4 unique (e.g. 7,8,9,J)
    return u[3] - u[0] === 4;
  }
  function highsIn(cards) { return cards.filter((c) => rnk(c) >= 11).length; }
  function sf3Type(cs) { // 3 suited, unique ranks; type 1/2/3 or 0
    if (cs.length !== 3) return 0;
    const rs = cs.map(rnk).sort((a, b) => a - b);
    if (new Set(rs).size < 3) return 0;
    let use = rs.slice(), highs = cs.filter((c) => rnk(c) >= 11).length;
    if (rs[2] === 14 && rs[0] <= 5) { use = [1, rs[0], rs[1]]; highs = 0; } // 휠: A는 하이로 안 침
    const spread = use[2] - use[0];
    if (spread > 4) return 0;
    const gaps = spread - 2;
    const score = highs - gaps;
    if (score >= 0) return 1;
    if (score === -1) return 2;
    if (score === -2) return 3;
    return 0;
  }
  function autoHold(cards) {
    const all = holdI([0, 1, 2, 3, 4]), H = analyze(cards);
    const bySuit = {}; Cards.SUITS.forEach((s) => { bySuit[s] = idxWhere(cards, (c) => c.s === s); });
    const suited = (n) => Cards.SUITS.map((s) => bySuit[s]).find((ix) => ix.length === n) || null;
    const royalIx = (s) => idxWhere(cards, (c) => c.s === s && rnk(c) >= 10);
    // 1-3 이미 만들어진 로열/SF/포카드
    if (H.flush && H.straight && H.high === 14 && (H.low === 10 || H.rs.includes(10))) return all;
    if (H.flush && H.straight) return all;
    if (H.counts[0] === 4) return holdI(idxWhere(cards, (c) => rnk(c) === H.groups[0].r));
    // 4. 로열 드로우 4장
    for (const s of Cards.SUITS) { const ix = royalIx(s); if (ix.length === 4) return holdI(ix); }
    // 5-8 풀하우스, 플러시, 트리플, 스트레이트
    if (H.counts[0] === 3 && H.counts[1] === 2) return all;
    if (H.flush) return all;
    if (H.counts[0] === 3) return holdI(idxWhere(cards, (c) => rnk(c) === H.groups[0].r));
    if (H.straight) return all;
    // 9. 스트레이트 플러시 드로우 4장
    for (const s of Cards.SUITS) {
      const ix = bySuit[s];
      if (ix.length === 4) {
        const rs = ix.map((i) => rnk(cards[i]));
        if (isOS(rs) || isInside4(rs) || (new Set(rs).size === 4 && Math.max(...rs) - Math.min(...rs.map((x)=>x===14&&Math.min(...rs)<=5?1:x)) <= 4)) return holdI(ix);
      }
    }
    // 10-11 투페어, 하이페어
    if (H.counts[0] === 2 && H.counts[1] === 2) return holdI(idxWhere(cards, (c) => rnk(c) === H.groups[0].r || rnk(c) === H.groups[1].r));
    if (H.counts[0] === 2 && H.pairHigh >= 11) return holdI(idxWhere(cards, (c) => rnk(c) === H.pairHigh));
    // 12. 로열 드로우 3장
    for (const s of Cards.SUITS) { const ix = royalIx(s); if (ix.length === 3) return holdI(ix); }
    // 13. 플러시 드로우 4장
    for (const s of Cards.SUITS) { if (bySuit[s].length === 4) return holdI(bySuit[s]); }
    // 14. 무늬 다른 T-J-Q-K
    const tjqk = [10, 11, 12, 13].every((r) => cards.some((c) => rnk(c) === r));
    if (tjqk) return holdI(idxWhere(cards, (c) => rnk(c) >= 10 && rnk(c) <= 13));
    // 15. 로우 페어
    if (H.counts[0] === 2) return holdI(idxWhere(cards, (c) => rnk(c) === H.groups[0].r));
    // 16. 아웃사이드 스트레이트 4장 (하이카드 0-2, 에이스 없음)
    const allRs = cards.map(rnk);
    if (isOS(allRs) && highsIn(cards) <= 2) return all;
    // 4장 부분집합 (5장 중 1장 버리고 OS)
    for (let drop = 0; drop < 5; drop++) {
      const ix = [0, 1, 2, 3, 4].filter((i) => i !== drop), rs = ix.map((i) => rnk(cards[i]));
      if (isOS(rs) && highsIn(ix.map((i) => cards[i])) <= 2) return holdI(ix);
    }
    // 17. 3 to SF type 1
    const sf3 = (t) => {
      for (const s of Cards.SUITS) {
        const ix = bySuit[s];
        if (ix.length >= 3) {
          // 3장 조합
          for (let a = 0; a < ix.length; a++) for (let b = a + 1; b < ix.length; b++) for (let c = b + 1; c < ix.length; c++) {
            const sub = [ix[a], ix[b], ix[c]];
            if (sf3Type(sub.map((i) => cards[i])) === t) return holdI(sub);
          }
        }
      }
      return null;
    };
    const t1 = sf3(1); if (t1) return t1;
    // 18. 같은 무늬 QJ
    for (const s of Cards.SUITS) {
      const q = cards.findIndex((c) => c.s === s && rnk(c) === 12);
      const j = cards.findIndex((c) => c.s === s && rnk(c) === 11);
      if (q >= 0 && j >= 0) return holdI([q, j]);
    }
    // 19. 인사이드 스트레이트 4장, 하이 4장 (JQKA)
    const pickInside = (needH) => {
      const trySet = (ix) => {
        if (ix.length !== 4) return null;
        const rs = ix.map((i) => rnk(cards[i]));
        if (isInside4(rs) && !isOS(rs) && highsIn(ix.map((i) => cards[i])) === needH) return holdI(ix);
        return null;
      };
      let r = trySet([0, 1, 2, 3, 4].filter(() => true).slice(0, 5));
      if (cards.length === 5) {
        const allTry = trySet([0, 1, 2, 3, 4]); if (false) {}
        for (let d = 0; d < 5; d++) { const h = trySet([0, 1, 2, 3, 4].filter((i) => i !== d)); if (h) return h; }
      }
      return null;
    };
    const i4 = pickInside(4); if (i4) return i4;
    // 20. 같은 무늬 KQ / KJ
    for (const s of Cards.SUITS) {
      const k = cards.findIndex((c) => c.s === s && rnk(c) === 13);
      const q = cards.findIndex((c) => c.s === s && rnk(c) === 12);
      const j = cards.findIndex((c) => c.s === s && rnk(c) === 11);
      if (k >= 0 && q >= 0) return holdI([k, q]);
      if (k >= 0 && j >= 0) return holdI([k, j]);
    }
    // 21. 같은 무늬 A+ J/Q/K
    for (const s of Cards.SUITS) {
      const a = cards.findIndex((c) => c.s === s && rnk(c) === 14);
      if (a < 0) continue;
      for (const r of [13, 12, 11]) { const i = cards.findIndex((c) => c.s === s && rnk(c) === r); if (i >= 0) return holdI([a, i]); }
    }
    // 22. 인사이드 스트레이트 4장, 하이 3장
    const i3 = pickInside(3); if (i3) return i3;
    // 23. 3 to SF type 2
    const t2 = sf3(2); if (t2) return t2;
    // 24. 무늬 다른 JQK
    const jqk = [11, 12, 13].map((r) => cards.findIndex((c) => rnk(c) === r));
    if (jqk.every((i) => i >= 0)) return holdI(jqk);
    // 25. 무늬 다른 JQ
    const ju = cards.findIndex((c) => rnk(c) === 11), qu = cards.findIndex((c) => rnk(c) === 12);
    if (ju >= 0 && qu >= 0) return holdI([ju, qu]);
    // 26. 같은 무늬 TJ
    for (const s of Cards.SUITS) {
      const t = cards.findIndex((c) => c.s === s && rnk(c) === 10);
      const j = cards.findIndex((c) => c.s === s && rnk(c) === 11);
      if (t >= 0 && j >= 0) return holdI([t, j]);
    }
    // 27. 무늬 다른 하이 2장 (킹이 최고: KQ 이미, KJ, 그리고 K만 있는 페어 아닌 KA는 29)
    const kh = cards.findIndex((c) => rnk(c) === 13);
    if (kh >= 0) {
      const q2 = cards.findIndex((c) => rnk(c) === 12);
      const j2 = cards.findIndex((c) => rnk(c) === 11);
      if (q2 >= 0) return holdI([kh, q2]);
      if (j2 >= 0) return holdI([kh, j2]);
    }
    // 28. 같은 무늬 TQ
    for (const s of Cards.SUITS) {
      const t = cards.findIndex((c) => c.s === s && rnk(c) === 10);
      const q = cards.findIndex((c) => c.s === s && rnk(c) === 12);
      if (t >= 0 && q >= 0) return holdI([t, q]);
    }
    // 29. 무늬 다른 하이 2장 (에이스가 최고: AJ, AQ, AK)
    const ah = cards.findIndex((c) => rnk(c) === 14);
    if (ah >= 0) {
      for (const r of [13, 12, 11]) { const i = cards.findIndex((c) => rnk(c) === r); if (i >= 0) return holdI([ah, i]); }
    }
    // 30. J 하나
    const jOnly = cards.findIndex((c) => rnk(c) === 11); if (jOnly >= 0) return holdI([jOnly]);
    // 31. 같은 무늬 TK
    for (const s of Cards.SUITS) {
      const t = cards.findIndex((c) => c.s === s && rnk(c) === 10);
      const k = cards.findIndex((c) => c.s === s && rnk(c) === 13);
      if (t >= 0 && k >= 0) return holdI([t, k]);
    }
    // 32-34 Q, K, A 하나
    for (const r of [12, 13, 14]) { const i = cards.findIndex((c) => rnk(c) === r); if (i >= 0) return holdI([i]); }
    // 35. 3 to SF type 3
    const t3 = sf3(3); if (t3) return t3;
    // 36. 전부 버림
    return holdI([]);
  }
  function drawFrom(hand, held, deck, rng) {
    const d = deck.slice(); Cards.shuffle(d, rng);
    let j = 0;
    return hand.map((c, i) => held[i] ? c : d[j++]);
  }
  function deal(rng) {
    const d = Cards.shuffle(Cards.makeDeck(), rng);
    return { hand: d.slice(0, 5), rest: d.slice(5) };
  }
  const Engine = { PAY, analyze, rankHand, payout, autoHold, drawFrom, deal };

  let api, el, st;
  function mount(root, a) {
    api = a; el = root;
    st = { phase: 'idle', bet: a.minBet, hand: [null,null,null,null,null], hold: [0,0,0,0,0], rank: null, msg: '베팅 후 DEAL' };
    render();
  }
  function unmount() { el=null; api&&api.setBusy(false); }
  function busy() { return st && st.phase === 'deal'; } // never really blocking long
  function help() {
    api.help(`<h2>🃏 비디오 포커 — Jacks or Better 9/6</h2>
      <p>5장을 받고, 남길 카드를 <b>홀드</b>한 뒤 나머지를 한 번 교체합니다. 잭 이상의 원페어부터 당첨입니다.</p>
      <div class="pt vp-pt">${PAY.map((p)=>`<div><span>${p.name}</span><b>x${p.odd}</b></div>`).join('')}</div>
      <p>풀하우스 x9 · 플러시 x6 이 풀페이(9/6) 기준입니다. 최적 전략 시 이론 RTP는 <b>99.54%</b>입니다.</p>`);
  }
  function render() {
    if (!el || !el.isConnected) return;
    const L = api.levels.filter((n)=>n>=api.minBet).slice(0,7);
    const hit = st.rank && st.phase === 'end' ? st.rank.id : '';
    el.innerHTML = `<div class="felt felt-vp">
      <div class="vp-pay">${PAY.map((p)=>`<div class="vp-row ${hit===p.id?'hit':''}"><span>${p.name}</span><b>x${p.odd}</b><em>${api.fmt(st.bet*p.odd)}</em></div>`).join('')}</div>
      <div class="vp-cards">${st.hand.map((c,i)=>`<button class="vp-c ${st.hold[i]?'held':''} ${!c?'empty':''}" data-i="${i}">
        ${c?Cards.html(c):'<div class="pcard down"><div class="pc-inner"><div class="pc-back"></div></div></div>'}
        <span class="vp-h">${st.phase==='hold'?(st.hold[i]?'HOLD':'홀드'):''}</span></button>`).join('')}</div>
      <div class="bj-msg">${st.msg||''}</div>
      <div class="rl-bar">
        ${st.phase!=='hold'?`<div class="tb-chips">${L.map((n)=>`<button class="chipv ${st.bet===n?'on':''}" data-chip="${n}">${api.fmt(n)}</button>`).join('')}</div>`:''}
        <div class="bj-btns">
          ${st.phase==='hold'?`<button class="tba ghost" id="vpHint">추천</button><button class="tba deal" id="vpDraw">DRAW</button>`:
            `<button class="tba deal" id="vpDeal">DEAL</button>`}
        </div>
      </div>
    </div>`;
    bind();
  }
  function bind() {
    el.querySelectorAll('[data-chip]').forEach((b)=>b.onclick=()=>{st.bet=+b.dataset.chip;Audio2.play('click');render();});
    el.querySelectorAll('[data-i]').forEach((b)=>b.onclick=()=>{
      if (st.phase!=='hold') return; const i=+b.dataset.i; st.hold[i]=!st.hold[i]; Audio2.play('hold'); render();
    });
    const d=el.querySelector('#vpDeal'); if(d) d.onclick=dealH;
    const w=el.querySelector('#vpDraw'); if(w) w.onclick=drawH;
    const h=el.querySelector('#vpHint'); if(h) h.onclick=()=>{ st.hold=Engine.autoHold(st.hand); Audio2.play('click'); render(); };
  }
  function dealH() {
    if (st.phase==='hold') return;
    if (!api.wager(st.bet, true)) return api.toast('잔액이 부족해요');
    const d = Engine.deal(); st.hand=d.hand; st.rest=d.rest; st.hold=[0,0,0,0,0]; st.phase='hold'; st.rank=null;
    st.msg='남길 카드를 탭하세요'; Audio2.play('card_deal'); render();
  }
  function drawH() {
    let j=0;
    st.hand = st.hand.map((c,i)=> st.hold[i] ? c : st.rest[j++]);
    Audio2.play('card_flip');
    st.rank = Engine.rankHand(st.hand);
    const ret = Engine.payout(st.hand, st.bet);
    const net = api.settle('비디오 포커', st.bet, ret);
    st.phase='end'; st.msg = st.rank ? `${st.rank.name} · +${api.fmt(net)}` : '다음 기회에';
    api.setBusy(false); render();
  }
  function debugWin() {
    st.hand=[Cards.card(1,'s'),Cards.card(13,'s'),Cards.card(12,'s'),Cards.card(11,'s'),Cards.card(10,'s')];
    st.hold=[1,1,1,1,1]; st.rank=Engine.rankHand(st.hand); st.phase='end'; st.msg='로열 플러시 · +80,000'; st.bet=100; render();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine };
  else {
    (root.GAME_DEFS = root.GAME_DEFS || []).push(DEF);
    root.GAME_MODS = root.GAME_MODS || {}; root.GAME_MODS.vpoker = { DEF, Engine, mount, unmount, help, busy, debugWin };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
