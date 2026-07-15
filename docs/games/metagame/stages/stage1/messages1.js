// Stage 1 commentary messages. Each entry:
//   { id, text, trigger, condition, maxCount, removeAfterFire }
//
// trigger: 'game-start' | 'bit-earn' | 'buy' | 'bit-lose' | 'bell-open' | 'any' | 'prestige' | 'boss-loss'
// condition(state): boolean — only fire if true
// maxCount: number (max times to fire) | undefined (unlimited)
// removeAfterFire: boolean — remove from active checks after first fire

function bigGte(bn, n) {
  if (!bn || bn.m === 0) return n <= 0;
  if (!isFinite(n)) return false;   // Inf/NaN threshold would spin the while; a finite BigNum is never >= it
  let e = 0, m = n;
  while (m >= 1000) { m /= 1000; e += 3; }
  if (bn.e !== e) return bn.e > e;
  return bn.m >= m;
}

export const MESSAGES1 = [
  {
    id: 'bell-nothing',
    text: '🌑 nothing here',
    trigger: 'game-start',
    condition: () => true,
    maxCount: 1,
    removeAfterFire: true,
  },
  {
    id: 'bell-firstsight',
    text: '👁 I can see something',
    trigger: 'bit-earn',
    condition: (state) => bigGte(state.bits, 10),
    maxCount: 1,
    removeAfterFire: true,
  },
  {
    id: 'bell-stronger',
    text: '⚡ I feel stronger already',
    trigger: 'buy',
    condition: (state) => (state.totalBought || 0) < 5,
    maxCount: undefined,
    removeAfterFire: false,
  },
  {
    id: 'bell-reset',
    text: '🕳 where did everything go :(',
    trigger: 'bit-lose',
    condition: (state) => !bigGte(state.bits, 10),
    maxCount: undefined,
    removeAfterFire: false,
  },
  {
    id: 'bell-halfway',
    text: '🌗 halfway there',
    trigger: 'bit-earn',
    condition: (state) => bigGte(state.totalBits, 500),
    maxCount: 1,
    removeAfterFire: true,
  },
  {
    id: 'bell-patient',
    text: '⏳ patience has a cost',
    trigger: 'buy',
    condition: (state) => (state.totalBought || 0) >= 10,
    maxCount: 1,
    removeAfterFire: true,
  },

  // §2.2 Sub-stage first-unlock bells
  { id: 'bell-mult',    text: '✖ now my taps multiply.',                    trigger: 'buy',      condition: (state) => (state.owned && state.owned['s1-mult'] || 0) >= 1,    maxCount: 1, removeAfterFire: true },
  { id: 'bell-box',     text: '🧰 a box. it makes more of me.',             trigger: 'bit-earn', condition: (state) => bigGte(state.bits, 500),                              maxCount: 1, removeAfterFire: true },
  { id: 'bell-boost',   text: '📡 the box hums louder now.',                trigger: 'buy',      condition: (state) => (state.owned && state.owned['s1-boost'] || 0) >= 1,   maxCount: 1, removeAfterFire: true },
  { id: 'bell-cluster', text: '🧊 a cluster. things are accelerating.',     trigger: 'buy',      condition: (state) => (state.owned && state.owned['s1-cluster'] || 0) >= 1, maxCount: 1, removeAfterFire: true },
  { id: 'bell-array',   text: '🛰 it runs without me. that\'s new.',        trigger: 'buy',      condition: (state) => (state.owned && state.owned['s1-array'] || 0) >= 1,   maxCount: 1, removeAfterFire: true },
  { id: 'bell-neural',  text: '🧠 it\'s… thinking? everything multiplies.', trigger: 'buy',      condition: (state) => (state.owned && state.owned['s1-neural'] || 0) >= 1,  maxCount: 1, removeAfterFire: true },
  { id: 'bell-quantum', text: '⚛ my tap fractured into many.',              trigger: 'buy',      condition: (state) => (state.owned && state.owned['s1-quantum'] || 0) >= 1, maxCount: 1, removeAfterFire: true },

  // §8.5 Prestige bell (unlimited, fires each time)
  { id: 'bell-reset-prestige', text: '🌀 collapsed. denser now.', trigger: 'prestige', condition: () => true, maxCount: undefined, removeAfterFire: false },

  // §7.3 Boss-hint bells (fire on 'boss-loss' trigger at 5/10/15 losses)
  { id: 'bell-boss-hint-1', text: '💬 "try a steady rhythm." — The Defragmenter',                  trigger: 'boss-loss', condition: (state) => (state.bossLossCount || 0) >= 5,  maxCount: 1, removeAfterFire: true },
  { id: 'bell-boss-hint-2', text: '💬 "my surges end quickly." — The Defragmenter',               trigger: 'boss-loss', condition: (state) => (state.bossLossCount || 0) >= 10, maxCount: 1, removeAfterFire: true },
  { id: 'bell-boss-hint-3', text: '💬 "one point ahead is enough." — The Defragmenter',            trigger: 'boss-loss', condition: (state) => (state.bossLossCount || 0) >= 15, maxCount: 1, removeAfterFire: true },
];
