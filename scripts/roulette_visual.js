const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const fs = require('fs');
const URL = process.env.URL || 'http://127.0.0.1:18006/';
const OUT = path.join(__dirname, '../docs-screens/roulette/');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const errs = [];
  let fail = 0;
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

  async function boot(w) {
    const p = await b.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    p.on('pageerror', (e) => errs.push(w + ' ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(w + ' ' + m.text()); });
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.evaluate(() => localStorage.clear());
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    await p.click('#btnStart', { force: true });
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      Game.closeModal();
      const s = __slot.E.s; s.level = 20; s.coins = 500000; s.seenHints = { roulette: 1 }; s.lastCharge = 0;
      __slot.E.save();
    });
    await p.evaluate(() => { Lobby.hide(); Tables.enter('roulette'); });
    await p.waitForTimeout(900); // textures + prerender
    return p;
  }

  const p = await boot(390);
  const ready = await p.evaluate(() => {
    const cv = document.getElementById('rlScene');
    const mod = GAME_MODS.roulette;
    return { cv: !!(cv && cv.width > 10), w: cv && cv.width, h: cv && cv.height, hasDebug: !!(mod && mod.debugIdle && mod.debugMidSpin && mod.debugWin) };
  });
  ok(ready.cv, 'canvas ready ' + ready.w + 'x' + ready.h);
  ok(ready.hasDebug, 'debug hooks');

  await p.evaluate(() => GAME_MODS.roulette.debugIdle());
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT + 'idle.jpg', type: 'jpeg', quality: 86 });

  await p.evaluate(() => GAME_MODS.roulette.debugMidSpin());
  await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + 'midspin.jpg', type: 'jpeg', quality: 86 });

  await p.evaluate(() => GAME_MODS.roulette.debugWin());
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'result.jpg', type: 'jpeg', quality: 86 });

  // live short spin (RNG preserved) — just ensure no throw
  const spun = await p.evaluate(async () => {
    const m = GAME_MODS.roulette;
    // place a small bet via UI state: debugIdle then addBet by clicking
    m.debugIdle();
    const n = document.querySelector('[data-sp="n-7"]');
    if (n) n.click();
    return document.getElementById('rlTot').textContent;
  });
  ok(!!spun && spun !== '0', 'can place a bet, tot=' + spun);

  const forbidden = await p.evaluate(() => /가상|모의|virtual|캐시아웃|출금|입금/i.test(document.body.innerText));
  ok(!forbidden, 'no forbidden words');
  const foot = await p.evaluate(() => /실제 돈이 오가지 않는 게임입니다/.test(document.body.innerText));
  ok(!foot, 'no footer on table screen');

  await p.close();

  const q = await boot(375);
  await q.evaluate(() => GAME_MODS.roulette.debugWin());
  await q.waitForTimeout(250);
  await q.screenshot({ path: OUT + 'result_375.jpg', type: 'jpeg', quality: 86 });
  const overflow = await q.evaluate(() => {
    const stage = document.getElementById('rlStage');
    const r = stage.getBoundingClientRect();
    return { w: r.width, right: r.right, vw: innerWidth, ok: r.right <= innerWidth + 1 && r.left >= -1 };
  });
  ok(overflow.ok, '375 stage in viewport ' + JSON.stringify(overflow));
  await q.screenshot({ path: OUT + 'idle_375.jpg', type: 'jpeg', quality: 86 }); // actually result still showing - take idle too
  await q.evaluate(() => GAME_MODS.roulette.debugIdle());
  await q.waitForTimeout(200);
  await q.screenshot({ path: OUT + 'idle_375.jpg', type: 'jpeg', quality: 86 });
  await q.close();

  console.log('errors', errs);
  ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
