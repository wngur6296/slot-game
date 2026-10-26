// 로비/지갑/이벤트/각 슬롯/저장 메뉴 스크린샷 + 콘솔 에러 검사 (node scripts/lobby_test.js)
const { chromium } = require(process.env.PW || 'playwright');
const URL = process.env.URL || 'http://127.0.0.1:18006/';
const OUT = __dirname + '/../docs-screens/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
  await p.click('#btnStart', { force: true }); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.getElementById('modal').classList.remove('show'); const s = __slot.E.s; s.level = 9; s.coins = 250000; s.vipPts = 120000; s.lastCharge = 0; __slot.E.save(); Lobby.render(); });
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: OUT + n + '.png' }); };
  await shot('lobby');
  for (const id of ['classic', 'fruit', 'dragon', 'mega', 'bunny']) {
    await p.evaluate((id) => { Lobby.hide(); Game.enterSlot(id); }, id); await p.waitForTimeout(400);
    for (let i = 0; i < 3; i++) { await p.evaluate(() => __slot.spin()); await p.waitForTimeout(200); }
    await p.waitForTimeout(3500); await p.evaluate(() => document.querySelectorAll('.overlay').forEach((o) => o.classList.remove('show')));
    await shot('slot_' + id);
    await p.evaluate(() => Lobby.show());
  }
  await p.evaluate(() => Lobby.go('promo')); await shot('promo');
  await p.evaluate(() => Lobby.go('wallet')); await shot('wallet');
  await p.click('#wCharge', { force: true }); await shot('wallet_charged');
  await p.evaluate(() => Lobby.go('home')); await p.click('.cats [data-cat="jp"]', { force: true }); await shot('lobby_jackpot');
  await p.evaluate(() => { Lobby.hide(); Game.saveMenu(); }); await shot('save_menu');
  const code = await p.evaluate(() => { const c = __slot.E.exportCode(); return [c.slice(0, 20), __slot.E.importCode(c), __slot.E.importCode('bad')]; });
  console.log('export/import', code);
  const txt = await p.evaluate(() => document.body.innerText); console.log('virtual words:', /가상|모의|virtual/i.test(txt));
  console.log('errors', errs); await b.close();
})();
