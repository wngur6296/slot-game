/* =========================================================
 * 상점 설정 (게임 내 코인/젬으로만 구매 — 실제 결제 기능 없음)
 * 가격 단위: coins(코인) / gems(젬). 소모품의 betX = "현재 베팅 x N 코인".
 * ========================================================= */
(function (root) {
  const SHOP = {
    categories: [
      { id: 'frame',  name: '릴 프레임' },
      { id: 'bg',     name: '배경 테마' },
      { id: 'spin',   name: '스핀 버튼' },
      { id: 'fx',     name: '당첨 이펙트' },
      { id: 'avatar', name: '아바타' },
      { id: 'title',  name: '칭호' },
    ],
    // 기본 장착 (무료 보유)
    defaults: { frame: 'frame_gold', bg: 'bg_casino', spin: 'spin_ruby', fx: 'fx_classic', avatar: 'av_none', title: 'title_rookie' },

    // ---- 꾸미기 아이템 ---- (vars = CSS 변수, 미리보기 색에도 사용)
    cosmetics: [
      // 릴 프레임: f1 메인 금속, f2 테두리 어두운색, f3 발광색, f4 내부 그라데이션
      { id: 'frame_gold',    cat: 'frame', name: '클래식 골드',   price: {},              vars: { f1: '#e6a019', f2: '#4a1b00', f3: '#ffd34d', f4: '#5a1a6e' } },
      { id: 'frame_neon',    cat: 'frame', name: '네온 사이버',   price: { coins: 30000 }, vars: { f1: '#2ad8ff', f2: '#06243a', f3: '#ff3dd4', f4: '#102a5a' } },
      { id: 'frame_ruby',    cat: 'frame', name: '루비 로열',     price: { coins: 80000 }, level: 5, vars: { f1: '#ff3d5a', f2: '#3a0010', f3: '#ffb0c0', f4: '#6a0a24' } },
      { id: 'frame_emerald', cat: 'frame', name: '에메랄드 시티', price: { gems: 40 },     vars: { f1: '#2fe08a', f2: '#00301a', f3: '#c8ffd8', f4: '#0a4a30' } },
      { id: 'frame_diamond', cat: 'frame', name: '다이아몬드',    price: { gems: 120 },    level: 10, vars: { f1: '#e8f6ff', f2: '#1a2a4a', f3: '#7ad8ff', f4: '#2a3a6a' } },
      // 배경
      { id: 'bg_casino', cat: 'bg', name: '벨벳 카지노', price: {},              img: 'bg' },
      { id: 'bg_neon',   cat: 'bg', name: '네온 시티',   price: { coins: 50000 }, img: 'bg_neon' },
      { id: 'bg_ocean',  cat: 'bg', name: '심해 라운지', price: { coins: 120000 }, level: 6, img: 'bg_ocean' },
      { id: 'bg_royal',  cat: 'bg', name: '황금 보물고', price: { gems: 80 },     img: 'bg_royal' },
      // 스핀 버튼: s1 하이라이트, s2 메인, s3 그림자, s4 발광
      { id: 'spin_ruby',     cat: 'spin', name: '루비 버튼',   price: {},              vars: { s1: '#ff8fb8', s2: '#ff2a6a', s3: '#a0003a', s4: 'rgba(255,61,154,.6)' } },
      { id: 'spin_gold',     cat: 'spin', name: '골드 버튼',   price: { coins: 25000 }, vars: { s1: '#fff3b0', s2: '#ffc21a', s3: '#a05a00', s4: 'rgba(255,200,40,.7)' } },
      { id: 'spin_emerald',  cat: 'spin', name: '에메랄드',    price: { coins: 40000 }, vars: { s1: '#b8ffd0', s2: '#20c060', s3: '#006030', s4: 'rgba(50,230,120,.6)' } },
      { id: 'spin_galaxy',   cat: 'spin', name: '갤럭시',      price: { gems: 30 },     vars: { s1: '#d8b8ff', s2: '#7a3dff', s3: '#2a0080', s4: 'rgba(150,90,255,.8)' } },
      // 당첨 이펙트: shape rect/star/heart/gem
      { id: 'fx_classic', cat: 'fx', name: '클래식 컨페티', price: {},              fx: { shape: 'rect',  colors: ['#ffd34d', '#ff3d9a', '#4de1ff', '#7dff7a', '#ffffff', '#b266ff'] } },
      { id: 'fx_stars',   cat: 'fx', name: '골든 스타',     price: { coins: 35000 }, fx: { shape: 'star',  colors: ['#ffd34d', '#fff3b0', '#ffb020', '#ffffff'] } },
      { id: 'fx_hearts',  cat: 'fx', name: '러브 하트',     price: { coins: 35000 }, fx: { shape: 'heart', colors: ['#ff3d9a', '#ff8fb8', '#ff2a4a', '#ffd0e0'] } },
      { id: 'fx_gems',    cat: 'fx', name: '보석 폭풍',     price: { gems: 50 },     fx: { shape: 'gem',   colors: ['#4de1ff', '#b266ff', '#2fe08a', '#ff3d5a', '#ffffff'] } },
      // 아바타
      { id: 'av_none',   cat: 'avatar', name: '골드 배지',  price: {},              img: null },
      { id: 'av_cat',    cat: 'avatar', name: '행운 고양이', price: { coins: 20000 }, img: 'av_cat' },
      { id: 'av_fox',    cat: 'avatar', name: '여우 신사',   price: { coins: 60000 }, level: 4, img: 'av_fox' },
      { id: 'av_dragon', cat: 'avatar', name: '황금 용',     price: { gems: 60 },     img: 'av_dragon' },
      { id: 'av_crown',  cat: 'avatar', name: '왕관',        price: { gems: 150 },    level: 12, img: 'av_crown' },
      // 칭호
      { id: 'title_rookie',  cat: 'title', name: '초보 도박사', price: {} },
      { id: 'title_lucky',   cat: 'title', name: '행운아',       price: { coins: 10000 } },
      { id: 'title_shark',   cat: 'title', name: '카지노 상어', price: { coins: 50000 }, level: 5 },
      { id: 'title_whale',   cat: 'title', name: '큰손',         price: { coins: 300000 }, level: 10 },
      { id: 'title_legend',  cat: 'title', name: '잭팟 전설',   price: { gems: 100 } },
    ],

    // ---- 소모품 (버프) ----
    // spins: 유료 스핀마다 1 감소. maxBet: 구매 당시 베팅 이하에서만 적용 (저베팅 구매 악용 방지)
    consumables: [
      { id: 'boost2x',   name: '2배 부스터',    img: 'it_boost2x',   desc: '당첨금 2배',                 spins: 15, betX: 18, gems: 12 },
      { id: 'luck',      name: '행운의 부적',   img: 'it_luck',      desc: '꽝일 때 8% 확률로 재추첨',    spins: 30, betX: 4,  gems: 4 },
      { id: 'ticket',    name: '프리스핀 티켓', img: 'it_ticket',    desc: '즉시 프리스핀 5회 (x2)',     freeSpins: 5, betX: 12, gems: 8 },
      { id: 'xp2',       name: 'XP 부스터',     img: 'it_xp',        desc: '경험치 2배',                 spins: 50, betX: 5,  gems: 4 },
      { id: 'insurance', name: '손실 보험',     img: 'it_insurance', desc: '꽝이면 베팅 25% 환급',       spins: 30, betX: 6,  gems: 5 },
      { id: 'autopass',  name: '오토 패스',     img: 'it_autopass',  desc: '60분간 자동스핀 무제한',     minutes: 60, coins: 15000, gems: 10 },
    ],
    luckRerollChance: 0.08,   // 행운의 부적 재추첨 확률 (simulate.js 로 RTP 확인)
    insuranceRefund: 0.25,
    autoSpinFreeLimit: 25,   // 오토 패스 없을 때 자동스핀 연속 최대 횟수
  };
  if (typeof module !== 'undefined') module.exports = SHOP; else root.SHOP_CONFIG = SHOP;
})(this);
