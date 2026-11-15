const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const URL = process.env.URL || 'http://127.0.0.1:18006/';
const OUT = path.join(__dirname, '../docs-screens/holdem/');
(async () => {
  const b = await chromium.launch();
  const errs = []; let fail = 0;
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(700);
  await p.click('#btnStart', { force: true }); await p.waitForTimeout(1200);
  await p.evaluate(() => {
    Game.closeModal();
    const s = __slot.E.s; s.level = 20; s.coins = 500000; s.gems = 20; s.vipPts = 120000; s.seenHints.holdem = 1; __slot.E.save();
    Lobby.render();
  });
  await p.waitForTimeout(300);

  // lobby has holdem, no video poker
  const lobbyTxt = await p.evaluate(() => document.body.innerText);
  ok(/텍사스 홀덤/.test(lobbyTxt), 'lobby has holdem');
  ok(!/비디오\s*포커/.test(lobbyTxt), 'lobby has no video poker');
  ok(!/가상|모의|virtual|캐시아웃|출금|입금/i.test(lobbyTxt), 'lobby forbidden words');

  await p.evaluate(() => { Lobby.hide(); Tables.enter('holdem'); });
  await p.waitForTimeout(700);
  ok(await p.locator('.hd-setup-card').count() === 1, 'setup screen');
  ok(await p.evaluate(() => document.getElementById('tbName').textContent.includes('홀덤')), 'title holdem');
  const setupTxt = await p.evaluate(() => document.getElementById('table').innerText);
  ok(!/가상|모의|virtual|캐시아웃|출금|입금/i.test(setupTxt), 'setup forbidden words');
  ok(!/실제 돈이 오가지 않는 게임입니다/.test(setupTxt), 'no footer on setup');
  await p.screenshot({ path: OUT + 'setup.png' });
  await p.screenshot({ path: OUT + 'setup.jpg', type: 'jpeg', quality: 84 });

  await p.evaluate(() => { const m = Tables.current; if (m && m.debugPreflop) m.debugPreflop(); });
  await p.waitForTimeout(600);
  const nSeats = await p.locator('.hd-seat').count();
  ok(nSeats >= 7, 'preflop 7 seats got ' + nSeats);
  ok(await p.locator('.hd-hole .pcard').count() >= 14, 'hole cards dealt');
  ok(await p.locator('.hd-oval').count() === 1, 'oval table');
  const preTxt = await p.evaluate(() => document.getElementById('table').innerText);
  ok(!/가상|모의|virtual|캐시아웃|출금|입금/i.test(preTxt), 'preflop forbidden words');
  await p.screenshot({ path: OUT + 'preflop.png' });
  await p.screenshot({ path: OUT + 'preflop.jpg', type: 'jpeg', quality: 84 });

  await p.evaluate(() => { const m = Tables.current; if (m && m.debugShowdown) m.debugShowdown(); });
  await p.waitForTimeout(700);
  const n2 = await p.locator('.hd-seat').count();
  ok(n2 >= 7, 'showdown 7 seats got ' + n2);
  ok(await p.locator('.hd-board .pcard').count() === 5, '5 community cards');
  ok(await p.locator('.hd-seat.winner').count() >= 1, 'winner highlight');
  const sdTxt = await p.evaluate(() => document.getElementById('table').innerText);
  ok(/플러시|로열|스트레이트|포카드|풀하우스|페어|하이카드|승리/.test(sdTxt), 'hand rank or winner text: ' + sdTxt.slice(0, 80));
  ok(!/가상|모의|virtual|캐시아웃|출금|입금/i.test(sdTxt), 'showdown forbidden words');
  await p.screenshot({ path: OUT + 'showdown.png' });
  await p.screenshot({ path: OUT + 'showdown.jpg', type: 'jpeg', quality: 84 });

  await p.click('#tbHelp', { force: true });
  await p.waitForTimeout(400);
  const gtxt = await p.evaluate(() => document.getElementById('modalBody').innerText);
  ok(/텍사스 홀덤/.test(gtxt) && /레이크 없음/.test(gtxt) && /로열 플러시/.test(gtxt), 'guide content');
  ok(/사이드 팟|블라인드|프리플롭/.test(gtxt), 'guide rules');
  await p.screenshot({ path: OUT + 'guide.png' });
  await p.screenshot({ path: OUT + 'guide.jpg', type: 'jpeg', quality: 84 });
  await p.evaluate(() => Game.closeModal());

  // 375 portrait preflop
  await p.setViewportSize({ width: 375, height: 812 });
  await p.evaluate(() => { const m = Tables.current; if (m && m.debugPreflop) m.debugPreflop(); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + 'preflop_375.png' });
  const ov = await p.evaluate(() => {
    const seats = [...document.querySelectorAll('.hd-seat')];
    const bar = document.querySelector('.hd-bar');
    const oval = document.querySelector('.hd-oval');
    const r = (el) => el.getBoundingClientRect();
    const br = r(bar), ovl = r(oval);
    return {
      ovalH: ovl.height, barTop: br.top, vw: innerWidth, vh: innerHeight,
      overflow: seats.some((s) => { const b = r(s); return b.left < -4 || b.right > innerWidth + 4 || b.top < 36 || b.bottom > br.top + 20; }),
      n: seats.length
    };
  });
  ok(ov.n >= 7 && ov.ovalH > 200 && !ov.overflow, '375 oval layout ' + JSON.stringify(ov));

  ok(errs.length === 0, 'console errors: ' + JSON.stringify(errs));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
