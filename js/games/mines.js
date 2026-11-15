/* 마인즈: 5x5, 지뢰 수 선택, 보석을 연 뒤 회수. 공정 배당 × 0.97 (하우스 엣지 3%) */
(function (root) {
  const EDGE = 0.03, N = 25;
  const DEF = {
    id: 'mines', name: '마인즈', level: 5, minBetIdx: 0, order: 26,
    cats: ['instant'], kind: 'instant',
    theme: { bgm: 'table_loop', cover: 'g_mines', vars: { f1: '#7ad8ff', f2: '#101018' } },
    lobby: { blurb: '지뢰를 피해 칸을 여는 마인즈', rtp: 97.00, volatility: 4, tag: '인스턴트',
      pros: ['회수 시점을 스스로 정함', '어느 칸에서 회수해도 엣지 3%', '지뢰 수로 변동성 조절'],
      cons: ['한 번만 지뢰를 밟아도 베팅 전부 소멸', '레벨 5 해금'],
      features: ['5×5', '회수', '지뢰 1–24개'] }
  };
  function comb(n, k) { if (k<0||k>n) return 0; if (k>n-k) k=n-k; let r=1; for (let i=1;i<=k;i++) r=r*(n-k+i)/i; return r; }
  // 보석 n개를 연 상태의 공정 배수 = C(25,n)/C(25-m,n) = Π i=0..n-1 (25-i)/(25-m-i)
  function fair(mines, gems) {
    let x = 1; for (let i = 0; i < gems; i++) x *= (N - i) / (N - mines - i); return x;
  }
  function mult(mines, gems) { return gems <= 0 ? 1 : fair(mines, gems) * (1 - EDGE); }
  function setup(mines, rng) {
    rng = rng || Math.random;
    const idx = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    const bombs = new Set(idx.slice(0, mines));
    return { bombs, mines };
  }
  const Engine = { EDGE, N, comb, fair, mult, setup };

  let api, el, st;
  function mount(root, a) {
    api = a; el = root;
    st = { phase: 'idle', bet: a.minBet, mines: 5, open: [], dead: -1, board: null, msg: '지뢰 수를 고르고 시작하세요' };
    render();
  }
  function unmount() { el=null; api&&api.setBusy(false); }
  function busy() { return st && st.phase === 'play'; }
  function help() {
    api.help(`<h2>💎 마인즈 규칙</h2>
      <p>5×5 칸 중 일부를 지뢰로 숨깁니다. 안전한 칸(보석)을 열수록 배수가 오르고, 원하는 순간 <b>회수</b>하면 그 배수로 정산됩니다. 지뢰를 열면 그 라운드 베팅은 사라집니다.</p>
      <p>배당은 남은 안전 칸의 공정 확률에 <b>0.97</b>을 곱해 정합니다. 언제 회수하더라도 이론 하우스 엣지는 <b>3%</b> (RTP 97%)입니다.</p>`);
  }
  function curM() { return Engine.mult(st.mines, st.open.length); }
  function render() {
    if (!el || !el.isConnected) return;
    const L = api.levels.filter((n)=>n>=api.minBet).slice(0,7);
    const m = curM();
    el.innerHTML = `<div class="felt felt-mn">
      <div class="mn-top"><span>배수 <b id="mnM">${m.toFixed(2)}x</b></span><span>${st.open.length} 보석 · 지뢰 ${st.mines}</span></div>
      <div class="mn-grid">${Array.from({length:N},(_,i)=>{
        const on=st.open.includes(i), boom=st.dead===i || (st.phase==='end' && st.board && st.board.bombs.has(i));
        const gem=st.phase==='end' && st.board && !st.board.bombs.has(i);
        return `<button class="mn-c ${on?'gem':''} ${boom?'boom':''} ${gem&&!on?'safe':''}" data-i="${i}">${boom?'💣':on||gem?'💎':''}</button>`;
      }).join('')}</div>
      <div class="bj-msg">${st.msg||''}</div>
      <div class="rl-bar">
        ${st.phase==='idle'?`<div class="pk-opts"><div>${[3,5,8,10,15,20].map((n)=>`<button class="chipv ${st.mines===n?'on':''}" data-mn="${n}">지뢰 ${n}</button>`).join('')}</div></div>
        <div class="tb-chips">${L.map((n)=>`<button class="chipv ${st.bet===n?'on':''}" data-chip="${n}">${api.fmt(n)}</button>`).join('')}</div>
        <button class="tba deal" id="mnStart">시작</button>`:
        st.phase==='play'?`<button class="tba recoup" id="mnOut" ${!st.open.length?'disabled':''}>회수 ${m.toFixed(2)}x · ${api.fmt(Math.round(st.bet*m))}</button>`:
        `<button class="tba deal" id="mnAgain">다시</button>`}
      </div>
    </div>`;
    bind();
  }
  function bind() {
    el.querySelectorAll('[data-chip]').forEach((b)=>b.onclick=()=>{st.bet=+b.dataset.chip;render();});
    el.querySelectorAll('[data-mn]').forEach((b)=>b.onclick=()=>{st.mines=+b.dataset.mn;render();});
    el.querySelectorAll('[data-i]').forEach((b)=>b.onclick=()=>open(+b.dataset.i));
    const s=el.querySelector('#mnStart'); if(s)s.onclick=start;
    const o=el.querySelector('#mnOut'); if(o)o.onclick=cash;
    const a=el.querySelector('#mnAgain'); if(a)a.onclick=()=>{st.phase='idle';st.open=[];st.dead=-1;st.board=null;api.setBusy(false);st.msg='지뢰 수를 고르고 시작하세요';render();};
  }
  function debugWin() {
    st.board=Engine.setup(5); st.open=[0,1,2,6,7]; st.phase='end'; st.bet=100; st.msg='회수 '+curM().toFixed(2)+'x'; st.dead=-1; render();
  }
  function start() {
    if (!api.wager(st.bet,true)) return api.toast('잔액이 부족해요');
    st.board=Engine.setup(st.mines); st.open=[]; st.dead=-1; st.phase='play'; st.msg='안전한 칸을 고르세요'; api.setBusy(true); Audio2.play('chip'); render();
  }
  function open(i) {
    if (st.phase!=='play' || st.open.includes(i)) return;
    if (st.board.bombs.has(i)) {
      st.dead=i; Audio2.play('mine_boom'); Haptic([30,40,30]);
      api.settle('마인즈', st.bet, 0);
      st.phase='end'; st.msg='지뢰!'; api.setBusy(false); render(); return;
    }
    st.open.push(i); Audio2.play('mine_gem');
    if (st.open.length >= N - st.mines) { cash(true); return; }
    st.msg='계속 열거나 회수하세요'; render();
  }
  function cash(auto) {
    if (st.phase!=='play' || !st.open.length) return;
    const ret=Math.round(st.bet * curM());
    api.settle('마인즈 회수', st.bet, ret);
    Audio2.play('recoup'); st.phase='end'; st.msg=(auto?'전부 개방! ':'')+`회수 ${curM().toFixed(2)}x`; api.setBusy(false); render();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine };
  else {
    (root.GAME_DEFS = root.GAME_DEFS || []).push(DEF);
    root.GAME_MODS = root.GAME_MODS || {}; root.GAME_MODS.mines = { DEF, Engine, mount, unmount, help, busy, debugWin };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
