/* 슬롯 3: 드래곤 보물 — 고변동성: 드물지만 거대한 당첨. 와일드 1개당 x3 배수 (2개면 x9) */
(function (root) {
  const SLOT = {
    id: 'dragon', name: '드래곤 보물', level: 5, minBetIdx: 0, order: 3,
    theme: { bg: 'bg_dragon', logo: ['DRAGON', '寶'], bgm: 'dragon_loop', sfx: { win_big: 'gong', freespins: 'gong' }, vars: { f1: '#d4a020', f2: '#3a0000', f3: '#ff5a1a', f4: '#5a0a0a' }, cover: 'd_wild' },
    lobby: { blurb: '고배당 와일드 배수의 드래곤 슬롯', rtp: 96.0, volatility: 5, tag: '고변동성', pros: ['와일드 배수 x3 / x9', '최대 수천 배 당첨', '프리스핀 x3'], cons: ['당첨 확률 낮음', '꽝 연속 각오'], features: ['와일드 배수', '프리스핀 x3', '드래곤 잭팟'] },
    symbols: {
      coin:    { name: '복전',   img: 'd_coin',    tier: 'low'  },
      lantern: { name: '홍등',   img: 'd_lantern', tier: 'low'  },
      koi:     { name: '잉어',   img: 'd_koi',     tier: 'mid'  },
      jade:    { name: '옥패',   img: 'd_jade',    tier: 'mid'  },
      ingot:   { name: '금괴',   img: 'd_ingot',   tier: 'high' },
      pearl:   { name: '용의 구슬', img: 'd_pearl', tier: 'high' },
      wild:    { name: '드래곤', img: 'd_wild',    tier: 'high', wild: true },
      scatter: { name: '화염 구슬', img: 'd_scatter', tier: 'high', scatter: true },
    },
    reelWeights: [
      { coin: 9, lantern: 9, koi: 7, jade: 5, ingot: 3, pearl: 2, wild: 1, scatter: 2 },
      { coin: 9, lantern: 9, koi: 7, jade: 5, ingot: 3, pearl: 2, wild: 2, scatter: 2 },
      { coin: 11, lantern: 11, koi: 8, jade: 6, ingot: 3, pearl: 1, wild: 1, scatter: 1 },
    ],
    paytable: { coin: 2.5, lantern: 4, koi: 8, jade: 14, ingot: 33, pearl: 80, wild: 1000 },
    twoKind: {},
    jackpotSymbol: 'wild',
    scatter: { pay: { 2: 0, 3: 3 }, freeSpinsAt: 3, freeSpins: 8, freeSpinMultiplier: 3 },
    streakMultipliers: [1],
    features: { wildMultiplier: 3 },   // 당첨 라인의 와일드 1개당 배수
  };
  if (typeof module !== "undefined") module.exports = SLOT; else (root.SLOT_DEFS = root.SLOT_DEFS || []).push(SLOT);
})(this);
