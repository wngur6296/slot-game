/* 오디오: Web Audio API. iOS는 첫 탭에서 unlock() 필요. 파일은 assets/sfx, assets/bgm */
const Audio2 = (() => {
  const SFX = ['click', 'spin', 'stop', 'coin', 'win_small', 'win_big', 'jackpot', 'freespins', 'tension', 'levelup'];
  let ctx, master, sfxGain, bgmGain, bgmSrc; const buf = {}; let sfxOn = true, bgmOn = true; const active = {};
  async function load(name, url) {
    try { const r = await fetch(url); buf[name] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { console.warn('audio load fail', name); }
  }
  function unlock() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.connect(master); bgmGain = ctx.createGain(); bgmGain.gain.value = 0.32; bgmGain.connect(master);
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(master); s.start(0); // iOS 잠금 해제
    SFX.forEach((n) => load(n, `assets/sfx/${n}.mp3`));
    load('bgm', 'assets/bgm/casino_loop.mp3').then(() => bgmOn && startBgm());
    document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });
  }
  function play(name, { vol = 1, rate = 1, loop = false } = {}) {
    if (!ctx || !sfxOn || !buf[name]) return null;
    const s = ctx.createBufferSource(); s.buffer = buf[name]; s.playbackRate.value = rate; s.loop = loop;
    const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(sfxGain); s.start(); active[name] = { s, g }; return s;
  }
  function stop(name, fade = 0.15) { const a = active[name]; if (!a || !ctx) return; a.g.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); a.s.stop(ctx.currentTime + fade); delete active[name]; }
  function startBgm() { if (!ctx || !buf.bgm || bgmSrc) return; bgmSrc = ctx.createBufferSource(); bgmSrc.buffer = buf.bgm; bgmSrc.loop = true; bgmSrc.connect(bgmGain); bgmSrc.start(); }
  function stopBgm() { if (bgmSrc) { bgmSrc.stop(); bgmSrc = null; } }
  function duck(on) { if (bgmGain) bgmGain.gain.setTargetAtTime(on ? 0.08 : 0.32, ctx.currentTime, 0.2); }
  function setSfx(v) { sfxOn = v; } function setBgm(v) { bgmOn = v; v ? startBgm() : stopBgm(); }
  return { unlock, play, stop, duck, setSfx, setBgm };
})();
const Haptic = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
