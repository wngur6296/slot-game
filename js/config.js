/* =========================================================
 * 게임 튜닝 값은 전부 여기! (확률/배당/재화/보너스)
 * 수정 후 `node scripts/simulate.js` 로 RTP(환수율) 확인하세요.
 * ========================================================= */
(function (root) {
  const CONFIG = {
    version: 1,
    saveKey: 'luckyslot_save_v1',

    // ---- 심볼 (img: assets/img/*.webp) ----
    // tier: low/mid/high -> 니어미스(마지막 릴 감속) 판정에 사용
    symbols: {
      cherry:  { name: '체리',     img: 'cherry',  tier: 'low'  },
      lemon:   { name: '레몬',     img: 'lemon',   tier: 'low'  },
      grape:   { name: '포도',     img: 'grape',   tier: 'low'  },
      bell:    { name: '벨',       img: 'bell',    tier: 'mid'  },
      bar:     { name: 'BAR',      img: 'bar',     tier: 'mid'  },
      seven:   { name: '세븐',     img: 'seven',   tier: 'high' },
      diamond: { name: '다이아',   img: 'diamond', tier: 'high' },
      wild:    { name: '와일드',   img: 'wild',    tier: 'high', wild: true },
      scatter: { name: '보너스',   img: 'scatter', tier: 'high', scatter: true },
    },

    // ---- 릴 가중치 (릴마다 스트립에 몇 개씩 들어가는지) ----
    // 숫자가 클수록 자주 나옴. 릴 3(마지막)의 고배당 심볼을 줄이면 니어미스가 늘어납니다.
    reelWeights: [
      { cherry: 9, lemon: 9, grape: 8, bell: 6, bar: 5, seven: 3, diamond: 2, wild: 2, scatter: 2 },
      { cherry: 8, lemon: 9, grape: 8, bell: 6, bar: 5, seven: 3, diamond: 2, wild: 1, scatter: 2 },
      { cherry: 7, lemon: 9, grape: 9, bell: 6, bar: 5, seven: 2, diamond: 2, wild: 1, scatter: 2 },
    ],
    rows: 3,

    // ---- 페이라인 (각 릴의 행 인덱스 0=위,1=가운데,2=아래) ----
    paylines: [
      [1, 1, 1], // 가운데
      [0, 0, 0], // 위
      [2, 2, 2], // 아래
      [0, 1, 2], // 대각선 ↘
      [2, 1, 0], // 대각선 ↗
    ],

    // ---- 배당표: "라인 베팅액"의 배수 (라인 베팅 = 총 베팅 / 라인 수) ----
    paytable: {
      cherry: 8, lemon: 9, grape: 12, bell: 25, bar: 40, seven: 100, diamond: 250,
      wild: 1000,          // 와일드 3개 = 잭팟!
    },
    cherryTwo: 3,          // 체리가 1·2번 릴에 연속 (작은 당첨 자주)
    anyBarMix: 0,          // (예비)

    // ---- 스캐터 (위치 무관, "총 베팅" 배수) ----
    scatter: { pay: { 2: 1, 3: 5 }, freeSpinsAt: 3, freeSpins: 10, freeSpinMultiplier: 2 },

    // ---- 연승 배수: 연속 당첨 횟수 -> 배수 ----
    streakMultipliers: [1, 1, 1.2, 1.5, 2],  // 1연승 x1, 2연승 x1, 3연승 x1.2 ... 5연승+ x2

    // ---- 당첨 연출 등급 (총 베팅 대비 배수) ----
    winTiers: { big: 10, mega: 30, epic: 80 },

    // ---- 재화 ----
    economy: {
      startCoins: 5000,
      startGems: 10,
      betLevels: [10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
      betUnlockLevel: [1, 1, 2, 3, 5, 8, 12, 16, 20], // 해당 베팅 해금 레벨
      hourlyBonus: { minutes: 60, coins: 1000, perLevel: 100 },
      dailyBonus: [1000, 2000, 3000, 5000, 7000, 10000, 20000], // 연속 출석 1~7일차
      dailyGems: [1, 1, 2, 2, 3, 3, 10],
      bankruptRescue: 500,   // 코인 부족 시 1회 구조금 (시간당 보너스와 별개)
      gemShop: [             // 젬 -> 코인 교환 (실제 결제 없음)
        { gems: 5, coins: 5000 }, { gems: 20, coins: 25000 }, { gems: 50, coins: 80000 },
      ],
      bigWinGems: 1, megaWinGems: 3, jackpotGems: 20,
    },

    // ---- 레벨/경험치 ----
    level: {
      xpPerCoinBet: 0.1,                       // 베팅 10코인당 1XP
      xpNeeded: (lv) => Math.floor(100 * Math.pow(lv, 1.6)),
      rewardCoins: (lv) => 1000 * lv,
      rewardGems: (lv) => (lv % 5 === 0 ? 10 : 2),
    },

    // ---- 연출 타이밍(ms) ----
    timing: { spinBase: 700, reelGap: 260, nearMissExtra: 1500, turbo: 0.45, autoDelay: 450 },
  };
  if (typeof module !== 'undefined') module.exports = CONFIG; else root.SLOT_CONFIG = CONFIG;
})(this);
