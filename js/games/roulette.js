/* 유럽식 룰렛 (0–36, 37포켓). 포토리얼 휠·물리 볼·골드 펠트 테이블 */
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

  function covers(spot) {
    const [t, a, b, c, d] = String(spot).split(/[:-]/);
    const n = (...x) => x.map(Number);
    if (t === 'n') return { nums: n(a), odds: 35 };
    if (t === 'sp') return { nums: n(a, b), odds: 17 };
    if (t === 'st') return { nums: n(a, b, c), odds: 11 };
    if (t === 'cr') return { nums: n(a, b, c, d), odds: 8 };
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
  function payout(bets, n) {
    let ret = 0, hits = [];
    Object.entries(bets).forEach(([sp, amt]) => {
      const c = covers(sp);
      if (c.nums.includes(n)) { ret += amt * (c.odds + 1); hits.push(sp); }
    });
    return { returned: ret, hits };
  }
  function houseEdge() { return 1 / 37; }
  const Engine = { ORDER, color, covers, spin, payout, houseEdge, REDS };

  /* ---- 시각: 캐시된 캔버스 레이어 + rAF ---- */
  const R = {
    bowl: 0.992, woodIn: 0.908, trackOut: 0.900, trackIn: 0.808,
    wheelOut: 0.798, pocketOut: 0.768, pocketIn: 0.452,
    track: 0.854, pocket: 0.612, diamond: 0.850
  };
  const TEX = {}, CACHE = { size: 0 };
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  function loadTex() {
    if (TEX.ready) return Promise.resolve();
    if (TEX.wait) return TEX.wait;
    const names = ['tex_wood', 'tex_brass', 'tex_chrome', 'tex_turret'];
    TEX.wait = Promise.all(names.map((n) => loadImg('assets/img/' + n + '.webp').then((im) => { TEX[n] = im; })))
      .then(() => { TEX.ready = true; })
      .catch(() => { TEX.ready = false; });
    return TEX.wait;
  }
  function ring(ctx, cx, cy, r0, r1) {
    ctx.beginPath(); ctx.arc(cx, cy, r0, 0, Math.PI * 2); ctx.arc(cx, cy, r1, 0, Math.PI * 2, true); ctx.closePath();
  }
  function angRad(deg) { return (deg - 90) * Math.PI / 180; }
  function prerender(size) {
    const wood = TEX.tex_wood, brass = TEX.tex_brass, chrome = TEX.tex_chrome, turret = TEX.tex_turret;
    const bowl = document.createElement('canvas'); bowl.width = bowl.height = size;
    const wheel = document.createElement('canvas'); wheel.width = wheel.height = size;
    const bctx = bowl.getContext('2d'), wctx = wheel.getContext('2d');
    const cx = size / 2, cy = size / 2, S = size / 2;
    const woodPat = wood ? bctx.createPattern(wood, 'repeat') : '#4a2010';
    const brassPat = brass ? bctx.createPattern(brass, 'repeat') : '#c9a227';
    const chromePat = chrome ? bctx.createPattern(chrome, 'repeat') : '#c8d0d8';

    // ---- BOWL (고정): 나무 림, 트랙, 다이아몬드 ----
    bctx.clearRect(0, 0, size, size);
    // 바깥 그림자를 살짝 베이크
    bctx.beginPath(); bctx.arc(cx, cy + 4, S * R.bowl, 0, Math.PI * 2);
    bctx.fillStyle = 'rgba(0,0,0,.45)'; bctx.fill();
    // 목재 림
    ring(bctx, cx, cy, S * R.bowl, S * R.woodIn);
    bctx.fillStyle = woodPat; bctx.fill();
    // 광택
    const wg = bctx.createRadialGradient(cx - S * .2, cy - S * .28, S * .1, cx, cy, S);
    wg.addColorStop(0, 'rgba(255,230,180,.28)'); wg.addColorStop(.45, 'rgba(255,255,255,.05)'); wg.addColorStop(1, 'rgba(0,0,0,.28)');
    ring(bctx, cx, cy, S * R.bowl, S * R.woodIn); bctx.fillStyle = wg; bctx.fill();
    // 브레스 립
    ring(bctx, cx, cy, S * R.bowl, S * (R.bowl - 0.014));
    bctx.fillStyle = brassPat; bctx.fill();
    ring(bctx, cx, cy, S * (R.woodIn + 0.008), S * R.woodIn);
    bctx.fillStyle = brassPat; bctx.fill();
    // 트랙 (어두운 홈)
    ring(bctx, cx, cy, S * R.trackOut, S * R.trackIn);
    const tg = bctx.createRadialGradient(cx, cy, S * R.trackIn, cx, cy, S * R.trackOut);
    tg.addColorStop(0, '#1a1008'); tg.addColorStop(.5, '#2a1a10'); tg.addColorStop(1, '#120c08');
    bctx.fillStyle = tg; bctx.fill();
    if (chrome) {
      bctx.save(); ring(bctx, cx, cy, S * R.trackOut, S * R.trackIn); bctx.clip();
      bctx.globalAlpha = 0.18; bctx.fillStyle = chromePat; bctx.fillRect(0, 0, size, size);
      bctx.restore(); bctx.globalAlpha = 1;
    }
    // 트랙 안쪽 브레스 링 (휠과의 경계, 고정 보울 쪽)
    ring(bctx, cx, cy, S * R.trackIn, S * (R.trackIn - 0.01));
    bctx.fillStyle = brassPat; bctx.fill();
    // 다이아몬드 디플렉터 8개
    for (let i = 0; i < 8; i++) {
      const d = i * 45 + 22.5, a = angRad(d), rr = S * R.diamond;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      bctx.save(); bctx.translate(x, y); bctx.rotate(a + Math.PI / 2);
      bctx.beginPath();
      bctx.moveTo(0, -S * 0.046); bctx.lineTo(S * 0.026, 0); bctx.lineTo(0, S * 0.046); bctx.lineTo(-S * 0.026, 0);
      bctx.closePath();
      bctx.fillStyle = brassPat; bctx.fill();
      const hg = bctx.createLinearGradient(0, -S * 0.046, 0, S * 0.046);
      hg.addColorStop(0, 'rgba(255,240,200,.7)'); hg.addColorStop(.5, 'rgba(180,120,20,.15)'); hg.addColorStop(1, 'rgba(0,0,0,.35)');
      bctx.fillStyle = hg; bctx.fill();
      bctx.strokeStyle = 'rgba(80,50,0,.5)'; bctx.lineWidth = 0.8; bctx.stroke();
      bctx.restore();
    }

    // ---- WHEEL (회전): 포켓, 프렛, 숫자, 터렛 ----
    wctx.clearRect(0, 0, size, size);
    const wBrass = brass ? wctx.createPattern(brass, 'repeat') : '#c9a227';
    const wWood = wood ? wctx.createPattern(wood, 'repeat') : '#4a2010';
    // 외곽 브레스 림
    ring(wctx, cx, cy, S * R.wheelOut, S * R.pocketOut);
    wctx.fillStyle = wBrass; wctx.fill();
    const rg = wctx.createLinearGradient(cx, cy - S * R.wheelOut, cx, cy + S * R.wheelOut);
    rg.addColorStop(0, 'rgba(255,240,200,.4)'); rg.addColorStop(.5, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(0,0,0,.35)');
    ring(wctx, cx, cy, S * R.wheelOut, S * R.pocketOut); wctx.fillStyle = rg; wctx.fill();

    ORDER.forEach((n, i) => {
      const a0 = (i / 37) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 37) * Math.PI * 2 - Math.PI / 2;
      wctx.beginPath();
      wctx.arc(cx, cy, S * R.pocketOut, a0, a1);
      wctx.arc(cx, cy, S * R.pocketIn, a1, a0, true);
      wctx.closePath();
      const col = color(n);
      const g = wctx.createRadialGradient(cx, cy, S * R.pocketIn, cx, cy, S * R.pocketOut);
      if (col === 'red') { g.addColorStop(0, '#4a0510'); g.addColorStop(.35, '#b10e28'); g.addColorStop(.72, '#e03448'); g.addColorStop(1, '#6a0a16'); }
      else if (col === 'green') { g.addColorStop(0, '#063018'); g.addColorStop(.4, '#0b7a3c'); g.addColorStop(.75, '#17b85a'); g.addColorStop(1, '#064a28'); }
      else { g.addColorStop(0, '#050505'); g.addColorStop(.4, '#1a1a1a'); g.addColorStop(.75, '#3a3a3a'); g.addColorStop(1, '#0a0a0a'); }
      wctx.fillStyle = g; wctx.fill();
      // 포켓 광택
      wctx.save(); wctx.clip();
      const mid = (a0 + a1) / 2;
      const gx = cx + Math.cos(mid) * S * 0.58, gy = cy + Math.sin(mid) * S * 0.58;
      const lg = wctx.createRadialGradient(gx - 6, gy - 6, 2, gx, gy, S * 0.18);
      lg.addColorStop(0, 'rgba(255,255,255,.22)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      wctx.fillStyle = lg; wctx.fillRect(0, 0, size, size);
      wctx.restore();
    });
    // 브레스 프렛 (포켓 칸막이)
    ORDER.forEach((_, i) => {
      const a = (i / 37) * Math.PI * 2 - Math.PI / 2;
      wctx.beginPath();
      wctx.moveTo(cx + Math.cos(a) * S * R.pocketIn, cy + Math.sin(a) * S * R.pocketIn);
      wctx.lineTo(cx + Math.cos(a) * S * R.pocketOut, cy + Math.sin(a) * S * R.pocketOut);
      wctx.strokeStyle = wBrass; wctx.lineWidth = Math.max(2.2, size * 0.007); wctx.lineCap = 'butt'; wctx.stroke();
      wctx.strokeStyle = 'rgba(255,230,160,.35)'; wctx.lineWidth = 1; wctx.stroke();
    });
    // 숫자 (금색, 포켓이 6시일 때 바로 서도록)
    wctx.font = `700 ${Math.round(size * 0.04)}px Cinzel, Times, serif`;
    wctx.textAlign = 'center'; wctx.textBaseline = 'middle';
    ORDER.forEach((n, i) => {
      const deg = (i + 0.5) / 37 * 360, a = angRad(deg), rr = S * 0.68;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      wctx.save(); wctx.translate(x, y); wctx.rotate((deg - 180) * Math.PI / 180);
      wctx.lineWidth = 2.2; wctx.strokeStyle = 'rgba(40,20,0,.75)'; wctx.strokeText(String(n), 0, 0);
      wctx.fillStyle = '#f3e0a0'; wctx.fillText(String(n), 0, 0);
      wctx.fillStyle = 'rgba(255,248,220,.55)'; wctx.fillText(String(n), -0.4, -0.5);
      wctx.restore();
    });
    // 안쪽 브레스 링
    ring(wctx, cx, cy, S * R.pocketIn, S * (R.pocketIn - 0.012));
    wctx.fillStyle = wBrass; wctx.fill();
    // 터렛 / 콘
    wctx.save();
    wctx.beginPath(); wctx.arc(cx, cy, S * (R.pocketIn - 0.01), 0, Math.PI * 2); wctx.clip();
    if (turret) {
      const d = S * (R.pocketIn - 0.01) * 2;
      wctx.drawImage(turret, cx - d / 2, cy - d / 2, d, d);
    } else {
      const cg = wctx.createRadialGradient(cx, cy, 2, cx, cy, S * R.pocketIn);
      cg.addColorStop(0, '#eee'); cg.addColorStop(.4, '#9aa'); cg.addColorStop(1, '#333');
      wctx.fillStyle = cg; wctx.fill();
    }
    wctx.restore();
    // 허브 가장자리 미세 링
    wctx.beginPath(); wctx.arc(cx, cy, S * (R.pocketIn - 0.01), 0, Math.PI * 2);
    wctx.strokeStyle = 'rgba(0,0,0,.35)'; wctx.lineWidth = 2; wctx.stroke();

    CACHE.bowl = bowl; CACHE.wheel = wheel; CACHE.size = size;
  }

  let api, el, st, tmr = [], raf, scene, sctx, lastBall = 180, zoomT = 0;
  const wait = (ms) => new Promise((r) => tmr.push(setTimeout(r, ms)));

  function mount(root, a) {
    api = a; el = root;
    const hist = (a.E.s.rouletteHist || []).slice();
    st = { phase: 'bet', chip: a.minBet, bets: {}, last: hist, spin: null, ang: 0, ball: 180, ballR: R.pocket, msg: '칩을 고르고 테이블에 올려 주세요', glow: 0 };
    lastBall = 180; zoomT = 0;
    buildShell();
    requestAnimationFrame(() => { fitScene(); paint(); });
    loadTex().then(() => { if (!el) return; const dpr = Math.min(2, devicePixelRatio || 1); prerender(Math.min(1024, Math.round(800 * dpr))); fitScene(); paint(); });
  }
  function unmount() { tmr.forEach(clearTimeout); tmr = []; cancelAnimationFrame(raf); el = null; api && api.setBusy(false); scene = sctx = null; }
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
    st.bets[sp] = (st.bets[sp] || 0) + st.chip; Audio2.play('chip'); updateBoard();
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
  function chipSkin(v) {
    if (v >= 1000) return 'gold'; if (v >= 500) return 'purple'; if (v >= 100) return 'black';
    if (v >= 50) return 'blue'; if (v >= 20) return 'green'; if (v >= 10) return 'red'; return 'white';
  }
  function chipTxt(v) { return v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'K' : String(v); }
  function stackHtml(amt) {
    if (!amt) return '';
    const denoms = [1000, 500, 100, 50, 20, 10, 5, 1];
    const chips = []; let left = amt;
    for (const d of denoms) { while (left >= d && chips.length < 7) { chips.push(chipSkin(d)); left -= d; } }
    if (!chips.length) chips.push(chipSkin(amt));
    return `<span class="rl-stack" aria-hidden="true">${chips.map((c, i) => `<i class="rl-chip ${c}" style="--i:${i}"></i>`).join('')}<em>${chipTxt(amt)}</em></span>`;
  }
  function cell(n) {
    const amt = st.bets['n-' + n];
    return `<button class="rl-n ${color(n)} ${st.spin===n?'hit':''}" data-sp="n-${n}">${n}${stackHtml(amt)}
      ${n ? edgeHits(n) : ''}</button>`;
  }
  function edgeHits(n) {
    const bits = [];
    if (n + 3 <= 36) bits.push(`<i class="hit-e" data-sp="sp-${n}-${n+3}"></i>`);
    if (n % 3 !== 0) bits.push(`<i class="hit-n" data-sp="sp-${n}-${n+1}"></i>`);
    if (n % 3 !== 0 && n + 3 <= 36) bits.push(`<i class="hit-c" data-sp="cr-${n}-${n+1}-${n+3}-${n+4}"></i>`);
    if (n % 3 === 1) bits.push(`<i class="hit-s" data-sp="st-${n}-${n+1}-${n+2}"></i>`);
    return bits.join('');
  }
  function badge(sp) { return stackHtml(st.bets[sp]); }
  function board() {
    const cols = [3, 2, 1].map((start) => {
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
  function chipBtns() {
    const L = api.levels.filter((n) => n >= api.minBet).slice(0, 7);
    return L.map((n) => `<button class="chipv rl-tray ${st.chip===n?'on':''}" data-chip="${n}"><i class="rl-chip ${chipSkin(n)}"></i><span>${api.fmt(n)}</span></button>`).join('');
  }
  function buildShell() {
    if (!el) return;
    el.innerHTML = `<div class="felt felt-rl">
      <div class="rl-stage" id="rlStage">
        <div class="rl-persp" id="rlPersp">
          <div class="rl-plane" id="rlPlane"><canvas id="rlScene" class="rl-scene"></canvas></div>
          <div class="rl-pointer" aria-hidden="true"></div>
        </div>
        <div class="rl-res" id="rlRes">${st.spin==null?'—':st.spin}</div>
      </div>
      <div id="rlMeta">${histBar()}${hotcold()}</div>
      <div class="rl-board" id="rlBoard">${board()}</div>
      <div class="rl-bar">
        <div class="tb-chips" id="rlChips">${chipBtns()}</div>
        <div class="rl-tot">베팅 <b id="rlTot">${api.fmt(totalBet())}</b></div>
        <p class="bj-msg" id="rlMsg">${st.msg}</p>
        <div class="bj-btns">
          <button class="tba ghost" id="rlClear">지우기</button>
          <button class="tba ghost" id="rlRebet">리벳</button>
          <button class="tba deal" id="rlSpin">SPIN</button>
        </div>
      </div>
    </div>`;
    scene = el.querySelector('#rlScene');
    fitScene();
    bind();
    updateBtns();
  }
  function fitScene() {
    if (!scene) return;
    const plane = el.querySelector('#rlPlane');
    const css = (plane && plane.clientWidth) || 240;
    const dpr = Math.min(2, devicePixelRatio || 1);
    scene.width = Math.round(css * dpr); scene.height = Math.round(css * dpr);
    sctx = scene.getContext('2d');
  }
  function updateBoard() {
    const b = el.querySelector('#rlBoard'); if (b) b.innerHTML = board();
    const t = el.querySelector('#rlTot'); if (t) t.textContent = api.fmt(totalBet());
    updateBtns(); bindBoard();
  }
  function updateBtns() {
    const s = el.querySelector('#rlSpin'), c = el.querySelector('#rlClear'), r = el.querySelector('#rlRebet');
    if (s) s.disabled = st.phase !== 'bet' || !totalBet();
    if (c) c.disabled = st.phase !== 'bet';
    if (r) r.disabled = st.phase !== 'bet' || !st.prev;
  }
  function updateMeta() {
    const m = el.querySelector('#rlMeta'); if (m) m.innerHTML = histBar() + hotcold();
    const res = el.querySelector('#rlRes');
    if (res) { res.textContent = st.spin == null ? '—' : st.spin; res.className = 'rl-res ' + (st.spin == null ? '' : color(st.spin)); }
    const msg = el.querySelector('#rlMsg'); if (msg) msg.textContent = st.msg || '';
  }
  function bind() {
    el.querySelectorAll('[data-chip]').forEach((b) => b.onclick = () => {
      st.chip = +b.dataset.chip; Audio2.play('click');
      el.querySelectorAll('[data-chip]').forEach((x) => x.classList.toggle('on', +x.dataset.chip === st.chip));
    });
    el.querySelector('#rlClear').onclick = () => { if (st.phase !== 'bet') return; st.bets = {}; updateBoard(); };
    el.querySelector('#rlRebet').onclick = () => {
      if (st.phase !== 'bet' || !st.prev) return; st.bets = { ...st.prev };
      if (totalBet() > api.E.s.coins) { st.bets = {}; return api.toast('잔액이 부족해요'); }
      Audio2.play('chip'); updateBoard();
    };
    el.querySelector('#rlSpin').onclick = go;
    bindBoard();
  }
  function bindBoard() {
    el.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); addBet(b.dataset.sp); }));
  }

  function pose(k, local, startW, endW, startB, endB) {
    const e = 1 - Math.pow(1 - k, 2.35);
    const ang = startW + (endW - startW) * e;
    const be = 1 - Math.pow(1 - Math.min(1, k / 0.88), 1.65);
    let ball = startB + (endB - startB) * be;
    let r;
    if (k < 0.60) r = R.track;
    else if (k < 0.70) r = R.track - (R.track - R.diamond) * ((k - 0.60) / 0.10) * 0.6;
    else if (k < 0.86) {
      const t = (k - 0.70) / 0.16;
      const bumps = Math.abs(Math.sin(t * Math.PI * 3.4)) * (1 - t) * 0.038;
      r = R.diamond - (R.diamond - (R.pocket + 0.035)) * t + bumps;
    } else {
      const t = (k - 0.86) / 0.14, ee = 1 - Math.pow(1 - t, 3);
      r = (R.pocket + 0.035) * (1 - ee) + R.pocket * ee;
      r += Math.sin(ee * Math.PI) * 0.01 * (1 - ee);
      const target = ang + local;
      const wrap = (a) => { const d = ((target - a) % 360 + 540) % 360 - 180; return a + d * Math.min(1, ee * 1.4); };
      ball = wrap(ball);
    }
    return { ang, ball, r };
  }
  function paint(opts) {
    if (!sctx || !scene) return;
    const W = scene.width, H = scene.height, cx = W / 2, cy = H / 2, S = W / 2;
    sctx.clearRect(0, 0, W, H);
    if (CACHE.bowl) sctx.drawImage(CACHE.bowl, 0, 0, W, H);
    else {
      sctx.beginPath(); sctx.arc(cx, cy, S * 0.98, 0, Math.PI * 2);
      sctx.fillStyle = '#3a1c10'; sctx.fill();
    }
    sctx.save();
    sctx.translate(cx, cy); sctx.rotate(st.ang * Math.PI / 180); sctx.translate(-cx, -cy);
    if (CACHE.wheel) sctx.drawImage(CACHE.wheel, 0, 0, W, H);
    if (st.glow > 0 && st.spin != null) {
      const idx = ORDER.indexOf(st.spin), a0 = (idx / 37) * Math.PI * 2 - Math.PI / 2, a1 = ((idx + 1) / 37) * Math.PI * 2 - Math.PI / 2;
      sctx.beginPath(); sctx.arc(cx, cy, S * R.pocketOut, a0, a1); sctx.arc(cx, cy, S * R.pocketIn, a1, a0, true); sctx.closePath();
      sctx.fillStyle = `rgba(255, 211, 77, ${0.18 + 0.22 * st.glow})`;
      sctx.shadowColor = 'rgba(255,211,77,.9)'; sctx.shadowBlur = 18 * st.glow; sctx.fill(); sctx.shadowBlur = 0;
    }
    sctx.restore();
    // 고정 스펙ular (조명, 휠과 함께 안 돌아감)
    const sg = sctx.createRadialGradient(cx - S * 0.22, cy - S * 0.32, 4, cx - S * 0.1, cy - S * 0.18, S * 0.7);
    sg.addColorStop(0, 'rgba(255,255,255,.16)'); sg.addColorStop(.35, 'rgba(255,230,180,.05)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = sg; sctx.beginPath(); sctx.arc(cx, cy, S * R.bowl, 0, Math.PI * 2); sctx.fill();
    // 가장자리 비네트
    const vg = sctx.createRadialGradient(cx, cy, S * 0.72, cx, cy, S * R.bowl);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)');
    sctx.fillStyle = vg; sctx.beginPath(); sctx.arc(cx, cy, S * R.bowl, 0, Math.PI * 2); sctx.fill();
    drawBall(opts && opts.blur);
  }
  function drawBall(blur) {
    const W = scene.width, cx = W / 2, cy = W / 2, S = W / 2;
    const rpx = S * st.ballR, a = angRad(st.ball);
    const x = cx + Math.cos(a) * rpx, y = cy + Math.sin(a) * rpx;
    const br = S * 0.052;
    const speed = Math.abs(st.ball - lastBall);
    lastBall = st.ball;
    const ghosts = (blur && !reduce() && speed > 2) ? Math.min(7, Math.round(speed / 4)) : 0;
    for (let i = ghosts; i >= 1; i--) {
      const ba = angRad(st.ball + (st.ballR > R.track - 0.05 ? 1 : -1) * i * Math.min(6, speed * 0.35));
      const gx = cx + Math.cos(ba) * rpx, gy = cy + Math.sin(ba) * rpx;
      sctx.beginPath(); sctx.arc(gx, gy, br * (1 - i * 0.08), 0, Math.PI * 2);
      sctx.fillStyle = `rgba(255,245,220,${0.14 / i})`; sctx.fill();
    }
    // 그림자 (기울어진 면의 ‘아래’ 쪽)
    sctx.save();
    sctx.translate(x + br * 0.15, y + br * 0.55); sctx.scale(1.15, 0.62);
    sctx.beginPath(); sctx.arc(0, 0, br, 0, Math.PI * 2);
    sctx.fillStyle = 'rgba(0,0,0,.4)'; sctx.fill();
    sctx.restore();
    const g = sctx.createRadialGradient(x - br * 0.35, y - br * 0.4, br * 0.1, x, y, br);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(.35, '#f0e2c4'); g.addColorStop(.8, '#d4c09a'); g.addColorStop(1, '#9a8060');
    sctx.beginPath(); sctx.arc(x, y, br, 0, Math.PI * 2); sctx.fillStyle = g; sctx.fill();
    sctx.beginPath(); sctx.arc(x - br * 0.28, y - br * 0.32, br * 0.28, 0, Math.PI * 2);
    sctx.fillStyle = 'rgba(255,255,255,.7)'; sctx.fill();
  }

  async function go() {
    if (st.phase !== 'bet') return;
    const stake = totalBet(); if (!stake) return;
    if (!api.wager(stake, true)) return api.toast('잔액이 부족해요');
    st.phase = 'spin'; st.prev = { ...st.bets }; api.setBusy(true); st.glow = 0;
    const n = Engine.spin(); st.spin = n;
    const res = el.querySelector('#rlRes'); if (res) { res.textContent = '—'; res.className = 'rl-res'; }
    st.msg = '공이 돕니다…'; const m = el.querySelector('#rlMsg'); if (m) m.textContent = st.msg;
    updateBtns();
    Audio2.play('wheel', { vol: 0.9 });
    await runSpin(n, reduce() ? 1400 : 5400);
    Audio2.play('ball');
    const p = Engine.payout(st.bets, n);
    const net = api.settle('유럽 룰렛', stake, p.returned);
    st.last.push(n); if (st.last.length > 100) st.last = st.last.slice(-100);
    api.E.s.rouletteHist = st.last.slice(); api.E.save();
    st.msg = (p.returned ? `당첨 +${api.fmt(net)}` : '다음 기회에') + ` · ${n} ${color(n)==='green'?'제로':color(n)==='red'?'레드':'블랙'}`;
    st.glow = 1; st.bets = {}; st.phase = 'bet'; api.setBusy(false);
    updateMeta(); updateBoard();
    const badge = el.querySelector('#rlRes');
    if (badge) { badge.textContent = n; badge.className = 'rl-res ' + color(n) + ' pop win'; }
    dolly(true);
    if (window.FX) {
      const rec = badge ? badge.getBoundingClientRect() : { left: innerWidth * 0.7, top: 180, width: 56, height: 56 };
      FX.sparkle(rec.left + rec.width / 2, rec.top + rec.height / 2, p.returned ? 28 : 12, color(n) === 'red' ? '#ff6b7a' : '#ffe27a');
      if (p.returned && net > 0) FX.coinBurst(innerWidth / 2, innerHeight * 0.28, 18);
    }
    paint();
    await wait(reduce() ? 200 : 900);
    dolly(false);
    // 글로우 유지한 채 보드만 갱신, 캔버스는 유지
    let g0 = 1, t0 = performance.now();
    const fade = (now) => {
      st.glow = Math.max(0.35, 0.35 + 0.65 * Math.sin((now - t0) / 180));
      if (now - t0 < 1600) { paint(); raf = requestAnimationFrame(fade); }
      else { st.glow = 0.4; paint(); }
    };
    raf = requestAnimationFrame(fade);
  }
  function runSpin(n, dur) {
    const idx = ORDER.indexOf(n);
    const local = (idx + 0.5) / 37 * 360;
    const startW = st.ang, startB = st.ball || 0;
    const endW = startW + 360 * 5 + ((180 - local - startW) % 360 + 360) % 360;
    const endB = startB - 360 * 8 + ((180 - startB) % 360 + 360) % 360;
    const t0 = performance.now();
    return new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const p = pose(k, local, startW, endW, startB, endB);
        st.ang = p.ang; st.ball = p.ball; st.ballR = p.r;
        paint({ blur: k < 0.86 });
        if (k < 1) raf = requestAnimationFrame(step); else {
          st.ang = 180 - local; st.ball = 180; st.ballR = R.pocket; paint(); res();
        }
      };
      raf = requestAnimationFrame(step);
    });
  }
  function dolly(on) {
    const p = el && el.querySelector('#rlPersp'); if (!p) return;
    p.classList.toggle('zoom', !!on);
  }
  function debugWin() {
    st.spin = 7;
    const idx = ORDER.indexOf(7), local = (idx + 0.5) / 37 * 360;
    st.ang = 180 - local; st.ball = 180; st.ballR = R.pocket; st.glow = 1;
    st.last = st.last.concat([32, 15, 19, 4, 7]); st.bets = { red: 100, 'n-7': 50 }; st.phase = 'bet';
    st.msg = '당첨';
    if (!el.querySelector('#rlScene')) buildShell();
    updateMeta(); updateBoard();
    const badge = el.querySelector('#rlRes');
    if (badge) { badge.textContent = 7; badge.className = 'rl-res red pop win'; }
    dolly(true); paint();
  }
  function debugMidSpin() {
    st.spin = null; st.phase = 'spin'; st.glow = 0; st.msg = '공이 돕니다…';
    const idx = ORDER.indexOf(7), local = (idx + 0.5) / 37 * 360;
    const startW = 20, endW = 20 + 360 * 5 + ((180 - local - 20) % 360 + 360) % 360;
    const startB = 80, endB = 80 - 360 * 8 + ((180 - 80) % 360 + 360) % 360;
    const p = pose(0.40, local, startW, endW, startB, endB);
    st.ang = p.ang;
    // 트랙 위 앞-오른쪽(잘 보이는 위치)에 볼 + 모션블러
    st.ball = 48; st.ballR = R.track;
    if (!el.querySelector('#rlScene')) buildShell();
    const badge = el.querySelector('#rlRes');
    if (badge) { badge.textContent = '—'; badge.className = 'rl-res'; }
    const msg = el.querySelector('#rlMsg'); if (msg) msg.textContent = st.msg;
    lastBall = st.ball + 18;
    paint({ blur: true });
  }
  function debugIdle() {
    st.spin = null; st.glow = 0; st.bets = {}; st.phase = 'bet'; st.msg = '칩을 고르고 테이블에 올려 주세요';
    st.ang = 0; st.ball = 180; st.ballR = R.pocket;
    if (!el.querySelector('#rlScene')) buildShell();
    updateMeta(); updateBoard(); dolly(false); paint();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { DEF, Engine };
  else {
    (root.GAME_DEFS = root.GAME_DEFS || []).push(DEF);
    root.GAME_MODS = root.GAME_MODS || {};
    root.GAME_MODS.roulette = { DEF, Engine, mount, unmount, help, busy, debugWin, debugMidSpin, debugIdle };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
