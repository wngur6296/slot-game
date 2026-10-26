/* 재화/레벨/보너스/저장 (localStorage). 가상 코인 전용 — 실제 결제 없음 */
const Economy = (() => {
  const C = SLOT_CONFIG, E = C.economy;
  const fresh = () => ({ v: C.version, coins: E.startCoins, gems: E.startGems, level: 1, xp: 0, betIdx: 0,
    lastHourly: 0, lastDaily: '', dailyStreak: 0, streak: 0, freeSpins: 0, fsTotal: 0,
    settings: { sfx: true, bgm: true, turbo: false }, stats: { spins: 0, wagered: 0, won: 0, biggest: 0, jackpots: 0 },
    ...shopFields() });
  // v2: 상점 (보유/장착/버프)
  function shopFields() { const D = (typeof SHOP_CONFIG !== 'undefined' ? SHOP_CONFIG.defaults : {});
    return { owned: Object.values(D), equipped: { ...D }, buffs: {}, autopassUntil: 0 }; }
  // 저장 데이터 마이그레이션: 버전별 단계적으로 업그레이드
  function migrate(d) {
    if (!d || typeof d !== 'object') return null;
    if (!d.v || d.v < 2) { Object.assign(d, shopFields()); d.v = 2; }
    // 이후 버전: if (d.v < 3) { ...; d.v = 3; }
    const f = fresh(); const out = Object.assign(f, d);
    out.settings = Object.assign(fresh().settings, d.settings); out.stats = Object.assign(fresh().stats, d.stats);
    out.equipped = Object.assign(shopFields().equipped, d.equipped); out.owned = [...new Set([...shopFields().owned, ...(d.owned || [])])];
    out.buffs = d.buffs || {}; return out;
  }
  let s = load();
  function load() { try { const d = migrate(JSON.parse(localStorage.getItem(C.saveKey))); if (d) return d; } catch (e) {} return fresh(); }
  const save = () => { try { localStorage.setItem(C.saveKey, JSON.stringify(s)); } catch (e) {} };
  const listeners = []; const emit = (ev, d) => listeners.forEach((f) => f(ev, d));
  const bet = () => E.betLevels[s.betIdx];
  function maxBetIdx() { let i = 0; E.betUnlockLevel.forEach((lv, k) => { if (s.level >= lv) i = k; }); return i; }
  function changeBet(d) { const ni = Math.max(0, Math.min(maxBetIdx(), s.betIdx + d)); if (ni === s.betIdx) return false; s.betIdx = ni; save(); return true; }
  function canSpin() { return s.freeSpins > 0 || s.coins >= bet(); }
  function takeBet(xpMult = 1) {
    if (s.freeSpins > 0) { s.freeSpins--; save(); return { free: true, bet: s.fsBet || bet() }; }
    const b = bet(); if (s.coins < b) return null; s.coins -= b; s.stats.spins++; s.stats.wagered += b; addXp(b * C.level.xpPerCoinBet * xpMult); save(); return { free: false, bet: b };
  }
  function addXp(x) {
    s.xp += x; while (s.xp >= C.level.xpNeeded(s.level)) { s.xp -= C.level.xpNeeded(s.level); s.level++;
      const c = C.level.rewardCoins(s.level), g = C.level.rewardGems(s.level); s.coins += c; s.gems += g; emit('levelup', { level: s.level, coins: c, gems: g }); }
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
  function claimDaily() { if (!dailyAvailable()) return null; const i = dailyDayIndex(); const r = { coins: E.dailyBonus[i], gems: E.dailyGems[i], day: i + 1 };
    s.coins += r.coins; s.gems += r.gems; s.dailyStreak = i + 1; s.lastDaily = today(); save(); return r; }
  function buy(i) { const o = E.gemShop[i]; if (!o || s.gems < o.gems) return false; s.gems -= o.gems; s.coins += o.coins; save(); return true; }
  function reset() { s = fresh(); save(); }
  return { get s() { return s; }, save, on: (f) => listeners.push(f), bet, changeBet, maxBetIdx, canSpin, takeBet, award, hourlyLeft, claimHourly,
    dailyAvailable, dailyDayIndex, claimDaily, buy, reset, migrate };
})();
