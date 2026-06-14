// achievements1.js — Stage 1 achievement definitions (WP-S1-03)
// 29 achievements across milestone, behavior, speed, manager, prestige, boss, and secret categories.
//
// NOTE: Do NOT import bignum.js — it may not exist at module parse time. BigNum helpers are local.

// --- BigNum helpers (local, no import) ---

function fromN(n) {
  if (!isFinite(n) || n <= 0) return { m: 0, e: 0 };
  let e = 0, m = n;
  while (m >= 1000) { m /= 1000; e += 3; }
  return { m, e };
}

function bigGte(bn, n) {
  if (!bn || bn.m === 0) return n <= 0;
  const target = n <= 0 ? { m: 0, e: 0 } : fromN(n);
  if (bn.e !== target.e) return bn.e > target.e;
  return bn.m >= target.m;
}

// --- Achievement definitions ---

export const ACHIEVEMENTS1 = [
  // --- Milestone (1–8) ---
  {
    id: 'ach-bits-100',
    name: 'First Hundred 💯',
    icon: '💯',
    category: 'milestone',
    condition: (state) => bigGte(state.totalBits, 100),
    bell: '🏆 100 bits. it begins.',
  },
  {
    id: 'ach-bits-1k',
    name: 'Kilobit ⓚ',
    icon: 'ⓚ',
    category: 'milestone',
    condition: (state) => bigGte(state.totalBits, 1e3),
    bell: '🏆 a thousand bits.',
  },
  {
    id: 'ach-bits-10k',
    name: 'Ten-K 🔟',
    icon: '🔟',
    category: 'milestone',
    condition: (state) => bigGte(state.totalBits, 1e4),
    bell: '🏆 ten thousand.',
  },
  {
    id: 'ach-bits-100k',
    name: 'Six Figures 📈',
    icon: '📈',
    category: 'milestone',
    condition: (state) => bigGte(state.totalBits, 1e5),
    bell: '🏆 a hundred thousand.',
  },
  {
    id: 'ach-bits-1m',
    name: 'Megabit 🧮',
    icon: '🧮',
    category: 'milestone',
    condition: (state) => bigGte(state.totalBits, 1e6),
    bell: '🏆 one million bits.',
  },
  {
    id: 'ach-bits-1b',
    name: 'Gigabit 🌐',
    icon: '🌐',
    category: 'milestone',
    condition: (state) => bigGte(state.totalBits, 1e9),
    bell: '🏆 a billion. boss money.',
  },
  {
    id: 'ach-bits-1aa',
    name: 'Petascale 🪐',
    icon: '🪐',
    category: 'milestone',
    condition: (state) => bigGte(state.totalBits, 1e15),
    bell: '🏆 1aa. past safe-integer.',
  },
  {
    id: 'ach-bits-1bb',
    name: 'Beyond 🌌',
    icon: '🌌',
    category: 'milestone',
    condition: (state) => bigGte(state.totalBits, 1e96),
    bell: '🏆 1bb. absurd.',
  },

  // --- Behavior / buy-count (9–11) ---
  {
    id: 'ach-buy-1',
    name: 'First Blood 🩸',
    icon: '🩸',
    category: 'behavior',
    condition: (state) => (state.totalBought || 0) >= 1,
    bell: '⚡ first purchase.',
  },
  {
    id: 'ach-buy-10',
    name: 'Shopper 🛒',
    icon: '🛒',
    category: 'behavior',
    condition: (state) => (state.totalBought || 0) >= 10,
    bell: '⚡ ten buys deep.',
  },
  {
    id: 'ach-buy-100',
    name: 'Hoarder 📦',
    icon: '📦',
    category: 'behavior',
    condition: (state) => (state.totalBought || 0) >= 100,
    bell: '⚡ a hundred purchases.',
  },

  // --- Speed (12–14) ---
  {
    id: 'ach-speed-1k-2m',
    name: 'Quick Start ⏱',
    icon: '⏱',
    category: 'speed',
    condition: (state) =>
      bigGte(state.totalBits, 1e3) &&
      !!state.runStartedAt &&
      (Date.now() - state.runStartedAt) <= 2 * 60 * 1000,
    bell: '🚀 1K in two minutes.',
  },
  {
    id: 'ach-speed-1m-15m',
    name: 'Sprinter 🏃',
    icon: '🏃',
    category: 'speed',
    condition: (state) =>
      bigGte(state.totalBits, 1e6) &&
      !!state.runStartedAt &&
      (Date.now() - state.runStartedAt) <= 15 * 60 * 1000,
    bell: '🚀 1M in fifteen.',
  },
  {
    id: 'ach-speed-1b-30m',
    name: 'Velocity 🌠',
    icon: '🌠',
    category: 'speed',
    condition: (state) =>
      bigGte(state.totalBits, 1e9) &&
      !!state.runStartedAt &&
      (Date.now() - state.runStartedAt) <= 30 * 60 * 1000,
    bell: '🚀 1B in half an hour.',
  },

  // --- Manager (15–17) ---
  {
    id: 'ach-mgr-1',
    name: 'Automation 🤖',
    icon: '🤖',
    category: 'manager',
    condition: (state) => {
      const mgrs = state.managers || {};
      return Object.values(mgrs).some(m => (m.level || 0) >= 1);
    },
    bell: '🛠 first manager hired.',
  },
  {
    id: 'ach-mgr-5',
    name: 'Middle Management 🧑‍💼',
    icon: '🧑‍💼',
    category: 'manager',
    condition: (state) => {
      const mgrs = state.managers || {};
      const total = Object.values(mgrs).reduce((sum, m) => sum + (m.level || 0), 0);
      return total >= 5;
    },
    bell: '🛠 five levels of managers.',
  },
  {
    id: 'ach-mgr-solvent',
    name: 'In the Black 💹',
    icon: '💹',
    category: 'manager',
    condition: (state) => {
      const mgrs = state.managers || {};
      const hired = Object.values(mgrs).filter(m => (m.level || 0) >= 1).length;
      return (state.netRate || 0) > 0 && hired >= 3;
    },
    bell: '🛠 three managers, still profitable.',
  },

  // --- Behavior: net-negative (18) ---
  // Requires state._netNegSince to be set by the game tick (WP-S1-09) when netRate first goes
  // negative. The tick must set state._netNegSince = Date.now() on transition to negative, and
  // clear it (set to 0/null) when netRate returns to >= 0.
  {
    id: 'ach-net-neg',
    name: 'In the Red 🔻',
    icon: '🔻',
    category: 'behavior',
    condition: (state) =>
      !!state._netNegSince && (Date.now() - state._netNegSince) >= 10000,
    bell: '🔻 you ran negative. lesson learned.',
  },

  // --- Behavior: zero after 1M (19) ---
  {
    id: 'ach-zero',
    name: 'Rock Bottom 🕳',
    icon: '🕳',
    category: 'behavior',
    condition: (state) =>
      bigGte(state.totalBits, 1e6) &&
      !!state.bits &&
      state.bits.m === 0,
    bell: '🕳 back to nothing.',
  },

  // --- Prestige (20–22) ---
  {
    id: 'ach-prestige-1',
    name: 'Gravity Well 🌀',
    icon: '🌀',
    category: 'prestige',
    condition: (state) => Array.isArray(state.pullFactors) && state.pullFactors.length >= 1,
    bell: '🌀 first reset. pull begins.',
  },
  {
    id: 'ach-prestige-3',
    name: 'Event Horizon 🕳️',
    icon: '🕳️',
    category: 'prestige',
    condition: (state) => Array.isArray(state.pullFactors) && state.pullFactors.length >= 3,
    bell: '🌀 three resets deep.',
  },
  {
    id: 'ach-prestige-10aa',
    name: 'Heavy Pull 🪨',
    icon: '🪨',
    category: 'prestige',
    // globalPull = product of all pullFactors; must be >= 10 at the time of a reset.
    // The condition is polled each tick; it fires once pullFactors product reaches 10.
    condition: (state) => {
      const factors = state.pullFactors;
      if (!Array.isArray(factors) || factors.length === 0) return false;
      const globalPull = factors.reduce((a, b) => a * b, 1);
      return globalPull >= 10;
    },
    bell: '🌀 a reset worth ×10+ pull.',
  },

  // --- Boss: enter (23) ---
  {
    id: 'ach-boss-enter',
    name: 'Challenger ⚔',
    icon: '⚔',
    category: 'boss',
    condition: (state) => !!(state.bossEntered),
    bell: '⚔ you paid to fight.',
  },

  // --- Boss: lose (24) ---
  {
    id: 'ach-boss-lose',
    name: 'Out-Cheated 😤',
    icon: '😤',
    category: 'boss',
    condition: (state) => (state.bossLossCount || 0) >= 1,
    bell: '😤 it cheated. of course it did.',
  },

  // --- Secret: fast tap (25) ---
  {
    id: 'ach-secret-fast-tap',
    name: 'Speed Demon 🤫',
    icon: '🤫',
    category: 'behavior',
    secret: true,
    // Requires state._fastTapAt set by the click handler (WP-S1-09) when >= 12 taps occur in 1 s.
    condition: (state) => !!(state._fastTapUnlocked),
    bell: '🤫 you\'re fast. noted.',
  },

  // --- Behavior: idle (26) ---
  {
    id: 'ach-flavor-idle',
    name: 'Patience ⏳',
    icon: '⏳',
    category: 'behavior',
    // Requires state._gameOpenedAt (epoch ms) set on mount. netRate > 0 and >= 10 min open.
    condition: (state) =>
      (state.netRate || 0) > 0 &&
      !!state._gameOpenedAt &&
      (Date.now() - state._gameOpenedAt) >= 10 * 60 * 1000,
    bell: '⏳ you let it run. it ran.',
  },

  // --- Boss: seen (27) ---
  {
    id: 'ach-boss-seen',
    name: 'First Encounter 🥊',
    icon: '🥊',
    category: 'boss',
    condition: (state) => state.bossSeen === true,
    bell: '🥊 you stared the Defragmenter down.',
  },

  // --- Boss: cheat found (28) ---
  // condition is always false — this achievement is fired directly by the fv:boss-cheat-disable
  // event in WP-S1-11 (the boss cheat-disable handler), not by condition polling.
  {
    id: 'ach-boss-cheat-found',
    name: 'Suspicious Activity 🕵️',
    icon: '🕵️',
    category: 'boss',
    condition: () => false,
    bell: '🕵️ something was off. you fixed it.',
  },

  // --- Boss: victory (29) ---
  {
    id: 'ach-boss-victory',
    name: 'Defragmented 🏆',
    icon: '🏆',
    category: 'boss',
    condition: (state) =>
      Array.isArray(state.defeated) && state.defeated.includes(1),
    bell: '🏆 defragmented — your bits, your win.',
  },
];
