/* 유럽식 룰렛 (0–36, 37포켓). 인사이드/아웃사이드 베팅, 휠+볼 연출, 핫/콜드 */
(function (root) {
  const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const color = (n) => n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';
  const DEF = {
    id: 'roulette', name: '유럽 룰렛', level: 2, minBetIdx: 0, order: 21,
    cats: ['table', 'live'], kind: 'table',
    theme: { bgm: 'table_loop', cover: 'g_roulette', vars: { f1: '#d4af6a', f2: '#0b3d1e' } },
    lobby: { blurb: '유럽식 37포켓 · 인·아웃사이드 베팅', rtp: 97.30, volatility: 3, tag: '테이블',
      pros: ['모든 표준 베팅 하우스 엣지 동일 2.70%', '다양한 인·아웃사이드 베팅', '최근 번호·핫/콜드'],
      cons: ['0 때문에 짝/홀·레드/블랙도 2.70% 엣지', '한 판에 여러 칩을 올려야 함'],
      features: ['유럽식 37포켓', '인사이드/아웃사이드', '리벳'] }
  };

  // 스팟 키와 당첨 번호 → 배당(순수 배수, 원금 별도). 지불 = 판돈 * (odds+1)
  function covers(spot) {
    const [t, a, b, c, d] = String(spot).split(/[:-]/);
    const n = (...x) => x.map(Number);
    if (t === 'n') return { nums: n(a), odds: 35 };
    if (t === 'sp') return { nums: n(a, b), odds: 17 };
    if (t === 'st') return { nums: n(a, b, c), odds: 11 };          // street 3
    if (t === 'cr') return { nums: n(a, b, c, d), odds: 8 };        // corner 4
    if (t === 'six') return { nums: n(a, b, c).concat(n(a,b,c).map((x)=>x+3)), odds: 5 };
    if (t === 'col') { const k = +a; return { nums: range(k, 36, 3), odds: 2 }; }
    if (t === 'doz') { const k = +a; return { nums: range((k-1)*12+1, k*12, 1), odds: 2 }; }
    if (t === 'red') return { nums: [...REDS], odds: 1 };
    if (t === 'blk') return { nums: range(1,36,1).filter((x)=>!REDS.has(x)), odds: 1 };
    if (t === 'odd') return { nums: range(1,36,1).filter((x)=>x%2), odds: 1 };
    if (t === 'even') return { nums: range(1,36,1).filter((x)=>x%2===0), odds: 1 };
    if (t === 'lo') return { nums: range(1,18,1), odds: 1 };
    if (t === 'hi') return { nums: range(19,36,1), odds: 1 };
    return { nums: [], odds: 0 };
  }
  function range(a,b,s){ const o=[]; for(let i=a;i<=b;i+=s)o.push(i); return o; }
  function spin(rng) { return Math.floor((rng||Math.random)()*37); }
  function payout(bets, n) { // bets: {spot: amount}
    let ret = 0, hits = [];
    Object.entries(bets).forEach(([sp, amt]) => {
      const c = covers(sp);
      if (c.nums.includes(n)) { ret += amt * (c.odds + 1); hits.push(sp); }
    });
    return { returned: ret, hits };
  }
  function houseEdge() { return 1 / 37; } // 정확히 2.7027...%
  const Engine = { ORDER, color, covers, spin, payout, houseEdge, REDS };

  let api, el, st, tmr=[], raf;
  const wait = (ms) => new Promise((r) => tmr.push(setTimeout(r, ms)));
  function mount(root, a) {
    api = a; el = root;
    const hist = (a.E.s.rouletteHist || []).slice();
    st = { phase: 'bet', chip: a.minBet, bets: {}, last: hist, spin: null, ang: 0, ball: 180, ballR: 86, msg: '칩을 고르고 테이블에 올려 주세요' };
    render();
  }
  function unmount() { tmr.forEach(clearTimeout); tmr=[]; cancelAnimationFrame(raf); el=null; api&&api.setBusy(false); }
  function busy() { return st && st.phase === 'spin'; }
  function help() {
    api.help(`<h2>🎡 유럽 룰렛 규칙</h2>
      <p>0부터 36까지 <b>37포켓</b>. 미국식(00)이 없어 하우스 엣지가 더 낮습니다. 모든 표준 베팅의 이론 엣지는 <b>2.70%</b> (RTP 97.30%)로 동일합니다.</p>
      <ul>
        <li><b>스트레이트</b> 한 번호 35:1 · <b>스플릿</b> 두 번호 17:1 · <b>스트리트</b> 세 번호 11:1</li>
        <li><b>코너</b> 네 번호 8:1 · <b>식스라인</b> 여섯 번호 5:1</li>
        <li><b>더즌/컬럼</b> 2:1 · <b>레드/블랙, 홀/짝, 1–18/19–36</b> 1:1 (0이면 패배)</li>
      </ul>
      <p>번호를 탭하면 스트레이트, 칸 모서리·경계를 탭하면 스플릿/코너/스트리트가 올라갑니다. 리벳은 직전 베팅을 다시 올립니다.</p>`);
  }
  function totalBet() { return Object.values(st.bets).reduce((s, v) => s + v, 0); }
  function addBet(sp) {
    if (st.phase !== 'bet') return;
    const next = totalBet() + st.chip;
    if (next > api.E.s.coins) return api.toast('잔액이 부족해요');
    st.bets[sp] = (st.bets[sp] || 0) + st.chip; Audio2.play('chip'); renderBoard();
  }
  function histBar() {
    const h = st.last.slice(-16);
    return `<div class="rl-hist">${h.map((n) => `<i class="${color(n)}">${n}</i>`).join('') || '<em>아직 기록이 없어요</em>'}</div>`;
  }
  function hotcold() {
    const h = st.last.slice(-100);
    if (h.length < 10) return '';
    const cnt = Array(37).fill(0); h.forEach((n) => cnt[n]++);
    const ord = cnt.map((c, n) => ({ n, c })).sort((a, b) => b.c - a.c);
    const hot = ord.slice(0, 5), cold = ord.filter((x) => x.n).slice(-5).reverse();
    return `<div class="rl-hc"><span>HOT ${hot.map((x)=>x.n).join(' ')}</span><span>COLD ${cold.map((x)=>x.n).join(' ')}</span></div>`;
  }
  function wheelSVG() {
    const r = 100, cx = 110, cy = 110, inner = 42;
    let path = '';
    ORDER.forEach((n, i) => {
      const a0 = (i / 37) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / 37) * 2 * Math.PI - Math.PI / 2;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const xi0 = cx + inner * Math.cos(a0), yi0 = cy + inner * Math.sin(a0);
      const xi1 = cx + inner * Math.cos(a1), yi1 = cy + inner * Math.sin(a1);
      const col = color(n) === 'green' ? '#0a7a3e' : color(n) === 'red' ? '#c4122f' : '#1a1a1a';
      path += `<path d="M${xi0} ${yi0}L${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}L${xi1} ${yi1}A${inner} ${inner} 0 0 0 ${xi0} ${yi0}" fill="${col}"/>`;
      const am = (i + 0.5) / 37 * 2 * Math.PI - Math.PI / 2, tx = cx + 78 * Math.cos(am), ty = cy + 78 * Math.sin(am);
      path += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="7" font-weight="700" transform="rotate(${(i+0.5)/37*360},${tx},${ty})">${n}</text>`;
    });
    return `<svg viewBox="0 0 220 220" class="rl-svg">${path}<circle cx="110" cy="110" r="38" fill="#5a3408"/><circle cx="110" cy="110" r="22" fill="#d4af6a"/><circle cx="110" cy="110" r="6" fill="#2a1500"/></svg>`;
  }
  function cell(n) {
    const amt = st.bets['n-' + n];
    return `<button class="rl-n ${color(n)} ${st.spin===n?'hit':''}" data-sp="n-${n}">${n}${amt?`<b>${chipTxt(amt)}</b>`:''}
      ${n ? edgeHits(n) : ''}</button>`;
  }
  function edgeHits(n) {
    // 오른쪽 이웃(n+3) 스플릿, 위(n+1 if same col group) 등
    const bits = [];
    if (n + 3 <= 36) bits.push(`<i class="hit-e" data-sp="sp-${n}-${n+3}"></i>`);
    if (n % 3 !== 0) bits.push(`<i class="hit-n" data-sp="sp-${n}-${n+1}"></i>`);
    if (n % 3 !== 0 && n + 3 <= 36) bits.push(`<i class="hit-c" data-sp="cr-${n}-${n+1}-${n+3}-${n+4}"></i>`);
    if (n % 3 === 1) bits.push(`<i class="hit-s" data-sp="st-${n}-${n+1}-${n+2}"></i>`);
    return bits.join('');
  }
  function chipTxt(v) { return v >= 1000 ? (v/1000).toFixed(v%1000?1:0)+'K' : String(v); }
  function badge(sp) { const a = st.bets[sp]; return a ? `<b>${chipTxt(a)}</b>` : ''; }
  function board() {
    const cols = [3,2,1].map((start) => {
      let h = ''; for (let n = start; n <= 36; n += 3) h += cell(n);
      return `<div class="rl-row">${h}<button class="rl-out" data-sp="col-${start}">2:1${badge('col-'+start)}</button></div>`;
    }).join('');
    return `<div class="rl-table">
      <button class="rl-0 ${color(0)} ${st.spin===0?'hit':''}" data-sp="n-0">0${badge('n-0')}</button>
      <div class="rl-grid">${cols}</div>
      <div class="rl-doz">${[[1,'1–12'],[2,'13–24'],[3,'25–36']].map(([d,l])=>`<button class="rl-out" data-sp="doz-${d}">${l}${badge('doz-'+d)}</button>`).join('')}</div>
      <div class="rl-outrow">
        <button class="rl-out" data-sp="lo">1–18${badge('lo')}</button>
        <button class="rl-out" data-sp="even">EVEN${badge('even')}</button>
        <button class="rl-out red" data-sp="red">RED${badge('red')}</button>
        <button class="rl-out black" data-sp="blk">BLACK${badge('blk')}</button>
        <button class="rl-out" data-sp="odd">ODD${badge('odd')}</button>
        <button class="rl-out" data-sp="hi">19–36${badge('hi')}</button>
      </div>
    </div>`;
  }
  function render() {
    if (!el || !el.isConnected) return;
    const L = api.levels.filter((n)=>n>=api.minBet).slice(0,7);
    el.innerHTML = `<div class="felt felt-rl">
      <div class="rl-top">
        <div class="wheel-3d"><div class="wheel-rot" id="rlWheel" style="transform:rotateX(55deg) rotateZ(${st.ang}deg)">${wheelSVG()}<div class="rl-ball" id="rlBall"></div></div>
          <div class="rl-pointer" aria-hidden="true"></div></div>
        <div class="rl-res" id="rlRes">${st.spin==null?'—':st.spin}</div>
      </div>
      ${histBar()}${hotcold()}
      <div class="rl-board" id="rlBoard">${board()}</div>
      <div class="rl-bar">
        <div class="tb-chips">${L.map((n)=>`<button class="chipv ${st.chip===n?'on':''}" data-chip="${n}">${api.fmt(n)}</button>`).join('')}</div>
        <div class="rl-tot">베팅 <b>${api.fmt(totalBet())}</b></div>
        <div class="bj-btns">
          <button class="tba ghost" id="rlClear" ${st.phase!=='bet'?'disabled':''}>지우기</button>
          <button class="tba ghost" id="rlRebet" ${st.phase!=='bet'||!st.prev?'disabled':''}>리벳</button>
          <button class="tba deal" id="rlSpin" ${st.phase!=='bet'||!totalBet()?'disabled':''}>SPIN</button>
        </div>
      </div>
    </div>`;
    placeBall(st.ballR == null ? 78 : st.ballR, st.ball);
    bind();
  }
  function renderBoard() {
    const b = el.querySelector('#rlBoard'); if (b) b.innerHTML = board();
    const t = el.querySelector('.rl-tot b'); if (t) t.textContent = api.fmt(totalBet());
    const s = el.querySelector('#rlSpin'); if (s) s.disabled = st.phase !== 'bet' || !totalBet();
    bindBoard();
  }
  function bind() {
    el.querySelectorAll('[data-chip]').forEach((b)=>b.onclick=()=>{ st.chip=+b.dataset.chip; Audio2.play('click'); el.querySelectorAll('[data-chip]').forEach((x)=>x.classList.toggle('on',+x.dataset.chip===st.chip)); });
    el.querySelector('#rlClear').onclick=()=>{ if(st.phase!=='bet')return; st.bets={}; renderBoard(); };
    el.querySelector('#rlRebet').onclick=()=>{ if(st.phase!=='bet'||!st.prev)return; st.bets={...st.prev}; if(totalBet()>api.E.s.coins){ st.bets={}; return api.toast('잔액이 부족해요'); } Audio2.play('chip'); renderBoard(); };
    el.querySelector('#rlSpin').onclick=go;
    bindBoard();
  }
  function bindBoard() {
    el.querySelectorAll('[data-sp]').forEach((b)=>b.addEventListener('click',(e)=>{ e.stopPropagation(); addBet(b.dataset.sp); }));
  }
  function placeBall(radius, ang) {
    const ball = el.querySelector('#rlBall'); if (!ball) return;
    // radius는 SVG viewBox(220) 단위. 볼은 .wheel-rot 안에 있어 기울어진 휠과 같이 회전.
    const rad = (ang - 90) * Math.PI / 180, pct = radius / 220 * 100;
    ball.style.left = (50 + Math.cos(rad) * pct) + '%';
    ball.style.top  = (50 + Math.sin(rad) * pct) + '%';
  }
  async function go() {
    if (st.phase !== 'bet') return;
    const stake = totalBet(); if (!stake) return;
    if (!api.wager(stake, true)) return api.toast('잔액이 부족해요');
    st.phase = 'spin'; st.prev = { ...st.bets }; api.setBusy(true);
    const n = Engine.spin(); st.spin = n;
    Audio2.play('wheel', { vol: 0.9 });
    const idx = ORDER.indexOf(n);
    const local = (idx + 0.5) / 37 * 360;          // 포켓 중심, 12시 기준 시계방향
    const pocketAng = 180 - local;                 // 기울어진 휠의 앞쪽(6시/하단 포인터)에 포켓
    const startW = st.ang, startB = st.ball || 0;
    const endW = startW + 360 * 5 + ((pocketAng - startW) % 360 + 360) % 360;
    const endB = startB - 360 * 8 + ((local - startB) % 360 + 360) % 360; // 반대 방향으로 구르다 포켓에 안착
    const dur = 4200, t0 = performance.now();
    await new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        st.ang = startW + (endW - startW) * e;
        const be = k < 0.78 ? (k / 0.78) : 0.78 + (k - 0.78) / 0.22;
        const ee = 1 - Math.pow(1 - Math.min(1, be), 2);
        st.ball = startB + (endB - startB) * ee;
        st.ballR = k < 0.78 ? 94 : 94 - 8 * ((k - 0.78) / 0.22); // 외곽 트랙에서 번호 포켓(r≈86)으로
        const w = el.querySelector('#rlWheel'); if (w) w.style.transform = `rotateX(55deg) rotateZ(${st.ang}deg)`;
        placeBall(st.ballR, st.ball);
        if (k < 1) raf = requestAnimationFrame(step); else res();
      };
      raf = requestAnimationFrame(step);
    });
    Audio2.play('ball');
    const p = Engine.payout(st.bets, n);
    const net = api.settle('유럽 룰렛', stake, p.returned);
    st.last.push(n); if (st.last.length > 100) st.last = st.last.slice(-100);
    api.E.s.rouletteHist = st.last.slice(); api.E.save();
    const res = el.querySelector('#rlRes'); if (res) { res.textContent = n; res.className = 'rl-res ' + color(n) + ' pop'; }
    st.msg = (p.returned ? `당첨 +${api.fmt(net)}` : '다음 기회에') + ` · ${n} ${color(n)==='green'?'제로':color(n)==='red'?'레드':'블랙'}`;
    st.bets = {}; st.phase = 'bet'; api.setBusy(false);
    await wait(600); render();
  }
  function debugWin() {
    st.spin=7;
    const idx = ORDER.indexOf(7), local = (idx + 0.5) / 37 * 360;
    st.ang = 180 - local; st.ball = local; st.ballR = 86;
    st.last=st.last.concat([32,15,19,4,7]); st.bets={'red':100,'n-7':50}; st.phase='bet';
    st.msg='당첨';
    render();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine };
  else {
    (root.GAME_DEFS = root.GAME_DEFS || []).push(DEF);
    root.GAME_MODS = root.GAME_MODS || {}; root.GAME_MODS.roulette = { DEF, Engine, mount, unmount, help, busy, debugWin };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
