/* 텍사스 홀덤 노리밋: 엔진 · AI · 테이블 UI (플레이어 대 AI, 레이크 없음) */
(function (root) {
  const Cards = (typeof require === 'function' && typeof document === 'undefined') ? require('../cards.js') : root.Cards;
  const Eval = (typeof require === 'function' && typeof document === 'undefined') ? require('./holdem-eval.js') : root.HoldemEval;

  const DEF = {
    id: 'holdem', name: '텍사스 홀덤', level: 1, minBetIdx: 0, order: 23,
    cats: ['table', 'card'], kind: 'table',
    theme: { bgm: 'table_loop', cover: 'g_holdem', vars: { f1: '#d4af6a', f2: '#0b3d2c' } },
    lobby: { blurb: '노리밋 텍사스 홀덤 · AI와 함께', rtp: '실력순', volatility: 3, tag: '테이블',
      pros: ['플레이어 대 AI, 레이크 없음', '1~8명의 AI와 2~9인 테이블', '사이드 팟·정확한 핸드 평가'],
      cons: ['결과에 실력이 크게 영향을 줍니다'],
      features: ['노리밋', 'AI 상대', '사이드 팟'] }
  };

  const AI_NAMES = ['럭키팬더', '골드폭스', '문울프', '네온타이거', '실버호크', '크라운독', '블루샤크', '루비캣', '나이트오울', '스타코알라', '미스터칩', '드래곤킹', '안개여우', '볼트토끼'];
  const AI_AV = ['av_panda', 'av_fox', 'av_wolf', 'av_lion', 'av_hawk', 'av_crown', 'av_shark', 'av_cat', 'av_owl', 'av_panda', 'av_crown', 'av_dragon', 'av_fox', 'av_cat'];
  const STYLES = ['tight-passive', 'tight-aggressive', 'loose-passive', 'loose-aggressive', 'bluffer'];
  const STYLE_KO = { 'tight-passive': '타이트·패시브', 'tight-aggressive': '타이트·어그레시브', 'loose-passive': '루스·패시브', 'loose-aggressive': '루스·어그레시브', bluffer: '블러퍼' };
  const BLIND_LV = [{ sb: 10, bb: 20 }, { sb: 25, bb: 50 }, { sb: 50, bb: 100 }, { sb: 100, bb: 200 }, { sb: 250, bb: 500 }];
  const ACT_KO = { fold: '폴드', check: '체크', call: '콜', raise: '레이즈', bet: '벳', allin: '올인' };

  const rnk = (c) => (c.r === 1 ? 14 : c.r);
  const nSitting = (t) => t.seats.filter((p) => p.sitting && (p.stack > 0 || p.invested > 0 || p.inHand)).length;
  const canAct = (p) => p && p.sitting && p.inHand && !p.folded && !p.allIn && p.stack > 0;
  const potOf = (t) => t.seats.reduce((s, p) => s + p.invested, 0);
  const chipsOf = (t) => t.seats.reduce((s, p) => s + p.stack + p.invested, 0);
  function nextIdx(t, from, pred) {
    const n = t.seats.length;
    for (let i = 1; i <= n; i++) { const j = (from + i + n) % n; if (pred(t.seats[j], j)) return j; }
    return -1;
  }
  function nextButton(t) { return nextIdx(t, t.button, (p) => p.sitting && p.stack > 0); }
  function needsAction(t, p) {
    if (!canAct(p)) return false;
    return p.streetBet < t.currentBet || !p.acted;
  }

  function styleOf(key) {
    const s = {
      'tight-passive': { vpip: 0.18, raise: 0.25, callMul: 1.15, bluff: 0.04, size: 0.5 },
      'tight-aggressive': { vpip: 0.20, raise: 0.72, callMul: 1.02, bluff: 0.08, size: 0.66 },
      'loose-passive': { vpip: 0.42, raise: 0.18, callMul: 1.28, bluff: 0.05, size: 0.45 },
      'loose-aggressive': { vpip: 0.38, raise: 0.70, callMul: 1.08, bluff: 0.12, size: 0.7 },
      bluffer: { vpip: 0.34, raise: 0.65, callMul: 1.10, bluff: 0.22, size: 0.62 }
    };
    return s[key] || s['tight-aggressive'];
  }

  function makeAI(i, diff, rng, used) {
    const name = AI_NAMES.filter((n) => !used.has(n))[Math.floor((rng() * 99) % Math.max(1, AI_NAMES.filter((n) => !used.has(n)).length))] || (AI_NAMES[i % AI_NAMES.length] + (i + 1));
    used.add(name);
    const style = STYLES[Math.floor(rng() * STYLES.length)];
    const av = AI_AV[AI_NAMES.indexOf(name)] || AI_AV[i % AI_AV.length];
    return { style, diff, avatar: av, name };
  }

  function create(opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const sb = opts.sb || 25, bb = opts.bb || 50;
    const buyIn = opts.buyIn || bb * 100;
    const diff = opts.diff || 'normal';
    const nAI = Math.max(1, Math.min(8, opts.nAI == null ? 3 : opts.nAI));
    const withHero = !!opts.hero;
    const seats = [];
    const used = new Set();
    if (withHero) {
      seats.push({
        id: 0, name: opts.heroName || '나', isHero: true, sitting: true, inHand: false,
        stack: opts.heroStack != null ? opts.heroStack : buyIn, ai: null, avatar: 'av_crown',
        hole: [], folded: false, allIn: false, streetBet: 0, invested: 0, acted: false, live: true
      });
    }
    for (let i = 0; i < nAI; i++) {
      const a = makeAI(i, diff, rng, used);
      seats.push({
        id: seats.length, name: a.name, isHero: false, sitting: true, inHand: false,
        stack: buyIn, ai: a, avatar: a.avatar,
        hole: [], folded: false, allIn: false, streetBet: 0, invested: 0, acted: false, live: true
      });
    }
    seats.forEach((p, i) => { p.id = i; });
    return {
      seats, button: -1, sb, bb, buyIn, diff, rng,
      deck: [], board: [], burns: [],
      street: 'idle', currentBet: 0, minRaise: bb, toAct: -1, lastFull: -1,
      winners: [], pots: [], handNo: 0, msg: '', injected: 0, removed: 0,
      lastAct: null, heroBuyIn: withHero ? (opts.heroStack != null ? opts.heroStack : buyIn) : 0,
      startChips: seats.reduce((s, p) => s + p.stack, 0)
    };
  }

  function resetSeat(p) {
    p.hole = []; p.folded = false; p.allIn = false; p.streetBet = 0; p.invested = 0;
    p.acted = false; p.live = true; p.inHand = false; p.hand = null; p.won = 0; p.revealed = false;
  }

  function post(t, p, amt) {
    const a = Math.max(0, Math.min(amt, p.stack));
    p.stack -= a; p.streetBet += a; p.invested += a;
    if (p.stack === 0) p.allIn = true;
    return a;
  }

  function startHand(t) {
    t.seats.forEach(resetSeat);
    t.board = []; t.burns = []; t.winners = []; t.pots = []; t.lastAct = null; t.msg = '';
    const live = t.seats.filter((p) => p.sitting && p.stack > 0);
    if (live.length < 2) { t.street = 'idle'; t.msg = '플레이어가 부족합니다'; t.toAct = -1; return t; }
    t.button = nextButton(t);
    if (t.button < 0) { t.street = 'idle'; t.toAct = -1; return t; }
    t.handNo++;
    t.deck = Cards.shuffle(Cards.makeDeck(), t.rng);
    live.forEach((p) => { p.inHand = true; });
    const n = live.length;
    const sbI = n === 2 ? t.button : nextIdx(t, t.button, (p) => p.inHand);
    const bbI = nextIdx(t, sbI, (p) => p.inHand);
    t.sbI = sbI; t.bbI = bbI;
    post(t, t.seats[sbI], t.sb);
    post(t, t.seats[bbI], t.bb);
    t.currentBet = Math.max(t.seats[sbI].streetBet, t.seats[bbI].streetBet);
    t.minRaise = t.bb;
    t.lastFull = t.seats[bbI].allIn && t.seats[bbI].streetBet < t.bb ? -1 : bbI;
    // 딜: 버튼 왼쪽부터 두 장
    for (let r = 0; r < 2; r++) {
      let i = t.button;
      for (let k = 0; k < t.seats.length; k++) {
        i = nextIdx(t, i, (p) => p.inHand);
        t.seats[i].hole.push(t.deck.pop());
      }
    }
    t.street = 'preflop';
    t.seats.forEach((p) => { p.acted = false; p.live = canAct(p); });
    t.toAct = nextIdx(t, bbI, (p) => needsAction(t, p));
    if (t.toAct < 0) runout(t);
    return t;
  }

  function legal(t, id) {
    const p = t.seats[id];
    const empty = { canCheck: false, canFold: false, canCall: false, callAmt: 0, canRaise: false, minTo: 0, maxTo: 0, canAllIn: false, toCall: 0 };
    if (!p || t.toAct !== id || !canAct(p)) return empty;
    const toCall = Math.max(0, t.currentBet - p.streetBet);
    const maxTo = p.streetBet + p.stack;
    const minTo = t.currentBet + t.minRaise;
    const canCheck = toCall === 0;
    const canCall = toCall > 0 && p.stack > 0;
    const canRaise = p.live && p.stack > toCall && maxTo > t.currentBet;
    return {
      canCheck, canFold: true, canCall, callAmt: Math.min(toCall, p.stack),
      canRaise, minTo, maxTo, canAllIn: p.stack > 0, toCall, short: canRaise && maxTo < minTo
    };
  }

  function apply(t, id, type, toAmt) {
    const p = t.seats[id];
    if (!p || t.toAct !== id) return t;
    const L = legal(t, id);
    let act = type;
    if (act === 'allin') {
      if (L.canRaise) { act = 'raise'; toAmt = L.maxTo; }
      else if (L.canCall) act = 'call';
      else if (L.canCheck) act = 'check';
      else act = 'fold';
    }
    if (act === 'raise' && !L.canRaise) act = L.canCall ? 'call' : (L.canCheck ? 'check' : 'fold');
    if (act === 'check' && !L.canCheck) act = L.canCall ? 'call' : 'fold';
    if (act === 'call' && !L.canCall) act = L.canCheck ? 'check' : 'fold';

    if (act === 'fold') {
      p.folded = true; p.acted = true; p.live = false;
      t.lastAct = { id, type: 'fold', amt: 0 };
    } else if (act === 'check') {
      p.acted = true; p.live = false;
      t.lastAct = { id, type: 'check', amt: 0 };
    } else if (act === 'call') {
      post(t, p, L.callAmt);
      p.acted = true; p.live = false;
      t.lastAct = { id, type: p.allIn ? 'allin' : 'call', amt: L.callAmt };
    } else if (act === 'raise') {
      let to = Math.floor(toAmt);
      if (L.short) to = L.maxTo;
      else to = Math.max(L.minTo, Math.min(L.maxTo, to));
      const put = to - p.streetBet;
      post(t, p, put);
      const inc = p.streetBet - t.currentBet;
      const full = inc >= t.minRaise;
      t.currentBet = Math.max(t.currentBet, p.streetBet);
      if (full) {
        t.minRaise = inc;
        t.lastFull = id;
        t.seats.forEach((q) => { if (q.id !== id && canAct(q)) { q.acted = false; q.live = true; } });
      }
      p.acted = true; p.live = false;
      const kind = p.allIn ? 'allin' : (t.currentBet && t.seats.some((q) => q.id !== id && q.streetBet > 0 && t.street !== 'preflop' && t.currentBet === p.streetBet && t.seats.every((x) => x.id === id || x.streetBet === 0 || x.folded || !x.inHand)) ? 'bet' : 'raise');
      t.lastAct = { id, type: p.allIn ? 'allin' : (L.toCall === 0 && !full && false) || (L.toCall === 0 ? 'bet' : 'raise'), amt: p.streetBet, put };
    }

    const alive = t.seats.filter((q) => q.inHand && !q.folded);
    if (alive.length === 1) { awardSingle(t, alive[0]); return t; }
    const nxt = nextIdx(t, id, (q) => needsAction(t, q));
    if (nxt < 0) endStreet(t);
    else t.toAct = nxt;
    return t;
  }

  function awardSingle(t, w) {
    const pot = potOf(t);
    t.seats.forEach((p) => { w.stack += p.invested; p.invested = 0; p.won = p === w ? pot : 0; });
    w.won = pot;
    t.winners = [{ id: w.id, amount: pot, hand: null, pot: '메인' }];
    t.pots = [{ amount: pot, winners: [w.id] }];
    t.street = 'complete'; t.toAct = -1;
    t.msg = w.name + '이(가) 팟을 가져갑니다';
  }

  function dealBoard(t, n) {
    if (t.deck.length) t.burns.push(t.deck.pop());
    for (let i = 0; i < n && t.deck.length; i++) t.board.push(t.deck.pop());
  }

  function moreBetting(t) {
    return t.seats.filter((p) => p.inHand && !p.folded && !p.allIn && p.stack > 0).length >= 2;
  }

  function startStreet(t, street) {
    t.street = street;
    t.currentBet = 0; t.minRaise = t.bb; t.lastFull = -1;
    t.seats.forEach((p) => { p.streetBet = 0; p.acted = false; p.live = canAct(p); });
    const first = nextIdx(t, t.button, (p) => needsAction(t, p));
    if (first < 0) { if (street === 'river') showdown(t); else runout(t); return; }
    t.toAct = first;
  }

  function endStreet(t) {
    if (t.street === 'preflop') { dealBoard(t, 3); if (moreBetting(t)) startStreet(t, 'flop'); else runout(t); }
    else if (t.street === 'flop') { dealBoard(t, 1); if (moreBetting(t)) startStreet(t, 'turn'); else runout(t); }
    else if (t.street === 'turn') { dealBoard(t, 1); if (moreBetting(t)) startStreet(t, 'river'); else runout(t); }
    else showdown(t);
  }

  function runout(t) {
    if (t.board.length < 3) dealBoard(t, 3);
    if (t.board.length < 4) dealBoard(t, 1);
    if (t.board.length < 5) dealBoard(t, 1);
    showdown(t);
  }

  function showdown(t) {
    t.street = 'showdown';
    t.toAct = -1;
    const players = t.seats.filter((p) => p.inHand).map((p) => ({
      id: p.id, invested: p.invested, folded: p.folded, hole: p.hole
    }));
    const layers = Eval.settlePots(players, t.board);
    t.seats.forEach((p) => { p.won = 0; if (p.inHand && !p.folded) { p.revealed = true; p.hand = Eval.bestOf(p.hole.concat(t.board)); } });
    const wins = [];
    layers.forEach((layer, li) => {
      if (!layer.winners.length) {
        // 호출되지 않은 칩: 해당 레이어의 유일한 기여자에게 반환
        const contrib = players.filter((p) => p.invested >= (t.seats.find((s) => s.id === (layer.seats[0] || -1)) ? 0 : 0));
        t.seats.forEach((p) => {
          if (layer.seats.length === 0 && p.inHand) { /* skip */ }
        });
        if (layer.seats.length === 1) {
          const w = t.seats[layer.seats[0]];
          w.stack += layer.amount; w.won += layer.amount;
          wins.push({ id: w.id, amount: layer.amount, hand: w.hand, pot: li ? '사이드' : '메인' });
        }
        return;
      }
      const order = layer.winners.slice().sort((a, b) => distFrom(t, a) - distFrom(t, b));
      order.forEach((id, i) => {
        const add = layer.share + (i < layer.rem ? 1 : 0);
        t.seats[id].stack += add;
        t.seats[id].won += add;
        wins.push({ id, amount: add, hand: t.seats[id].hand, pot: li ? '사이드' : '메인' });
      });
    });
    t.seats.forEach((p) => { p.invested = 0; });
    t.winners = wins;
    t.pots = layers;
    t.street = 'complete';
    const names = [...new Set(wins.filter((w) => w.amount).map((w) => {
      const h = w.hand ? Eval.describe(w.hand) : '';
      return t.seats[w.id].name + (h ? ' · ' + h : '');
    }))];
    t.msg = names.join(', ') + ' 승리';
  }

  function distFrom(t, id) {
    const n = t.seats.length;
    return (id - t.button - 1 + n) % n;
  }

  function rebuy(t, id, amt) {
    const p = t.seats[id];
    if (!p || p.stack > 0 || !p.sitting || t.street !== 'idle' && t.street !== 'complete') return false;
    amt = Math.floor(amt);
    if (amt <= 0) return false;
    p.stack += amt; t.injected += amt;
    if (p.isHero) t.heroBuyIn += amt;
    return true;
  }

  function addAI(t) {
    if (t.seats.length >= 9) return null;
    if (t.street !== 'idle' && t.street !== 'complete') return null;
    const used = new Set(t.seats.map((p) => p.name));
    const a = makeAI(t.seats.length, t.diff, t.rng, used);
    const p = {
      id: t.seats.length, name: a.name, isHero: false, sitting: true, inHand: false,
      stack: t.buyIn, ai: a, avatar: a.avatar,
      hole: [], folded: false, allIn: false, streetBet: 0, invested: 0, acted: false, live: true
    };
    t.seats.push(p);
    t.seats.forEach((s, i) => { s.id = i; });
    t.injected += t.buyIn;
    return p;
  }

  function removeAI(t, id) {
    if (t.street !== 'idle' && t.street !== 'complete') return false;
    const p = t.seats[id];
    if (!p || p.isHero || t.seats.filter((s) => s.sitting && !s.isHero).length <= 1) return false;
    t.removed += p.stack + p.invested;
    t.seats.splice(id, 1);
    t.seats.forEach((s, i) => { s.id = i; });
    if (t.button >= t.seats.length) t.button = t.seats.length - 1;
    return true;
  }

  /* ---- AI: 히든 카드는 절대 보지 않음 ---- */
  function preflopScore(h) {
    const a = rnk(h[0]), b = rnk(h[1]);
    const hi = Math.max(a, b), lo = Math.min(a, b);
    const pair = a === b, suited = h[0].s === h[1].s, gap = hi - lo;
    let s;
    if (pair) s = 0.50 + (hi - 2) * 0.032;
    else {
      s = 0.12 + hi / 14 * 0.26 + lo / 14 * 0.11;
      if (suited) s += 0.07;
      if (gap === 1) s += 0.05; else if (gap === 2) s += 0.025; else s -= Math.min(0.12, (gap - 2) * 0.016);
      if (hi === 14) s += 0.05;
    }
    return Math.max(0.06, Math.min(0.95, s));
  }

  function handEquity(t, p, nOpp) {
    const iters = t._fast ? 36 : (p.ai && p.ai.diff === 'hard' ? 260 : p.ai && p.ai.diff === 'easy' ? 70 : 140);
    if (!t.board.length) {
      const s = preflopScore(p.hole);
      return Math.pow(s, 1 + 0.18 * Math.max(0, nOpp - 1));
    }
    return Eval.equity(p.hole, t.board, nOpp, [], iters, t.rng);
  }

  function decide(t, id) {
    const p = t.seats[id];
    const L = legal(t, id);
    const fallback = () => (L.canCheck ? { type: 'check' } : L.canCall && L.callAmt === 0 ? { type: 'call' } : L.canCheck ? { type: 'check' } : { type: 'fold' });
    if (!p || !L.canFold && !L.canCheck && !L.canCall) return { type: L.canCheck ? 'check' : 'fold' };
    const nOpp = t.seats.filter((q) => q.inHand && !q.folded && q.id !== id).length;
    const pot = potOf(t);
    const toCall = L.toCall;
    const odds = toCall <= 0 ? 0 : toCall / (pot + toCall);
    const st = styleOf(p.ai && p.ai.style || 'tight-aggressive');
    const diff = (p.ai && p.ai.diff) || t.diff || 'normal';
    const dMul = diff === 'easy' ? 1.18 : diff === 'hard' ? 0.92 : 1;
    const pos = distFrom(t, id);
    const late = pos >= Math.max(1, t.seats.filter((q) => q.inHand).length - 3);
    const eq = handEquity(t, p, Math.max(1, nOpp));
    const open = toCall <= (t.street === 'preflop' ? (t.currentBet === t.bb || t.currentBet === Math.min(t.bb, t.currentBet)) && t.currentBet <= t.bb : 0) && t.currentBet <= t.bb && t.street === 'preflop';
    const facingOpen = t.street === 'preflop' && toCall <= t.bb && toCall > 0;
    let wantIn = eq + (late ? 0.04 : 0) > (1 - st.vpip) * 0.55 * dMul;
    if (t.street === 'preflop') wantIn = eq >= (0.22 / st.vpip * 0.08 + 0.10) * (late ? 0.9 : 1.05) * (diff === 'easy' ? 0.85 : 1);
    // 팟 오즈
    const callOk = toCall === 0 || eq * st.callMul * (diff === 'easy' ? 1.15 : 1) >= odds * (diff === 'hard' ? 1.05 : 0.95);
    const strong = eq >= (diff === 'hard' ? 0.62 : 0.58);
    const very = eq >= 0.78;
    const bluffRoll = t.rng() < st.bluff * (diff === 'easy' ? 0.45 : diff === 'hard' ? 1.15 : 0.85) * (nOpp >= 4 ? 0.25 : 1);
    const raiseWant = (strong && t.rng() < st.raise) || (very) || (bluffRoll && nOpp <= 3 && (toCall === 0 || facingOpen));
    let to = 0;
    if (raiseWant && L.canRaise) {
      const potNow = pot + toCall;
      const frac = st.size * (very ? 1.15 : bluffRoll && !strong ? 0.9 : 1);
      to = t.currentBet === 0 ? Math.max(t.bb, Math.round(potNow * frac)) : t.currentBet + Math.max(t.minRaise, Math.round(Math.max(t.minRaise, potNow * frac)));
      if (t.street === 'preflop' && t.currentBet <= t.bb) to = Math.max(L.minTo, Math.round(t.bb * (st.raise > 0.5 ? 3 : 2.4)));
      if (very && p.stack + p.streetBet - to < t.bb * 3) to = L.maxTo;
      if (L.short) to = L.maxTo;
      to = Math.max(L.short ? L.maxTo : L.minTo, Math.min(L.maxTo, to));
      return { type: 'raise', to };
    }
    if (L.canCheck && (toCall === 0) && raiseWant && L.canRaise) {
      /* already handled */
    }
    if (L.canCheck && !raiseWant) return { type: 'check' };
    if (L.canCall && (callOk || (wantIn && facingOpen) || (strong))) return { type: 'call' };
    if (L.canCheck) return { type: 'check' };
    return { type: 'fold' };
  }

  function thinkMs(t, id) {
    const p = t.seats[id];
    const d = (p.ai && p.ai.diff) || t.diff || 'normal';
    const base = d === 'easy' ? 420 : d === 'hard' ? 700 : 550;
    return Math.max(400, Math.min(2000, Math.round(base + t.rng() * (d === 'hard' ? 1100 : 800))));
  }

  function runHand(t, maxSteps) {
    t._fast = true;
    if (t.street === 'idle' || t.street === 'complete') startHand(t);
    let steps = 0, cap = maxSteps || 500;
    while (t.street !== 'complete' && t.street !== 'idle') {
      if (++steps > cap || t.toAct < 0) { t.stuck = true; t.stuckAt = t.street + ':' + steps + ':' + t.toAct; break; }
      const a = decide(t, t.toAct);
      apply(t, t.toAct, a.type, a.to);
    }
    t._fast = false;
    return t;
  }

  const Engine = { create, startHand, legal, apply, decide, runHand, rebuy, addAI, removeAI, potOf, chipsOf, thinkMs, showdown, legalActs: legal };

  /* ---------------- UI ---------------- */
  let api, rootEl, table, view = 'setup', timers = [], cashed = false, selectedTo = 0, tickT = 0, flying = [];

  const $ = (s, el) => (el || rootEl).querySelector(s);
  const $$ = (s, el) => [...(el || rootEl).querySelectorAll(s)];
  const fmt = (n) => (api && api.fmt) ? api.fmt(n) : Math.floor(n).toLocaleString('ko-KR');
  const E = () => (api && api.E) || (root.__slot && root.__slot.E);

  function clearTimers() { timers.forEach((x) => clearTimeout(x)); timers = []; tickT++; }
  function later(ms, fn) { const my = tickT; const id = setTimeout(() => { if (my === tickT) fn(); }, ms); timers.push(id); }

  function prefs() {
    const s = E() && E().s; const p = (s && s.holdemPrefs) || {};
    return { nAI: p.nAI || 3, sb: p.sb || 25, bb: p.bb || 50, buyInBb: p.buyInBb || 100, diff: p.diff || 'normal' };
  }
  function savePrefs(p) {
    const e = E(); if (!e) return;
    e.s.holdemPrefs = { nAI: p.nAI, sb: p.sb, bb: p.bb, buyInBb: p.buyInBb, diff: p.diff };
    e.save();
  }
  function saveSession() {
    const e = E(); if (!e || !table) return;
    const h = table.seats.find((p) => p.isHero);
    if (!h) { e.s.holdemSession = null; e.save(); return; }
    e.s.holdemSession = { stack: h.stack + h.invested, totalBuyIn: table.heroBuyIn, sb: table.sb, bb: table.bb, nAI: table.seats.filter((p) => !p.isHero).length, diff: table.diff };
    e.save();
  }

  function cashOut() {
    if (cashed || !table) return;
    const h = table.seats.find((p) => p.isHero);
    if (!h) { cashed = true; return; }
    cashed = true;
    const stack = h.stack + h.invested;
    h.stack = 0; h.invested = 0;
    if (api && api.settle) api.settle('홀덤 테이블 퇴장', table.heroBuyIn || 0, stack);
    const e = E(); if (e) { e.s.holdemSession = null; e.save(); }
    if (api && api.hud) api.hud();
  }

  function seatXY(i, n, heroI) {
    const k = (i - heroI + n) % n;
    const ang = Math.PI / 2 + (2 * Math.PI * k) / n;
    const c = Math.cos(ang), si = Math.sin(ang);
    let l = 50 + 40 * c, t = 50 + 38 * si;
    if (k !== 0 && Math.abs(c) > 0.78) { l = 50 + 40 * c; t = Math.min(62, t + 4); }
    if (k !== 0 && si < -0.5) t = Math.max(16, t - 2);
    const side = l < 30 ? 's-left' : l > 70 ? 's-right' : (t < 40 ? 's-top' : (t > 70 ? 's-bot' : 's-mid'));
    return { l, t, side };
  }

  function chipStack(n, cls) {
    const cols = [['chip_white', 1], ['chip_red', 5], ['chip_blue', 25], ['chip_green', 100], ['chip_black', 500], ['chip_purple', 1000], ['chip_gold', 5000]];
    let left = Math.max(0, n), html = '';
    let shown = 0;
    for (let i = cols.length - 1; i >= 0 && shown < 8; i--) {
      const c = Math.min(3, Math.floor(left / cols[i][1]));
      for (let k = 0; k < c && shown < 8; k++) {
        html += `<img class="hd-chip ${cls || ''}" src="assets/img/${cols[i][0]}.webp" alt="" style="--i:${shown}">`;
        shown++; left -= cols[i][1];
      }
    }
    if (!shown && n >= 0) html = `<img class="hd-chip ${cls || ''}" src="assets/img/chip_white.webp" alt="" style="--i:0">`;
    return html;
  }

  function cardH(c, extra) { return Cards.html(c, extra || ''); }

  function renderSetup() {
    const p = prefs();
    const coins = E() ? E().s.coins : 0;
    const buy = p.buyInBb * p.bb;
    rootEl.innerHTML = `<div class="felt felt-hd hd-setup">
      <div class="hd-setup-card">
        <h3>텍사스 홀덤</h3>
        <p class="hd-sub">노리밋 · AI와 함께하는 테이블</p>
        <label>AI 상대 <b id="hdNAI">${p.nAI}명</b> <small>(${p.nAI + 1}인 테이블)</small></label>
        <div class="hd-step"><button type="button" data-ai="-1">−</button><input id="hdAI" type="range" min="1" max="8" value="${p.nAI}"><button type="button" data-ai="1">+</button></div>
        <label>블라인드</label>
        <div class="hd-blinds">${BLIND_LV.map((b) => `<button type="button" class="chipv ${b.sb === p.sb ? 'on' : ''}" data-sb="${b.sb}" data-bb="${b.bb}">${b.sb}/${b.bb}</button>`).join('')}</div>
        <label>바이인 <b id="hdBuyLab">${fmt(buy)}</b> <small>(${p.buyInBb} BB)</small></label>
        <div class="hd-step"><button type="button" data-bb="-10">−</button><input id="hdBB" type="range" min="20" max="200" step="10" value="${p.buyInBb}"><button type="button" data-bb="10">+</button></div>
        <label>AI 난이도</label>
        <div class="hd-diffs">${['easy', 'normal', 'hard'].map((d) => `<button type="button" class="chipv ${p.diff === d ? 'on' : ''}" data-diff="${d}">${d === 'easy' ? '쉬움' : d === 'hard' ? '어려움' : '보통'}</button>`).join('')}</div>
        <p class="hd-wallet">지갑 잔액 <b>${fmt(coins)}</b></p>
        <button type="button" class="tba deal" id="hdJoin" ${coins < buy ? 'disabled' : ''}>테이블 입장</button>
        <button type="button" class="tba ghost" id="hdGuideBtn">게임 방법</button>
      </div></div>`;
    bindSetup();
  }

  function bindSetup() {
    const sync = () => {
      const p = {
        nAI: +$('#hdAI').value, sb: +($('.hd-blinds .on') && $('.hd-blinds .on').dataset.sb) || 25,
        bb: +($('.hd-blinds .on') && $('.hd-blinds .on').dataset.bb) || 50,
        buyInBb: +$('#hdBB').value, diff: ($('.hd-diffs .on') && $('.hd-diffs .on').dataset.diff) || 'normal'
      };
      savePrefs(p);
      const buy = p.buyInBb * p.bb, coins = E() ? E().s.coins : 0;
      $('#hdNAI').innerHTML = p.nAI + '명';
      $('#hdNAI').nextElementSibling.textContent = `(${p.nAI + 1}인 테이블)`;
      $('#hdBuyLab').textContent = fmt(buy);
      $('#hdBuyLab').nextElementSibling.textContent = `(${p.buyInBb} BB)`;
      $('#hdJoin').disabled = coins < buy;
    };
    rootEl.oninput = (e) => { if (e.target.id === 'hdAI' || e.target.id === 'hdBB') sync(); };
    rootEl.onclick = (e) => {
      const ai = e.target.closest('[data-ai]');
      if (ai) { const el = $('#hdAI'); el.value = Math.max(1, Math.min(8, +el.value + +ai.dataset.ai)); sync(); return; }
      const bb = e.target.closest('[data-bb]');
      if (bb && bb.tagName === 'BUTTON' && !bb.dataset.sb) { const el = $('#hdBB'); el.value = Math.max(20, Math.min(200, +el.value + +bb.dataset.bb)); sync(); return; }
      const bl = e.target.closest('[data-sb]');
      if (bl) { $$('.hd-blinds .chipv').forEach((b) => b.classList.toggle('on', b === bl)); sync(); return; }
      const df = e.target.closest('[data-diff]');
      if (df) { $$('.hd-diffs .chipv').forEach((b) => b.classList.toggle('on', b === df)); sync(); return; }
      if (e.target.id === 'hdJoin') joinTable();
      if (e.target.id === 'hdGuideBtn' && window.Guides) Guides.open('holdem');
    };
  }

  function joinTable() {
    const p = prefs();
    const buy = p.buyInBb * p.bb;
    if (!api.wager(buy, false)) { api.toast('잔액이 부족해요'); return; }
    cashed = false;
    table = Engine.create({ nAI: p.nAI, sb: p.sb, bb: p.bb, buyIn: buy, diff: p.diff, hero: true, heroStack: buy, rng: Math.random });
    saveSession(); api.hud();
    view = 'table';
    renderTable();
    startNextHand();
  }

  function startNextHand() {
    clearTimers();
    const h = table.seats.find((p) => p.isHero);
    if (h && h.stack <= 0) { renderTable(); return; }
    if (table.seats.filter((p) => p.sitting && p.stack > 0).length < 2) { table.msg = '상대가 부족합니다. AI를 추가하세요'; renderTable(); return; }
    Engine.startHand(table);
    const e = E();
    if (e && table.seats[0] && table.seats[0].isHero && table.seats[0].inHand) { e.mission('spins', 1); e.save(); }
    if (api.setBusy) api.setBusy(true);
    saveSession();
    renderTable('deal');
    later(table.seats.length * 90 + 420, () => proceed());
  }

  function proceed() {
    if (!table || table.street === 'complete' || table.street === 'idle') {
      if (api.setBusy) api.setBusy(false);
      afterHand();
      renderTable();
      return;
    }
    const p = table.seats[table.toAct];
    if (!p) { renderTable(); return; }
    renderTable();
    if (p.isHero) startHeroTimer();
    else {
      const ms = Engine.thinkMs(table, p.id);
      later(ms, () => {
        const a = Engine.decide(table, table.toAct);
        Engine.apply(table, table.toAct, a.type, a.to);
        flyChips();
        if (window.Audio2) Audio2.play(a.type === 'fold' ? 'click' : 'coin');
        saveSession();
        later(280, () => proceed());
      });
    }
  }

  function startHeroTimer() {
    const sec = 20;
    const start = Date.now();
    const ring = $('.hd-timer');
    const step = () => {
      if (!table || table.street === 'complete') return;
      const p = table.seats[table.toAct];
      if (!p || !p.isHero) return;
      const left = Math.max(0, sec - (Date.now() - start) / 1000);
      if (ring) { const tot = 113; ring.style.strokeDashoffset = String(tot * (1 - left / sec)); }
      if (left <= 0) {
        const L = Engine.legal(table, p.id);
        Engine.apply(table, p.id, L.canCheck ? 'check' : 'fold');
        saveSession(); later(200, () => proceed());
        return;
      }
      later(80, step);
    };
    later(80, step);
  }

  function afterHand() {
    if (!table) return;
    const h = table.seats.find((p) => p.isHero);
    if (h && h.won > 0) {
      const e = E(); if (e) { e.mission('wins', 1); if (h.won >= table.bb * 50) e.mission('bigwin', 1); }
      if (window.FX) { FX.coinBurst(innerWidth / 2, innerHeight * 0.38, 18); FX.sparkle(innerWidth / 2, innerHeight * 0.38, 14); }
      if (window.Audio2) Audio2.play(h.won >= table.bb * 50 ? 'win_big' : 'win_small');
    }
    saveSession();
  }

  function flyChips() {
    if (!table || !table.lastAct || !table.lastAct.put && table.lastAct.type !== 'call' && table.lastAct.type !== 'raise' && table.lastAct.type !== 'bet' && table.lastAct.type !== 'allin') return;
    const el = rootEl && $(`.hd-seat[data-id="${table.lastAct.id}"]`);
    if (!el || !rootEl) return;
    const pot = $('.hd-pot'); if (!pot) return;
    const a = el.getBoundingClientRect(), b = pot.getBoundingClientRect();
    const img = document.createElement('img');
    img.src = 'assets/img/chip_gold.webp'; img.className = 'hd-fly';
    img.style.left = (a.left + a.width / 2 - 12) + 'px'; img.style.top = (a.top + 8) + 'px';
    document.body.appendChild(img);
    requestAnimationFrame(() => {
      img.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.7)`;
      img.style.opacity = '0.2';
    });
    setTimeout(() => img.remove(), 520);
  }

  function renderTable(mode) {
    if (!rootEl || !table) return;
    const n = table.seats.length;
    const heroI = Math.max(0, table.seats.findIndex((p) => p.isHero));
    const pot = Engine.potOf(table);
    const hero = table.seats[heroI];
    const between = table.street === 'complete' || table.street === 'idle';
    const L = (!between && hero && table.toAct === hero.id) ? Engine.legal(table, hero.id) : null;
    if (L && !selectedTo) selectedTo = L.short ? L.maxTo : L.minTo;
    if (L && selectedTo) selectedTo = Math.max(L.short ? L.maxTo : L.minTo, Math.min(L.maxTo, selectedTo || L.minTo));

    const seatsH = table.seats.map((p, i) => {
      const xy = seatXY(i, n, heroI);
      const heroTurn = table.toAct === p.id;
      const win = table.street === 'complete' && p.won > 0;
      const hole = p.hole.map((c, ci) => {
        const hide = !p.isHero && !p.revealed && table.street !== 'complete';
        const showWin = win && p.hand && p.hand.cards && p.hand.cards.some((x) => x.id === c.id);
        return cardH(c, (hide ? 'down ' : '') + (mode === 'deal' ? 'deal' : '') + (showWin ? ' win' : '') + (p.isHero ? ' hero' : ''));
      }).join('');
      return `<div class="hd-seat ${p.isHero ? 'me' : ''} ${xy.side} ${heroTurn ? 'turn' : ''} ${p.folded ? 'folded' : ''} ${win ? 'winner' : ''} ${p.allIn ? 'allin' : ''}" data-id="${p.id}" style="left:${xy.l}%;top:${xy.t}%">
        <div class="hd-av"><img src="assets/img/${p.avatar || 'av_crown'}.webp" alt="">${heroTurn ? `<svg class="hd-timer-svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18"></circle><circle class="hd-timer" cx="20" cy="20" r="18" pathLength="113"></circle></svg>` : ''}
          ${table.button === p.id ? '<i class="hd-btn">D</i>' : ''}
          ${table.sbI === p.id && table.street !== 'idle' ? '<i class="hd-blind sb">SB</i>' : ''}
          ${table.bbI === p.id && table.street !== 'idle' ? '<i class="hd-blind bb">BB</i>' : ''}
        </div>
        <div class="hd-meta"><b>${p.name}</b><span>🪙 ${fmt(p.stack)}</span>${p.ai ? `<small>${STYLE_KO[p.ai.style] || ''}</small>` : ''}</div>
        <div class="hd-hole">${hole}</div>
        ${p.allIn && !p.folded ? '<em class="hd-tag">올인</em>' : ''}
        ${table.lastAct && table.lastAct.id === p.id ? `<em class="hd-bubble">${ACT_KO[table.lastAct.type] || ''}${table.lastAct.amt ? ' ' + fmt(table.lastAct.amt) : ''}</em>` : ''}
      </div>`;
    }).join('');

    const boardH = [0, 1, 2, 3, 4].map((i) => {
      const c = table.board[i];
      if (!c) return `<div class="hd-slot"></div>`;
      const winC = table.street === 'complete' && table.winners.some((w) => {
        const h = table.seats[w.id] && table.seats[w.id].hand; return h && h.cards && h.cards.some((x) => x.id === c.id);
      });
      return cardH(c, 'board' + (winC ? ' win' : ''));
    }).join('');

    const rankLine = (table.street === 'complete' && table.msg) ? table.msg : (hero && hero.hole.length && table.board.length >= 3 && !hero.folded ? (Eval.describe(Eval.bestOf(hero.hole.concat(table.board))) || '') : (table.street === 'preflop' ? '프리플롭' : table.street === 'flop' ? '플롭' : table.street === 'turn' ? '턴' : table.street === 'river' ? '리버' : ''));

    let bar = '';
    if (between) {
      const canRe = hero && hero.stack <= 0;
      const minBuy = table.bb * 20, maxBuy = table.bb * 200, defBuy = Math.min(maxBuy, Math.max(minBuy, table.buyIn));
      bar = `<div class="hd-bar between">
        <div class="hd-msg">${table.msg || '핸드가 끝났습니다'}</div>
        <div class="hd-seats-edit"><span>AI ${table.seats.filter((p) => !p.isHero).length}명</span>
          <button type="button" class="tba ghost" id="hdAddAI" ${table.seats.length >= 9 ? 'disabled' : ''}>AI 추가</button>
          <button type="button" class="tba ghost" id="hdDelAI" ${table.seats.filter((p) => !p.isHero).length <= 1 ? 'disabled' : ''}>AI 제거</button>
        </div>
        ${canRe ? `<div class="hd-rebuy">바이인 ${fmt(defBuy)} <button type="button" class="tba" id="hdRebuy">다시 참가</button></div>` : ''}
        <div class="hd-row">
          <button type="button" class="tba ghost" id="hdLeave">테이블 퇴장</button>
          <button type="button" class="tba deal" id="hdNext" ${canRe || table.seats.filter((p) => p.stack > 0).length < 2 ? 'disabled' : ''}>다음 핸드</button>
        </div>
      </div>`;
    } else if (L) {
      const potF = (f) => Math.min(L.maxTo, Math.max(L.minTo, Math.round((pot + L.toCall) * f + table.currentBet)));
      bar = `<div class="hd-bar act">
        <div class="hd-msg">${rankLine}</div>
        ${L.canRaise ? `<div class="hd-raise">
          <input id="hdSlider" type="range" min="${L.short ? L.maxTo : L.minTo}" max="${L.maxTo}" value="${selectedTo || (L.short ? L.maxTo : L.minTo)}">
          <b id="hdRaiseVal">${fmt(selectedTo || L.minTo)}</b>
          <div class="hd-presets">
            ${[['1/3', potF(1 / 3)], ['1/2', potF(0.5)], ['2/3', potF(2 / 3)], ['팟', potF(1)], ['올인', L.maxTo]].map(([k, v]) => `<button type="button" class="chipv" data-to="${v}">${k}</button>`).join('')}
          </div>
        </div>` : ''}
        <div class="hd-row">
          <button type="button" class="tba ghost" id="hdFold">폴드</button>
          ${L.canCheck ? `<button type="button" class="tba" id="hdCheck">체크</button>` : `<button type="button" class="tba" id="hdCall">콜 ${fmt(L.callAmt)}</button>`}
          ${L.canRaise ? `<button type="button" class="tba deal" id="hdRaise">${L.short || (selectedTo >= L.maxTo) ? '올인' : '레이즈'}</button>` : (L.canCall && L.callAmt === L.maxTo - (hero.streetBet) ? '' : '')}
        </div>
      </div>`;
    } else {
      bar = `<div class="hd-bar wait"><div class="hd-msg">${rankLine || '상대의 행동을 기다리는 중'}</div></div>`;
    }

    rootEl.innerHTML = `<div class="felt felt-hd">
      <div class="hd-oval">
        <div class="hd-center" style="top:34%">
          <div class="hd-board">${boardH}</div>
          <div class="hd-pot">${pot > 0 ? chipStack(pot, 'pot') + '<b>' + fmt(pot) + '</b>' : (table.street === 'complete' ? '<b class="hd-pot-done">정산</b>' : '<b>0</b>')}<small>팟 · ${table.sb}/${table.bb}</small></div>
          <div class="hd-rank">${table.street === 'complete' ? rankLine : (hero && !hero.folded && table.board.length >= 3 ? rankLine : '')}</div>
        </div>
        ${seatsH}
      </div>
      ${bar}
    </div>`;
    bindTable();
    if (mode === 'deal') {
      $$('.pcard.deal', rootEl).forEach((el, i) => { el.style.animationDelay = (i * 70) + 'ms'; });
    }
  }

  function bindTable() {
    const sl = $('#hdSlider');
    if (sl) sl.addEventListener('input', () => { selectedTo = +sl.value; const v = $('#hdRaiseVal'); if (v) v.textContent = fmt(selectedTo); const b = $('#hdRaise'); const L = Engine.legal(table, table.toAct); if (b && L) b.textContent = selectedTo >= L.maxTo || L.short ? '올인' : '레이즈'; });
    rootEl.onclick = (e) => {
      const t = e.target.closest('button, [data-to]'); if (!t) return;
      if (t.dataset.to) { selectedTo = +t.dataset.to; const sl2 = $('#hdSlider'); if (sl2) sl2.value = selectedTo; const v = $('#hdRaiseVal'); if (v) v.textContent = fmt(selectedTo); const b = $('#hdRaise'); const L = Engine.legal(table, table.toAct); if (b && L) b.textContent = selectedTo >= L.maxTo || L.short ? '올인' : '레이즈'; return; }
      if (t.id === 'hdFold' || t.id === 'hdCheck' || t.id === 'hdCall' || t.id === 'hdRaise') {
        const L = Engine.legal(table, table.toAct); if (!L) return;
        let type = 'fold', to;
        if (t.id === 'hdCheck') type = 'check';
        else if (t.id === 'hdCall') type = 'call';
        else if (t.id === 'hdRaise') { type = 'raise'; to = selectedTo || L.minTo; }
        clearTimers();
        Engine.apply(table, table.toAct, type, to);
        selectedTo = 0;
        flyChips();
        if (window.Audio2) Audio2.play('coin');
        saveSession();
        later(240, () => proceed());
        return;
      }
      if (t.id === 'hdNext') { selectedTo = 0; startNextHand(); return; }
      if (t.id === 'hdLeave') { tryLeave(); return; }
      if (t.id === 'hdAddAI') { Engine.addAI(table); renderTable(); return; }
      if (t.id === 'hdDelAI') {
        const last = [...table.seats].reverse().find((p) => !p.isHero);
        if (last) Engine.removeAI(table, last.id);
        renderTable(); return;
      }
      if (t.id === 'hdRebuy') doRebuy();
    };
  }

  function doRebuy() {
    const amt = table.buyIn;
    if (!api.wager(amt, false)) { api.toast('잔액이 부족해요'); return; }
    const h = table.seats.find((p) => p.isHero);
    Engine.rebuy(table, h.id, amt);
    saveSession(); api.hud(); renderTable();
  }

  function tryLeave() {
    if (table && table.street !== 'complete' && table.street !== 'idle') {
      api.toast('핸드가 끝난 뒤 퇴장할 수 있어요');
      return;
    }
    if (api.setBusy) api.setBusy(false);
    cashOut();
    if (window.Tables) Tables.leave();
  }

  function mount(el, a) {
    api = a; rootEl = el; view = 'setup'; table = null; cashed = false; selectedTo = 0; clearTimers();
    el.classList.add('hd-root');
    renderSetup();
  }
  function unmount() {
    clearTimers();
    document.querySelectorAll('.hd-fly').forEach((n) => n.remove());
    if (table && !cashed) cashOut();
    table = null; if (rootEl) rootEl.innerHTML = ''; if (api && api.setBusy) api.setBusy(false);
  }
  function help() { if (window.Guides) Guides.open('holdem'); }
  function busy() { return !!(table && table.street !== 'complete' && table.street !== 'idle'); }

  function skipWalletJoin(opts) {
    cashed = true; // 디버그: 지갑 건드리지 않음
    table = Engine.create(Object.assign({ nAI: 6, sb: 25, bb: 50, buyIn: 5000, diff: 'normal', hero: true, heroStack: 5000 }, opts || {}));
    view = 'table';
  }

  function debugSetup() { cashed = true; table = null; view = 'setup'; if (rootEl) renderSetup(); }
  function debugPreflop() {
    skipWalletJoin({ nAI: 6 });
    Engine.startHand(table);
    const heroI = table.seats.findIndex((p) => p.isHero);
    let g = 0;
    while (table.toAct !== heroI && table.street === 'preflop' && g++ < 12) {
      const L = Engine.legal(table, table.toAct);
      Engine.apply(table, table.toAct, L.canCheck ? 'check' : 'fold');
    }
    selectedTo = 0;
    if (api && api.setBusy) api.setBusy(false);
    renderTable('deal');
  }
  function debugShowdown() {
    skipWalletJoin({ nAI: 6, buyIn: 5000 });
    Engine.startHand(table);
    const used = new Set();
    const take = (r, s) => { used.add(r + s); return Cards.card(r, s); };
    const H = table.seats[0];
    H.hole = [take(1, 'h'), take(13, 'h')];
    table.board = [take(10, 'h'), take(7, 'h'), take(2, 'h'), take(5, 's'), take(9, 'c')];
    const pool = [];
    for (const su of Cards.SUITS) for (let r = 1; r <= 13; r++) if (!used.has(r + su)) pool.push(Cards.card(r, su));
    table.seats.forEach((p, i) => {
      if (i === 0) return;
      p.hole = [pool.shift(), pool.shift()];
      p.revealed = true; p.inHand = true; p.folded = false;
    });
    table.seats.forEach((p) => {
      if (p.invested <= 0) { const a = Math.min(200, p.stack); p.invested = a; p.stack -= a; }
      p.folded = false; p.inHand = true;
    });
    Engine.showdown(table);
    if (api && api.setBusy) api.setBusy(false);
    renderTable();
  }
  function debugWin() { debugShowdown(); }

  const UI = { mount, unmount, help, busy, debugWin, debugSetup, debugPreflop, debugShowdown };
  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine, AI: { decide, styleOf, preflopScore }, UI, ACT_KO };
  else {
    root.GAME_DEFS = root.GAME_DEFS || []; root.GAME_DEFS.push(DEF);
    root.GAME_MODS = root.GAME_MODS || {}; root.GAME_MODS.holdem = { DEF, Engine, mount, unmount, help, busy, debugWin, debugSetup, debugPreflop, debugShowdown };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
