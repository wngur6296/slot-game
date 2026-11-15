/* 공용 카드: 슈, 값 계산, SVG/HTML 렌더 (블랙잭·바카라·홀덤) */
(function (root) {
  const SUITS = ['s', 'h', 'd', 'c'], SYM = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const RN = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  const rch = (r) => RN[r] || String(r);
  const card = (r, s) => ({ r, s, id: rch(r) + s });
  function shuffle(a, rng) {
    rng = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function makeDeck() { const a = []; for (const s of SUITS) for (let r = 1; r <= 13; r++) a.push(card(r, s)); return a; }
  function shoe(decks, rng) {
    const a = []; for (let d = 0; d < decks; d++) a.push(...makeDeck());
    shuffle(a, rng);
    return { a, i: 0, decks, cut: Math.floor(a.length * (0.72 + (rng || Math.random)() * 0.08)) };
  }
  function draw(sh, rng) { if (sh.i >= sh.a.length) { const n = shoe(sh.decks, rng); sh.a = n.a; sh.i = 0; sh.cut = n.cut; } return sh.a[sh.i++]; }
  function needShuffle(sh) { return sh.i >= sh.cut; }
  function bjValue(cards) {
    let t = 0, aces = 0;
    for (const c of cards) { if (c.r === 1) { aces++; t += 11; } else t += Math.min(10, c.r); }
    while (t > 21 && aces) { t -= 10; aces--; }
    return { total: t, soft: aces > 0 && t <= 21 };
  }
  function isBJ(cards) { return cards.length === 2 && bjValue(cards).total === 21; }
  function bacVal(c) { return c.r === 1 ? 1 : c.r >= 10 ? 0 : c.r; }
  function bacTotal(cards) { return cards.reduce((s, c) => s + bacVal(c), 0) % 10; }
  function html(c, extra) {
    const ch = rch(c.r), red = (c.s === 'h' || c.s === 'd') ? 'red' : 'blk';
    return `<div class="pcard ${red} ${extra || ''}" data-id="${c.id}"><div class="pc-inner"><div class="pc-face"><b>${ch}</b><i>${SYM[c.s]}</i><em>${SYM[c.s]}</em></div><div class="pc-back"></div></div></div>`;
  }
  const Cards = { SUITS, SYM, rch, card, shuffle, makeDeck, shoe, draw, needShuffle, bjValue, isBJ, bacVal, bacTotal, html };
  if (typeof module !== 'undefined' && module.exports) module.exports = Cards; else root.Cards = Cards;
})(typeof globalThis !== 'undefined' ? globalThis : this);
