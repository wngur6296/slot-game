// 로비 + 7개 테이블/카드/인스턴트 게임 스크린샷, 콘솔 에러, 375/390px (node scripts/tables_test.js)
const { chromium } = require(process.env.PW || 'playwright');
const URL = process.env.URL || 'http://127.0.0.1:18006/';
const OUT = require('path').join(__dirname, '../docs-screens/');
const GAMES = ['blackjack','roulette','baccarat','vpoker','crash','plinko','mines'];
(async () => {
  const b = await chromium.launch();
  const errs = []; let fail = 0;
  const ok = (c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fail++; };
  for (const w of [390, 375]) {
    const p = await b.newPage({ viewport:{ width:w, height:844 }, deviceScaleFactor:2, hasTouch:true, isMobile:true });
    p.on('pageerror', e => errs.push(w+' '+e.message));
    p.on('console', m => { if (m.type()==='error') errs.push(w+' '+m.text()); });
    await p.goto(URL);
    await p.evaluate(() => localStorage.clear());
    await p.reload(); await p.waitForTimeout(700);
    await p.click('#btnStart', { force:true }); await p.waitForTimeout(1400);
    await p.evaluate(() => { Game.closeModal(); const s=__slot.E.s; s.level=20; s.coins=500000; s.gems=20; s.vipPts=120000; __slot.E.save(); Lobby.render(); });
    await p.waitForTimeout(400);
    if (w===390) {
      await p.screenshot({ path: OUT+'lobby_all.png' });
      await p.click('.cats [data-cat="table"]', { force:true }); await p.waitForTimeout(400);
      await p.screenshot({ path: OUT+'lobby_table.png' });
      await p.click('.cats [data-cat="instant"]', { force:true }); await p.waitForTimeout(300);
      await p.screenshot({ path: OUT+'lobby_instant.png' });
      await p.click('.cats [data-cat="all"]', { force:true });
    }
    const txt = await p.evaluate(() => document.body.innerText);
    ok(!/가상|모의|virtual|캐시아웃|출금|입금/i.test(txt), w+'px lobby forbidden words');
    ok(await p.locator('.cats [data-cat="table"]').count()===1, w+'px table tab');
    for (const id of GAMES) {
      await p.evaluate((id) => { Game.closeModal(); Lobby.hide(); Tables.enter(id); }, id);
      await p.waitForTimeout(700);
      if (w===390) await p.screenshot({ path: OUT+'game_'+id+'.png' });
      const title = await p.evaluate(() => document.getElementById('tbName').textContent);
      ok(!!title, w+'px entered '+id+' title='+title);
      await p.evaluate(() => { const m = Tables.current; if (m && m.debugWin) m.debugWin(); });
      await p.waitForTimeout(500);
      if (w===390) await p.screenshot({ path: OUT+'game_'+id+'_win.png' });
      await p.evaluate(() => { const m=Tables.current; if(m&&m.unmount) m.unmount(); document.getElementById('table').classList.remove('on'); document.body.classList.remove('in-table'); Tables.leave && 0; });
      // force leave even if busy
      await p.evaluate(() => { try { document.getElementById('tbStage').innerHTML=''; document.getElementById('table').classList.remove('on'); document.body.classList.remove('in-table'); } catch(e){} Lobby.show(); });
      await p.waitForTimeout(200);
    }
    await p.close();
  }
  ok(errs.length===0, 'console errors: '+JSON.stringify(errs));
  await b.close();
  process.exit(fail?1:0);
})();
