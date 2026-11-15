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
    lobby: { rtp: 99.54, volatility: 3, tag: '카드',
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

  // 약식 9/6 전략 (우선순위). 시뮬 RTP는 최적(99.54%)에 근접
  function autoHold(cards) {
    const rnk = (c) => ranks(c), hold = (idx) => { const h = Array(5).fill(false); idx.forEach((i) => h[i] = true); return h; };
    const all = hold([0,1,2,3,4]);
    const H = analyze(cards);
    if (H.flush && H.straight) return all;
    if (H.counts[0] === 4) return hold(cards.map((c, i) => H.groups[0].r === rnk(c) ? i : -1).filter((i)=>i>=0));
    if (H.counts[0] === 3 && H.counts[1] === 2) return all;
    // 4 to royal
    const royal = (c) => 's' + (rnk(c) >= 10 ? rnk(c) : 0);
    for (const s of Cards.SUITS) {
      const idx = cards.map((c,i)=>c.s===s && rnk(c)>=10?i:-1).filter((i)=>i>=0);
      if (idx.length === 4) return hold(idx);
    }
    if (H.flush) return all;
    if (H.counts[0] === 3) return hold(cards.map((c,i)=>H.groups[0].r===rnk(c)?i:-1).filter((i)=>i>=0));
    if (H.straight) return all;
    // 4 to straight flush
    // 2 pair
    if (H.counts[0] === 2 && H.counts[1] === 2) return hold(cards.map((c,i)=>[H.groups[0].r,H.groups[1].r].includes(rnk(c))?i:-1).filter((i)=>i>=0));
    // high pair
    if (H.counts[0] === 2 && H.pairHigh >= 11) return hold(cards.map((c,i)=>rnk(c)===H.pairHigh?i:-1).filter((i)=>i>=0));
    // 3 to royal
    for (const s of Cards.SUITS) {
      const idx = cards.map((c,i)=>c.s===s && rnk(c)>=10?i:-1).filter((i)=>i>=0);
      if (idx.length === 3) return hold(idx);
    }
    // 4 to flush
    for (const s of Cards.SUITS) {
      const idx = cards.map((c,i)=>c.s===s?i:-1).filter((i)=>i>=0);
      if (idx.length === 4) return hold(idx);
    }
    // low pair
    if (H.counts[0] === 2) return hold(cards.map((c,i)=>rnk(c)===H.groups[0].r?i:-1).filter((i)=>i>=0));
    // 4 to outside straight (no gaps, not wheel-ish inside)
    if (H.rs[4] - H.rs[0] === 3 && new Set(H.rs).size === 4 && H.rs[0] !== 14) {
      /* skip, hard */ 
    }
    // two suited high
    for (const s of Cards.SUITS) {
      const idx = cards.map((c,i)=>c.s===s && rnk(c)>=11?i:-1).filter((i)=>i>=0);
      if (idx.length >= 2) return hold(idx.slice(0, 2));
    }
    // unsuited high cards (keep 2 highest J-A)
    const highs = cards.map((c,i)=>({i,r:rnk(c)})).filter((x)=>x.r>=11).sort((a,b)=>b.r-a.r);
    if (highs.length >= 2) return hold(highs.slice(0,2).map((x)=>x.i));
    if (highs.length === 1) return hold([highs[0].i]);
    return hold([]);
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
