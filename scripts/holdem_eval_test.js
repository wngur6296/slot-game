const E = require('../js/games/holdem-eval.js');
const Cards = require('../js/cards.js');
const C = (r,s) => Cards.card(r,s);
let fail=0;
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fail++; };

// classic 5-card
ok(E.bestOf([C(1,'s'),C(13,'s'),C(12,'s'),C(11,'s'),C(10,'s')]).cat===E.CAT.ROYAL, 'royal');
ok(E.bestOf([C(9,'h'),C(8,'h'),C(7,'h'),C(6,'h'),C(5,'h')]).key[1]===9, 'sf 9');
ok(E.bestOf([C(1,'s'),C(5,'h'),C(4,'d'),C(3,'c'),C(2,'s')]).cat===E.CAT.STRAIGHT && E.bestOf([C(1,'s'),C(5,'h'),C(4,'d'),C(3,'c'),C(2,'s')]).key[1]===5, 'wheel straight');
ok(E.bestOf([C(7,'s'),C(7,'h'),C(7,'d'),C(7,'c'),C(2,'s')]).cat===E.CAT.QUADS, 'quads');
ok(E.bestOf([C(7,'s'),C(7,'h'),C(7,'d'),C(2,'c'),C(2,'s')]).cat===E.CAT.FULL, 'boat');
ok(E.bestOf([C(2,'h'),C(5,'h'),C(9,'h'),C(11,'h'),C(13,'h')]).cat===E.CAT.FLUSH, 'flush');
ok(E.bestOf([C(10,'s'),C(9,'h'),C(8,'d'),C(7,'c'),C(6,'s')]).cat===E.CAT.STRAIGHT && E.bestOf([C(10,'s'),C(9,'h'),C(8,'d'),C(7,'c'),C(6,'s')]).key[1]===10, '10-straight');
ok(E.bestOf([C(8,'s'),C(8,'h'),C(8,'d'),C(3,'c'),C(2,'s')]).cat===E.CAT.TRIPS, 'trips');
ok(E.bestOf([C(8,'s'),C(8,'h'),C(3,'d'),C(3,'c'),C(2,'s')]).key[1]===8 && E.bestOf([C(8,'s'),C(8,'h'),C(3,'d'),C(3,'c'),C(2,'s')]).key[2]===3, 'two pair kickers');
ok(E.bestOf([C(1,'s'),C(1,'h'),C(13,'d'),C(12,'c'),C(2,'s')]).cat===E.CAT.PAIR && E.bestOf([C(1,'s'),C(1,'h'),C(13,'d'),C(12,'c'),C(2,'s')]).key[1]===14, 'aces pair');

// kickers: AAKK9 vs AAKK8
const a=E.bestOf([C(1,'s'),C(1,'h'),C(13,'d'),C(13,'c'),C(9,'s')]);
const b=E.bestOf([C(1,'d'),C(1,'c'),C(13,'s'),C(13,'h'),C(8,'s')]);
ok(E.compareKeys(a.key,b.key)>0, 'two pair kicker 9>8');

// 7-card: full house beats flush
const fh=E.bestOf([C(9,'s'),C(9,'h'),C(9,'d'),C(2,'c'),C(2,'s'),C(3,'h'),C(5,'h')]);
ok(fh.cat===E.CAT.FULL, '7c boat');
const fl=E.bestOf([C(2,'h'),C(5,'h'),C(7,'h'),C(9,'h'),C(11,'h'),C(1,'s'),C(3,'d')]);
ok(fl.cat===E.CAT.FLUSH, '7c flush');
ok(E.compareKeys(fh.key, fl.key)>0, 'boat > flush');

// 7-card broadway with extra
const br=E.bestOf([C(1,'s'),C(13,'h'),C(12,'d'),C(11,'c'),C(10,'s'),C(2,'d'),C(3,'h')]);
ok(br.cat===E.CAT.STRAIGHT && br.key[1]===14, '7c broadway');

// 7-card wheel + pair doesn't break wheel
const wh=E.bestOf([C(1,'s'),C(2,'h'),C(3,'d'),C(4,'c'),C(5,'s'),C(5,'d'),C(9,'h')]);
ok(wh.cat===E.CAT.STRAIGHT && wh.key[1]===5, '7c wheel over pair of 5s? wait pair+straight should be straight');
// actually 5,5,4,3,2,A,9 = straight A-5 is better than pair. yes.

// SF in 7 over higher flush
const sf=E.bestOf([C(5,'s'),C(6,'s'),C(7,'s'),C(8,'s'),C(9,'s'),C(1,'s'),C(13,'s')]);
ok(sf.cat===E.CAT.SFLUSH && sf.key[1]===9, '7c sf 9 not nut flush A');

// quads kicker
const q1=E.bestOf([C(8,'s'),C(8,'h'),C(8,'d'),C(8,'c'),C(1,'s'),C(13,'h'),C(2,'d')]);
ok(q1.key[2]===14, 'quads ace kicker from 7');

// side pots: A 50, B 100, C 200 all in, none folded
const pots=E.sidePots([
  {id:0, invested:50, folded:false},
  {id:1, invested:100, folded:false},
  {id:2, invested:200, folded:false},
]);
ok(pots.length===3, '3 side pot layers '+pots.length);
ok(pots[0].amount===150 && pots[0].seats.join()==='0,1,2', 'main 150 all three '+JSON.stringify(pots[0]));
ok(pots[1].amount===100 && pots[1].seats.join()==='1,2', 'side 100 B+C '+JSON.stringify(pots[1]));
ok(pots[2].amount===100 && pots[2].seats.join()==='2', 'dead/uncalled 100 C '+JSON.stringify(pots[2]));

// folded player still contributes but not eligible
const p2=E.sidePots([
  {id:0, invested:100, folded:true},
  {id:1, invested:100, folded:false},
  {id:2, invested:100, folded:false},
]);
ok(p2[0].amount===300 && p2[0].seats.join()==='1,2', 'folded not eligible '+JSON.stringify(p2[0]));

// split pot settle
const board=[C(10,'s'),C(9,'h'),C(2,'d'),C(3,'c'),C(7,'s')];
const stl=E.settlePots([
  {id:0, invested:100, folded:false, hole:[C(1,'s'),C(1,'h')]},
  {id:1, invested:100, folded:false, hole:[C(1,'d'),C(1,'c')]},
], board);
ok(stl[0].winners.length===2 && stl[0].share===100, 'split aces '+JSON.stringify(stl[0].winners)+' share='+stl[0].share);

// AA vs KK
const st2=E.settlePots([
  {id:0, invested:80, folded:false, hole:[C(1,'s'),C(1,'h')]},
  {id:1, invested:80, folded:false, hole:[C(13,'d'),C(13,'c')]},
], [C(2,'s'),C(4,'h'),C(6,'d'),C(8,'c'),C(10,'s')]);
ok(st2[0].winners.join()==='0' && st2[0].share===160, 'AA beats KK');

// equity sanity: AA vs 1 random, should be ~85%
const eq=E.equity([C(1,'s'),C(1,'h')], [], 1, [], 800, Math.random);
ok(eq>0.75 && eq<0.95, 'AA equity vs 1 ~85 got '+eq.toFixed(3));

console.log(fail? 'FAILED '+fail : 'ALL EVAL TESTS PASSED');
process.exit(fail?1:0);
