// RTP(환수율)·당첨률 시뮬레이션: node scripts/simulate.js [스핀수]
// 게임과 똑같은 js/engine.js + js/config.js 를 사용합니다. (프리스핀·연승배수 포함)
// 사용법: node scripts/simulate.js [슬롯ID|all] [스핀수]   예) node scripts/simulate.js bunny 2000000
const BASE = require('../js/config.js'); const { createEngine, makeRng } = require('../js/engine.js');
const fs = require('fs'), path = require('path');
const IDS = fs.readdirSync(path.join(__dirname, '../js/slots')).map((f) => f.replace('.js', ''));
const arg = process.argv[2] || 'all'; const N = +process.argv[3] || 2_000_000;
if (arg === 'all') { for (const id of IDS) require('child_process').execFileSync(process.execPath, [__filename, id, String(N)], { stdio: 'inherit', env: process.env }); process.exit(0); }
const DEF = require('../js/slots/' + arg + '.js');
const C = Object.assign({}, BASE, { mixPay: 0, twoKind: {}, features: {} }, DEF);
const K = +process.env.PAYSCALE || 1; // 튜닝용: 배당 일괄 배율
if (K !== 1) { C.paytable = Object.fromEntries(Object.entries(C.paytable).map(([k, v]) => [k, v * K])); C.mixPay *= K; C.twoKind = Object.fromEntries(Object.entries(C.twoKind).map(([k, v]) => [k, v * K])); }
const bet = DEF.features.progressive ? DEF.features.progressive.refBet : 100;
const PG = DEF.features.progressive; let pool = PG ? PG.seed : 0, poolPaid = 0, poolSeeded = PG ? PG.seed : 0, sumSq = 0;
// 버프 시뮬: LUCK=1 (행운의 부적 상시), BOOST=1 (2배 부스터 상시)
const SHOP = require('../js/shop-config.js'); const LUCK = !!process.env.LUCK, BOOST = !!process.env.BOOST;
const E = createEngine(C, makeRng(12345));
let spinWin = 0; let wagered = 0, won = 0, hits = 0, spins = 0, fsTrig = 0, jackpots = 0, near = 0, streak = 0, big = 0, mega = 0, maxWin = 0;
const bySym = {};
function play(free) {
  let { grid } = E.spin(); let r = E.evaluate(grid, bet, { freeSpin: free });
  if (LUCK && !free && r.total === 0 && Math.random() < SHOP.luckRerollChance) { grid = E.spin().grid; r = E.evaluate(grid, bet, { freeSpin: free }); }
  if (E.nearMiss(grid)) near++;
  let win = r.total * r.mult * (BOOST && !free ? 2 : 1);
  if (PG && !free) pool += bet * PG.contrib;
  if (r.progressive) { const p = Math.floor(pool * Math.min(1, bet / PG.refBet)); win += p; poolPaid += p; pool -= p; if (pool < PG.seed) { poolSeeded += PG.seed - pool; pool = PG.seed; } }
  if (win > 0) { streak++; win = Math.round(win * E.streakMult(streak)); } else streak = 0;
  if (win > 0) hits++;
  if (win >= bet * C.winTiers.mega) mega++; else if (win >= bet * C.winTiers.big) big++;
  if (r.jackpot) jackpots++;
  for (const w of r.wins) bySym[w.sym] = (bySym[w.sym] || 0) + w.pay * r.mult;
  maxWin = Math.max(maxWin, win); won += win; spinWin += win; return r.freeSpins;
}
for (let i = 0; i < N; i++) {
  wagered += bet; spins++; spinWin = 0; let fs = play(false);
  if (fs) { fsTrig++; while (fs > 0) { fs--; fs += play(true); } }
  sumSq += (spinWin / bet) ** 2;
}
const pct = (x) => (100 * x).toFixed(2) + '%';
const rtp = won / wagered, sd = Math.sqrt(sumSq / N - rtp * rtp);
console.log(`\n=== ${DEF.name} (${arg}) === 스핀 ${N.toLocaleString()}회 (베팅 ${bet})`);
console.log(`표준편차(변동성): ${sd.toFixed(2)}  ${PG ? `누적잭팟 지급 비중 ${(100 * poolPaid / wagered).toFixed(2)}% (시드 보충 ${(100 * (poolSeeded - PG.seed) / wagered).toFixed(2)}%)` : ''}`);
console.log(`RTP(환수율): ${pct(won / wagered)}`);
console.log(`당첨률(유료 스핀 기준 아님, 전체 스핀 중 당첨): ${pct(hits / N)}`);
console.log(`STAT ${arg} rtp=${(100 * rtp).toFixed(2)} hit=${(100 * hits / N).toFixed(2)} sd=${sd.toFixed(2)} fs=${(N / fsTrig).toFixed(0)} jp=${(N / Math.max(1, jackpots)).toFixed(0)} max=${maxWin / bet}`);
console.log(`프리스핀 발동: 1/${(N / fsTrig).toFixed(0)}  잭팟: 1/${(N / Math.max(1, jackpots)).toFixed(0)}`);
console.log(`빅윈 1/${(N / big).toFixed(0)}  메가윈+ 1/${(N / Math.max(1, mega)).toFixed(0)}  니어미스 연출 ${pct(near / N)}  최대당첨 ${maxWin / bet}x`);
console.log('심볼별 RTP 기여:', Object.fromEntries(Object.entries(bySym).map(([k, v]) => [k, pct(v / wagered)])));
