/* 플린코: 이항 경로, 행 수/리스크별 97% RTP 배당 */
(function (root) {
  const MULT = {
    8:  { lo:[5.52,1.97,1.09,0.99,0.49,0.99,1.09,1.97,5.52], mid:[12.75,2.94,1.28,0.69,0.39,0.69,1.28,2.94,12.75], hi:[28.40,3.92,1.47,0.29,0.20,0.29,1.47,3.92,28.40] },
    12: { lo:[8.05,3.02,1.51,1.21,1.11,1.01,0.50,1.01,1.11,1.21,1.51,3.02,8.05], mid:[27.02,9.01,3.38,2.25,0.79,0.68,0.45,0.68,0.79,2.25,3.38,9.01,27.02], hi:[152.30,20.04,6.01,1.80,0.60,0.40,0.40,0.40,0.60,1.80,6.01,20.04,152.30] },
    16: { lo:[15.68,8.82,1.96,1.37,1.37,1.18,1.08,0.98,0.49,0.98,1.08,1.18,1.37,1.37,1.96,8.82,15.68], mid:[107.79,40.18,9.80,4.90,2.94,1.47,0.98,0.49,0.29,0.49,0.98,1.47,2.94,4.90,9.80,40.18,107.79], hi:[1031.64,138.11,26.62,9.98,3.33,1.16,0.33,0.33,0.33,0.33,0.33,1.16,3.33,9.98,26.62,138.11,1031.64] }
  };
  const DEF = {
    id: 'plinko', name: '플린코', level: 3, minBetIdx: 0, order: 25,
    cats: ['instant'], kind: 'instant',
    theme: { bgm: 'table_loop', cover: 'g_plinko', vars: { f1: '#ffd34d', f2: '#101018' } },
    lobby: { blurb: '핀을 타고 떨어지는 공 · 배수 슬롯', rtp: 97.00, volatility: 3, tag: '인스턴트',
      pros: ['모든 행·리스크 조합 RTP 약 97%', '경로를 눈으로 따라감', '낮은 리스크는 빈번한 당첨'],
      cons: ['높은 리스크는 가운데가 거의 0에 가까움', '레벨 3 해금'],
      features: ['8/12/16행', '3단계 리스크'] }
  };
  function path(rows, rng) {
    rng = rng || Math.random; const steps = []; let k = 0;
    for (let i = 0; i < rows; i++) { const r = rng() < 0.5 ? 0 : 1; steps.push(r); k += r; }
    return { steps, bin: k };
  }
  function pay(rows, risk, bin, bet) { return Math.round(bet * MULT[rows][risk][bin]); }
  const Engine = { MULT, path, pay };

  let api, el, st, raf, ctx;
  function mount(root, a) {
    api = a; el = root;
    st = { bet: a.minBet, rows: 12, risk: 'mid', dropping: false, last: -1, ball: null };
    render();
  }
  function unmount() { cancelAnimationFrame(raf); el=null; api&&api.setBusy(false); }
  function busy() { return st && st.dropping; }
  function help() {
    api.help(`<h2>🟡 플린코 규칙</h2>
      <p>공이 핀을 타고 내려가 아래 칸의 배수만큼 지급됩니다. 각 핀에서 왼쪽·오른쪽 확률은 같습니다.</p>
      <p>행 수(8 / 12 / 16)와 리스크(낮음·보통·높음)를 고를 수 있으며, 모든 조합의 이론 RTP는 약 <b>97%</b>입니다. 높은 리스크일수록 가장자리 배수는 커지고 가운데는 작아집니다.</p>`);
  }
  function render() {
    if (!el || !el.isConnected) return;
    const L = api.levels.filter((n)=>n>=api.minBet).slice(0,7);
    const M = MULT[st.rows][st.risk];
    el.innerHTML = `<div class="felt felt-pk">
      <div class="pk-opts">
        <div>${[8,12,16].map((r)=>`<button class="chipv ${st.rows===r?'on':''}" data-rows="${r}">${r}행</button>`).join('')}</div>
        <div>${[['lo','낮음'],['mid','보통'],['hi','높음']].map(([k,n])=>`<button class="chipv ${st.risk===k?'on':''}" data-risk="${k}">${n}</button>`).join('')}</div>
      </div>
      <div class="pk-board"><canvas id="pkCv"></canvas></div>
      <div class="pk-bins" id="pkBins">${M.map((m,i)=>`<i class="${st.last===i?'hit':''} ${m<1?'lo':m>=10?'hi':''}">${fmtM(m)}</i>`).join('')}</div>
      <div class="rl-bar">
        <div class="tb-chips">${L.map((n)=>`<button class="chipv ${st.bet===n?'on':''}" data-chip="${n}">${api.fmt(n)}</button>`).join('')}</div>
        <button class="tba deal" id="pkDrop" ${st.dropping?'disabled':''}>DROP</button>
      </div>
    </div>`;
    const cv=el.querySelector('#pkCv'); fit(cv); ctx=cv.getContext('2d'); draw(null); bind();
  }
  function fmtM(m){ return m>=100?m.toFixed(0):m>=10?m.toFixed(1):m.toFixed(2); }
  function bind() {
    el.querySelectorAll('[data-chip]').forEach((b)=>b.onclick=()=>{if(st.dropping)return;st.bet=+b.dataset.chip;render();});
    el.querySelectorAll('[data-rows]').forEach((b)=>b.onclick=()=>{if(st.dropping)return;st.rows=+b.dataset.rows;st.last=-1;render();});
    el.querySelectorAll('[data-risk]').forEach((b)=>b.onclick=()=>{if(st.dropping)return;st.risk=b.dataset.risk;st.last=-1;render();});
    el.querySelector('#pkDrop').onclick=drop;
  }
  function fit(cv){ const r=cv.getBoundingClientRect(), d=Math.min(2,devicePixelRatio||1); cv.width=r.width*d; cv.height=r.height*d; cv._dpr=d; }
  function layout() {
    const w=ctx.canvas.width, h=ctx.canvas.height, rows=st.rows;
    const pegs=[]; const top=h*0.07, bot=h*0.94, gap=(bot-top)/rows;
    const span=w*0.92, x0=(w-span)/2;
    for(let r=0;r<rows;r++){
      const n=r+2, y=top+gap*r, rowSpan=span*(n-1)/rows, rx0=(w-rowSpan)/2;
      for(let i=0;i<n;i++) pegs.push({x: n===1?w/2 : rx0+rowSpan*(n===1?0:i/(n-1)), y, r});
    }
    return { w,h,top,bot,gap,pegs,span,x0 };
  }
  function draw(ball) {
    if(!ctx) return;
    const {w,h,pegs,bot,top,gap}=layout();
    ctx.clearRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,'#16161f'); g.addColorStop(1,'#0b0b12');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#ffd34d';
    pegs.forEach((p)=>{ ctx.beginPath(); ctx.arc(p.x,p.y,3.2*(ctx.canvas._dpr||1),0,7); ctx.fill(); });
    if (ball) { ctx.fillStyle='#ffe27a'; ctx.shadowColor='#ffd34d'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(ball.x,ball.y,7*(ctx.canvas._dpr||1),0,7); ctx.fill(); ctx.shadowBlur=0; }
  }
  function drop() {
    if (st.dropping) return;
    if (!api.wager(st.bet,true)) return api.toast('잔액이 부족해요');
    st.dropping=true; api.setBusy(true); st.last=-1;
    const {steps,bin}=Engine.path(st.rows);
    const L=layout(), rows=st.rows, w=L.w;
    // start centered, at each row move toward the slot of the running right-count
    const pts=[{x:w/2,y:L.top-L.gap*0.4,r:-1}];
    let k=0;
    for(let r=0;r<rows;r++){
      k+=steps[r];
      const n=r+2, rowSpan=L.span*(n-1)/rows, rx0=(w-rowSpan)/2;
      const x= n<=1 ? w/2 : rx0+rowSpan*((k+0.5)/n);
      pts.push({x, y:L.top+L.gap*r, r});
    }
    const span=L.span, x0=L.x0, bins=rows+1;
    pts.push({x:x0+span*((bin+0.5)/bins), y:L.bot, r:rows});
    let i=0, t0=performance.now();
    const step=()=>{
      const now=performance.now();
      const dur=220, kase=Math.min(1,(now-t0)/dur);
      const a=pts[i], b=pts[i+1];
      const e=kase*(2-kase);
      const x=a.x+(b.x-a.x)*e, y=a.y+(b.y-a.y)*e;
      if (kase>0.5 && !b._peg) { b._peg=1; Audio2.play('plinko_peg',{vol:0.35, rate:0.9+Math.random()*0.3}); }
      draw({x,y});
      if (kase>=1){ i++; t0=now; if(i>=pts.length-1) return land(bin); }
      raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
  }
  function land(bin) {
    Audio2.play('plinko_land');
    const ret=Engine.pay(st.rows, st.risk, bin, st.bet);
    api.settle('플린코', st.bet, ret);
    st.last=bin; st.dropping=false; api.setBusy(false);
    render();
  }
  function debugWin() { st.last = st.rows; st.dropping=false; render(); }

  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine };
  else {
    (root.GAME_DEFS = root.GAME_DEFS || []).push(DEF);
    root.GAME_MODS = root.GAME_MODS || {}; root.GAME_MODS.plinko = { DEF, Engine, mount, unmount, help, busy, debugWin };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
