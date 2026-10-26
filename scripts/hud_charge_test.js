// HUD 잔액 표시(375/390px) + 지갑 무료 충전 실제 클릭 테스트 (node scripts/hud_charge_test.js)
const { chromium } = require(process.env.PW || 'playwright');
const URL = process.env.URL || 'http://127.0.0.1:18006/', OUT = __dirname + '/../docs-screens/';
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [390, 375]) {
    const p = await b.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
    await p.tap('#btnStart', { force: true }); await p.waitForTimeout(1500); await p.evaluate(() => Game.closeModal());
    for (const coins of [24567, 245678, 1234567, 24567890, 987654321]) for (const id of ['classic', 'fruit', 'dragon', 'mega', 'bunny']) {
      const r = await p.evaluate(([c, id]) => { const s = __slot.E.s; s.level = 9; s.coins = c; s.gems = 1234; Lobby.hide(); Game.enterSlot(id); Game.hud();
        const t = document.getElementById('coinText'), pill = t.parentElement.getBoundingClientRect(), tb = t.getBoundingClientRect(), nx = document.getElementById('btnShop').getBoundingClientRect(), mb = document.getElementById('btnMenu').getBoundingClientRect();
        return { txt: t.textContent, fits: t.scrollWidth <= t.clientWidth + 1 && tb.right <= pill.right + 1 && pill.right <= nx.left && mb.right <= innerWidth }; }, [coins, id]);
      if (!r.fits || id === 'classic') ok(r.fits && !r.txt.includes('…'), `${w}px ${id} ${coins} -> "${r.txt}"`);
      if (coins === 24567890) await p.screenshot({ path: OUT + `hud_${w}_${id}.png`, clip: { x: 0, y: 0, width: w, height: 120 } });
    }
    await p.evaluate(() => { __slot.E.s.coins = 24567890; Game.hud(); }); await p.tap('#coinPill', { force: true }); await p.waitForTimeout(300);
    ok((await p.textContent('#toast')).includes('24,567,890'), `${w}px tap pill shows full value`);
    await p.evaluate(() => Lobby.show()); await p.waitForTimeout(400); await p.screenshot({ path: OUT + `lobby_top_${w}.png`, clip: { x: 0, y: 0, width: w, height: 120 } });
    if (w === 390) { // ---- 충전 실제 탭 ----
      await p.evaluate(() => { const s = __slot.E.s; s.coins = 1000; s.lastCharge = 0; s.tx = []; __slot.E.save(); Lobby.go('wallet'); });
      await p.waitForTimeout(400); const before = await p.evaluate(() => __slot.E.s.coins);
      const top = await p.evaluate(() => { const r = document.getElementById('wCharge').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e && (e.id || e.className); });
      ok(top === 'wCharge' || String(top).includes('charge'), 'charge button is top element: ' + top);
      await p.tap('#wCharge', { force: true }); await p.waitForTimeout(800);
      const st = await p.evaluate(() => ({ c: __slot.E.s.coins, left: __slot.E.chargeLeft(), tx: __slot.E.s.tx[0], btn: document.getElementById('wCharge').textContent }));
      ok(st.c > before, `balance ${before} -> ${st.c}`); ok(st.left > 29 * 60000, 'cooldown started ' + Math.round(st.left / 1000) + 's');
      ok(st.tx && st.tx.type === 'charge' && st.tx.amount === st.c - before, 'tx logged ' + JSON.stringify(st.tx)); ok(/다음 충전/.test(st.btn), 'button shows: ' + st.btn);
      await p.waitForTimeout(1500); await p.screenshot({ path: OUT + 'wallet_charged.png' });
      await p.tap('#wCharge', { force: true }); await p.waitForTimeout(300); ok((await p.evaluate(() => __slot.E.s.coins)) === st.c, 'second tap during cooldown grants nothing');
      await p.reload(); await p.waitForTimeout(800);
      const after = await p.evaluate(() => ({ c: __slot.E.s.coins, left: __slot.E.chargeLeft(), t: __slot.E.s.tx[0] && __slot.E.s.tx[0].type }));
      ok(after.c === st.c && after.left > 0 && after.t === 'charge', 'persists after reload ' + JSON.stringify(after));
    }
    await p.close();
  }
  ok(errs.length === 0, 'console errors: ' + JSON.stringify(errs)); await b.close(); process.exit(fail ? 1 : 0);
})();
