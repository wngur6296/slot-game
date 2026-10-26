/* 슬롯 레지스트리: js/slots/*.js 에서 등록한 SLOT_DEFS 를 관리하고 현재 슬롯을 SLOT_CONFIG 에 적용 */
const Slots = (() => {
  const KEYS = ['id', 'name', 'minBetIdx', 'theme', 'lobby', 'symbols', 'reelWeights', 'paylines', 'paytable', 'twoKind', 'mixPay',
    'jackpotSymbol', 'scatter', 'streakMultipliers', 'features', 'rows'];
  const BASE = { paylines: SLOT_CONFIG.paylines, rows: SLOT_CONFIG.rows, mixPay: 0, twoKind: {}, features: {}, streakMultipliers: [1] };
  const list = () => (window.SLOT_DEFS || []).slice().sort((a, b) => a.order - b.order);
  const get = (id) => list().find((d) => d.id === id) || list()[0];
  let current = null;
  function apply(id) { const d = get(id); KEYS.forEach((k) => { SLOT_CONFIG[k] = d[k] !== undefined ? d[k] : BASE[k]; }); current = d; return d; }
  return { list, get, apply, get current() { return current; } };
})();
Slots.apply('classic');
