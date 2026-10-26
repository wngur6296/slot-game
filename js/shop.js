/* 상점: 꾸미기(장착/보유) + 소모품(버프) + 젬 환전. 설정은 js/shop-config.js */
const Shop = (() => {
  const S = SHOP_CONFIG, C = SLOT_CONFIG, E = Economy; let ui; let tab = 'buff', sub = 'frame';
  const fmt = (n) => Math.floor(n).toLocaleString();
  const item = (id) => S.cosmetics.find((c) => c.id === id);
  const cons = (id) => S.consumables.find((c) => c.id === id);

  // ---------- 꾸미기 적용 ----------
  function applyCosmetics() {
    const eq = E.s.equipped, root = document.documentElement.style;
    const fr = item(eq.frame) || item(S.defaults.frame); Object.entries(fr.vars).forEach(([k, v]) => root.setProperty('--' + k, v));
    const sp = item(eq.spin) || item(S.defaults.spin); Object.entries(sp.vars).forEach(([k, v]) => root.setProperty('--' + k, v));
    const bg = item(eq.bg) || item(S.defaults.bg); document.querySelector('.bg').style.backgroundImage = `url(assets/img/${bg.img}.webp)`;
    const fx = item(eq.fx) || item(S.defaults.fx); FX.setStyle(fx.fx);
    const av = item(eq.avatar); const b = document.querySelector('.lvl-badge');
    b.style.backgroundImage = av && av.img ? `url(assets/img/${av.img}.webp)` : ''; b.classList.toggle('has-av', !!(av && av.img));
    const ti = item(eq.title) || item(S.defaults.title); document.querySelector('.logo-sub').textContent = ti.name;
  }

  // ---------- 버프 ----------
  function active(id) { const b = E.s.buffs[id]; return b && b.n > 0 && (!b.maxBet || E.bet() <= b.maxBet) ? b : null; }
  function autopass() { return E.s.autopassUntil > Date.now(); }
  // 유료 스핀 직전 호출: 이번 스핀 효과 반환 + 횟수 차감
  function consumeForSpin(isFree) {
    const fx = { boost: 1, luck: false, insurance: 0, xp: 1 };
    if (isFree) return fx;
    if (active('boost2x')) fx.boost = 2; if (active('luck')) fx.luck = true;
    if (active('insurance')) fx.insurance = S.insuranceRefund; if (active('xp2')) fx.xp = 2;
    ['boost2x', 'luck', 'insurance', 'xp2'].forEach((id) => { if (active(id)) { E.s.buffs[id].n--; if (E.s.buffs[id].n <= 0) delete E.s.buffs[id]; } });
    return fx;
  }
  function renderBuffs() {
    const el = document.getElementById('buffs'); let h = '';
    S.consumables.forEach((c) => { const b = E.s.buffs[c.id]; if (b && b.n > 0) { const on = active(c.id);
      h += `<span class="buff ${on ? '' : 'off'}" title="${c.name}"><img src="assets/img/${c.img}.webp" alt=""><b>${b.n}</b></span>`; } });
    if (autopass()) h += `<span class="buff"><img src="assets/img/it_autopass.webp" alt=""><b>${Math.ceil((E.s.autopassUntil - Date.now()) / 60000)}분</b></span>`;
    el.innerHTML = h; el.classList.toggle('on', !!h);
  }

  // ---------- 구매 ----------
  function consPrice(c) { return c.betX ? { coins: c.betX * E.bet(), gems: c.gems } : { coins: c.coins, gems: c.gems }; }
  function pay(price, cur) { const s = E.s; if (cur === 'gems') { if (s.gems < price.gems) return false; s.gems -= price.gems; } else { if (s.coins < price.coins) return false; s.coins -= price.coins; } return true; }
  function buyConsumable(id, cur) {
    const c = cons(id), s = E.s;
    if (c.freeSpins && s.freeSpins > 0) return ui.toast('프리스핀 중에는 사용할 수 없어요');
    if (!pay(consPrice(c), cur)) return ui.toast(cur === 'gems' ? '젬이 부족해요' : '코인이 부족해요');
    if (c.spins) { const b = s.buffs[id] || { n: 0, maxBet: 0 }; b.n += c.spins; b.maxBet = Math.max(b.maxBet, E.bet()); s.buffs[id] = b; }
    if (c.freeSpins) { s.freeSpins += c.freeSpins; s.fsBet = E.bet(); }
    if (c.minutes) s.autopassUntil = Math.max(Date.now(), s.autopassUntil) + c.minutes * 60000;
    E.save(); Audio2.play('coin'); FX.sparkle(innerWidth / 2, innerHeight * .45, 40); ui.toast(`✨ ${c.name} 획득!`); ui.hud(true); render();
  }
  function buyCosmetic(id) {
    const it = item(id), s = E.s; if (s.owned.includes(id)) return equip(id);
    if (it.level && s.level < it.level) return ui.toast(`레벨 ${it.level}부터 구매할 수 있어요`);
    const cur = it.price.gems ? 'gems' : 'coins'; if (!pay(it.price, cur)) return ui.toast(cur === 'gems' ? '젬이 부족해요' : '코인이 부족해요');
    s.owned.push(id); Audio2.play('win_small'); FX.confetti(50); equip(id, true);
  }
  function equip(id, silent) { const it = item(id); E.s.equipped[it.cat] = id; E.save(); applyCosmetics(); if (!silent) Audio2.play('click'); ui.toast(`👕 ${it.name} 장착!`); ui.hud(); render(); }

  // ---------- UI ----------
  function priceTag(p) { return p.gems ? `💎 ${fmt(p.gems)}` : p.coins ? `🪙 ${fmt(p.coins)}` : '무료'; }
  function preview(it) {
    if (it.img) return `<img src="assets/img/${it.img}.webp" alt="" class="${it.cat === 'avatar' ? 'round' : it.cat === 'bg' ? 'bgthumb' : ''}">`;
    if (it.cat === 'avatar') return `<div class="sw sw-badge">Lv</div>`;
    if (it.vars && it.cat === 'frame') return `<div class="sw sw-frame" style="--a:${it.vars.f1};--b:${it.vars.f3};--c:${it.vars.f4}"><i></i><i></i><i></i></div>`;
    if (it.vars && it.cat === 'spin') return `<div class="sw sw-spin" style="background:radial-gradient(circle at 50% 35%,${it.vars.s1},${it.vars.s2} 45%,${it.vars.s3});box-shadow:0 0 14px ${it.vars.s4}">SPIN</div>`;
    if (it.fx) return `<div class="sw sw-fx">${it.fx.colors.map((c, i) => `<i class="${it.fx.shape}" style="--c:${c};--i:${i}"></i>`).join('')}</div>`;
    return `<div class="sw sw-title">${it.name}</div>`;
  }
  function card(it) {
    const s = E.s, own = s.owned.includes(it.id), eq = s.equipped[it.cat] === it.id, locked = it.level && s.level < it.level && !own;
    const btn = eq ? `<button class="cbtn eq" disabled>장착중</button>` : own ? `<button class="cbtn" data-eq="${it.id}">장착</button>`
      : locked ? `<button class="cbtn" disabled>🔒 Lv.${it.level}</button>` : `<button class="cbtn buy" data-buy="${it.id}">${priceTag(it.price)}</button>`;
    return `<div class="card ${eq ? 'equipped' : ''}">${preview(it)}<div class="cname">${it.name}</div>${btn}</div>`;
  }
  function render() {
    const body = document.getElementById('modalBody'); if (!body || !body.querySelector('.shop')) return;
    const s = E.s, tabs = [['buff', '⚡ 버프'], ['skin', '🎨 꾸미기'], ['inv', '🎒 보유'], ['ex', '💱 환전']];
    let h = `<div class="shop"><h2>🛒 상점</h2><div class="wallet"><span>🪙 ${fmt(s.coins)}</span><span>💎 ${fmt(s.gems)}</span><small>가상 재화 전용 · 실제 결제 없음</small></div>
      <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
    if (tab === 'buff') {
      h += `<p class="hint">버프 가격은 현재 베팅(${fmt(E.bet())})에 비례해요. 구매 시 베팅 이하에서만 적용돼요.</p><div class="clist">`;
      S.consumables.forEach((c) => { const p = consPrice(c), b = s.buffs[c.id];
        const extra = c.spins ? `${c.spins}스핀` : c.freeSpins ? `${c.freeSpins}회` : `${c.minutes}분`;
        const own = b && b.n ? `<em>보유 ${b.n}</em>` : c.id === 'autopass' && autopass() ? `<em>사용중</em>` : '';
        h += `<div class="crow"><img src="assets/img/${c.img}.webp" alt=""><div class="cinfo"><b>${c.name} ${own}</b><small>${c.desc} · ${extra}</small></div>
          <div class="cbuy"><button class="cbtn buy" data-cons="${c.id}" data-cur="coins" ${s.coins < p.coins ? 'disabled' : ''}>🪙 ${fmt(p.coins)}</button>
          <button class="cbtn gem" data-cons="${c.id}" data-cur="gems" ${s.gems < p.gems ? 'disabled' : ''}>💎 ${p.gems}</button></div></div>`; });
      h += '</div>';
    } else if (tab === 'skin' || tab === 'inv') {
      if (tab === 'skin') h += `<div class="subtabs">${S.categories.map((c) => `<button class="stab ${sub === c.id ? 'on' : ''}" data-sub="${c.id}">${c.name}</button>`).join('')}</div>`;
      const list = tab === 'skin' ? S.cosmetics.filter((c) => c.cat === sub) : S.cosmetics.filter((c) => s.owned.includes(c.id));
      if (tab === 'inv') { h += S.categories.map((cat) => { const l = list.filter((c) => c.cat === cat.id); return `<h3>${cat.name} (${l.length}/${S.cosmetics.filter((c) => c.cat === cat.id).length})</h3><div class="grid">${l.map(card).join('')}</div>`; }).join('');
        const bl = S.consumables.filter((c) => s.buffs[c.id]); h += `<h3>보유 버프</h3><p class="hint">${bl.length ? bl.map((c) => `${c.name} ${s.buffs[c.id].n}회 (베팅 ≤ ${fmt(s.buffs[c.id].maxBet)})`).join('<br>') : '없음'}${autopass() ? '<br>오토 패스 사용중' : ''}</p>`; }
      else h += `<div class="grid">${list.map(card).join('')}</div>`;
    } else {
      h += `<p class="hint">젬은 레벨업 · 출석 · 큰 당첨으로 얻어요.</p>` + C.economy.gemShop.map((o, i) => `<button class="btn ${s.gems < o.gems ? 'alt' : ''}" data-ex="${i}" ${s.gems < o.gems ? 'disabled' : ''}>💎${o.gems} → 🪙${fmt(o.coins)}</button>`).join('');
    }
    body.innerHTML = h + '</div>';
    body.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; Audio2.play('click'); render(); });
    body.querySelectorAll('[data-sub]').forEach((b) => b.onclick = () => { sub = b.dataset.sub; Audio2.play('click'); render(); });
    body.querySelectorAll('[data-cons]').forEach((b) => b.onclick = () => buyConsumable(b.dataset.cons, b.dataset.cur));
    body.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => buyCosmetic(b.dataset.buy));
    body.querySelectorAll('[data-eq]').forEach((b) => b.onclick = () => equip(b.dataset.eq));
    body.querySelectorAll('[data-ex]').forEach((b) => b.onclick = () => { if (E.buy(+b.dataset.ex)) { Audio2.play('coin'); FX.coinBurst(innerWidth / 2, innerHeight * .4, 40); ui.hud(true); render(); } });
  }
  function open(t) { if (t) tab = t; ui.modal('<div class="shop"></div>'); render(); }
  function init(hooks) { ui = hooks; applyCosmetics(); renderBuffs(); setInterval(renderBuffs, 30000); }
  return { init, open, consumeForSpin, renderBuffs, autopass, applyCosmetics, active };
})();
