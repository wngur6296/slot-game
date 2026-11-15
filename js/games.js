/* 테이블/카드/인스턴트 게임 레지스트리 + 공용 셸 (베팅·정산·입장/퇴장) */
const Games = (() => {
  const list = () => (typeof GAME_DEFS !== 'undefined' ? GAME_DEFS.slice() : []).sort((a, b) => a.order - b.order);
  const get = (id) => list().find((d) => d.id === id);
  return { list, get };
})();

const Tables = (() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');
  let cur = null, busy = false, leaving = false;
  const E = () => window.__slot.E;
  const levels = () => SLOT_CONFIG.economy.betLevels;

  function xpMult() {
    try {
      const b = Shop.active && Shop.active('xp2');
      if (b) { b.n--; if (b.n <= 0) delete E().s.buffs.xp2; Shop.renderBuffs && Shop.renderBuffs(); return 2; }
    } catch (e) {}
    return 1;
  }
  function wager(amount, round = true) { return E().takeWager(amount, xpMult(), round); }
  function settle(label, stake, returned) {
    returned = Math.max(0, Math.round(returned));
    const net = returned - stake;
    if (returned > 0) {
      const ratio = stake ? returned / stake : 0;
      const tier = ratio >= 80 ? 'epic' : ratio >= 30 ? 'mega' : ratio >= 10 ? 'big' : 'small';
      E().award(returned, net > 0 ? tier : 'small');
      if (net > 0) E().mission('wins', 1);
      if (ratio >= 10) E().mission('bigwin', 1);
    }
    E().tx('game', label, net);
    hud();
    if (net > 0) { Audio2.play(returned >= stake * 10 ? 'win_big' : 'win_small'); Haptic([8, 30, 12]); }
    else if (net < 0) Audio2.play('stop');
    return net;
  }
  function hud() {
    const s = E().s;
    const el = $('tbCoins'); if (el) el.innerHTML = `<span class="ico coin-ico"></span><b>${s.coins >= 1e5 ? fmtCompact(s.coins) : fmt(s.coins)}</b>`;
    if (window.Game && Game.hud) Game.hud();
  }
  function toast(m) { (window.Game && Game.toast) ? Game.toast(m) : console.log(m); }
  function help(html) { if (window.Game && Game.modal) Game.modal(html); }
  function setBusy(v) { busy = !!v; }

  function enter(id) {
    const d = Games.get(id); if (!d) return;
    const mod = (window.GAME_MODS || {})[id]; if (!mod) return toast('게임을 불러오지 못했어요');
    if (cur && cur.unmount) try { cur.unmount(); } catch (e) {}
    cur = mod; E().markPlayed(id, true); busy = false;
    $('tbName').textContent = d.name; $('tbSub').textContent = d.lobby.tag || '';
    $('table').classList.add('on'); document.body.classList.add('in-table');
    $('table').dataset.game = id;
    Audio2.setTheme({ bgm: (d.theme && d.theme.bgm) || 'table_loop' });
    hud();
    mod.mount($('tbStage'), { E: E(), fmt, wager, settle, hud, toast, help, setBusy, isBusy: () => busy, levels: levels(), minBet: levels()[d.minBetIdx || 0], def: d });
  }
  function leave() {
    if (busy) return toast('라운드가 끝난 뒤 로비로 갈 수 있어요');
    if (cur && cur.unmount) try { cur.unmount(); } catch (e) {}
    cur = null; $('tbStage').innerHTML = ''; $('table').classList.remove('on'); document.body.classList.remove('in-table');
    Lobby.show();
  }
  function showHelp() { if (cur && cur.help) cur.help(); }

  function bind() {
    const t = $('table'); if (!t || t._bound) return; t._bound = true;
    $('tbHome').addEventListener('click', () => { Audio2.play('click'); leave(); });
    $('tbHelp').addEventListener('click', () => { Audio2.play('click'); showHelp(); });
    $('tbCoins').addEventListener('click', () => toast(`🪙 보유 잔액 ${fmt(E().s.coins)}`));
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', bind); else bind();

  return { enter, leave, hud, toast, settle, wager, fmt, setBusy, get busy() { return busy; }, get current() { return cur; } };
})();
