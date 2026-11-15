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
  await p.reload(); await p.waitForTimeout(600);
  await p.click('#btnStart', { force: true }); await p.waitForTimeout(1000);
  await p.evaluate(() => {
    Game.closeModal();
    const s = __slot.E.s; s.level = 20; s.coins = 500000; s.gems = 20; s.vipPts = 120000; s.seenHints.holdem = 1;
    s.holdemPrefs = { nAI: 6, sb: 25, bb: 50, buyInBb: 100, diff: 'normal' };
    __slot.E.save(); Lobby.render();
  });
  await p.waitForTimeout(200);

  const enter = async () => {
    await p.evaluate(() => { Game.closeModal(); Lobby.hide(); Tables.enter('holdem'); });
    await p.waitForTimeout(350);
  };

  const holeInfo = async () => p.evaluate(() => {
    const t = GAME_MODS.holdem.getTable();
    if (!t) return { seats: [], ok: false };
    return {
      ok: true,
      street: t.street,
      seats: t.seats.map((s) => ({ id: s.id, name: s.name, inHand: !!s.inHand, n: (s.hole || []).length, stack: s.stack }))
    };
  });

  const leaveHit = async () => p.evaluate(() => {
    const leave = document.getElementById('hdLeave');
    if (!leave) return { vis: false };
    const r = leave.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      vis: r.width > 0 && r.height > 0,
      hit: !!(top && (top.id === 'hdLeave' || leave.contains(top))),
      hitId: top && (top.id || String(top.className).slice(0, 40))
    };
  });

  const overlapNames = async () => p.evaluate(() => {
    const ov = (a, b, pad) => { pad = pad == null ? 1 : pad; return !(a.right <= b.left + pad || a.left >= b.right - pad || a.bottom <= b.top + pad || a.top >= b.bottom - pad); };
    const bad = [];
    document.querySelectorAll('.hd-seat:not(.me)').forEach((s) => {
      const av = s.querySelector('.hd-av');
      const meta = s.querySelector('.hd-meta');
      const name = (s.querySelector('.hd-meta b') || {}).textContent;
      const ar = av && av.getBoundingClientRect();
      const mr = meta && meta.getBoundingClientRect();
      s.querySelectorAll('.hd-hole .pcard').forEach((c) => {
        const cr = c.getBoundingClientRect();
        if (ar && ov(cr, ar)) bad.push(name + ' card-avatar');
        if (mr && ov(cr, mr)) bad.push(name + ' card-name');
      });
      const board = [...document.querySelectorAll('.hd-board .pcard')].map((c) => c.getBoundingClientRect());
      if (mr) board.forEach((br) => { if (ov(mr, br, 8)) bad.push(name + ' name-board'); });
      s.querySelectorAll('.hd-hole .pcard').forEach((c) => {
        const cr = c.getBoundingClientRect();
        board.forEach((br) => { if (ov(cr, br, 4)) bad.push(name + ' card-board'); });
      });
    });
    return bad;
  });

  // ---- setup + join ----
  await enter();
  ok(await p.locator('.hd-setup-card').count() === 1, 'setup after enter');
  const coins0 = await p.evaluate(() => __slot.E.s.coins);
  await p.click('#hdJoin', { force: true });
  await p.waitForTimeout(700);
  ok(await p.locator('.hd-oval').count() === 1, 'joined table');
  const coins1 = await p.evaluate(() => __slot.E.s.coins);
  ok(coins1 === coins0 - 5000, 'buy-in deducted 5000: ' + coins1);

  let info = await holeInfo();
  ok(info.ok && info.seats.filter((s) => s.inHand).every((s) => s.n === 2),
    'join deal exactly 2 hole cards: ' + JSON.stringify(info.seats.map((s) => s.n + (s.inHand ? '' : '*'))));
  ok((await p.locator('#hdLeave').count()) === 1, 'leave visible mid-hand');
  let hit = await leaveHit();
  ok(hit.vis && hit.hit, 'leave tappable mid-hand ' + JSON.stringify(hit));
  await p.screenshot({ path: OUT + 'midhand.png' });
  await p.screenshot({ path: OUT + 'midhand.jpg', type: 'jpeg', quality: 84 });

  const heroStack = info.seats.find((s) => s.id === 0).stack;

  // mid-hand leave + confirm + wallet
  await p.click('#hdLeave');
  await p.waitForTimeout(300);
  ok(await p.locator('#hdLeaveYes').count() === 1, 'confirm dialog shown');
  await p.screenshot({ path: OUT + 'leave_confirm.png' });
  await p.screenshot({ path: OUT + 'leave_confirm.jpg', type: 'jpeg', quality: 84 });
  await p.evaluate(() => document.getElementById('hdLeaveYes') && document.getElementById('hdLeaveYes').click());
  await p.waitForFunction(() => document.getElementById('lobby').classList.contains('on'), { timeout: 4000 }).catch(() => {});
  const after = await p.evaluate(() => ({
    coins: __slot.E.s.coins,
    lobby: document.getElementById('lobby').classList.contains('on'),
    tableOn: document.getElementById('table').classList.contains('on'),
    session: __slot.E.s.holdemSession,
    body: document.body.className
  }));
  ok(after.lobby && !after.tableOn, 'lobby after mid-hand leave ' + JSON.stringify(after));
  ok(!after.session, 'session cleared');
  ok(after.coins === coins1 + heroStack, 'wallet got remaining stack ' + after.coins + ' expected ' + (coins1 + heroStack) + ' stack=' + heroStack);

  // ---- re-enter, busted AI, next hand still 2 cards, AI add/remove, rapid next ----
  await enter();
  await p.click('#hdJoin', { force: true });
  await p.waitForTimeout(500);
  const bustDeal = await p.evaluate(() => {
    const H = GAME_MODS.holdem, t = H.getTable(), E = H.Engine;
    // finish/reset: mark complete, bust one AI, deal next
    t.street = 'complete';
    t.seats.forEach((s) => { s.inHand = false; s.folded = false; s.hole = []; s.invested = 0; s.streetBet = 0; });
    const ai = t.seats.find((s) => !s.isHero);
    ai.stack = 0;
    H.startNextHand();
    return t.seats.map((s) => ({ name: s.name, inHand: s.inHand, n: s.hole.length, stack: s.stack }));
  });
  ok(bustDeal.filter((s) => s.inHand).every((s) => s.n === 2)
    && bustDeal.some((s) => !s.inHand && s.n === 0 && s.stack === 0),
    'after busted AI, in-hand players have 2 cards: ' + JSON.stringify(bustDeal.map((s) => s.name + ':' + s.n + (s.inHand ? '' : '*'))));
  await p.waitForTimeout(200);

  // go to between-hands and change AI count
  await p.evaluate(() => {
    const t = GAME_MODS.holdem.getTable();
    t.street = 'complete'; t.toAct = -1;
  });
  await p.evaluate(() => { const m = Tables.current; if (m && GAME_MODS.holdem.getTable()) { /* re-render via requestLeave cancel path */ } });
  // force render by toggling confirm no... use startNextHand after add, or debug re-render: click isn't available until render
  // Call render by requestLeave cancel after setting complete + invoking debug? Easier: leave to between via unmount no.
  // Use addAI then the table is complete; we need renderTable. Export isn't renderTable.
  // startNextHand would start a hand. Let's use debugPreflop? That replaces the table (cashed=true) — bad for wallet.
  // Trigger render by opening confirm and cancelling? requestLeave on complete leaves immediately!
  // I'll add a small evaluate that clicks isn't possible. Use GAME_MODS and a custom event...
  // Workaround: call debugSetup? No.
  // Simply re-render by briefly using requestLeave on complete would cash out.
  // I'll expose render by starting next then immediately... messy.
  // For AI add: set street complete and dispatch by calling startNextHand after addAI (addAI requires complete/idle).
  const aiCount = await p.evaluate(() => {
    const H = GAME_MODS.holdem, t = H.getTable();
    t.street = 'complete';
    const before = t.seats.length;
    H.Engine.addAI(t);
    H.Engine.addAI(t);
    const last = [...t.seats].reverse().find((s) => !s.isHero);
    H.Engine.removeAI(t, last.id);
    t.seats.forEach((s) => { if (s.stack <= 0 && !s.isHero) s.stack = t.buyIn; });
    H.startNextHand();
    return { before, after: t.seats.length, holes: t.seats.map((s) => s.hole.length) };
  });
  ok(aiCount.after === aiCount.before + 1, 'add/remove AI seats: ' + JSON.stringify(aiCount));
  ok(aiCount.holes.every((n) => n === 2), 'after AI adjust, all 2 cards: ' + aiCount.holes.join(','));

  // rapid startNextHand should not deal 4
  const rapid = await p.evaluate(() => {
    const H = GAME_MODS.holdem, t = H.getTable();
    t.street = 'complete';
    H.startNextHand();
    H.startNextHand();
    H.startNextHand();
    return { street: t.street, holes: t.seats.filter((s) => s.inHand).map((s) => s.hole.length), handNo: t.handNo };
  });
  ok(rapid.holes.every((n) => n === 2), 'rapid next-hand still 2 cards: ' + JSON.stringify(rapid));

  // leave from mid/wait via home button too
  await p.click('#hdLeave');
  await p.waitForTimeout(200);
  if (await p.locator('#hdLeaveYes').count()) await p.evaluate(() => document.getElementById('hdLeaveYes') && document.getElementById('hdLeaveYes').click());
  await p.waitForFunction(() => document.getElementById('lobby').classList.contains('on'), { timeout: 4000 }).catch(() => {});
  ok(await p.evaluate(() => document.getElementById('lobby').classList.contains('on') && !document.getElementById('table').classList.contains('on')), 'lobby after second leave');

  // re-enter and leave from BETWEEN hands (no confirm)
  await enter();
  await p.click('#hdJoin', { force: true });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const t = GAME_MODS.holdem.getTable();
    // resolve hand instantly
    t.street = 'complete'; t.toAct = -1;
  });
  // Need render of between bar. Force by start? I'll call requestLeave which on complete leaves immediately — that's the between-hands leave path we want to test, but we need the button.
  // Render between: use debug path... inject inner re-render by folding all via Engine until complete then we need renderTable.
  // Export a tiny render: after setting complete, call getTable and start... 
  // If I click tbHome, requestLeave on mid-hand (street still preflop unless we set complete AND re-render).
  // Setting street complete without render still has mid-hand UI, but requestLeave checks midHand() via table.street — complete means immediate leave. Good test of between-hands leave (no confirm, full stack+invested).
  const coinsB = await p.evaluate(() => __slot.E.s.coins);
  const retB = await p.evaluate(() => {
    const t = GAME_MODS.holdem.getTable();
    t.street = 'complete';
    const h = t.seats.find((s) => s.isHero);
    return h.stack + h.invested;
  });
  await p.evaluate(() => GAME_MODS.holdem.requestLeave(() => Tables.forceLeave()));
  await p.waitForTimeout(500);
  const coinsC = await p.evaluate(() => __slot.E.s.coins);
  ok(await p.evaluate(() => document.getElementById('lobby').classList.contains('on')), 'between-hands leave to lobby');
  ok(coinsC === coinsB + retB, 'between-hands leave returns stack+invested ' + coinsC + ' == ' + coinsB + '+' + retB);

  // ---- 7 and 9 player showdown layout at 390 and 375 ----
  await enter();
  await p.evaluate(() => { const m = Tables.current; m.debugShowdown({ nAI: 6 }); });
  await p.waitForTimeout(500);
  ok(await p.locator('.hd-seat').count() >= 7, '7-max showdown seats');
  ok(await p.locator('.hd-board .pcard').count() === 5, '5 board cards');
  let ov = await overlapNames();
  ok(ov.length === 0, '390 7-max no card/avatar/name overlap: ' + JSON.stringify(ov));
  await p.screenshot({ path: OUT + 'showdown.png' });
  await p.screenshot({ path: OUT + 'showdown.jpg', type: 'jpeg', quality: 84 });

  await p.evaluate(() => { const m = Tables.current; m.debugShowdown({ nAI: 8 }); });
  await p.waitForTimeout(400);
  ov = await overlapNames();
  ok(ov.length === 0, '390 9-max no card/avatar/name overlap: ' + JSON.stringify(ov));
  await p.screenshot({ path: OUT + 'showdown_9.png' });

  await p.setViewportSize({ width: 375, height: 812 });
  await p.evaluate(() => { const m = Tables.current; m.debugShowdown({ nAI: 6 }); });
  await p.waitForTimeout(400);
  ov = await overlapNames();
  ok(ov.length === 0, '375 7-max no overlap: ' + JSON.stringify(ov));
  const lay = await p.evaluate(() => {
    const seats = [...document.querySelectorAll('.hd-seat')];
    const bar = document.querySelector('.hd-bar');
    const r = (el) => el.getBoundingClientRect();
    const br = r(bar);
    return {
      n: seats.length,
      overflow: seats.some((s) => { const b = r(s); return b.left < -6 || b.right > innerWidth + 6 || b.top < 32 || b.bottom > br.top + 24; })
    };
  });
  ok(lay.n >= 7 && !lay.overflow, '375 layout in bounds ' + JSON.stringify(lay));
  await p.screenshot({ path: OUT + 'showdown_375.png' });

  await p.evaluate(() => { const m = Tables.current; m.debugShowdown({ nAI: 8 }); });
  await p.waitForTimeout(400);
  ov = await overlapNames();
  ok(ov.length === 0, '375 9-max no overlap: ' + JSON.stringify(ov));

  // setup screenshot still
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { try { Tables.forceLeave(); } catch (e) {} Lobby.hide(); Tables.enter('holdem'); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + 'setup.png' });
  await p.screenshot({ path: OUT + 'setup.jpg', type: 'jpeg', quality: 84 });
  await p.click('#tbHelp', { force: true });
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'guide.png' });
  await p.screenshot({ path: OUT + 'guide.jpg', type: 'jpeg', quality: 84 });
  await p.evaluate(() => Game.closeModal());

  ok(errs.length === 0, 'console errors: ' + JSON.stringify(errs));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
