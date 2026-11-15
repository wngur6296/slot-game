/* 테이블/카드/인스턴트 하우스 엣지 시뮬/정확 계산
   node scripts/simulate-tables.js
*/
const path = require('path');
const BJ = require(path.join(__dirname, '../js/games/blackjack.js')).Engine;
const RL = require(path.join(__dirname, '../js/games/roulette.js')).Engine;
const BC = require(path.join(__dirname, '../js/games/baccarat.js')).Engine;
const CR = require(path.join(__dirname, '../js/games/crash.js')).Engine;
const PK = require(path.join(__dirname, '../js/games/plinko.js')).Engine;
const MN = require(path.join(__dirname, '../js/games/mines.js')).Engine;
const Cards = require(path.join(__dirname, '../js/cards.js'));

function stat(name, stake, returned, n, extra) {
  const rtp = 100 * returned / stake, he = 100 - rtp;
  console.log(`STAT ${name} n=${n} rtp=${rtp.toFixed(4)} he=${he.toFixed(4)} ${extra || ''}`);
}

// ----- Roulette: exact 1/37 -----
{
  const he = RL.houseEdge();
  console.log(`EXACT roulette he=${(he*100).toFixed(4)} rtp=${((1-he)*100).toFixed(4)} (all standard bets)`);
  let st = 0, ret = 0; const n = 200000, bet = 100;
  for (let i = 0; i < n; i++) {
    const num = RL.spin();
    const bets = { 'red': bet }; // even money
    st += bet; ret += RL.payout(bets, num).returned;
  }
  stat('roulette-red-sim', st, ret, n);
}

// ----- Baccarat: 8-deck shoe sim, standard bets -----
{
  const N = 400000;
  let sh = Cards.shoe(8);
  const acc = { P:{s:0,r:0}, B:{s:0,r:0}, T:{s:0,r:0}, PP:{s:0,r:0}, BP:{s:0,r:0} };
  const bet = 100;
  for (let i = 0; i < N; i++) {
    if (Cards.needShuffle(sh)) sh = Cards.shoe(8);
    const res = BC.play(sh);
    acc.P.s += bet; acc.B.s += bet; acc.T.s += bet; acc.PP.s += bet; acc.BP.s += bet;
    acc.P.r += BC.settle(res, { P: bet });
    acc.B.r += BC.settle(res, { B: bet });
    acc.T.r += BC.settle(res, { T: bet });
    acc.PP.r += BC.settle(res, { PP: bet });
    acc.BP.r += BC.settle(res, { BP: bet });
  }
  for (const k of Object.keys(acc)) stat('baccarat-'+k, acc[k].s, acc[k].r, N);
}

// ----- Blackjack basic strategy -----
{
  const N = 300000, bet = 100;
  let sh = BJ.newShoe(), st = 0, ret = 0, bj = 0;
  for (let i = 0; i < N; i++) {
    if (require('../js/cards.js').needShuffle(sh)) sh = BJ.newShoe();
    const r = BJ.playRound(sh, bet);
    st += r.stake; ret += r.returned; if (r.pBJ) bj++;
  }
  stat('blackjack-basic', st, ret, N, `playerBJ=${(bj/N*100).toFixed(2)}% avgStake=${(st/N).toFixed(2)}`);
}

// ----- Crash: cash at various multipliers -----
{
  const N = 200000, bet = 100;
  for (const c of [1.5, 2, 5, 10]) {
    let st = 0, ret = 0, hits = 0;
    for (let i = 0; i < N; i++) {
      const p = CR.crashPoint(); st += bet;
      if (p > c || (p === c && c === 1)) { /* equal: typically crash at exactly c loses if we need p > c? We cash when live >= auto && live < crash, so need crash > c */ }
      if (p > c) { ret += Math.floor(bet * c); hits++; }
    }
    stat('crash-@'+c+'x', st, ret, N, `hit=${(hits/N).toFixed(4)} theory=${((1-CR.EDGE)*100).toFixed(2)}`);
  }
  console.log(`EXACT crash he=${(CR.EDGE*100).toFixed(2)} rtp=${((1-CR.EDGE)*100).toFixed(2)} (any cashout)`);
}

// ----- Plinko exact -----
{
  const comb = (n,k)=>{ if(k<0||k>n)return 0; if(k>n-k)k=n-k; let r=1; for(let i=1;i<=k;i++) r=r*(n-k+i)/i; return r; };
  for (const rows of [8,12,16]) for (const risk of ['lo','mid','hi']) {
    const M = PK.MULT[rows][risk], tot = 2 ** rows;
    let ev = 0; for (let k = 0; k <= rows; k++) ev += comb(rows, k) / tot * M[k];
    console.log(`EXACT plinko-${rows}-${risk} rtp=${(ev*100).toFixed(3)} he=${((1-ev)*100).toFixed(3)}`);
  }
  const N = 100000, bet = 100; let st=0,ret=0;
  for (let i=0;i<N;i++){ const {bin}=PK.path(12); st+=bet; ret+=PK.pay(12,'mid',bin,bet); }
  stat('plinko-12-mid-sim', st, ret, N);
}

// ----- Mines exact (cash after k gems) -----
{
  for (const mines of [3,5,10]) for (const gems of [1,3,5]) {
    const m = MN.mult(mines, gems);
    // P(survive k gems) * m  = C(25-m,k)/C(25,k) * fair * 0.97 = 0.97
    const p = MN.comb(25-mines, gems) / MN.comb(25, gems);
    const ev = p * m;
    console.log(`EXACT mines-m${mines}-g${gems} pSurvive=${p.toFixed(4)} mult=${m.toFixed(4)} rtp=${(ev*100).toFixed(3)} he=${((1-ev)*100).toFixed(3)}`);
  }
}
