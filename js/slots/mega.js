/* 슬롯 4: 메가 잭팟 볼트 — 누적(프로그레시브) 잭팟. 모든 베팅의 일부가 잭팟에 쌓임. 최소 베팅 100 */
(function (root) {
  const SLOT = {
    id: 'mega', name: '메가 잭팟 볼트', level: 8, minBetIdx: 3, order: 4,
    theme: { bg: 'bg_mega', logo: ['MEGA', 'VAULT'], bgm: 'mega_loop', sfx: { jackpot: 'vault' }, vars: { f1: '#7ad8ff', f2: '#0a1a3a', f3: '#ffd34d', f4: '#10204a' }, cover: 'm_jp' },
    lobby: { rtp: 97.0, volatility: 4, tag: '누적 잭팟', pros: ['누적 잭팟이 계속 커짐', 'JACKPOT 3개 = 잭팟 통째로!'], cons: ['최소 베팅 100', '일반 당첨률 낮음'], features: ['누적 잭팟', '프리스핀 x2'] },
    symbols: {
      bell:    { name: '벨',      img: 'bell',    tier: 'low'  },
      bar:     { name: 'BAR',     img: 'bar',     tier: 'low'  },
      chip:    { name: 'VIP 칩',  img: 'm_chip',  tier: 'mid'  },
      seven:   { name: '세븐',    img: 'seven',   tier: 'mid'  },
      gold:    { name: '골드바',  img: 'm_gold',  tier: 'high' },
      diamond: { name: '다이아',  img: 'diamond', tier: 'high' },
      jp:      { name: '잭팟',    img: 'm_jp',    tier: 'high', noWild: true },  // 와일드 대체 불가
      wild:    { name: '와일드',  img: 'wild',    tier: 'high', wild: true },
      scatter: { name: '보너스',  img: 'scatter', tier: 'high', scatter: true },
    },
    reelWeights: [
      { bell: 9, bar: 8, chip: 6, seven: 5, gold: 3, diamond: 2, jp: 1, wild: 2, scatter: 2 },
      { bell: 9, bar: 8, chip: 6, seven: 5, gold: 3, diamond: 2, jp: 1, wild: 1, scatter: 2 },
      { bell: 10, bar: 9, chip: 6, seven: 5, gold: 3, diamond: 2, jp: 1, wild: 1, scatter: 2 },
    ],
    paytable: { bell: 6, bar: 9.5, chip: 19, seven: 39, gold: 78, diamond: 146, wild: 291, jp: 0 },
    twoKind: {},
    jackpotSymbol: 'jp',
    scatter: { pay: { 2: 1, 3: 4 }, freeSpinsAt: 3, freeSpins: 8, freeSpinMultiplier: 2 },
    streakMultipliers: [1],
    // 누적 잭팟: seed=시작 금액, contrib=베팅 중 잭팟 적립 비율, refBet=이 베팅 이상이면 잭팟 100% 지급 (미만은 비례)
    features: { progressive: { sym: 'jp', seed: 200000, contrib: 0.02, refBet: 1000 } },
  };
  if (typeof module !== "undefined") module.exports = SLOT; else (root.SLOT_DEFS = root.SLOT_DEFS || []).push(SLOT);
})(this);
