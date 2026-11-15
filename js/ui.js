/* 메인 컨트롤러: 입력, HUD, 스핀 흐름, 모달 */
(() => {
  const C = SLOT_CONFIG, E = Economy, $ = (id) => document.getElementById(id);
  let engine = SlotEngine.createEngine(C);
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
  $('coinText')._fmt = fmtCompact;
  function hud(animate) {
    const s = E.s; $('gemText').textContent = fmt(s.gems); $('lvlNum').textContent = s.level;
    $('xpBar').style.width = Math.min(100, (100 * s.xp) / C.level.xpNeeded(s.level)) + '%';
    if (animate && s.coins > shownCoins) FX.countUp($('coinText'), shownCoins, s.coins, 900); else $('coinText').textContent = fmtCompact(s.coins); $('coinText').title = fmt(s.coins);
    shownCoins = s.coins; $('betText').textContent = fmt(E.bet());
    $('betDown').disabled = s.betIdx <= 0; $('betUp').disabled = s.betIdx >= E.maxBetIdx();
    const fs = s.freeSpins > 0; document.body.classList.toggle('freespin', fs); $('btnSpin').classList.toggle('free', fs);
    $('fsLeft').textContent = s.freeSpins; $('fsMult').textContent = C.scatter.freeSpinMultiplier;
    $('spinLabel').textContent = fs ? 'FREE' : auto ? 'STOP' : 'SPIN';
    $('btnDaily').classList.toggle('ready', E.dailyAvailable());
    Shop.renderBuffs();
    const st = s.streak, m = engine.streakMult(st); $('streak').textContent = `🔥 ${st}연승 x${m}`; $('streak').classList.toggle('on', st >= 2 && m > 1);
  }
  function tick() { const l = E.chargeLeft(), b = $('btnHourly'); if (window.Lobby) Lobby.tick();
    if (l <= 0) { $('hourlyText').textContent = '충전!'; b.classList.add('ready'); }
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

  // ----- 캐릭터 리액션 (theme.character 가 있는 슬롯) -----
  let sayT;
  function say(kind) { const ch = C.theme && C.theme.character; if (!ch) return; const L = ch.lines[kind] || ch.lines.idle; const b = $('charBubble');
    b.textContent = L[Math.floor(Math.random() * L.length)]; b.classList.add('show'); clearTimeout(sayT); sayT = setTimeout(() => b.classList.remove('show'), 2600); }
  function pose(p) { const ch = C.theme && C.theme.character; if (!ch) return; const el = $('character'); $('charImg').src = `assets/img/${ch[p] || ch.idle}.webp`;
    el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); }
  function react(tier, near) { const ch = C.theme && C.theme.character; if (!ch) return;
    if (tier === 'none') { if (near) { pose('sad'); say('sad'); setTimeout(() => pose('idle'), 2500); } return; }
    pose('win'); say(tier === 'small' ? 'win' : 'big'); setTimeout(() => pose('idle'), tier === 'small' ? 2200 : 5000); }
  function showPool() { const PG = (C.features || {}).progressive; $('jpPool').classList.toggle('on', !!PG); if (PG) $('jpPoolVal').textContent = fmt(E.s.pools[C.id] || PG.seed); }

  // ----- 슬롯 입장 -----
  function enterSlot(id) {
    const d = Slots.apply(id); engine = SlotEngine.createEngine(C); Reels.init(engine); Reels.clearWins();
    E.markPlayed(id, false);
    if (E.s.betIdx < (d.minBetIdx || 0)) E.s.betIdx = d.minBetIdx;
    document.body.dataset.slot = id; $('logoA').textContent = d.theme.logo[0]; $('logoB').textContent = d.theme.logo[1];
    $('logoB').classList.toggle('long', d.theme.logo[1].length > 2);
    $('character').classList.toggle('on', !!d.theme.character); if (d.theme.character) { pose('idle'); setTimeout(() => say('idle'), 800); }
    Shop.applyCosmetics(); Audio2.setTheme(d.theme); showPool(); setWin('행운을 빌어요!', 0); E.save(); hud(); bulbs();
    setTimeout(() => { if (window.Guides) Guides.maybeTip(id); }, 450);
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
    const PG = (C.features || {}).progressive;
    if (PG && !take.free) { E.s.pools[C.id] = (E.s.pools[C.id] || PG.seed) + take.bet * PG.contrib; }
    if (ev.expanded != null) { Audio2.play('expand'); say('expand'); FX.shake(); await Reels.expand(ev.expanded); }
    let win = ev.total * ev.mult * buff.boost;
    if (win > 0) { E.s.streak++; win = Math.round(win * engine.streakMult(E.s.streak)); } else E.s.streak = 0;
    let poolWin = 0;
    if (ev.progressive && PG) { const pool = E.s.pools[C.id] || PG.seed; poolWin = Math.floor(pool * Math.min(1, take.bet / PG.refBet)); E.s.pools[C.id] = Math.max(PG.seed, pool - poolWin); win += poolWin; ev.jackpot = true; }
    const ratio = win / take.bet, T = C.winTiers;
    const tier = ev.jackpot ? 'jackpot' : ratio >= T.epic ? 'epic' : ratio >= T.mega ? 'mega' : ratio >= T.big ? 'big' : win > 0 ? 'small' : 'none';
    const pts = Reels.showWins(ev.wins);
    if (win > 0) E.mission('wins', 1); if (ev.freeSpins) E.mission('freespins', 1); if (['big', 'mega', 'epic', 'jackpot'].includes(tier)) E.mission('bigwin', 1);
    E.tx('game', `${C.name}${take.free ? ' 프리스핀' : ''}${poolWin ? ' · 누적 잭팟!' : ''}`, win - (take.free ? 0 : take.bet));
    react(tier, near); showPool();
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
    const S = C.symbols, F = C.features || {}, row = (k, v) => `<div><img src="assets/img/${S[k].img}.webp"><span>${S[k].name}</span><b>${v}</b></div>`;
    const lb = C.paylines.length, wildK = Object.keys(S).find((k) => S[k].wild), scK = Object.keys(S).find((k) => S[k].scatter);
    const keys = Object.keys(C.paytable).sort((a, b) => (C.paytable[b] || 1e9) - (C.paytable[a] || 1e9));
    const rules = [];
    rules.push(`<b>${S[wildK].name}</b>: 보너스 외 심볼 대체${C.jackpotSymbol === 'wild' ? ` · 3개 = <b>잭팟</b>` : ''}`);
    Object.entries(C.twoKind || {}).forEach(([k, v]) => rules.push(`<b>${S[k].name} 2개</b>(1·2번 릴): 라인베팅 x${v}`));
    if (C.mixPay) rules.push(`<b>과일 믹스</b>: ${Object.keys(S).filter((k) => S[k].fruit).map((k) => S[k].name).join('·')} 아무거나 3개 = 라인베팅 x${C.mixPay}`);
    if (F.wildMultiplier) rules.push(`<b>와일드 배수</b>: 당첨 라인의 와일드 1개당 x${F.wildMultiplier} (2개면 x${F.wildMultiplier ** 2})`);
    if (F.expandWild) rules.push(`<b>확장 와일드</b>: ${F.expandWild.reel + 1}번 릴에 와일드가 뜨면 릴 전체가 와일드!`);
    if (F.progressive) rules.push(`<b>누적 잭팟</b>: ${S[F.progressive.sym].name} 3개(라인) = 누적 잭팟 지급 · 베팅의 ${F.progressive.contrib * 100}% 적립 · 베팅 ${fmt(F.progressive.refBet)} 이상이면 100% 지급`);
    rules.push(`<b>${S[scK].name} 3개</b>(어디든): 프리스핀 ${C.scatter.freeSpins}회 · 당첨 x${C.scatter.freeSpinMultiplier}`);
    if ((C.streakMultipliers || []).length > 2) rules.push(`<b>연승 보너스</b>: ${C.streakMultipliers.map((m, i) => m > 1 ? `${i + 1}연승 x${m}` : '').filter(Boolean).join(', ')}`);
    modal(`<h2>📜 ${C.name} 배당표</h2><p>총 ${lb}라인 · 라인 베팅 = 베팅 ÷ ${lb}. 같은 심볼 3개가 라인에 맞으면 당첨!</p>
      <div class="pt">${keys.map((k) => row(k, C.paytable[k] ? `x${C.paytable[k]}` : 'JACKPOT')).join('')}${row(scK, `${C.scatter.freeSpins}회 무료`)}</div>
      <h3>✨ 특수 규칙</h3><p>${rules.map((r) => '• ' + r).join('<br>')}<br>• 이론 환수율(RTP) 약 96%</p>`);
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
      <button class="btn alt" id="mSave">💾 저장 / 불러오기</button><button class="btn danger" id="mReset">게임 초기화</button>`);
    $('mSave').onclick = saveMenu;
    $('swSfx').onclick = (e) => { s.settings.sfx = !s.settings.sfx; Audio2.setSfx(s.settings.sfx); e.target.classList.toggle('on'); E.save(); };
    $('swBgm').onclick = (e) => { s.settings.bgm = !s.settings.bgm; Audio2.setBgm(s.settings.bgm); e.target.classList.toggle('on'); E.save(); };
    $('mReset').onclick = () => { if (confirm('모든 진행 상황을 초기화할까요?')) { E.reset(); shownCoins = E.s.coins; auto = false; closeModal(); hud(); toast('초기화 완료!'); } };
  }
  function levelInfo() { const s = E.s, D = C.economy;
    modal(`<h2>⭐ 레벨 ${s.level}</h2><p>경험치 ${fmt(s.xp)} / ${fmt(C.level.xpNeeded(s.level))} (베팅할수록 쌓여요)<br>다음 레벨 보상: 🪙${fmt(C.level.rewardCoins(s.level + 1))} 💎${C.level.rewardGems(s.level + 1)}</p>
      <h3>🔓 베팅 해금</h3><p>${D.betLevels.map((b, i) => `${s.level >= D.betUnlockLevel[i] ? '✅' : '🔒'} ${fmt(b)} (Lv.${D.betUnlockLevel[i]})`).join('<br>')}</p>`); }

  Shop.init({ modal, closeModal, toast, hud: (a) => hud(a) });

  function charge(el) { const c = E.charge(); if (c) { Audio2.play('win_small'); const b = el.getBoundingClientRect(); FX.coinBurst(b.left + b.width / 2, b.top, 40); toast(`💰 충전 완료 +${fmt(c)}`); hud(true); tick(); if (window.Lobby) Lobby.render(); return c; }
    toast(`다음 충전까지 ${Math.ceil(E.chargeLeft() / 60000)}분`); return 0; }
  function saveMenu() {
    const row = (i) => { const inf = E.slotInfo(i); return `<div class="save-row"><div><b>슬롯 ${i + 1}</b><small>${inf ? `${new Date(inf.t).toLocaleString('ko-KR')} · Lv.${inf.level} · 🪙${fmt(inf.coins)}` : '비어 있음'}</small></div>
      <button class="cbtn buy" data-save="${i}">저장</button><button class="cbtn" data-load="${i}" ${inf ? '' : 'disabled'}>불러오기</button></div>`; };
    modal(`<h2>💾 저장 / 불러오기</h2><p class="hint">진행 상황은 매 스핀·구매마다 자동 저장돼요. 수동 슬롯과 저장 코드로 백업하거나 다른 기기로 옮길 수 있어요.</p>
      ${[0, 1, 2].map(row).join('')}<h3>📤 저장 코드 내보내기</h3><textarea id="exCode" readonly></textarea><button class="btn alt" id="btnCopy">코드 생성 · 복사</button>
      <h3>📥 저장 코드 가져오기</h3><textarea id="imCode" placeholder="L7S3.로 시작하는 코드를 붙여넣으세요"></textarea><button class="btn" id="btnImport">가져오기</button>`);
    document.querySelectorAll('[data-save]').forEach((b) => b.onclick = () => { E.saveSlot(+b.dataset.save); toast(`슬롯 ${+b.dataset.save + 1}에 저장했어요`); saveMenu(); });
    document.querySelectorAll('[data-load]').forEach((b) => b.onclick = () => { if (confirm('현재 진행 상황을 이 슬롯으로 덮어쓸까요?') && E.loadSlot(+b.dataset.load)) { toast('불러오기 완료!'); setTimeout(() => location.reload(), 500); } });
    $('btnCopy').onclick = () => { const c = E.exportCode(); $('exCode').value = c; $('exCode').select(); (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject()).then(() => toast('코드를 복사했어요'), () => { document.execCommand && document.execCommand('copy'); toast('코드를 선택했어요 · 길게 눌러 복사'); }); };
    $('btnImport').onclick = () => { if (E.importCode($('imCode').value)) { toast('가져오기 완료!'); setTimeout(() => location.reload(), 500); } else toast('코드가 올바르지 않아요'); };
  }
  window.Game = { enterSlot, hud, toast, modal, closeModal, daily, menu, saveMenu, charge, levelInfo, get spinning() { return spinning || E.s.freeSpins > 0; } };

  // ----- 입력 -----
  const tap = (id, f) => $(id).addEventListener('click', f);
  tap('btnSpin', () => { if (auto) { auto = false; $('btnAuto').classList.remove('on'); hud(); return; } spin(); });
  tap('betUp', () => { if (spinning || E.s.freeSpins) return; if (E.changeBet(1)) { Audio2.play('click'); hud(); } else toast(`레벨업하면 더 큰 베팅이 열려요`); });
  tap('betDown', () => { if (spinning || E.s.freeSpins) return; if (E.changeBet(-1)) { Audio2.play('click'); hud(); } });
  tap('btnAuto', () => { auto = !auto; autoCount = 0; $('btnAuto').classList.toggle('on', auto); Audio2.play('click'); hud(); if (auto) spin(); });
  tap('btnTurbo', () => { E.s.settings.turbo = !E.s.settings.turbo; $('btnTurbo').classList.toggle('on', E.s.settings.turbo); E.save(); Audio2.play('click'); });
  tap('btnHourly', () => charge($('btnHourly')));
  tap('btnDaily', daily); tap('coinPill', () => toast(`🪙 보유 잔액 ${fmt(E.s.coins)}`)); tap('btnHome', () => { if (spinning || E.s.freeSpins > 0) return toast('스핀이 끝난 뒤 로비로 갈 수 있어요'); auto = false; $('btnAuto').classList.remove('on'); Lobby.show(); }); tap('btnInfo', () => (window.Guides ? Guides.open(document.body.dataset.slot) : paytable())); tap('btnShop', () => Shop.open('ex')); tap('btnStore', () => Shop.open()); tap('btnMenu', menu); tap('btnLevel', levelInfo);
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); $('btnSpin').click(); } });
  $('btnTurbo').classList.toggle('on', E.s.settings.turbo);

  // ----- 시작 (오디오 잠금 해제) -----
  $('btnStart').addEventListener('click', () => {
    Audio2.unlock(); Audio2.setSfx(E.s.settings.sfx); if (!E.s.settings.bgm) Audio2.setBgm(false);
    $('intro').classList.add('hide'); setTimeout(() => $('intro').remove(), 600);
    const v = $('jpVideo'); v.play().then(() => v.pause()).catch(() => {}); // iOS 비디오 사전 준비
    Lobby.show(); if (E.dailyAvailable()) setTimeout(daily, 700);
  }, { once: true });
  document.addEventListener('touchstart', () => Audio2.unlock(), { passive: true });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__slot = { spin, E, get engine() { return engine; }, bigWin, Shop, enterSlot };
  enterSlot(E.s.lastSlot || 'classic'); // 디버그/테스트용
})();
