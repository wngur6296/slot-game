// RTP(환수율)·당첨률 시뮬레이션: node scripts/simulate.js [스핀수]
// 게임과 똑같은 js/engine.js + js/config.js 를 사용합니다. (프리스핀·연승배수 포함)
const C = require('../js/config.js'); const { createEngine, makeRng } = require('../js/engine.js');
const N = +process.argv[2] || 3_000_000; const bet = 100;
// 버프 시뮬: LUCK=1 (행운의 부적 상시), BOOST=1 (2배 부스터 상시)
const SHOP = require('../js/shop-config.js'); const LUCK = !!process.env.LUCK, BOOST = !!process.env.BOOST;
const E = createEngine(C, makeRng(12345));
let wagered = 0, won = 0, hits = 0, spins = 0, fsTrig = 0, jackpots = 0, near = 0, streak = 0, big = 0, mega = 0, maxWin = 0;
const bySym = {};
function play(free) {
  let { grid } = E.spin(); let r = E.evaluate(grid, bet, { freeSpin: free });
  if (LUCK && !free && r.total === 0 && Math.random() < SHOP.luckRerollChance) { grid = E.spin().grid; r = E.evaluate(grid, bet, { freeSpin: free }); }
  if (E.nearMiss(grid)) near++;
  let win = r.total * r.mult * (BOOST && !free ? 2 : 1);
  if (win > 0) { streak++; win = Math.round(win * E.streakMult(streak)); } else streak = 0;
  if (win > 0) hits++;
  if (win >= bet * C.winTiers.mega) mega++; else if (win >= bet * C.winTiers.big) big++;
  if (r.jackpot) jackpots++;
  for (const w of r.wins) bySym[w.sym] = (bySym[w.sym] || 0) + w.pay * r.mult;
  maxWin = Math.max(maxWin, win); won += win; return r.freeSpins;
}
for (let i = 0; i < N; i++) {
  wagered += bet; spins++; let fs = play(false);
  if (fs) { fsTrig++; while (fs > 0) { fs--; fs += play(true); } }
}
const pct = (x) => (100 * x).toFixed(2) + '%';
console.log(`스핀 ${N.toLocaleString()}회 (베팅 ${bet})`);
console.log(`RTP(환수율): ${pct(won / wagered)}`);
console.log(`당첨률(유료 스핀 기준 아님, 전체 스핀 중 당첨): ${pct(hits / N)}`);
console.log(`프리스핀 발동: 1/${(N / fsTrig).toFixed(0)}  잭팟: 1/${(N / Math.max(1, jackpots)).toFixed(0)}`);
console.log(`빅윈 1/${(N / big).toFixed(0)}  메가윈+ 1/${(N / Math.max(1, mega)).toFixed(0)}  니어미스 연출 ${pct(near / N)}  최대당첨 ${maxWin / bet}x`);
console.log('심볼별 RTP 기여:', Object.fromEntries(Object.entries(bySym).map(([k, v]) => [k, pct(v / wagered)])));
