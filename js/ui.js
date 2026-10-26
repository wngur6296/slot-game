/* 메인 컨트롤러: 입력, HUD, 스핀 흐름, 모달 */
(() => {
  const C = SLOT_CONFIG, E = Economy, $ = (id) => document.getElementById(id);
  const engine = SlotEngine.createEngine(C);
  let spinning = false, auto = false, autoCount = 0;
  const fmt = (n) => Math.floor(n).toLocaleString();
  Reels.init(engine);

  // ----- 마키 전구 -----
  function bulbs() { const m = $('marquee'), r = m.getBoundingClientRect(), n = 34; let h = '';
    const per = 2 * (r.width + r.height); for (let i = 0; i < n; i++) { let d = (i / n) * per, x, y;
      if (d < r.width) { x = d; y = 0; } else if ((d -= r.width) < r.height) { x = r.width; y = d; } else if ((d -= r.height) < r.width) { x = r.width - d; y = r.height; } else { d -= r.width; x = 0; y = r.height - d; }
      h += `<i style="left:${x}px;top:${y}px"></i>`; } m.innerHTML = h; }
  bulbs(); addEventListener('resize', bulbs);

  // ----- HUD -----
  let shownCoins = E.s.coins;
  function hud(animate) {
    const s = E.s; $('gemText').textContent = fmt(s.gems); $('lvlNum').textContent = s.level;
    $('xpBar').style.width = Math.min(100, (100 * s.xp) / C.level.xpNeeded(s.level)) + '%';
    if (animate && s.coins > shownCoins) FX.countUp($('coinText'), shownCoins, s.coins, 900); else $('coinText').textContent = fmt(s.coins);
    shownCoins = s.coins; $('betText').textContent = fmt(E.bet());
    $('betDown').disabled = s.betIdx <= 0; $('betUp').disabled = s.betIdx >= E.maxBetIdx();
    const fs = s.freeSpins > 0; document.body.classList.toggle('freespin', fs); $('btnSpin').classList.toggle('free', fs);
    $('fsLeft').textContent = s.freeSpins; $('fsMult').textContent = C.scatter.freeSpinMultiplier;
    $('spinLabel').textContent = fs ? 'FREE' : auto ? 'STOP' : 'SPIN';
    $('btnDaily').classList.toggle('ready', E.dailyAvailable());
    Shop.renderBuffs();
    const st = s.streak, m = engine.streakMult(st); $('streak').textContent = `🔥 ${st}연승 x${m}`; $('streak').classList.toggle('on', st >= 2);
  }
  function tick() { const l = E.hourlyLeft(), b = $('btnHourly');
    if (l <= 0) { $('hourlyText').textContent = '무료 코인!'; b.classList.add('ready'); }
    else { const m = Math.floor(l / 60000), sec = Math.floor((l % 60000) / 1000); $('hourlyText').textContent = `${m}:${String(sec).padStart(2, '0')}`; b.classList.remove('ready'); } }
  setInterval(tick, 1000); tick(); hud();

  let toastT; function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  const setWin = (label, amt) => { $('winLabel').textContent = label; $('winAmount').textContent = amt ? '+' + fmt(amt) : ''; };

  E.on((ev, d) => { if (ev === 'levelup') { setTimeout(() => { Audio2.play('levelup'); toast(`🎉 레벨 ${d.level} 달성! +${fmt(d.coins)}코인 +${d.gems}젬`); FX.fireworks(3); hud(true);
    const unlock = C.economy.betUnlockLevel.indexOf(d.level); if (unlock > 0) setTimeout(() => toast(`🔓 베팅 ${fmt(C.economy.betLevels[unlock])} 해금!`), 2400); }, 600); } });

  // ----- 큰 당첨 오버레이 -----
  const TITLES = { big: 'BIG WIN', mega: 'MEGA WIN', epic: 'EPIC WIN', jackpot: 'JACKPOT!', freespins: '프리스핀!' };
  function bigWin(tier, amount, sub) {
    return new Promise((res) => {
      const o = $('bigwin'), v = $('jpVideo'), amt = $('bwAmount'); o.className = 'overlay show ' + tier; $('bwTitle').textContent = TITLES[tier];
      Audio2.duck(true);
      if (tier === 'jackpot') { v.currentTime = 0; v.play().catch(() => {}); Audio2.play('jackpot'); FX.shake(true); Haptic([80, 40, 80, 40, 200]); }
      else if (tier === 'freespins') { Audio2.play('freespins'); Haptic([40, 30, 40]); }
      else { Audio2.play('win_big'); FX.shake(tier !== 'big'); Haptic([60, 40, 120]); }
      FX.confetti(tier === 'big' || tier === 'freespins' ? 90 : 180); FX.coinRain(tier === 'big' ? 50 : 110, 2200); if (tier !== 'big') FX.fireworks(tier === 'jackpot' ? 8 : 4);
      let coinTick = 0;
      if (sub) amt.textContent = sub; else FX.countUp(amt, 0, amount, tier === 'big' ? 1800 : 3000, () => { if (++coinTick % 6 === 0) Audio2.play('coin', { vol: .4, rate: 1 + Math.random() * .3 }); });
      let done = false; const close = () => { if (done) return; if (!sub && amt.textContent !== fmt(amount)) { amt._skip = true; return; } done = true;
        o.classList.remove('show'); v.pause(); Audio2.duck(false); o.removeEventListener('pointerdown', close); res(); };
      setTimeout(() => o.addEventListener('pointerdown', close), 400); if (auto || E.s.freeSpins > 0) setTimeout(close, 4200), setTimeout(close, 4600);
    });
  }

  // ----- 스핀 -----
  async function spin() {
    if (spinning) return;
    if (!E.canSpin()) { auto = false; noCoins(); hud(); return; }
    spinning = true; $('btnSpin').classList.add('spinning'); Reels.clearWins();
    const wasFree = E.s.freeSpins > 0;
    if (auto && !wasFree && !Shop.autopass() && ++autoCount > SHOP_CONFIG.autoSpinFreeLimit) { auto = false; autoCount = 0; $('btnAuto').classList.remove('on'); spinning = false; $('btnSpin').classList.remove('spinning'); hud(); toast(`자동스핀 ${SHOP_CONFIG.autoSpinFreeLimit}회 완료 · 오토 패스로 무제한!`); return; }
    const buff = Shop.consumeForSpin(wasFree); const take = E.takeBet(buff.xp); hud();
    setWin(wasFree ? `프리스핀 (남은 ${E.s.freeSpins})` : '행운을 빌어요!', 0); $('winbar').classList.remove('flash');
    Audio2.play('spin', { vol: .7 }); Haptic(15);
    let { grid } = engine.spin(); let ev = engine.evaluate(grid, take.bet, { freeSpin: take.free });
    if (buff.luck && ev.total === 0 && Math.random() < SHOP_CONFIG.luckRerollChance) { grid = engine.spin().grid; ev = engine.evaluate(grid, take.bet, { freeSpin: take.free }); setTimeout(() => toast('🍀 행운의 부적 발동!'), 300); } // 행운의 부적
    const near = engine.nearMiss(grid);
    await Reels.spin(grid, { turbo: E.s.settings.turbo, nearMiss: near,
      onStop: (r) => { Audio2.play('stop', { vol: .8, rate: 1 + r * .05 }); Haptic(10); if (r === 2) Audio2.stop('tension'); },
      onAnticipate: () => Audio2.play('tension', { vol: .7 }) });
    let win = ev.total * ev.mult * buff.boost;
    if (win > 0) { E.s.streak++; win = Math.round(win * engine.streakMult(E.s.streak)); } else E.s.streak = 0;
    const ratio = win / take.bet, T = C.winTiers;
    const tier = ev.jackpot ? 'jackpot' : ratio >= T.epic ? 'epic' : ratio >= T.mega ? 'mega' : ratio >= T.big ? 'big' : win > 0 ? 'small' : 'none';
    const pts = Reels.showWins(ev.wins);
    if (win > 0) {
      const gems = E.award(win, tier); $('machine').classList.add('hot');
      pts.forEach(([x, y], i) => setTimeout(() => FX.sparkle(x, y, 18), i * 60));
      const label = ev.mult * buff.boost > 1 || engine.streakMult(E.s.streak) > 1 ? `당첨! x${(ev.mult * buff.boost * engine.streakMult(E.s.streak)).toFixed(1).replace('.0', '')}` : '당첨!';
      setWin(label, 0); $('winbar').classList.add('flash');
      if (tier === 'small') { Audio2.play('win_small'); Haptic(30); if (pts[0]) FX.coinBurst(pts[Math.floor(pts.length / 2)][0], pts[Math.floor(pts.length / 2)][1], Math.min(40, 8 + Math.round(ratio * 6))); FX.countUp($('winAmount'), 0, win, 700); $('winAmount').textContent = '+' + fmt(win); }
      else { await bigWin(tier, win); setWin(TITLES[tier], win); }
      if (gems) toast(`💎 보너스 젬 +${gems}`);
      setTimeout(() => $('machine').classList.remove('hot'), 1500);
    } else if (buff.insurance && !take.free) { const r = Math.round(take.bet * buff.insurance); E.s.coins += r; E.save(); setWin('🛡️ 보험 환급', r); }
    else if (near) setWin('아깝다! 😱', 0); else setWin(wasFree ? `프리스핀 (남은 ${E.s.freeSpins})` : '다시 도전!', 0);
    if (ev.freeSpins) { if (!wasFree) E.s.fsBet = take.bet; E.s.freeSpins += ev.freeSpins; E.save(); await bigWin('freespins', 0, `${ev.freeSpins}회 · 당첨 x${C.scatter.freeSpinMultiplier}`); }
    E.save(); hud(true); spinning = false; $('btnSpin').classList.remove('spinning');
    if (E.s.freeSpins > 0 || auto) setTimeout(spin, (tier === 'none' ? 1 : 2.2) * C.timing.autoDelay * (E.s.settings.turbo ? .6 : 1));
    else if (wasFree) { toast(`프리스핀 종료!`); }
  }

  function noCoins() {
    const l = E.hourlyLeft();
    // 베팅을 내릴 수 있으면 먼저 내림
    while (E.s.betIdx > 0 && E.s.coins < E.bet()) E.changeBet(-1);
    if (E.canSpin()) { toast('코인이 부족해 베팅을 낮췄어요'); return hud(); }
    modal(`<h2>코인이 부족해요 😢</h2><p>무료 코인은 ${l > 0 ? Math.ceil(l / 60000) + '분 뒤' : '지금'} 받을 수 있어요. 젬으로 코인을 바꾸거나 출석 보상을 받아보세요.</p>
      <button class="btn" id="mRescue">구조 코인 ${fmt(C.economy.bankruptRescue)} 받기</button><button class="btn alt" id="mShop">젬 상점</button>`);
    $('mRescue').onclick = () => { E.s.coins += C.economy.bankruptRescue; E.save(); hud(true); closeModal(); Audio2.play('coin'); };
    $('mShop').onclick = () => Shop.open('ex');
  }

  // ----- 모달 -----
  function modal(html) { $('modalBody').innerHTML = html; $('modal').classList.add('show'); Audio2.play('click'); }
  function closeModal() { $('modal').classList.remove('show'); }
  $('modalClose').onclick = closeModal; $('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });

  function paytable() {
    const s = C.symbols, row = (k, v) => `<div><img src="assets/img/${s[k].img}.webp"><span>${s[k].name}</span><b>${v}</b></div>`;
    const lb = C.paylines.length;
    modal(`<h2>📜 배당표</h2><p>총 ${lb}라인 · 라인 베팅 = 베팅 ÷ ${lb}. 같은 심볼 3개가 라인에 맞으면 당첨!</p>
      <div class="pt">${['wild', 'diamond', 'seven', 'bar', 'bell', 'grape', 'lemon', 'cherry'].map((k) => row(k, `x${C.paytable[k]}`)).join('')}${row('scatter', `${C.scatter.freeSpins}회 무료`)}</div>
      <h3>✨ 특수 규칙</h3><p>• <b>와일드</b>: 보너스 외 모든 심볼 대체. 와일드 3개 = <b>잭팟</b> (라인베팅 x${C.paytable.wild})<br>
      • <b>체리 2개</b>(1·2번 릴): 라인베팅 x${C.cherryTwo}<br>
      • <b>보너스 3개</b>(어디든): 프리스핀 ${C.scatter.freeSpins}회 + 모든 당첨 x${C.scatter.freeSpinMultiplier} (2개도 베팅 x${C.scatter.pay[2]})<br>
      • <b>연승 보너스</b>: 3연승 x${C.streakMultipliers[2]}, 4연승 x${C.streakMultipliers[3]}, 5연승+ x${C.streakMultipliers[4]}<br>
      • 이론 환수율(RTP) 약 96% · 가상 코인 전용</p>`);
  }
  function daily() {
    const avail = E.dailyAvailable(), di = E.dailyDayIndex(), D = C.economy;
    modal(`<h2>📅 출석 보상</h2><p>매일 접속하면 보상이 커져요! 7일 연속 시 대박 보상.</p>
      <div class="days">${D.dailyBonus.map((c, i) => `<div class="${avail ? (i < di ? 'done' : i === di ? 'today' : '') : i < E.s.dailyStreak ? 'done' : ''}">${i + 1}일차<b>${fmt(c)}</b>💎${D.dailyGems[i]}</div>`).join('')}</div>
      <button class="btn" id="mClaim" ${avail ? '' : 'disabled'}>${avail ? '보상 받기' : '내일 다시 오세요'}</button>`);
    $('mClaim').onclick = () => { const r = E.claimDaily(); if (!r) return; closeModal(); Audio2.play('win_big'); FX.coinRain(60, 1500); FX.confetti(80); toast(`${r.day}일차 보상 +${fmt(r.coins)}코인 +${r.gems}젬`); hud(true); };
  }
  function menu() {
    const s = E.s, st = s.stats, sw = (id, on, label) => `<div class="row"><span>${label}</span><button class="switch ${on ? 'on' : ''}" id="${id}"></button></div>`;
    modal(`<h2>⚙️ 설정</h2>${sw('swSfx', s.settings.sfx, '효과음')}${sw('swBgm', s.settings.bgm, '배경음악')}
      <h3>📊 기록</h3><p>스핀 ${fmt(st.spins)}회 · 총 베팅 ${fmt(st.wagered)} · 총 당첨 ${fmt(st.won)}<br>최고 당첨 ${fmt(st.biggest)} · 잭팟 ${st.jackpots}회</p>
      <h3>📱 홈 화면에 추가</h3><p>Safari 공유 버튼 → "홈 화면에 추가"로 앱처럼 전체화면 실행할 수 있어요.</p>
      <button class="btn danger" id="mReset">게임 초기화</button>`);
    $('swSfx').onclick = (e) => { s.settings.sfx = !s.settings.sfx; Audio2.setSfx(s.settings.sfx); e.target.classList.toggle('on'); E.save(); };
    $('swBgm').onclick = (e) => { s.settings.bgm = !s.settings.bgm; Audio2.setBgm(s.settings.bgm); e.target.classList.toggle('on'); E.save(); };
    $('mReset').onclick = () => { if (confirm('모든 진행 상황을 초기화할까요?')) { E.reset(); shownCoins = E.s.coins; auto = false; closeModal(); hud(); toast('초기화 완료!'); } };
  }
  function levelInfo() { const s = E.s, D = C.economy;
    modal(`<h2>⭐ 레벨 ${s.level}</h2><p>경험치 ${fmt(s.xp)} / ${fmt(C.level.xpNeeded(s.level))} (베팅할수록 쌓여요)<br>다음 레벨 보상: 🪙${fmt(C.level.rewardCoins(s.level + 1))} 💎${C.level.rewardGems(s.level + 1)}</p>
      <h3>🔓 베팅 해금</h3><p>${D.betLevels.map((b, i) => `${s.level >= D.betUnlockLevel[i] ? '✅' : '🔒'} ${fmt(b)} (Lv.${D.betUnlockLevel[i]})`).join('<br>')}</p>`); }

  Shop.init({ modal, closeModal, toast, hud: (a) => hud(a) });

  // ----- 입력 -----
  const tap = (id, f) => $(id).addEventListener('click', f);
  tap('btnSpin', () => { if (auto) { auto = false; $('btnAuto').classList.remove('on'); hud(); return; } spin(); });
  tap('betUp', () => { if (spinning || E.s.freeSpins) return; if (E.changeBet(1)) { Audio2.play('click'); hud(); } else toast(`레벨업하면 더 큰 베팅이 열려요`); });
  tap('betDown', () => { if (spinning || E.s.freeSpins) return; if (E.changeBet(-1)) { Audio2.play('click'); hud(); } });
  tap('btnAuto', () => { auto = !auto; autoCount = 0; $('btnAuto').classList.toggle('on', auto); Audio2.play('click'); hud(); if (auto) spin(); });
  tap('btnTurbo', () => { E.s.settings.turbo = !E.s.settings.turbo; $('btnTurbo').classList.toggle('on', E.s.settings.turbo); E.save(); Audio2.play('click'); });
  tap('btnHourly', () => { const c = E.claimHourly(); if (c) { Audio2.play('win_small'); const b = $('btnHourly').getBoundingClientRect(); FX.coinBurst(b.left + b.width / 2, b.top, 40); toast(`🎁 무료 코인 +${fmt(c)}`); hud(true); tick(); } else toast(`${Math.ceil(E.hourlyLeft() / 60000)}분 뒤에 받을 수 있어요`); });
  tap('btnDaily', daily); tap('btnInfo', paytable); tap('btnShop', () => Shop.open('ex')); tap('btnStore', () => Shop.open()); tap('btnMenu', menu); tap('btnLevel', levelInfo);
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); $('btnSpin').click(); } });
  $('btnTurbo').classList.toggle('on', E.s.settings.turbo);

  // ----- 시작 (오디오 잠금 해제) -----
  $('btnStart').addEventListener('click', () => {
    Audio2.unlock(); Audio2.setSfx(E.s.settings.sfx); if (!E.s.settings.bgm) Audio2.setBgm(false);
    $('intro').classList.add('hide'); setTimeout(() => $('intro').remove(), 600);
    const v = $('jpVideo'); v.play().then(() => v.pause()).catch(() => {}); // iOS 비디오 사전 준비
    if (E.dailyAvailable()) setTimeout(daily, 700);
  }, { once: true });
  document.addEventListener('touchstart', () => Audio2.unlock(), { passive: true });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__slot = { spin, E, engine, bigWin, Shop }; // 디버그/테스트용
})();
