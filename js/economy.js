/* 재화/레벨/보너스/VIP/미션/거래내역/저장 (localStorage). 게임 내 코인만 사용 — 실제 돈 없음 */
const Economy = (() => {
  const C = SLOT_CONFIG, E = C.economy;
  const fresh = () => ({ v: C.version, coins: E.startCoins, gems: E.startGems, level: 1, xp: 0, betIdx: 0,
    lastHourly: 0, lastDaily: '', dailyStreak: 0, streak: 0, freeSpins: 0, fsTotal: 0,
    settings: { sfx: true, bgm: true, turbo: false }, stats: { spins: 0, wagered: 0, won: 0, biggest: 0, jackpots: 0 },
    ...shopFields(), ...v3Fields(), ...v4Fields() });
  // v3: 멀티 슬롯 · VIP · 미션 · 거래내역 · 누적잭팟
  function v3Fields() { return { lastSlot: 'classic', pools: {}, vipPts: 0, tx: [], missions: { day: '', prog: {}, claimed: [] }, slotsPlayed: {}, lastCharge: 0 }; }
  // v4: 테이블/카드/인스턴트 게임 (룰렛 히스토리, 바카라 로드, 플레이 기록)
  function v4Fields() { return { lastGame: 'classic', tablesPlayed: {}, rouletteHist: [], baccaratBead: [], baccaratBig: [], crashHist: [], seenHints: {} }; }
  // v2: 상점 (보유/장착/버프)
  function shopFields() { const D = (typeof SHOP_CONFIG !== 'undefined' ? SHOP_CONFIG.defaults : {});
    return { owned: Object.values(D), equipped: { ...D }, buffs: {}, autopassUntil: 0 }; }
  // 저장 데이터 마이그레이션: 버전별 단계적으로 업그레이드
  function migrate(d) {
    if (!d || typeof d !== 'object') return null;
    if (!d.v || d.v < 2) { Object.assign(d, shopFields()); d.v = 2; }
    if (d.v < 3) { Object.assign(d, v3Fields(), { lastCharge: d.lastHourly || 0, vipPts: (d.stats && d.stats.wagered) || 0 }); d.v = 3; }
    if (d.v < 4) { Object.assign(d, v4Fields(), { lastGame: d.lastSlot || 'classic' }); d.v = 4; }
    const f = fresh(); const out = Object.assign(f, d);
    out.settings = Object.assign(fresh().settings, d.settings); out.stats = Object.assign(fresh().stats, d.stats);
    out.equipped = Object.assign(shopFields().equipped, d.equipped); out.owned = [...new Set([...shopFields().owned, ...(d.owned || [])])];
    out.buffs = d.buffs || {}; out.missions = Object.assign(v3Fields().missions, d.missions); out.seenHints = Object.assign({}, v4Fields().seenHints, d.seenHints || {}); return out;
  }
  let s = load();
  function load() { try { const d = migrate(JSON.parse(localStorage.getItem(C.saveKey))); if (d) return d; } catch (e) {} return fresh(); }
  const save = () => { try { localStorage.setItem(C.saveKey, JSON.stringify(s)); } catch (e) {} };
  addEventListener('visibilitychange', () => { if (document.hidden) save(); });   // 앱 전환/잠금 시 즉시 저장
  addEventListener('pagehide', save); addEventListener('beforeunload', save);
  const listeners = []; const emit = (ev, d) => listeners.forEach((f) => f(ev, d));
  const bet = () => E.betLevels[s.betIdx];
  function maxBetIdx() { let i = 0; E.betUnlockLevel.forEach((lv, k) => { if (s.level >= lv) i = k; }); return i; }
  function changeBet(d) { const ni = Math.max(C.minBetIdx || 0, Math.min(maxBetIdx(), s.betIdx + d)); if (ni === s.betIdx) return false; s.betIdx = ni; save(); return true; }
  function canSpin() { return s.freeSpins > 0 || s.coins >= bet(); }
  // 테이블 게임용 베팅. round=false 이면 더블/스플릿/추가칩처럼 같은 라운드의 추가 판돈만 차감
  function takeWager(amount, xpMult = 1, round = true) {
    amount = Math.floor(amount);
    if (amount <= 0 || s.coins < amount) return null;
    s.coins -= amount; s.stats.wagered += amount; s.vipPts += amount; mission('bet', amount);
    if (round) { s.stats.spins++; mission('spins', 1); }
    addXp(amount * C.level.xpPerCoinBet * xpMult); save(); return amount;
  }
  function markPlayed(id, table) {
    const today = new Date().toLocaleDateString('sv');
    const bag = table ? (s.tablesPlayed = s.tablesPlayed || {}) : (s.slotsPlayed = s.slotsPlayed || {});
    if (bag[id] !== today) { bag[id] = today; mission(table ? 'tables' : 'slots', 1); }
    s.lastGame = id; if (!table) s.lastSlot = id; save();
  }
  function takeBet(xpMult = 1) {
    if (s.freeSpins > 0) { s.freeSpins--; save(); return { free: true, bet: s.fsBet || bet() }; }
    const b = bet(); if (s.coins < b) return null; s.coins -= b; s.stats.spins++; s.stats.wagered += b; s.vipPts += b; mission('bet', b); mission('spins', 1); addXp(b * C.level.xpPerCoinBet * xpMult); save(); return { free: false, bet: b };
  }
  function addXp(x) {
    s.xp += x; while (s.xp >= C.level.xpNeeded(s.level)) { s.xp -= C.level.xpNeeded(s.level); s.level++;
      const c = C.level.rewardCoins(s.level), g = C.level.rewardGems(s.level); s.coins += c; s.gems += g; tx('level', `레벨 ${s.level} 달성 보너스`, c); emit('levelup', { level: s.level, coins: c, gems: g }); }
  }
  function award(win, tier) { s.coins += win; s.stats.won += win; s.stats.biggest = Math.max(s.stats.biggest, win);
    const g = tier === 'jackpot' ? E.jackpotGems : tier === 'mega' || tier === 'epic' ? E.megaWinGems : tier === 'big' ? E.bigWinGems : 0;
    if (g) s.gems += g; if (tier === 'jackpot') s.stats.jackpots++; save(); return g; }
  function hourlyLeft() { return Math.max(0, s.lastHourly + E.hourlyBonus.minutes * 60000 - Date.now()); }
  function claimHourly() { if (hourlyLeft() > 0) return 0; const c = E.hourlyBonus.coins + E.hourlyBonus.perLevel * (s.level - 1); s.coins += c; s.lastHourly = Date.now(); save(); return c; }
  const today = () => new Date().toLocaleDateString('sv');
  const yesterday = () => new Date(Date.now() - 864e5).toLocaleDateString('sv');
  function dailyAvailable() { return s.lastDaily !== today(); }
  function dailyDayIndex() { return (s.lastDaily === yesterday() ? s.dailyStreak : 0) % E.dailyBonus.length; }
  function claimDaily() { if (!dailyAvailable()) return null; const i = dailyDayIndex(); const r = { coins: Math.round(E.dailyBonus[i] * vip().tier.dailyMult), gems: E.dailyGems[i], day: i + 1 };
    s.coins += r.coins; s.gems += r.gems; s.dailyStreak = i + 1; s.lastDaily = today(); tx('daily', `출석 ${r.day}일차 보너스`, r.coins); return r; }
  function buy(i) { const o = E.gemShop[i]; if (!o || s.gems < o.gems) return false; s.gems -= o.gems; s.coins += o.coins; tx('exchange', `젬 ${o.gems} 교환`, o.coins); return true; }
  function reset() { s = fresh(); save(); }

  // ---- 거래 내역 (최근 150건) ----
  function tx(type, label, amount, cur = 'coins') { s.tx.unshift({ t: Date.now(), type, label, amount, cur, bal: cur === 'gems' ? s.gems : s.coins }); if (s.tx.length > 150) s.tx.length = 150; save(); }
  // ---- VIP (누적 베팅 포인트) ----
  function vip() { const T = E.vipTiers; let i = 0; T.forEach((v, k) => { if (s.vipPts >= v.pts) i = k; });
    const cur = T[i], next = T[i + 1]; return { idx: i, tier: cur, next, progress: next ? (s.vipPts - cur.pts) / (next.pts - cur.pts) : 1 }; }
  // ---- 충전 (무료, 쿨다운) ----
  function chargeLeft() { return Math.max(0, s.lastCharge + E.charge.minutes * 60000 - Date.now()); }
  function chargeAmount() { return Math.round((E.charge.coins + E.charge.perLevel * (s.level - 1)) * vip().tier.chargeMult); }
  function charge() { if (chargeLeft() > 0) return 0; const c = chargeAmount(); s.coins += c; s.lastCharge = Date.now(); tx('charge', '무료 충전', c); return c; }
  // ---- 일일 미션 ----
  function missionsToday() { const d = today(); if (s.missions.day !== d) s.missions = { day: d, prog: {}, claimed: [] }; return s.missions; }
  function mission(key, n) { const m = missionsToday(); m.prog[key] = (m.prog[key] || 0) + n; }
  function claimMission(id) { const m = missionsToday(), def = E.missions.find((x) => x.id === id); if (!def || m.claimed.includes(id) || (m.prog[def.key] || 0) < def.goal) return null;
    m.claimed.push(id); s.coins += def.coins; s.gems += def.gems || 0; tx('mission', `미션: ${def.name}`, def.coins); return def; }
  // ---- 수동 저장 슬롯 3개 + 코드 내보내기/가져오기 ----
  const slotKey = (i) => `${C.saveKey}_slot${i}`;
  function saveSlot(i) { save(); localStorage.setItem(slotKey(i), JSON.stringify({ t: Date.now(), d: s })); }
  function slotInfo(i) { try { const o = JSON.parse(localStorage.getItem(slotKey(i))); return o && { t: o.t, coins: o.d.coins, level: o.d.level, gems: o.d.gems }; } catch (e) { return null; } }
  function loadSlot(i) { try { const o = JSON.parse(localStorage.getItem(slotKey(i))); const d = migrate(o.d); if (!d) return false; s = d; save(); return true; } catch (e) { return false; } }
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  function exportCode() { save(); const j = JSON.stringify(s); const b = btoa(unescape(encodeURIComponent(j))); return `L7S${C.version}.${b}.${hash(b)}`; }
  function importCode(code) { try { const [, b, h] = code.trim().split('.'); if (!b || hash(b) !== h) return false;
      const d = migrate(JSON.parse(decodeURIComponent(escape(atob(b))))); if (!d || typeof d.coins !== 'number') return false; s = d; save(); return true; } catch (e) { return false; } }
  return { get s() { return s; }, save, on: (f) => listeners.push(f), bet, changeBet, maxBetIdx, canSpin, takeBet, takeWager, markPlayed, award, hourlyLeft, claimHourly,
    dailyAvailable, dailyDayIndex, claimDaily, buy, reset, migrate, tx, vip, chargeLeft, chargeAmount, charge, missionsToday, mission, claimMission, saveSlot, slotInfo, loadSlot, exportCode, importCode };
})();
