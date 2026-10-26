/* =========================================================
 * 게임 튜닝 값은 전부 여기! (확률/배당/재화/보너스)
 * 수정 후 `node scripts/simulate.js` 로 RTP(환수율) 확인하세요.
 * ========================================================= */
(function (root) {
  const CONFIG = {
    version: 3,            // 저장 데이터 버전 (구조 바꾸면 +1 하고 economy.js migrate에 단계 추가)
    saveKey: 'luckyslot_save_v1',

    // ★ 슬롯별 심볼/확률/배당/테마는 js/slots/*.js 에 있습니다. (아래는 모든 슬롯 공통)
    // 게임 중 SLOT_CONFIG 에는 현재 선택된 슬롯의 값이 덮어써집니다 (Slots.apply).
    rows: 3,
    paylines: [ [1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0] ], // 기본 5라인
    streakMultipliers: [1],
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
      charge: { minutes: 30, coins: 3000, perLevel: 200 },   // 무료 충전 (쿨다운)
      vipTiers: [   // 누적 베팅 포인트(pts) 기준. chargeMult=충전량 배수, dailyMult=출석 보너스 배수
        { name: 'BRONZE',   pts: 0,        color: '#cd7f32', chargeMult: 1,   dailyMult: 1 },
        { name: 'SILVER',   pts: 50000,    color: '#d8e0ea', chargeMult: 1.2, dailyMult: 1.2 },
        { name: 'GOLD',     pts: 300000,   color: '#ffd34d', chargeMult: 1.5, dailyMult: 1.5 },
        { name: 'PLATINUM', pts: 1500000,  color: '#9ef4ff', chargeMult: 2,   dailyMult: 2 },
        { name: 'DIAMOND',  pts: 8000000,  color: '#b98cff', chargeMult: 3,   dailyMult: 3 },
      ],
      missions: [   // 일일 미션 (key: spins/bet/wins/freespins/slots/bigwin)
        { id: 'm1', key: 'spins', goal: 50,    name: '스핀 50회',            coins: 2000 },
        { id: 'm2', key: 'wins',  goal: 15,    name: '당첨 15회',            coins: 3000 },
        { id: 'm3', key: 'bet',   goal: 20000, name: '누적 베팅 20,000',     coins: 5000, gems: 2 },
        { id: 'm4', key: 'freespins', goal: 1, name: '프리스핀 1회 발동',    coins: 4000, gems: 2 },
        { id: 'm5', key: 'slots', goal: 3,     name: '서로 다른 슬롯 3종 플레이', coins: 3000, gems: 1 },
        { id: 'm6', key: 'bigwin', goal: 1,    name: 'BIG WIN 이상 1회',      coins: 6000, gems: 3 },
      ],
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
