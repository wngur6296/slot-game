const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:18006/'); await p.waitForTimeout(800);
  const D = '/workspace/slot-game/docs-screens/';
  await p.screenshot({ path: D + '0_intro.jpg' });
  await p.tap('#btnStart',{force:true}); await p.waitForTimeout(900); await p.tap('#modalClose',{force:true}); await p.waitForTimeout(500);
  await p.screenshot({ path: D + '1_main.jpg' });
  await p.tap('#btnSpin',{force:true}); await p.waitForTimeout(350); await p.screenshot({ path: D + '1b_spinning.jpg' }); await p.waitForTimeout(2500);
  // 소당첨 강제
  await p.evaluate(() => { const e = __slot.engine; e._spin = e.spin; e.spin = () => ({ grid: [['lemon','bell','grape'],['cherry','bell','bar'],['seven','bell','lemon']] }); });
  await p.tap('#btnSpin',{force:true}); await p.waitForTimeout(2400); await p.screenshot({ path: D + '2_win.jpg' });
  await p.evaluate(() => { const e = __slot.engine; e.spin = () => ({ grid: [['seven','seven','grape'],['diamond','seven','bar'],['seven','seven','lemon']] }); });
  await p.tap('#btnSpin',{force:true}); await p.waitForTimeout(3600); await p.screenshot({ path: D + '3_bigwin.jpg' });
  await p.mouse.click(195, 400); await p.waitForTimeout(300); await p.mouse.click(195, 400); await p.waitForTimeout(800);
  await p.evaluate(() => { const e = __slot.engine; e.spin = () => ({ grid: [['wild','wild','scatter'],['lemon','wild','bar'],['wild','wild','lemon']] }); });
  await p.tap('#btnSpin',{force:true}); await p.waitForTimeout(5200); await p.screenshot({ path: D + '4_jackpot.jpg' });
  await p.mouse.click(195, 400); await p.waitForTimeout(300); await p.mouse.click(195, 400); await p.waitForTimeout(1000);
  await p.evaluate(() => { __slot.engine.spin = __slot.engine._spin; });
  await p.tap('#btnInfo',{force:true}); await p.waitForTimeout(600); await p.screenshot({ path: D + '5_paytable.jpg' });
  console.log('ERRORS:', JSON.stringify(errs)); await b.close();
})();
