/* 슬롯 5: 바니 나이트 — 보너스 특화: 당근 스캐터가 자주 나와 프리스핀 x3, 가운데 릴 바니 와일드 확장 */
(function (root) {
  const SLOT = {
    id: 'bunny', name: '바니 나이트', level: 3, minBetIdx: 0, order: 5,
    theme: { bg: 'bg_bunny', logo: ['BUNNY', 'NIGHT'], bgm: 'bunny_loop', sfx: { win_small: 'bunny_heart' }, vars: { f1: '#ff5ab4', f2: '#2a0030', f3: '#c38bff', f4: '#3a0a4a' }, cover: 'b_wild',
      character: { idle: 'ch_bunny_idle', win: 'ch_bunny_win', sad: 'ch_bunny_sad',
        lines: { idle: ['오늘 밤 행운은 당신 거예요 ♥', '당근 3개면 프리스핀!', '바니 와일드를 노려봐요~'], win: ['꺄~ 대단해요!', '역시 최고!', '♥ 축하해요 ♥'], big: ['대박이에요!!', '오늘 밤의 주인공!'], sad: ['아깝다… 다음엔 꼭!', '힝, 거의 다 왔는데!'], expand: ['바니 와일드 확장!'] } } },
    lobby: { blurb: '확장 와일드와 프리스핀이 매력인 나이트 슬롯', rtp: 96.3, volatility: 2, tag: '보너스 특화', pros: ['프리스핀이 자주 발동', '프리스핀 당첨 x3', '바니 와일드가 릴 전체로 확장'], cons: ['일반 배당이 낮음', '레벨 3 필요'], features: ['확장 와일드', '당근 프리스핀 x3', '하트 2개 당첨', '캐릭터 리액션'] },
    symbols: {
      cards:    { name: '카드',     img: 'b_cards',    tier: 'low'  },
      dice:     { name: '주사위',   img: 'b_dice',     tier: 'low'  },
      cocktail: { name: '칵테일',   img: 'b_cocktail', tier: 'low'  },
      champ:    { name: '샴페인',   img: 'b_champ',    tier: 'mid'  },
      hat:      { name: '실크햇',   img: 'b_hat',      tier: 'mid'  },
      heart:    { name: '하트',     img: 'b_heart',    tier: 'high' },
      wild:     { name: '바니 와일드', img: 'b_wild',  tier: 'high', wild: true },
      scatter:  { name: '황금 당근', img: 'b_carrot',  tier: 'high', scatter: true },
    },
    reelWeights: [
      { cards: 9, dice: 9, cocktail: 8, champ: 6, hat: 5, heart: 3, wild: 1, scatter: 3 },
      { cards: 9, dice: 9, cocktail: 8, champ: 6, hat: 5, heart: 3, wild: 1, scatter: 3 },
      { cards: 9, dice: 9, cocktail: 8, champ: 6, hat: 5, heart: 2, wild: 1, scatter: 3 },
    ],
    paytable: { cards: 8, dice: 9.5, cocktail: 13, champ: 24, hat: 40, heart: 96, wild: 480 },
    twoKind: { heart: 3 },
    jackpotSymbol: 'wild',
    scatter: { pay: { 2: 1, 3: 3 }, freeSpinsAt: 3, freeSpins: 8, freeSpinMultiplier: 3 },
    streakMultipliers: [1, 1, 1.1, 1.2, 1.3],
    features: { expandWild: { reel: 1 } },   // 가운데 릴에 와일드가 뜨면 릴 전체가 와일드
  };
  if (typeof module !== "undefined") module.exports = SLOT; else (root.SLOT_DEFS = root.SLOT_DEFS || []).push(SLOT);
})(this);
