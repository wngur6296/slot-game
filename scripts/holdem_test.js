const assert = require('assert');
const Cards = require('../js/cards.js');
const Eval = require('../js/games/holdem-eval.js');
const { Engine } = require('../js/games/holdem.js');

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

// ---- HU blinds: button is SB, acts first preflop ----
{
  const t = Engine.create({ nAI: 2, hero: false, sb: 50, bb: 100, buyIn: 2000, rng: mulberry32(1) });
  // create with nAI:2 means 2 seats all AI
  Engine.startHand(t);
  ok(t.seats.length === 2, 'HU seats 2 got '+t.seats.length);
  ok(t.sbI === t.button, 'HU button is SB btn='+t.button+' sb='+t.sbI+' bb='+t.bbI);
  ok(t.toAct === t.button, 'HU preflop button acts first toAct='+t.toAct);
  ok(t.seats[t.sbI].streetBet === 50, 'SB posted 50');
  ok(t.seats[t.bbI].streetBet === 100, 'BB posted 100');
  // postflop first is BB (left of button)
  Engine.apply(t, t.toAct, 'call');
  Engine.apply(t, t.toAct, 'check'); // BB option
  ok(t.street === 'flop', 'after limp-check -> flop, street='+t.street);
  ok(t.toAct === t.bbI, 'postflop BB acts first toAct='+t.toAct+' bb='+t.bbI);
}

// ---- 6-max blinds order ----
{
  const t = Engine.create({ nAI: 6, hero: false, sb: 25, bb: 50, buyIn: 5000, rng: mulberry32(2) });
  Engine.startHand(t);
  ok(t.seats.length === 6, '6max seats');
  ok(t.sbI !== t.button && t.bbI !== t.button, '6max blinds not button');
  const leftOfBtn = (t.button + 1) % 6;
  ok(t.sbI === leftOfBtn, 'SB is left of button');
  ok(t.bbI === (t.button + 2) % 6, 'BB is left of SB');
  ok(t.toAct === (t.button + 3) % 6, 'UTG acts first preflop toAct='+t.toAct);
}

// ---- min-raise: incomplete all-in does not reopen ----
{
  const t = Engine.create({ nAI: 3, hero: false, sb: 50, bb: 100, buyIn: 10000, rng: mulberry32(3) });
  // stacks: A big, B short, C big — we'll set after start
  Engine.startHand(t);
  // fold any extra? 3 players: button, SB, BB. Preflop first is button.
  const utg = t.toAct;
  // UTG raises to 300 (full raise of 200)
  Engine.apply(t, utg, 'raise', 300);
  ok(t.currentBet === 300 && t.minRaise === 200, 'raise to 300 minRaise 200  cur='+t.currentBet+' mr='+t.minRaise);
  // next player short all-in 400 (raise 100, incomplete)
  const nxt = t.toAct;
  t.seats[nxt].stack = 100 + (300 - t.seats[nxt].streetBet); // can go to 400? streetBet might be 0 or 50/100
  // set stack so maxTo = 400
  t.seats[nxt].stack = 400 - t.seats[nxt].streetBet;
  const L = Engine.legal(t, nxt);
  ok(L.canRaise && L.maxTo === 400, 'short can shove to 400 maxTo='+L.maxTo+' minTo='+L.minTo+' live='+t.seats[nxt].live);
  Engine.apply(t, nxt, 'raise', 400);
  ok(t.currentBet === 400, 'currentBet 400 after short');
  ok(t.minRaise === 200, 'minRaise stays 200 after incomplete, got '+t.minRaise);
  // last full raiser (utg) should not be able to re-raise, only call/fold
  // there may be a third player first
  // after short, next might be BB then UTG
  let guard=0;
  while (t.toAct !== utg && t.street==='preflop' && guard++<5) {
    const L2 = Engine.legal(t, t.toAct);
    if (L2.canCall) Engine.apply(t, t.toAct, 'call');
    else Engine.apply(t, t.toAct, 'check');
  }
  if (t.toAct === utg) {
    const Lu = Engine.legal(t, utg);
    ok(!Lu.canRaise && Lu.canCall, 'UTG cannot reraise incomplete shove canRaise='+Lu.canRaise+' canCall='+Lu.canCall+' live='+t.seats[utg].live);
  } else {
    ok(false, 'did not return to UTG, toAct='+t.toAct+' street='+t.street);
  }
}

// ---- side pot settle via showdown ----
{
  const t = Engine.create({ nAI: 3, hero: false, sb: 50, bb: 100, buyIn: 200, rng: mulberry32(4) });
  // stacks 50, 100, 200 after create all 200 — set before start
  t.seats[0].stack = 50; t.seats[1].stack = 100; t.seats[2].stack = 200;
  const start = Engine.chipsOf(t);
  Engine.startHand(t);
  // shove everyone
  let g=0;
  while (t.street !== 'complete' && g++<40) {
    const L = Engine.legal(t, t.toAct);
    if (L.canRaise) Engine.apply(t, t.toAct, 'raise', L.maxTo);
    else if (L.canCall) Engine.apply(t, t.toAct, 'call');
    else Engine.apply(t, t.toAct, 'check');
  }
  ok(t.street === 'complete', 'all-in hand completed g='+g+' stuck='+t.stuck);
  ok(Engine.chipsOf(t) === start, 'side-pot chips conserved '+Engine.chipsOf(t)+' vs '+start+' stacks='+t.seats.map(p=>p.stack).join(','));
  ok(t.board.length === 5, 'runout 5 cards');
}

// ---- split pot conservation ----
{
  const t = Engine.create({ nAI: 2, hero: false, sb: 50, bb: 100, buyIn: 1000, rng: mulberry32(5) });
  Engine.startHand(t);
  t.seats[0].hole = [Cards.card(1,'s'), Cards.card(1,'h')];
  t.seats[1].hole = [Cards.card(1,'d'), Cards.card(1,'c')];
  t.board = [Cards.card(10,'s'), Cards.card(9,'h'), Cards.card(2,'d'), Cards.card(3,'c'), Cards.card(7,'s')];
  t.seats[0].invested = 500; t.seats[1].invested = 500;
  t.seats[0].stack = 500; t.seats[1].stack = 500;
  t.seats[0].folded = false; t.seats[1].folded = false;
  t.seats[0].inHand = true; t.seats[1].inHand = true;
  Engine.showdown(t);
  ok(t.seats[0].stack === 1000 && t.seats[1].stack === 1000, 'split 1000 each '+t.seats.map(p=>p.stack).join(','));
  ok(t.seats[0].invested === 0 && t.seats[1].invested === 0, 'invested cleared');
}

// ---- thousands of AI-only hands, chip conservation, no stuck ----
function sim(nHands, nAI, seed, rebuy) {
  const rng = mulberry32(seed);
  const buy = 5000, sb = 25, bb = 50;
  const t = Engine.create({ nAI, hero: false, sb, bb, buyIn: buy, diff: 'normal', rng });
  const start = Engine.chipsOf(t);
  let stuck = 0, done = 0, bad = 0, injected = 0, removed = 0;
  for (let i = 0; i < nHands; i++) {
    if (t.seats.filter((p) => p.stack > 0).length < 2) {
      if (!rebuy) break;
      t.seats.forEach((p) => { if (p.stack <= 0) { Engine.rebuy(t, p.id, buy) || ((t.street='complete'), Engine.rebuy(t, p.id, buy)); } });
    }
    if (rebuy) {
      t.street = 'complete';
      t.seats.forEach((p) => { if (p.stack <= 0) Engine.rebuy(t, p.id, buy); });
    }
    Engine.runHand(t, 600);
    done++;
    if (t.stuck) stuck++;
    const cur = Engine.chipsOf(t);
    const expect = start + t.injected - t.removed;
    if (cur !== expect) { bad++; if (bad <= 3) console.log('  leak hand', i, 'cur', cur, 'expect', expect, 'stacks', t.seats.map(p=>p.stack+'+'+p.invested), t.stuckAt); }
    // prevent NaN
    if (t.seats.some((p) => !Number.isFinite(p.stack))) { bad++; break; }
  }
  return { done, stuck, bad, start, end: Engine.chipsOf(t), injected: t.injected, removed: t.removed };
}

{
  const r = sim(3000, 6, 42, true);
  ok(r.stuck === 0, '3000 x 6max no stuck: '+r.stuck+' / '+r.done);
  ok(r.bad === 0, '3000 x 6max chips conserved leaks='+r.bad+' end='+r.end+' inj='+r.injected);
  console.log('  sim6', JSON.stringify(r));
}
{
  const r = sim(2000, 2, 7, true);
  ok(r.stuck === 0 && r.bad === 0, '2000 HU conserved stuck='+r.stuck+' leak='+r.bad+' done='+r.done);
  console.log('  simHU', JSON.stringify(r));
}
{
  const r = sim(1500, 8, 99, true);
  ok(r.stuck === 0 && r.bad === 0, '1500 x 9? nAI8 conserved stuck='+r.stuck+' leak='+r.bad+' done='+r.done+' seats should be 8');
  console.log('  sim8', JSON.stringify(r));
}


// ---- busted seats must still get exactly 2 hole cards (not 4) ----
{
  for (const [nAI, bust] of [[6,1],[8,2],[3,1]]) {
    const t = Engine.create({ nAI, hero: false, sb: 25, bb: 50, buyIn: 500, rng: mulberry32(800 + nAI + bust) });
    const start = Engine.chipsOf(t);
    for (let i = 0; i < bust; i++) t.seats[i].stack = 0;
    const afterBust = Engine.chipsOf(t);
    Engine.startHand(t);
    const bad = t.seats.filter((p) => (p.inHand && p.hole.length !== 2) || (!p.inHand && p.hole.length !== 0));
    ok(bad.length === 0, 'deal 2 cards with '+bust+' busted in '+nAI+'max: '+t.seats.map((p)=>p.hole.length).join(','));
    ok(Engine.chipsOf(t) === afterBust, 'deal with busted conserves chips');
  }
}

console.log(fail ? 'FAILED '+fail : 'ALL ENGINE TESTS PASSED');
process.exit(fail ? 1 : 0);
