// Visual polish: 390/375 screenshots, guides, cats layout, no console errors
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const URL = process.env.URL || 'http://127.0.0.1:18006/';
const OUT = path.join(__dirname, '../docs-screens/after/');
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
    await p.goto(URL);
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(700);
    await p.click('#btnStart', { force: true });
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      Game.closeModal();
      const s = __slot.E.s;
      s.level = 20; s.coins = 500000; s.gems = 20; s.vipPts = 120000; s.lastCharge = 0;
      s.seenHints = {};
      __slot.E.save(); Lobby.render();
    });
    await p.waitForTimeout(300);
    return p;
  }

  // ---- 390: main shots ----
  const p = await boot(390);
  await p.screenshot({ path: OUT + 'lobby.jpg', type: 'jpeg', quality: 82 });
  await p.click('.cats [data-cat="all"]', { force: true });
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'lobby_all.jpg', type: 'jpeg', quality: 82 });
  await p.click('.cats [data-cat="table"]', { force: true });
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'lobby_table.jpg', type: 'jpeg', quality: 82 });
  await p.click('.cats [data-cat="live"]', { force: true });
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT + 'lobby_live.jpg', type: 'jpeg', quality: 82 });
  await p.evaluate(() => Lobby.go('promo'));
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'promo.jpg', type: 'jpeg', quality: 82 });
  await p.evaluate(() => Lobby.go('home'));

  // category tabs all fully visible
  const catBox = await p.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { t: el.textContent, x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, btm: b.bottom }; };
    return {
      vw: innerWidth, vh: innerHeight,
      cats: [...document.querySelectorAll('.cats button')].map(r)
    };
  });
  for (const c of catBox.cats) {
    ok(c.x >= -0.5 && c.r <= catBox.vw + 0.5 && c.y >= 0 && c.btm <= catBox.vh, '390 cat visible: ' + c.t + ' ' + JSON.stringify(c));
  }
  ok(catBox.cats.length === 8, '8 category chips');
  ok(catBox.cats.some((c) => /라이브/.test(c.t)), '라이브 tab present');

  const lobbyTxt = await p.evaluate(() => document.body.innerText);
  ok(!/가상|모의|virtual|캐시아웃|출금|입금/i.test(lobbyTxt), 'lobby forbidden words');
  ok(/실제 돈이 오가지 않는 게임입니다/.test(lobbyTxt), 'footer present on lobby');
  const hasBlurb = await p.evaluate(() => !!document.querySelector('.gc-blurb') && /슬롯|베팅|홀드|룰렛|블랙잭/.test(document.querySelector('.gc-blurb').textContent||'') || !!document.querySelector('.gc-blurb'));
  ok(hasBlurb, 'lobby card blurbs');

  // first-play tip on blackjack
  await p.evaluate(() => { Game.closeModal(); Lobby.hide(); Tables.enter('blackjack'); });
  await p.waitForTimeout(800);
  const tipOn = await p.evaluate(() => document.getElementById('hintTip').classList.contains('on'));
  ok(tipOn, 'first-play tooltip shows once');
  await p.screenshot({ path: OUT + 'hint_blackjack.jpg', type: 'jpeg', quality: 82 });
  await p.click('#hintOk', { force: true });
  await p.waitForTimeout(400);
  const tipOff = await p.evaluate(() => !document.getElementById('hintTip').classList.contains('on'));
  ok(tipOff, 'tooltip dismissed');
  await p.evaluate(() => { if (Tables.current && Tables.current.debugWin) Tables.current.debugWin(); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + 'game_blackjack.jpg', type: 'jpeg', quality: 82 });
  await p.click('#tbHelp', { force: true });
  await p.waitForTimeout(400);
  const guideOk = await p.evaluate(() => !!document.querySelector('.guide-hero') && /블랙잭/.test(document.getElementById('modalBody').innerText) && /RTP/.test(document.getElementById('modalBody').innerText));
  ok(guideOk, 'guide modal blackjack');
  await p.screenshot({ path: OUT + 'guide_blackjack.jpg', type: 'jpeg', quality: 82 });
  await p.evaluate(() => Game.closeModal());

  async function shotGame(id, file, win) {
    await p.evaluate((id) => {
      Game.closeModal();
      try { document.getElementById('tbStage').innerHTML = ''; document.getElementById('table').classList.remove('on'); document.body.classList.remove('in-table'); } catch (e) {}
      Lobby.hide();
      const s = __slot.E.s; s.seenHints[id] = 1; __slot.E.save();
      Tables.enter(id);
    }, id);
    await p.waitForTimeout(600);
    if (win) await p.evaluate(() => { const m = Tables.current; if (m && m.debugWin) m.debugWin(); });
    await p.waitForTimeout(500);
    await p.screenshot({ path: OUT + file, type: 'jpeg', quality: 82 });
  }
  await shotGame('roulette', 'game_roulette.jpg', true);
  await shotGame('baccarat', 'game_baccarat.jpg', true);
  await shotGame('vpoker', 'game_vpoker.jpg', true);
  await p.click('#tbHelp', { force: true });
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => /비디오 포커/.test(document.getElementById('modalBody').innerText) && /99\.54/.test(document.getElementById('modalBody').innerText)), 'guide vpoker');
  await p.screenshot({ path: OUT + 'guide_vpoker.jpg', type: 'jpeg', quality: 82 });
  await p.evaluate(() => Game.closeModal());
  await shotGame('crash', 'game_crash.jpg', true);
  await shotGame('plinko', 'game_plinko.jpg', false);
  await shotGame('mines', 'game_mines.jpg', false);

  // slot + slot guide
  await p.evaluate(() => {
    try { document.getElementById('tbStage').innerHTML = ''; document.getElementById('table').classList.remove('on'); document.body.classList.remove('in-table'); } catch (e) {}
    Lobby.hide();
    const s = __slot.E.s; s.seenHints.classic = 1; s.seenHints.bunny = 1; __slot.E.save();
    Game.enterSlot('classic');
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + 'slot_classic.jpg', type: 'jpeg', quality: 82 });
  await p.click('#btnInfo', { force: true });
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => /럭키 7 클래식/.test(document.getElementById('modalBody').innerText) && /게임 방법|규칙/.test(document.getElementById('modalBody').innerText)), 'slot guide modal');
  await p.screenshot({ path: OUT + 'guide_classic.jpg', type: 'jpeg', quality: 82 });
  await p.evaluate(() => Game.closeModal());
  await p.evaluate(() => Game.enterSlot('bunny'));
  await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + 'slot_bunny.jpg', type: 'jpeg', quality: 82 });

  // footer must not appear on play screens
  const noFoot = await p.evaluate(() => !/실제 돈이 오가지 않는 게임입니다/.test(document.body.innerText));
  ok(noFoot, 'no footer on slot screen');

  await p.close();

  // ---- 375px layout ----
  const q = await boot(375);
  await q.evaluate(() => { const s = __slot.E.s; s.seenHints = { classic:1, blackjack:1, roulette:1 }; __slot.E.save(); });
  const cat375 = await q.evaluate(() => {
    return [...document.querySelectorAll('.cats button')].map((el) => {
      const b = el.getBoundingClientRect();
      return { t: el.textContent, x: b.x, r: b.right, y: b.y, btm: b.bottom, w: b.width };
    });
  });
  for (const c of cat375) {
    ok(c.x >= -0.5 && c.r <= 375.5 && c.w > 20, '375 cat visible: ' + c.t);
  }
  await q.screenshot({ path: OUT + 'lobby_375.jpg', type: 'jpeg', quality: 82 });
  await q.evaluate(() => { Lobby.hide(); const s=__slot.E.s; s.seenHints.roulette=1; __slot.E.save(); Tables.enter('roulette'); });
  await q.waitForTimeout(600);
  await q.evaluate(() => { const m = Tables.current; if (m && m.debugWin) m.debugWin(); });
  await q.waitForTimeout(400);
  await q.screenshot({ path: OUT + 'game_roulette_375.jpg', type: 'jpeg', quality: 82 });
  await q.evaluate(() => { try { document.getElementById('tbStage').innerHTML=''; document.getElementById('table').classList.remove('on'); document.body.classList.remove('in-table'); } catch(e){} Lobby.show(); });
  await q.close();

  console.log('errors', errs);
  ok(errs.length === 0, 'no console errors: ' + JSON.stringify(errs));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
