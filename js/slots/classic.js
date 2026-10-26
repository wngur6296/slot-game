/* 슬롯 1: 럭키 7 클래식 — 중간 변동성, 체리 소당첨 + 와일드 잭팟 */
(function (root) {
  const SLOT = {
    id: 'classic', name: '럭키 7 클래식', level: 1, minBetIdx: 0, order: 1,
    theme: { bg: 'bg', logo: ['LUCKY', '7'], bgm: 'casino_loop', sfx: {}, vars: { f1: '#e6a019', f2: '#4a1b00', f3: '#ffd34d', f4: '#5a1a6e' }, cover: 'seven' },
    lobby: { rtp: 96.1, volatility: 3, tag: '밸런스', pros: ['체리 2개만 맞아도 당첨', '와일드 3개 = 잭팟'], cons: ['특수 기능이 단순'], features: ['프리스핀 x2', '연승 배수', '니어미스'] },
    symbols: {
      cherry:  { name: '체리',   img: 'cherry',  tier: 'low'  },
      lemon:   { name: '레몬',   img: 'lemon',   tier: 'low'  },
      grape:   { name: '포도',   img: 'grape',   tier: 'low'  },
      bell:    { name: '벨',     img: 'bell',    tier: 'mid'  },
      bar:     { name: 'BAR',    img: 'bar',     tier: 'mid'  },
      seven:   { name: '세븐',   img: 'seven',   tier: 'high' },
      diamond: { name: '다이아', img: 'diamond', tier: 'high' },
      wild:    { name: '와일드', img: 'wild',    tier: 'high', wild: true },
      scatter: { name: '보너스', img: 'scatter', tier: 'high', scatter: true },
    },
    reelWeights: [
      { cherry: 9, lemon: 9, grape: 8, bell: 6, bar: 5, seven: 3, diamond: 2, wild: 2, scatter: 2 },
      { cherry: 8, lemon: 9, grape: 8, bell: 6, bar: 5, seven: 3, diamond: 2, wild: 1, scatter: 2 },
      { cherry: 7, lemon: 9, grape: 9, bell: 6, bar: 5, seven: 2, diamond: 2, wild: 1, scatter: 2 },
    ],
    paytable: { cherry: 8, lemon: 9, grape: 12, bell: 25, bar: 40, seven: 100, diamond: 250, wild: 1000 },
    twoKind: { cherry: 3 },            // 1·2번 릴 2개 일치 시 라인베팅 배수
    jackpotSymbol: 'wild',             // 이 심볼 3개 = 잭팟 연출
    scatter: { pay: { 2: 1, 3: 5 }, freeSpinsAt: 3, freeSpins: 10, freeSpinMultiplier: 2 },
    streakMultipliers: [1, 1, 1.2, 1.5, 2],
    features: {},
  };
  if (typeof module !== "undefined") module.exports = SLOT; else (root.SLOT_DEFS = root.SLOT_DEFS || []).push(SLOT);
})(this);
