/* 블랙잭: 6덱 슈, S17, 3:2, 히트/스탠드/더블/스플릿/보험, 아메리칸 피크 */
(function (root) {
  const Cards = (typeof require === 'function' && typeof document === 'undefined') ? require('../cards.js') : root.Cards;
  const DEF = {
    id: 'blackjack', name: '블랙잭', level: 1, minBetIdx: 0, order: 20,
    cats: ['table', 'card'], kind: 'table',
    theme: { bgm: 'table_loop', cover: 'g_blackjack', vars: { f1: '#d4af6a', f2: '#0b3d2c' } },
    lobby: { blurb: '6덱 · 블랙잭 3:2 · 스플릿·더블', rtp: 99.54, volatility: 2, tag: '테이블',
      pros: ['기본 전략 시 하우스 엣지 약 0.46%', '블랙잭은 3:2 배당', '스플릿·더블 가능'],
      cons: ['실력에 따라 환수율이 달라짐', '보험의 엣지가 높음'],
      features: ['6덱 슈', 'S17', '3:2', '스플릿/더블'] }
  };

  const U = '2,3,4,5,6,7,8,9,T,A'.split(',');
  const ui = (c) => c.r === 1 ? 'A' : c.r >= 10 ? 'T' : String(c.r);
  // 6덱, S17, DAS, 스플릿 에이스는 한 장만, 블랙잭 3:2. Wizard of Odds 기본전략
  const HARD = { 5:'HHHHHHHHHH',6:'HHHHHHHHHH',7:'HHHHHHHHHH',8:'HHHHHHHHHH',9:'HDDDDHHHHH',10:'DDDDDDDDHH',11:'DDDDDDDDDH',12:'HHSSSHHHHH',13:'HSSSSHHHHH',14:'HSSSSHHHHH',15:'HSSSSHHHHH',16:'HSSSSHHHHH',17:'SSSSSSSSSS',18:'SSSSSSSSSS',19:'SSSSSSSSSS',20:'SSSSSSSSSS',21:'SSSSSSSSSS' };
  const SOFT = { 13:'HHHDDHHHHH',14:'HHHDDHHHHH',15:'HHDDDHHHHH',16:'HHDDDHHHHH',17:'HDDDDHHHHH',18:'SDDDDSSHHH',19:'SSSSSSSSSS',20:'SSSSSSSSSS',21:'SSSSSSSSSS' };
  const PAIR = { 1:'YYYYYYYYYY',2:'NYYYYYYNNN',3:'NYYYYYYNNN',4:'NNNYYNNNNN',5:'NNNNNNNNNN',6:'NYYYYNNNNN',7:'YYYYYYNNNN',8:'YYYYYYYYYY',9:'YYYYNYYNYN',10:'NNNNNNNNNN' };

  function actBasic(hand, up, { canDouble, canSplit, acesSplit }) {
    if (acesSplit) return 'S';
    const u = U.indexOf(ui(up));
    const cards = hand.cards, v = Cards.bjValue(cards);
    if (canSplit && cards.length === 2 && cards[0].r === cards[1].r) {
      const key = Math.min(10, cards[0].r === 1 ? 1 : cards[0].r);
      const a = (PAIR[key] || 'N')[u];
      if (a === 'Y') return 'P';
    }
    if (v.soft && cards.length >= 2) {
      const a = (SOFT[v.total] || 'H')[u];
      if (a === 'D') return canDouble ? 'D' : (v.total >= 18 ? 'S' : 'H');
      return a;
    }
    const a = (HARD[Math.min(21, Math.max(5, v.total))] || 'H')[u];
    if (a === 'D') return canDouble ? 'D' : 'H';
    return a;
  }

  function newShoe(rng) { return Cards.shoe(6, rng); }
  function draw(sh, rng) { return Cards.draw(sh, rng); }

  function playDealer(cards, sh, rng) {
    while (true) {
      const v = Cards.bjValue(cards);
      if (v.total < 17) cards.push(draw(sh, rng));
      else break; // S17: 소프트 17에서 스탠드
    }
    return cards;
  }

  // 한 판을 기본전략으로 진행 (시뮬레이터용). 반환: { stake, returned }
  function playRound(sh, bet, rng) {
    rng = rng || Math.random;
    const player = [draw(sh, rng), draw(sh, rng)];
    const dealer = [draw(sh, rng), draw(sh, rng)];
    let stake = bet, returned = 0;
    const up = dealer[0];
    const pBJ = Cards.isBJ(player), dBJ = Cards.isBJ(dealer);
    // 보험은 기본전략에서 하지 않음 (엣지 높음)
    if (dBJ && pBJ) return { stake, returned: bet, push: true, pBJ, dBJ };
    if (dBJ) return { stake, returned: 0, dBJ };
    if (pBJ) return { stake, returned: bet + Math.floor(bet * 3 / 2), pBJ };
    const hands = [{ cards: player, bet, done: false, fromSplit: false, acesSplit: false }];
    for (let i = 0; i < hands.length; i++) {
      const h = hands[i];
      while (!h.done) {
        const v = Cards.bjValue(h.cards);
        if (v.total >= 21) { h.done = true; break; }
        const canDouble = h.cards.length === 2 && !h.acesSplit;
        const canSplit = h.cards.length === 2 && h.cards[0].r === h.cards[1].r && hands.length < 4 && !h.acesSplit;
        const a = actBasic(h, up, { canDouble, canSplit, acesSplit: h.acesSplit });
        if (a === 'P' && canSplit) {
          stake += h.bet;
          const c2 = h.cards.pop();
          const h2 = { cards: [c2], bet: h.bet, done: false, fromSplit: true, acesSplit: h.cards[0].r === 1 };
          h.fromSplit = true; h.acesSplit = h2.acesSplit;
          h.cards.push(draw(sh, rng)); h2.cards.push(draw(sh, rng));
          if (h.acesSplit) { h.done = true; h2.done = true; }
          hands.splice(i + 1, 0, h2);
          continue;
        }
        if (a === 'D' && canDouble) { stake += h.bet; h.bet *= 2; h.cards.push(draw(sh, rng)); h.done = true; h.doubled = true; break; }
        if (a === 'S') { h.done = true; break; }
        h.cards.push(draw(sh, rng));
      }
    }
    const live = hands.some((h) => Cards.bjValue(h.cards).total <= 21);
    if (live) playDealer(dealer, sh, rng);
    const dv = Cards.bjValue(dealer).total, dBust = dv > 21;
    for (const h of hands) {
      const pv = Cards.bjValue(h.cards).total;
      const pNat = !h.fromSplit && Cards.isBJ(h.cards);
      if (pv > 21) continue;
      if (pNat) { returned += h.bet + Math.floor(h.bet * 3 / 2); continue; } // shouldn't happen here
      if (dBust || pv > dv) returned += h.bet * 2;
      else if (pv === dv) returned += h.bet;
    }
    return { stake, returned };
  }

  const Engine = { newShoe, draw, playDealer, playRound, actBasic, bjValue: Cards.bjValue, isBJ: Cards.isBJ };

  // ---------------- UI ----------------
  let api, el, sh, st, tmr = [];
  const wait = (ms) => new Promise((r) => { const t = setTimeout(r, ms); tmr.push(t); });
  function alive() { return !!el && el.isConnected; }

  function mount(root, a) {
    api = a; el = root; sh = Engine.newShoe();
    st = { phase: 'bet', bet: a.minBet, hands: [], hi: 0, dealer: [], ins: 0, stake: 0, msg: '베팅 후 DEAL' };
    render();
  }
  function unmount() { tmr.forEach(clearTimeout); tmr = []; el = null; api && api.setBusy(false); }
  function busy() { return st && st.phase !== 'bet' && st.phase !== 'end'; }
  function help() {
    api.help(`<h2>♠️ 블랙잭 규칙</h2>
      <p>6덱 슈 · 딜러는 <b>소프트 17에서 스탠드(S17)</b> · 블랙잭 배당 <b>3:2</b>. 목표: 딜러보다 21에 가깝게, 21 초과(버스트)는 패배.</p>
      <ul>
        <li><b>히트</b>: 한 장 더. <b>스탠드</b>: 현재 패로 확정.</li>
        <li><b>더블</b>: 첫 두 장에서 판돈을 두 배로 하고 한 장만 받습니다.</li>
        <li><b>스플릿</b>: 같은 랭크 두 장이면 판돈을 추가해 두 패로 나눕니다. 에이스는 한 장씩만, 스플릿 블랙잭은 1:1.</li>
        <li><b>보험</b>: 딜러 업카드가 에이스일 때 본전 절반으로 가입, 딜러 블랙잭이면 2:1.</li>
        <li>딜러가 10/A를 보여주면 홀 카드를 먼저 확인(피크)합니다.</li>
      </ul>
      <p>기본 전략을 지키면 이론 하우스 엣지는 약 <b>0.46%</b> (RTP 99.54%)입니다. 보험은 기본 전략에서 권장하지 않습니다.</p>`);
  }

  function chipRow() {
    const L = api.levels.filter((n) => n >= api.minBet).slice(0, 8);
    return `<div class="tb-chips">${L.map((n) => `<button class="chipv ${st.bet === n ? 'on' : ''}" data-bet="${n}">${api.fmt(n)}</button>`).join('')}</div>`;
  }
  function handHTML(h, i, who) {
    const v = h.cards.length ? Cards.bjValue(h.cards) : { total: 0 };
    const bust = v.total > 21, nat = Cards.isBJ(h.cards) && !h.fromSplit;
    const act = st.phase === 'act' && st.hi === i && who === 'p';
    return `<div class="bj-hand ${act ? 'act' : ''} ${bust ? 'bust' : ''} ${h.result || ''}" data-h="${i}">
      <div class="bj-cards">${h.cards.map((c, k) => Cards.html(c, (who === 'd' && k === 1 && st.holeDown) ? 'down' : '')).join('')}</div>
      <div class="bj-tot">${h.cards.length ? (nat ? '블랙잭' : bust ? '버스트' : (v.soft ? '소프트 ' : '') + v.total) : ''}${h.bet && who === 'p' ? ` · ${api.fmt(h.bet)}` : ''}</div>
    </div>`;
  }

  function render() {
    if (!alive()) return;
    const can = st.phase === 'act' ? canActs() : {};
    el.innerHTML = `<div class="felt felt-bj">
      <div class="bj-dealer"><span class="bj-lab">딜러</span>${handHTML({ cards: st.dealer, bet: 0 }, -1, 'd')}</div>
      <div class="bj-msg" id="bjMsg">${st.msg || ''}</div>
      <div class="bj-player">${st.hands.length ? st.hands.map((h, i) => handHTML(h, i, 'p')).join('') : '<div class="bj-hand empty"><div class="bj-cards"></div></div>'}</div>
      <div class="bj-acts">
        ${st.phase === 'bet' ? `${chipRow()}<button class="tba deal" id="bjDeal">DEAL</button>` : ''}
        ${st.phase === 'ins' ? `<p class="bj-ins">딜러 에이스 — 보험에 가입할까요? (판돈 절반, 배당 2:1)</p>
          <div class="bj-btns"><button class="tba" id="bjInsY">보험 ${api.fmt(Math.floor(st.hands[0].bet / 2))}</button><button class="tba ghost" id="bjInsN">건너뛰기</button></div>` : ''}
        ${st.phase === 'act' ? `<div class="bj-btns">
          <button class="tba" id="bjH">히트</button><button class="tba" id="bjS">스탠드</button>
          <button class="tba" id="bjD" ${can.dbl ? '' : 'disabled'}>더블</button>
          <button class="tba" id="bjP" ${can.sp ? '' : 'disabled'}>스플릿</button>
        </div>` : ''}
        ${st.phase === 'end' ? `<div class="bj-end">${st.endLine || ''}</div><button class="tba deal" id="bjAgain">다시 하기</button>` : ''}
      </div>
    </div>`;
    bind();
  }
  function bind() {
    el.querySelectorAll('[data-bet]').forEach((b) => b.onclick = () => { if (st.phase !== 'bet') return; st.bet = +b.dataset.bet; Audio2.play('chip'); render(); });
    const on = (id, fn) => { const b = el.querySelector('#' + id); if (b) b.onclick = fn; };
    on('bjDeal', deal);
    on('bjInsY', () => insurance(true)); on('bjInsN', () => insurance(false));
    on('bjH', () => act('H')); on('bjS', () => act('S')); on('bjD', () => act('D')); on('bjP', () => act('P'));
    on('bjAgain', () => { st.phase = 'bet'; st.hands = []; st.dealer = []; st.msg = '베팅 후 DEAL'; st.endLine = ''; api.setBusy(false); render(); });
  }
  function canActs() {
    const h = st.hands[st.hi]; if (!h) return {};
    const two = h.cards.length === 2 && !h.acesSplit;
    return { dbl: two && api.E.s.coins >= h.bet, sp: two && h.cards[0].r === h.cards[1].r && st.hands.length < 4 && !h.acesSplit && api.E.s.coins >= h.bet };
  }
  async function deal() {
    if (st.phase !== 'bet') return;
    const b = st.bet; if (b > api.E.s.coins) return api.toast('잔액이 부족해요');
    if (!api.wager(b, true)) return;
    Audio2.play('chip'); st.stake = b; st.ins = 0; st.holeDown = true;
    st.hands = [{ cards: [], bet: b, done: false, fromSplit: false, acesSplit: false }];
    st.dealer = []; st.phase = 'deal'; st.msg = ''; api.setBusy(true); render();
    const put = async (who) => {
      const c = Engine.draw(sh); Audio2.play('card_deal');
      if (who === 'd') st.dealer.push(c); else st.hands[0].cards.push(c);
      render(); await wait(280);
    };
    await put('p'); await put('d'); await put('p'); await put('d');
    if (!alive()) return;
    const up = st.dealer[0];
    if (ui(up) === 'A') { st.phase = 'ins'; st.msg = ''; render(); return; }
    await afterPeek();
  }
  async function insurance(yes) {
    if (yes) {
      const amt = Math.floor(st.hands[0].bet / 2);
      if (!api.wager(amt, false)) { api.toast('잔액이 부족해 보험을 건너뛰어요'); }
      else { st.ins = amt; st.stake += amt; Audio2.play('chip'); }
    }
    st.phase = 'deal'; render();
    await afterPeek();
  }
  async function afterPeek() {
    const up = st.dealer[0];
    const peek = ui(up) === 'A' || ui(up) === 'T';
    if (peek && Cards.isBJ(st.dealer)) {
      st.holeDown = false; Audio2.play('card_flip'); render(); await wait(500);
      let ret = 0;
      if (st.ins) ret += st.ins * 3; // 보험 2:1 + 원금
      if (Cards.isBJ(st.hands[0].cards)) ret += st.hands[0].bet; // 본전 푸시
      finish(ret, Cards.isBJ(st.hands[0].cards) ? '푸시 (양쪽 블랙잭)' : (st.ins ? '딜러 블랙잭 · 보험 적중' : '딜러 블랙잭'));
      return;
    }
    if (st.ins) st.msg = '보험 실패';
    if (Cards.isBJ(st.hands[0].cards)) {
      st.holeDown = false; Audio2.play('card_flip'); render(); await wait(400);
      finish(st.hands[0].bet + Math.floor(st.hands[0].bet * 3 / 2), '블랙잭! 3:2');
      return;
    }
    st.phase = 'act'; st.hi = 0; st.msg = '당신의 차례'; render();
  }
  async function act(a) {
    if (st.phase !== 'act') return;
    const h = st.hands[st.hi]; if (!h) return;
    const c = canActs();
    if (a === 'P') {
      if (!c.sp) return;
      if (!api.wager(h.bet, false)) return api.toast('잔액이 부족해요');
      st.stake += h.bet; Audio2.play('chip');
      const c2 = h.cards.pop();
      const h2 = { cards: [c2], bet: h.bet, done: false, fromSplit: true, acesSplit: h.cards[0].r === 1 };
      h.fromSplit = true; h.acesSplit = h2.acesSplit;
      h.cards.push(Engine.draw(sh)); h2.cards.push(Engine.draw(sh));
      st.hands.splice(st.hi + 1, 0, h2);
      Audio2.play('card_deal');
      if (h.acesSplit) { h.done = true; h2.done = true; st.hi = st.hands.length; render(); await dealerPlay(); return; }
      render(); return;
    }
    if (a === 'D') {
      if (!c.dbl) return;
      if (!api.wager(h.bet, false)) return api.toast('잔액이 부족해요');
      st.stake += h.bet; h.bet *= 2; Audio2.play('chip');
      h.cards.push(Engine.draw(sh)); Audio2.play('card_deal'); h.done = true; render(); await wait(280); nextHand(); return;
    }
    if (a === 'S') { h.done = true; render(); nextHand(); return; }
    h.cards.push(Engine.draw(sh)); Audio2.play('card_deal'); render();
    const v = Cards.bjValue(h.cards).total;
    if (v >= 21) { h.done = true; await wait(250); nextHand(); }
  }
  async function nextHand() {
    while (st.hi < st.hands.length && st.hands[st.hi].done) st.hi++;
    if (st.hi >= st.hands.length) { await dealerPlay(); return; }
    st.msg = st.hands.length > 1 ? `패 ${st.hi + 1}` : '당신의 차례'; render();
  }
  async function dealerPlay() {
    st.phase = 'dealer'; st.holeDown = false; Audio2.play('card_flip'); render(); await wait(400);
    const live = st.hands.some((h) => Cards.bjValue(h.cards).total <= 21);
    if (live) {
      while (Cards.bjValue(st.dealer).total < 17) {
        st.dealer.push(Engine.draw(sh)); Audio2.play('card_deal'); render(); await wait(350);
        if (!alive()) return;
      }
    }
    const dv = Cards.bjValue(st.dealer).total, dBust = dv > 21;
    let ret = 0, bits = [];
    st.hands.forEach((h, i) => {
      const pv = Cards.bjValue(h.cards).total;
      const tag = st.hands.length > 1 ? `패${i + 1} ` : '';
      if (pv > 21) { h.result = 'lose'; bits.push(tag + '버스트'); return; }
      const nat = !h.fromSplit && Cards.isBJ(h.cards);
      if (nat) { ret += h.bet + Math.floor(h.bet * 3 / 2); h.result = 'win'; bits.push(tag + '블랙잭'); return; }
      if (dBust || pv > dv) { ret += h.bet * 2; h.result = 'win'; bits.push(tag + (dBust ? '딜러 버스트' : '승')); }
      else if (pv === dv) { ret += h.bet; h.result = 'push'; bits.push(tag + '푸시'); }
      else { h.result = 'lose'; bits.push(tag + '패'); }
    });
    finish(ret, bits.join(' · '));
  }
  function finish(returned, line) {
    if (Cards.needShuffle(sh)) { sh = Engine.newShoe(); line += ' · 셔플'; }
    const net = api.settle('블랙잭', st.stake, returned);
    st.phase = 'end'; st.endLine = `${line} · ${net >= 0 ? '+' : ''}${api.fmt(net)}`; st.msg = '';
    api.setBusy(false); render();
  }

  function debugWin() {
    st.phase='end'; st.holeDown=false; st.msg='';
    st.hands=[{ cards:[Cards.card(1,'s'),Cards.card(13,'h')], bet:100, result:'win', fromSplit:false }];
    st.dealer=[Cards.card(10,'c'),Cards.card(8,'d')];
    st.endLine='블랙잭! 3:2 · +150'; render();
  }
  const UI = { mount, unmount, help, busy, debugWin };
  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine };
  else {
    (root.GAME_DEFS = root.GAME_DEFS || []).push(DEF);
    root.GAME_MODS = root.GAME_MODS || {}; root.GAME_MODS.blackjack = { DEF, Engine, mount, unmount, help, busy, debugWin };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
