/* 슬롯 2: 트로피컬 프루츠 — 저변동성: 자주 터지는 작은 당첨 (과일 아무거나 3개 = 믹스 당첨) */
(function (root) {
  const SLOT = {
    id: 'fruit', name: '트로피컬 프루츠', level: 1, minBetIdx: 0, order: 2,
    theme: { bg: 'bg_fruit', logo: ['FRUIT', 'PARTY'], bgm: 'fruit_loop', sfx: { win_small: 'fruit_pop' }, vars: { f1: '#ff9a1a', f2: '#4a1a00', f3: '#7dff7a', f4: '#1a5a3a' }, cover: 'f_melon' },
    lobby: { blurb: '당첨이 자주 나오는 상큼한 과일 슬롯', rtp: 96.4, volatility: 1, tag: '저변동성', pros: ['당첨이 매우 자주 나옴', '체리·레몬·오렌지 섞어서 3개 = 믹스 당첨', '코인이 천천히 오래감'], cons: ['한 방 당첨이 작음', '잭팟 없음'], features: ['과일 믹스', '프리스핀 x2'] },
    symbols: {
      cherry:  { name: '체리',     img: 'cherry',  tier: 'low', fruit: true },
      lemon:   { name: '레몬',     img: 'lemon',   tier: 'low', fruit: true },
      orange:  { name: '오렌지',   img: 'f_orange', tier: 'low', fruit: true },
      grape:   { name: '포도',     img: 'grape',   tier: 'low' },
      straw:   { name: '딸기',     img: 'f_straw', tier: 'mid' },
      melon:   { name: '수박',     img: 'f_melon', tier: 'mid' },
      pine:    { name: '황금 파인', img: 'f_pine', tier: 'high' },
      wild:    { name: '와일드',   img: 'f_wild',  tier: 'high', wild: true },
      scatter: { name: '보너스',   img: 'scatter', tier: 'high', scatter: true },
    },
    reelWeights: [
      { cherry: 8, lemon: 8, orange: 8, grape: 7, straw: 5, melon: 4, pine: 2, wild: 2, scatter: 2 },
      { cherry: 8, lemon: 8, orange: 8, grape: 7, straw: 5, melon: 4, pine: 2, wild: 2, scatter: 2 },
      { cherry: 8, lemon: 8, orange: 8, grape: 7, straw: 5, melon: 4, pine: 2, wild: 1, scatter: 2 },
    ],
    paytable: { cherry: 8, lemon: 8, orange: 10, grape: 12, straw: 18, melon: 28, pine: 79, wild: 158 },
    twoKind: {},
    mixPay: 2.4,                       // 체리/레몬/오렌지 아무거나 3개(라인) = 라인베팅 x mixPay
    jackpotSymbol: null,
    scatter: { pay: { 2: 1, 3: 3 }, freeSpinsAt: 3, freeSpins: 8, freeSpinMultiplier: 2 },
    streakMultipliers: [1, 1, 1, 1.1, 1.2],
    features: {},
  };
  if (typeof module !== "undefined") module.exports = SLOT; else (root.SLOT_DEFS = root.SLOT_DEFS || []).push(SLOT);
})(this);
