const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));
  // v1 세이브로 마이그레이션 테스트
  await p.goto('http://127.0.0.1:18006/');
  await p.evaluate(() => localStorage.setItem('luckyslot_save_v1', JSON.stringify({ v: 1, coins: 777777, gems: 300, level: 12, xp: 0, betIdx: 3, settings: { sfx: true, bgm: true, turbo: false }, stats: { spins: 5, wagered: 50, won: 0, biggest: 0, jackpots: 0 } })));
  await p.reload(); await p.waitForTimeout(600);
  const mig = await p.evaluate(() => ({ v: __slot.E.s.v, coins: __slot.E.s.coins, owned: __slot.E.s.owned.length, eq: __slot.E.s.equipped.frame }));
  console.log('MIGRATION', JSON.stringify(mig));
  const D = '/workspace/slot-game/docs-screens/';
  await p.tap('#btnStart', { force: true }); await p.waitForTimeout(900); await p.tap('#modalClose', { force: true }); await p.waitForTimeout(400);
  await p.tap('#btnStore', { force: true }); await p.waitForTimeout(600); await p.screenshot({ path: D + '6_shop_buffs.jpg', quality: 82 });
  for (const id of ['boost2x', 'luck', 'insurance', 'xp2']) { await p.click(`[data-cons="${id}"][data-cur="coins"]`, { force: true }); await p.waitForTimeout(150); }
  await p.click('[data-cons="autopass"][data-cur="gems"]', { force: true }); await p.waitForTimeout(200);
  await p.click('[data-tab="skin"]', { force: true }); await p.waitForTimeout(400); await p.screenshot({ path: D + '7_shop_frames.jpg', quality: 82 });
  for (const [sub, id] of [['frame', 'frame_neon'], ['bg', 'bg_neon'], ['spin', 'spin_galaxy'], ['fx', 'fx_stars'], ['avatar', 'av_dragon'], ['title', 'title_shark']]) {
    await p.click(`[data-sub="${sub}"]`, { force: true }); await p.waitForTimeout(150); await p.click(`[data-buy="${id}"]`, { force: true }); await p.waitForTimeout(250);
    if (sub === 'avatar') await p.screenshot({ path: D + '8_shop_avatars.jpg', quality: 82 }); }
  await p.click('[data-sub="fx"]', { force: true }); await p.waitForTimeout(300); await p.screenshot({ path: D + '9_shop_effects.jpg', quality: 82 });
  await p.click('[data-tab="inv"]', { force: true }); await p.waitForTimeout(400); await p.screenshot({ path: D + '10_inventory.jpg', quality: 82 });
  await p.tap('#modalClose', { force: true }); await p.waitForTimeout(2500); await p.screenshot({ path: D + '11_main_skinned_buffs.jpg', quality: 82 });
  await p.evaluate(() => { const e = __slot.engine; e._spin = e.spin; e.spin = () => ({ grid: [['seven','seven','grape'],['diamond','seven','bar'],['seven','seven','lemon']] }); });
  await p.tap('#btnSpin', { force: true }); await p.waitForTimeout(3300); await p.screenshot({ path: D + '12_bigwin_stars.jpg', quality: 82 });
  const st = await p.evaluate(() => JSON.stringify(__slot.E.s.buffs)); console.log('BUFFS', st);
  console.log('ERRORS:', JSON.stringify(errs)); await b.close();
})();
