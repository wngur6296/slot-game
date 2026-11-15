/* 크래시: 상승 배수 그래프, 회수 / 자동 회수, 다른 플레이어 연출. 하우스 엣지 4% (어느 배수에서 회수해도 EV 동일) */
(function (root) {
  const EDGE = 0.04;
  const DEF = {
    id: 'crash', name: '크래시', level: 6, minBetIdx: 0, order: 24,
    cats: ['live', 'instant'], kind: 'live',
    theme: { bgm: 'table_loop', cover: 'g_crash', vars: { f1: '#ffd34d', f2: '#1a0540' } },
    lobby: { blurb: '배가 오를 때 직접 회수하는 그래프', rtp: 96.00, volatility: 5, tag: '라이브',
      pros: ['회수 시점을 직접 고름', '자동 회수 지원', '한 판이 짧고 템포가 빠름'],
      cons: ['변동성이 매우 큼', '시작하자마자 1.00에 터지기도 함', '레벨 6 해금'],
      features: ['실시간 그래프', '회수', '자동 회수'] }
  };
  function crashPoint(rng) {
    const u = Math.max(1e-12, (rng || Math.random)());
    return Math.max(1, Math.floor(100 * (1 - EDGE) / u) / 100);
  }
  // 회수 배수 c에서의 이론 EV = -EDGE (c>1)
  function ev() { return -EDGE; }
  const Engine = { EDGE, crashPoint, ev };

  const NICK_A = ['네온','골드','스타','문','크라운','와일드','블루','나이트','드래곤','하트','실버','럭키'];
  const NICK_B = ['러너','킹','토끼','여우','고래','7','보스','팬더','라이더','헌터'];
  const nick = () => { const n = NICK_A[Math.random()*NICK_A.length|0] + NICK_B[Math.random()*NICK_B.length|0] + (Math.random()*90+10|0); return n.slice(0,2)+'**'+n.slice(-2); };

  let api, el, st, raf, tmr=[], ctx;
  const wait = (ms) => new Promise((r)=>tmr.push(setTimeout(r,ms)));
  function mount(root, a) {
    api = a; el = root;
    st = { phase: 'bet', bet: a.minBet, auto: 2, crash: 1, t0: 0, live: 0, in: false, cashed: 0, feed: [], hist: (a.E.s.crashHist||[]).slice(), msg: '다음 라운드에 참여하세요' };
    render(); nextRound(true);
  }
  function unmount() { tmr.forEach(clearTimeout); tmr=[]; cancelAnimationFrame(raf); st&& (st.dead=true); el=null; api&&api.setBusy(false); }
  function busy() { return st && st.in && st.phase === 'fly'; } // can't leave while a live bet is flying
  function help() {
    api.help(`<h2>🚀 크래시 규칙</h2>
      <p>배수가 1.00부터 계속 올라갑니다. 터지기 <b>전에 회수</b>하면 그 배수만큼 받게 됩니다. 터진 뒤에는 해당 라운드 베팅이 사라집니다.</p>
      <ul>
        <li><b>자동 회수</b>: 설정한 배수에 도달하면 자동으로 회수합니다.</li>
        <li>아주 낮은 확률로 시작과 동시에 1.00에서 끝나기도 합니다.</li>
        <li>어느 배수에서 회수하더라도 이론 하우스 엣지는 <b>4%</b> (RTP 96%)로 같습니다.</li>
      </ul>
      <p>화면의 다른 플레이어 베팅은 연출입니다.</p>`);
  }
  function multAt(ms) { return Math.max(1, Math.pow(Math.E, 0.00013 * ms)); } // ~1.14x at 1s, 2x at ~5.3s, 10x at ~17s
  function msAt(m) { return Math.log(m) / 0.00013; }

  function render() {
    if (!el || !el.isConnected) return;
    const L = api.levels.filter((n)=>n>=api.minBet).slice(0,7);
    const flying = st.phase==='fly';
    el.innerHTML = `<div class="felt felt-cr">
      <div class="cr-hist">${st.hist.slice(-12).map((m)=>`<i class="${m<2?'lo':m<5?'mid':'hi'}">${m.toFixed(2)}x</i>`).join('')}</div>
      <div class="cr-graph"><canvas id="crCv"></canvas><div class="cr-mult ${st.phase==='boom'?'boom':''}" id="crM">${st.phase==='wait'?'다음 라운드':(st.live?st.live.toFixed(2)+'x':'1.00x')}</div></div>
      <div class="cr-feed" id="crFeed"></div>
      <div class="rl-bar">
        <div class="tb-chips">${L.map((n)=>`<button class="chipv ${st.bet===n?'on':''}" data-chip="${n}" ${flying&&st.in?'disabled':''}>${api.fmt(n)}</button>`).join('')}</div>
        <label class="sq-tog">자동 회수 <input type="number" id="crAuto" min="1.01" step="0.1" value="${st.auto}" ${flying&&st.in?'disabled':''}>x</label>
        <div class="bj-btns">
          ${!st.in && st.phase!=='fly'?`<button class="tba deal" id="crIn">베팅 ${api.fmt(st.bet)}</button>`:''}
          ${st.in && st.phase==='fly' && !st.cashed?`<button class="tba recoup" id="crOut">회수 ${st.live.toFixed(2)}x</button>`:''}
          
        </div>
      </div>
    </div>`;
    const cv = el.querySelector('#crCv'); if (cv) { fit(cv); ctx = cv.getContext('2d'); drawGraph(); }
    bind(); paintFeed();
  }
  function bind() {
    el.querySelectorAll('[data-chip]').forEach((b)=>b.onclick=()=>{st.bet=+b.dataset.chip;Audio2.play('chip');el.querySelectorAll('[data-chip]').forEach((x)=>x.classList.toggle('on',+x.dataset.chip===st.bet)); const t=el.querySelector('#crIn'); if(t)t.textContent='베팅 '+api.fmt(st.bet);});
    const a=el.querySelector('#crAuto'); if(a) a.onchange=()=>{ st.auto=Math.max(1.01, +a.value||2); };
    const inn=el.querySelector('#crIn'); if(inn) inn.onclick=join;
    const o=el.querySelector('#crOut'); if(o) o.onclick=()=>cash();
  }
  function join() {
    if (st.in || st.phase==='fly') return;
    if (!api.wager(st.bet, true)) return api.toast('잔액이 부족해요');
    st.in = true; st.paid = st.bet; st.cashed = 0; api.setBusy(true); Audio2.play('chip'); render();
  }
  function cash() {
    if (!st.in || st.cashed || st.phase !== 'fly') return;
    if (st.live >= st.crash) return;
    st.cashed = st.live;
    const ret = Math.floor(st.paid * st.cashed);
    api.settle('크래시 회수', st.paid, ret);
    Audio2.play('recoup'); st.in = false; api.setBusy(false);
    addFeed('you', st.cashed, ret, true);
    const btn=el.querySelector('#crOut'); if(btn) btn.remove();
  }
  function addFeed(name, m, amt, ok) {
    st.feed.unshift({ name, m, amt, ok, t: Date.now() }); st.feed = st.feed.slice(0, 12); paintFeed();
  }
  function paintFeed() {
    const f=el.querySelector('#crFeed'); if(!f) return;
    f.innerHTML = st.feed.map((e)=>`<div class="${e.ok?'ok':'bad'}"><b>${e.name==='you'?'나':e.name}</b> ${e.ok?`회수 ${e.m.toFixed(2)}x · +${api.fmt(e.amt)}`:'실패'}</div>`).join('');
  }
  function fit(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio||1);
    cv.width = r.width*dpr; cv.height = r.height*dpr; cv._dpr=dpr;
  }
  function drawGraph() {
    if (!ctx) return;
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#0b0618'; ctx.fillRect(0,0,w,h);
    // grid
    ctx.strokeStyle='#ffffff12'; ctx.lineWidth=1;
    for (let i=1;i<5;i++){ ctx.beginPath(); ctx.moveTo(0,h*i/5); ctx.lineTo(w,h*i/5); ctx.stroke(); }
    if (!st.pts || st.pts.length<2) return;
    const maxM = Math.max(2, st.live, 1.2);
    const maxT = Math.max(2000, st.pts[st.pts.length-1][0]);
    ctx.beginPath();
    st.pts.forEach((p,i)=>{
      const x=p[0]/maxT*w, y=h - (p[1]-1)/(maxM-1)*h*0.85 - h*0.05;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });
    ctx.strokeStyle = st.phase==='boom' ? '#ff3b5c' : '#ffd34d';
    ctx.lineWidth = 3 * (ctx.canvas._dpr||1); ctx.stroke();
    // rocket tip
    const last=st.pts[st.pts.length-1];
    const x=last[0]/maxT*w, y=h - (last[1]-1)/(maxM-1)*h*0.85 - h*0.05;
    ctx.fillStyle=st.phase==='boom'?'#ff3b5c':'#ffe27a';
    ctx.beginPath(); ctx.arc(x,y,5*(ctx.canvas._dpr||1),0,7); ctx.fill();
  }
  async function nextRound(first) {
    if (st.dead) return;
    st.phase = 'wait'; st.live = 1; st.pts = [[0,1]]; st.crash = Engine.crashPoint();
    st.others = Array.from({length: 6+Math.random()*5|0}, () => ({ n: nick(), bet: api.levels[Math.random()*5|0], at: 1.1+Math.random()*8, out: false }));
    if (!first) render();
    else { const cv=el.querySelector('#crCv'); if(cv){fit(cv);ctx=cv.getContext('2d');} }
    const m = el.querySelector('#crM');
    for (let s=3;s>=1 && !st.dead;s--){ if(m) m.textContent = '시작 '+s; await wait(700); }
    if (st.dead) return;
    st.phase='fly'; st.t0=performance.now(); st.pts=[[0,1]]; lastTick=0;
    if (m) m.textContent='1.00x';
    fly();
  }
  let lastTick=0;
  function fly() {
    if (st.dead) return;
    const now=performance.now(), ms=now-st.t0, m=multAt(ms);
    st.live=Math.floor(m*100)/100;
    st.pts.push([ms, st.live]);
    if (st.pts.length>400) st.pts=st.pts.slice(-300);
    if (now-lastTick>180) { Audio2.play('crash_tick',{vol:0.25, rate: Math.min(2, 0.8+st.live/10)}); lastTick=now; }
    const mm=el.querySelector('#crM'); if(mm) mm.textContent=st.live.toFixed(2)+'x';
    const ob=el.querySelector('#crOut'); if(ob) ob.textContent='회수 '+st.live.toFixed(2)+'x';
    // auto
    if (st.in && !st.cashed && st.live >= st.auto && st.live < st.crash) cash();
    // others cash
    st.others.forEach((o)=>{ if(!o.out && st.live>=o.at && o.at<st.crash){ o.out=true; addFeed(o.n,o.at,Math.floor(o.bet*o.at),true);} });
    drawGraph();
    if (st.live >= st.crash) return boom();
    raf=requestAnimationFrame(fly);
  }
  function boom() {
    st.phase='boom'; st.live=st.crash; Audio2.play('crash_boom'); Haptic([20,40,20]);
    const mm=el.querySelector('#crM'); if(mm){ mm.textContent=st.crash.toFixed(2)+'x'; mm.classList.add('boom'); }
    drawGraph();
    st.others.forEach((o)=>{ if(!o.out) addFeed(o.n, st.crash, 0, false); });
    if (st.in && !st.cashed) { api.settle('크래시', st.paid, 0); st.in=false; api.setBusy(false); addFeed('you', st.crash, 0, false); }
    st.hist.push(st.crash); if(st.hist.length>50) st.hist=st.hist.slice(-50);
    api.E.s.crashHist=st.hist.slice(); api.E.save();
    tmr.push(setTimeout(()=>{ if(!st.dead) nextRound(); }, 1800));
  }
  function debugWin() {
    st.phase='fly'; st.live=2.54; st.cashed=2.54; st.in=false; st.pts=Array.from({length:40},(_,i)=>[i*120, Math.max(1, Math.pow(Math.E,0.00013*i*120))]);
    st.hist=st.hist.concat([1.12,2.54,3.81,1.00,7.2]); st.feed=[{name:'you',m:2.54,amt:254,ok:true,t:Date.now()}];
    render(); const mm=el.querySelector('#crM'); if(mm) mm.textContent='2.54x';
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine };
  else {
    (root.GAME_DEFS = root.GAME_DEFS || []).push(DEF);
    root.GAME_MODS = root.GAME_MODS || {}; root.GAME_MODS.crash = { DEF, Engine, mount, unmount, help, busy, debugWin };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
