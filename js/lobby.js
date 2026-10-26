/* 로비: 게임 선택(카테고리 탭·이벤트 배너·실시간 당첨 티커), 이벤트(일일 미션), 지갑(잔액·충전·VIP·거래내역) */
const Lobby = (() => {
  const $ = (id) => document.getElementById(id), C = SLOT_CONFIG, E = C.economy;
  const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');
  let page = 'home', cat = 'all', bannerI = 0, tickT = 0;
  const CATS = [['all', '전체'], ['hot', '인기'], ['high', '고배당'], ['bonus', '보너스'], ['jp', '잭팟']];
  const inCat = (d, c) => c === 'all' || (c === 'hot' && ['classic', 'bunny', 'fruit'].includes(d.id)) || (c === 'high' && d.lobby.volatility >= 4)
    || (c === 'bonus' && (d.id === 'bunny' || d.lobby.features.some((f) => /프리스핀|확장/.test(f)) && d.lobby.volatility <= 3)) || (c === 'jp' && (d.features || {}).progressive);
  const BANNERS = [
    { t: '🐰 신규 게임 OPEN', s: '바니 나이트 — 확장 와일드 & 하트 보너스', go: 'bunny', cls: 'b1' },
    { t: '💎 MEGA VAULT 누적 잭팟', s: () => `현재 잭팟 ${fmt(Machine.pool())} 코인`, go: 'mega', cls: 'b2' },
    { t: '🎁 30분마다 무료 충전', s: 'VIP 등급이 오를수록 충전량 UP', go: 'wallet', cls: 'b3' },
    { t: '🏆 일일 미션 이벤트', s: '미션 완료하고 보너스 코인 + 젬 받기', go: 'promo', cls: 'b4' }];
  const Machine = { pool: () => { const d = Slots.get('mega'); return (Game && window.__slot && __slot.E.s.pools.mega) || d.features.progressive.seed; } };
  const NICK_A = ['럭키', '골드', '나이트', '블루', '레드', '와일드', '스타', '문라이트', '네온', '크라운', '체리', '드래곤', '하트', '실버'];
  const NICK_B = ['헌터', '킹', '러너', '토끼', '여우', '고래', '메이커', '7', '보스', '팬더', '타이거', '라이더'];
  const nick = () => { const n = NICK_A[Math.random() * NICK_A.length | 0] + NICK_B[Math.random() * NICK_B.length | 0] + (Math.random() * 99 | 0); return n.slice(0, 2) + '*'.repeat(Math.max(2, n.length - 4)) + n.slice(-2); };
  function fakeWin() { const L = Slots.list(), d = L[Math.random() * L.length | 0], r = Math.random();
    const x = r < 0.6 ? 10 + Math.random() * 40 : r < 0.92 ? 50 + Math.random() * 200 : 300 + Math.random() * 900;
    const bet = C.economy.betLevels[Math.min(8, (d.minBetIdx || 0) + (Math.random() * 5 | 0))]; return { n: nick(), g: d.name, w: Math.round(bet * x / 10) * 10, x: Math.round(x) }; }
  const vol = (v) => '<i class="vol">' + [1, 2, 3, 4, 5].map((i) => `<b class="${i <= v ? 'on' : ''}"></b>`).join('') + '</i>';
  const volName = ['', '매우 낮음', '낮음', '보통', '높음', '매우 높음'];

  function home() {
    const s = E_().s, L = Slots.list().filter((d) => inCat(d, cat));
    const b = BANNERS[bannerI % BANNERS.length];
    return `<div class="banner ${b.cls}" data-banner="${b.go}"><div><b>${b.t}</b><span>${typeof b.s === 'function' ? b.s() : b.s}</span></div><em>바로가기 ›</em>
        <div class="dots">${BANNERS.map((_, i) => `<i class="${i === bannerI % BANNERS.length ? 'on' : ''}"></i>`).join('')}</div></div>
      <div class="ticker"><span class="live">LIVE</span><div class="tk-win" id="tkWin"></div></div>
      <div class="cats">${CATS.map(([k, n]) => `<button class="${k === cat ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('')}</div>
      <div class="games">${L.map((d) => { const lock = s.level < d.level, PG = (d.features || {}).progressive, rtp = d.lobby.rtp;
        return `<div class="gcard ${lock ? 'locked' : ''} ${s.lastSlot === d.id ? 'last' : ''}" data-slot="${d.id}" style="--g1:${d.theme.vars.f1};--g2:${d.theme.vars.f2}">
          <div class="gc-art" style="background-image:url(assets/img/${d.theme.bg}.webp)"><img src="assets/img/${d.theme.cover}.webp" alt="">${d.theme.character ? `<img class="gc-ch" src="assets/img/${d.theme.character.idle}.webp" alt="">` : ''}
            <span class="gc-tag">${d.lobby.tag}</span>${PG ? `<span class="gc-jp">JACKPOT ${fmt(s.pools[d.id] || PG.seed)}</span>` : ''}${lock ? `<span class="gc-lock">🔒 Lv.${d.level}</span>` : ''}</div>
          <div class="gc-body"><h4>${d.name}</h4>
            <div class="gc-meta"><span>변동성 ${vol(d.lobby.volatility)}</span><span>RTP <b>${rtp}%</b></span><span>최소 <b>${fmt(C.economy.betLevels[d.minBetIdx || 0])}</b></span></div>
            <div class="gc-feat">${d.lobby.features.map((f) => `<i>${f}</i>`).join('')}</div>
            <ul class="gc-pc">${d.lobby.pros.map((p) => `<li class="pro">${p}</li>`).join('')}${d.lobby.cons.map((p) => `<li class="con">${p}</li>`).join('')}</ul>
            <button class="gc-play">${lock ? `레벨 ${d.level} 필요` : '플레이'}</button></div></div>`; }).join('') || '<p class="empty">해당 게임이 없어요</p>'}</div>
      <p class="foot">실제 돈이 오가지 않는 게임입니다</p>`;
  }
  function promo() {
    const m = E_().missionsToday();
    return `<div class="banner b4 big"><div><b>🏆 일일 미션</b><span>매일 자정 초기화 · 완료 후 보상 받기</span></div></div>
      <div class="missions">${E.missions.map((d) => { const p = Math.min(d.goal, m.prog[d.key] || 0), done = p >= d.goal, got = m.claimed.includes(d.id);
        return `<div class="mis ${got ? 'got' : done ? 'done' : ''}"><div class="mi-t"><b>${d.name}</b><small>보상 🪙${fmt(d.coins)}${d.gems ? ` · 💎${d.gems}` : ''}</small>
          <div class="bar"><i style="width:${p / d.goal * 100}%"></i></div><small>${fmt(p)} / ${fmt(d.goal)}</small></div>
          <button data-claim="${d.id}" ${done && !got ? '' : 'disabled'}>${got ? '완료' : done ? '받기' : '진행중'}</button></div>`; }).join('')}</div>
      <div class="promo-list"><div class="pr"><b>📅 출석 보너스</b><span>7일 연속 출석 시 최대 보상 · VIP 배수 적용</span><button data-act="daily">출석 체크</button></div>
        <div class="pr"><b>👑 VIP 승급 보너스</b><span>누적 베팅으로 등급 상승 · 충전/출석 혜택 증가</span><button data-go="wallet">VIP 보기</button></div>
        <div class="pr"><b>🐰 바니 나이트</b><span>레벨 3부터 입장 · 확장 와일드</span><button data-slot="bunny">플레이</button></div></div>
      <p class="foot">실제 돈이 오가지 않는 게임입니다</p>`;
  }
  function wallet() {
    const s = E_().s, v = E_().vip(), left = E_().chargeLeft();
    const TXN = { game: '게임', charge: '충전', daily: '출석', mission: '미션', shop: '상점', level: '레벨업', exchange: '환전', hourly: '충전', bonus: '보너스' };
    return `<div class="wcard"><small>보유 잔액</small><div class="wbal"><span class="ico coin-ico"></span><b>${fmt(s.coins)}</b></div>
        <div class="wrow"><span>💎 젬 ${fmt(s.gems)}</span><span>Lv.${s.level}</span></div>
        <button class="charge ${left <= 0 ? 'ready' : ''}" id="wCharge">${left <= 0 ? `무료 충전 +${fmt(E_().chargeAmount())}` : `다음 충전 <b id="wLeft">${clock(left)}</b>`}</button>
        <small class="cnote">30분마다 무료 충전 · VIP 등급별 충전량 증가</small></div>
      <div class="vipcard" style="--vc:${v.tier.color}"><div class="vt"><b>VIP ${v.tier.name}</b><small>충전 x${v.tier.chargeMult} · 출석 x${v.tier.dailyMult}</small></div>
        <div class="bar"><i style="width:${v.progress * 100}%"></i></div>
        <small>${v.next ? `${v.next.name}까지 ${fmt(v.next.pts - s.vipPts)} P (누적 베팅 1코인 = 1P)` : '최고 등급 달성!'}</small>
        <div class="tiers">${E.vipTiers.map((t, i) => `<i class="${i <= v.idx ? 'on' : ''}" style="--c:${t.color}">${t.name}</i>`).join('')}</div></div>
      <div class="wstat"><div><small>총 베팅</small><b>${fmt(s.stats.wagered)}</b></div><div><small>총 당첨</small><b>${fmt(s.stats.won || 0)}</b></div><div><small>최고 당첨</small><b>${fmt(s.stats.biggest || 0)}</b></div></div>
      <h3 class="wh">거래 내역</h3><div class="txl">${(s.tx || []).slice(0, 60).map((t) => `<div class="tx"><i class="tt-${t.type}">${TXN[t.type] || t.type}</i><span>${t.label}<small>${new Date(t.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></span>
        <b class="${t.amount >= 0 ? 'p' : 'm'}">${t.amount >= 0 ? '+' : ''}${fmt(t.amount)}${t.cur === 'gems' ? '💎' : ''}</b></div>`).join('') || '<p class="empty">아직 거래 내역이 없어요</p>'}</div>
      <p class="foot">실제 돈이 오가지 않는 게임입니다</p>`;
  }
  const clock = (ms) => { const t = Math.ceil(ms / 1000); return `${String(t / 60 | 0).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const E_ = () => window.__slot.E;

  function render() {
    const s = E_().s, v = E_().vip();
    $('lbLvl').textContent = s.level; $('lbVip').textContent = 'VIP ' + v.tier.name; $('lbVip').style.color = v.tier.color;
    $('lbTitle').textContent = document.querySelector('.logo-sub') ? `Lv.${s.level} · ${fmt(s.vipPts)} P` : '';
    $('lbCoins').textContent = fmt(s.coins); $('lbGems').textContent = fmt(s.gems);
    const el = $({ home: 'pgHome', promo: 'pgPromo', wallet: 'pgWallet' }[page]); const sc = el.scrollTop;
    el.innerHTML = { home, promo, wallet }[page](); el.scrollTop = sc;
    document.querySelectorAll('.lb-page').forEach((p) => p.classList.toggle('on', p.dataset.page === page));
    document.querySelectorAll('.lb-nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === page));
    if (page === 'home') ticker(true);
  }
  function ticker(now) { const el = $('tkWin'); if (!el) return; const w = fakeWin();
    el.innerHTML = `<span class="tk-in"><b>${w.n}</b>님 ${w.g}에서 <em>${fmt(w.w)}</em> 당첨! <small>x${w.x}</small></span>`; }
  function go(p) {
    if (p === 'shop') return Shop.open(); if (p === 'menu') return Game.menu();
    page = p; render(); $('lobby').querySelector('.lb-pages').scrollTop = 0;
  }
  function show(p) { $('lobby').classList.add('on'); document.body.classList.add('in-lobby'); if (p) page = p; Audio2.setTheme({ bgm: 'casino_loop' }); render(); }
  function hide() { $('lobby').classList.remove('on'); document.body.classList.remove('in-lobby'); }
  function play(id) { const d = Slots.get(id), s = E_().s;
    if (s.level < d.level) { Audio2.play('click'); return Game.toast(`🔒 레벨 ${d.level}에 열려요 (현재 Lv.${s.level})`); }
    if (s.coins < C.economy.betLevels[d.minBetIdx || 0] && s.freeSpins <= 0) Game.toast('잔액이 부족해요 · 지갑에서 무료 충전!');
    Audio2.play('coin'); hide(); Game.enterSlot(id); }
  function tick() { if (!$('lobby').classList.contains('on')) return; tickT++;
    if (page === 'home' && tickT % 3 === 0) ticker(); if (page === 'home' && tickT % 6 === 0) { bannerI++; const b = document.querySelector('.banner'); if (b) render(); }
    if (page === 'wallet') { const l = E_().chargeLeft(), w = $('wLeft'); if (w && l > 0) w.textContent = clock(l); else if (w && l <= 0) render(); } }

  $('lobby').addEventListener('click', (e) => {
    Audio2.unlock(); const t = e.target.closest('[data-slot],[data-cat],[data-go],[data-banner],[data-claim],[data-act],#wCharge,#lbBal,#lbGem,#lbProf'); if (!t) return;
    if (t.dataset.slot) return play(t.dataset.slot);
    if (t.dataset.cat) { cat = t.dataset.cat; Audio2.play('click'); return render(); }
    if (t.dataset.go) { Audio2.play('click'); return go(t.dataset.go); }
    if (t.dataset.banner) { const g = t.dataset.banner; return Slots.get(g) ? play(g) : go(g); }
    if (t.dataset.claim) { const r = E_().claimMission(t.dataset.claim); if (r) { Audio2.play('win_small'); Game.toast(`🏆 미션 보상 +${fmt(r.coins)}${r.gems ? ` · 💎${r.gems}` : ''}`); render(); } return; }
    if (t.dataset.act === 'daily') { if (E_().dailyAvailable()) Game.daily(); else Game.toast('오늘 출석은 완료했어요'); return; }
    if (t.id === 'wCharge') { if (Game.charge(t)) render(); return; }
    if (t.id === 'lbBal') return go('wallet'); if (t.id === 'lbGem') return Shop.open('ex'); if (t.id === 'lbProf') return Game.levelInfo();
  });
  return { show, hide, render, tick, go, get page() { return page; } };
})();
Lobby.show();
