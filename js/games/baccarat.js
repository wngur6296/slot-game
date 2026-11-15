/* 바카라: 플레이어/뱅커/타이 + 페어, 정확한 세 번째 카드 규칙, 스퀴즈, 비드/빅 로드 */
(function (root) {
  const Cards = (typeof require === 'function' && typeof document === 'undefined') ? require('../cards.js') : root.Cards;
  const DEF = {
    id: 'baccarat', name: '바카라', level: 4, minBetIdx: 0, order: 22,
    cats: ['table', 'card', 'live'], kind: 'table',
    theme: { bgm: 'table_loop', cover: 'g_baccarat', vars: { f1: '#d4af6a', f2: '#0a1a40' } },
    lobby: { blurb: '뱅커/플레이어 · 출목표와 카드 쪼기', rtp: 98.94, volatility: 2, tag: '테이블',
      pros: ['뱅커 베팅 엣지 약 1.06% (커미션 5%)', '플레이어도 1.24%로 낮음', '로드로 최근 흐름 확인'],
      cons: ['타이(8:1)와 페어(11:1)는 엣지가 높음', '레벨 4 해금'],
      features: ['표준 세 번째 카드', '스퀴즈', '페어', '로드'] }
  };

  function third(pTot, bTot, pThird /* 0-9 or null if player stood */) {
    // returns { playerDraw, bankerDraw } given first two-card totals, then banker rule uses player's third if any
    const pDraw = pTot <= 5;
    // naturals handled outside
    if (pThird == null && !pDraw) {
      // player stands 6-7: banker draws on 0-5
      return { playerDraw: false, bankerDraw: bTot <= 5 };
    }
    return { playerDraw: true, bankerDraw: bankerDraws(bTot, pThird) };
  }
  function bankerDraws(b, p) { // p is player's third card value 0-9
    if (b <= 2) return true;
    if (b === 3) return p !== 8;
    if (b === 4) return p >= 2 && p <= 7;
    if (b === 5) return p >= 4 && p <= 7;
    if (b === 6) return p === 6 || p === 7;
    return false;
  }
  function play(sh, rng) {
    const P = [Cards.draw(sh, rng), Cards.draw(sh, rng)];
    const B = [Cards.draw(sh, rng), Cards.draw(sh, rng)];
    let pT = Cards.bacTotal(P), bT = Cards.bacTotal(B);
    const natural = pT >= 8 || bT >= 8;
    if (!natural) {
      if (pT <= 5) { P.push(Cards.draw(sh, rng)); pT = Cards.bacTotal(P); }
      const p3 = P[2] ? Cards.bacVal(P[2]) : null;
      const bd = p3 == null ? bT <= 5 : bankerDraws(bT, p3);
      if (bd) { B.push(Cards.draw(sh, rng)); bT = Cards.bacTotal(B); }
    }
    const winner = pT > bT ? 'P' : bT > pT ? 'B' : 'T';
    const pPair = P[0].r === P[1].r, bPair = B[0].r === B[1].r;
    return { P, B, pT, bT, winner, pPair, bPair, natural };
  }
  // bets: { P, B, T, PP, BP } amounts. Banker wins pay 0.95 (5% commission)
  function settle(res, bets) {
    let ret = 0;
    if (res.winner === 'P') ret += (bets.P || 0) * 2;
    if (res.winner === 'B') ret += Math.floor((bets.B || 0) * 1.95); // 1:1 minus 5%, keep stake+0.95
    if (res.winner === 'T') { ret += (bets.P || 0) + (bets.B || 0); ret += (bets.T || 0) * 9; }
    if (res.pPair) ret += (bets.PP || 0) * 12;
    if (res.bPair) ret += (bets.BP || 0) * 12;
    return ret;
  }
  const Engine = { play, settle, third, bankerDraws };

  let api, el, sh, st, tmr = [];
  const wait = (ms) => new Promise((r) => tmr.push(setTimeout(r, ms)));
  function mount(root, a) {
    api = a; el = root; sh = Cards.shoe(8);
    st = { phase: 'bet', chip: a.minBet, bets: {}, res: null, squeezeOn: true,
      bead: (a.E.s.baccaratBead || []).slice(), big: (a.E.s.baccaratBig || []).slice(),
      msg: '플레이어 · 뱅커 · 타이 · 페어에 칩을 올리세요' };
    render();
  }
  function unmount() { tmr.forEach(clearTimeout); tmr=[]; el=null; api&&api.setBusy(false); }
  function busy() { return st && (st.phase === 'deal' || st.phase === 'squeeze'); }
  function help() {
    api.help(`<h2>🂠 바카라 규칙</h2>
      <p>8덱 슈. 플레이어와 뱅커가 각각 두 장(필요 시 세 장)을 받으며, <b>9에 가까운 쪽</b>이 이깁니다. A=1, 2–9=숫자, 10·J·Q·K=0, 합의 일의 자리만 씁니다.</p>
      <h3>세 번째 카드</h3>
      <ul>
        <li>어느 한쪽이 8 또는 9(내추럴)이면 추가 카드 없음.</li>
        <li>플레이어는 0–5에서 한 장 더, 6–7은 스탠드.</li>
        <li>뱅커는 플레이어의 세 번째 카드에 따라 표준 차트를 따릅니다 (3은 8 제외 드로우, 6은 6·7만 드로우 등).</li>
      </ul>
      <p><b>플레이어</b> 1:1 (엣지 1.24%) · <b>뱅커</b> 0.95:1, 커미션 5% (엣지 1.06%) · <b>타이</b> 8:1 (엣지 14.4%) · <b>페어</b> 11:1 (엣지 약 10.4%).</p>`);
  }
  function tot() { return Object.values(st.bets).reduce((s, v) => s + v, 0); }
  function add(k) {
    if (st.phase !== 'bet') return;
    if (tot() + st.chip > api.E.s.coins) return api.toast('잔액이 부족해요');
    st.bets[k] = (st.bets[k] || 0) + st.chip; Audio2.play('chip'); paintBets();
  }
  function roads() {
    const bead = st.bead.slice(-66);
    const cols = [];
    for (let i = 0; i < bead.length; i++) {
      const c = Math.floor(i / 6), r = i % 6;
      (cols[c] = cols[c] || [])[r] = bead[i];
    }
    const beadHtml = cols.map((col) => `<div class="rd-col">${[0,1,2,3,4,5].map((r)=>`<i class="${(col[r]||{}).w||''}">${col[r]&&col[r].pair?'•':''}</i>`).join('')}</div>`).join('');
    // big road: new column when winner changes (ties marked on same cell)
    const bigCols = [];
    st.big.forEach((e) => {
      if (!bigCols.length) { bigCols.push([e]); return; }
      if (e.w === 'T') { const last = bigCols[bigCols.length-1]; last[last.length-1].ties = (last[last.length-1].ties||0)+1; return; }
      const lastCol = bigCols[bigCols.length-1], last = lastCol[lastCol.length-1];
      if (e.w === last.w) {
        if (lastCol.length >= 6) bigCols.push([e]); else lastCol.push(e);
      } else bigCols.push([e]);
    });
    const bigHtml = bigCols.slice(-16).map((col) => `<div class="rd-col">${col.map((e)=>`<i class="${e.w}">${e.ties?e.ties:''}</i>`).join('')}</div>`).join('');
    return `<div class="bc-roads"><div class="rd"><small>BEAD</small><div class="rd-grid">${beadHtml}</div></div>
      <div class="rd"><small>BIG ROAD</small><div class="rd-grid">${bigHtml}</div></div></div>`;
  }
  function cardsOf(side) {
    const res = st.res; if (!res) return '<div class="bj-cards"></div>';
    const arr = res[side];
    return `<div class="bj-cards">${arr.map((c, i) => Cards.html(c, st.hide && i === arr.length-1 && st.hide===side ? 'squeeze' : '')).join('')}</div>
      <div class="bj-tot">${st.revealed ? res[side==='P'?'pT':'bT'] : ''}</div>`;
  }
  function render() {
    if (!el || !el.isConnected) return;
    const L = api.levels.filter((n)=>n>=api.minBet).slice(0,7);
    const B = st.bets;
    el.innerHTML = `<div class="felt felt-bc">
      ${roads()}
      <div class="bc-hands">
        <div class="bc-side P"><span>PLAYER</span>${cardsOf('P')}</div>
        <div class="bc-vs">${st.res && st.revealed ? (st.res.winner==='T'?'타이':st.res.winner==='P'?'플레이어 승':'뱅커 승') : 'VS'}</div>
        <div class="bc-side B"><span>BANKER</span>${cardsOf('B')}</div>
      </div>
      <div class="bc-spots">
        ${[['PP','P PAIR 11:1'],['P','PLAYER 1:1'],['T','TIE 8:1'],['B','BANKER 0.95:1'],['BP','B PAIR 11:1']].map(([k,l])=>
          `<button class="bc-sp ${k}" data-k="${k}"><small>${l}</small><b>${B[k]?api.fmt(B[k]):''}</b></button>`).join('')}
      </div>
      <div class="rl-bar">
        <div class="tb-chips">${L.map((n)=>`<button class="chipv ${st.chip===n?'on':''}" data-chip="${n}">${api.fmt(n)}</button>`).join('')}</div>
        <label class="sq-tog"><input type="checkbox" id="bcSq" ${st.squeezeOn?'checked':''}> 스퀴즈</label>
        <div class="bj-btns">
          <button class="tba ghost" id="bcClear">지우기</button>
          <button class="tba deal" id="bcDeal" ${!tot()||st.phase!=='bet'?'disabled':''}>DEAL</button>
          ${st.phase==='end'?`<button class="tba deal" id="bcAgain">다시</button>`:''}
        </div>
      </div>
    </div>`;
    bind();
  }
  function paintBets() {
    el.querySelectorAll('[data-k]').forEach((b)=>{ const v=st.bets[b.dataset.k]; b.querySelector('b').textContent=v?api.fmt(v):''; });
    const d=el.querySelector('#bcDeal'); if(d) d.disabled=!tot()||st.phase!=='bet';
  }
  function bind() {
    el.querySelectorAll('[data-chip]').forEach((b)=>b.onclick=()=>{st.chip=+b.dataset.chip;Audio2.play('click');el.querySelectorAll('[data-chip]').forEach((x)=>x.classList.toggle('on',+x.dataset.chip===st.chip));});
    el.querySelectorAll('[data-k]').forEach((b)=>b.onclick=()=>add(b.dataset.k));
    el.querySelector('#bcClear').onclick=()=>{if(st.phase!=='bet')return;st.bets={};paintBets();};
    const sq=el.querySelector('#bcSq'); if(sq) sq.onchange=()=>st.squeezeOn=sq.checked;
    const d=el.querySelector('#bcDeal'); if(d) d.onclick=go;
    const ag=el.querySelector('#bcAgain'); if(ag) ag.onclick=()=>{st.phase='bet';st.res=null;st.bets={};st.revealed=false;api.setBusy(false);render();};
  }
  async function go() {
    if (st.phase !== 'bet' || !tot()) return;
    const stake = tot(); if (!api.wager(stake, true)) return api.toast('잔액이 부족해요');
    st.phase = 'deal'; st.revealed = false; api.setBusy(true);
    const res = Engine.play(sh); st.res = res; st.hide = st.squeezeOn ? 'P' : null;
    render(); Audio2.play('card_deal'); await wait(350);
    // deal animation is simplified: show all, squeeze last of each side
    if (st.squeezeOn) {
      st.phase = 'squeeze'; Audio2.play('squeeze');
      st.hide = 'P'; render(); await wait(700);
      Audio2.play('card_flip'); st.hide = 'B'; render(); await wait(700);
      Audio2.play('card_flip');
    } else { Audio2.play('card_flip'); }
    st.hide = null; st.revealed = true;
    const ret = Engine.settle(res, st.bets);
    const net = api.settle('바카라', stake, ret);
    const rec = { w: res.winner, pair: res.pPair || res.bPair };
    st.bead.push(rec); st.big.push({ w: res.winner });
    api.E.s.baccaratBead = st.bead.slice(-200); api.E.s.baccaratBig = st.big.slice(-200); api.E.save();
    if (Cards.needShuffle(sh)) sh = Cards.shoe(8);
    st.phase = 'end'; api.setBusy(false); render();
    api.toast(net >= 0 ? `${res.winner==='T'?'타이':res.winner==='P'?'플레이어':'뱅커'} · +${api.fmt(net)}` : `${res.winner==='T'?'타이':res.winner==='P'?'플레이어':'뱅커'} 승`);
  }
  function debugWin() {
    st.res={ P:[Cards.card(1,'s'),Cards.card(8,'h')], B:[Cards.card(10,'c'),Cards.card(7,'d')], pT:9,bT:7,winner:'P',pPair:false,bPair:false };
    st.revealed=true; st.hide=null; st.phase='end'; st.bets={P:100};
    st.bead=st.bead.concat([{w:'P'},{w:'B'},{w:'P'},{w:'P'},{w:'T'},{w:'B'}]);
    render();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine };
  else {
    (root.GAME_DEFS = root.GAME_DEFS || []).push(DEF);
    root.GAME_MODS = root.GAME_MODS || {}; root.GAME_MODS.baccarat = { DEF, Engine, mount, unmount, help, busy, debugWin };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
