// Stage 2 game data: monsters, weapons, the glyph shop, base stats and the XP curve.
// Kept separate from the engine so balance lives in one readable place.

// Player starting stats before any meta (shop) upgrades are applied.
export const BASE_STATS = { hp: 30, maxHp: 30, atk: 5, def: 2, sight: 7 };

// Monster roster. `minFloor` gates when a type can appear; stats scale with depth in
// spawnMonster(). `fast` foes retaliate twice. Glyph drop = `glyph` count on death.
export const MONSTERS = [
  { id: 'mite', glyph: 'm', name: 'parse mite', hp: 4, atk: 2, xp: 2, drop: 1, minFloor: 1 },
  { id: 'spider', glyph: 's', name: 'syntax spider', hp: 6, atk: 3, xp: 3, drop: 1, minFloor: 1 },
  { id: 'null', glyph: 'n', name: 'null pointer', hp: 5, atk: 5, xp: 4, drop: 2, minFloor: 2 },
  { id: 'race', glyph: 'r', name: 'race condition', hp: 8, atk: 4, xp: 6, drop: 2, minFloor: 3, fast: true },
  { id: 'leak', glyph: 'L', name: 'memory leak', hp: 16, atk: 2, xp: 5, drop: 3, minFloor: 3 },
  { id: 'overflow', glyph: 'O', name: 'stack overflow', hp: 22, atk: 6, xp: 9, drop: 4, minFloor: 4 }
];

// Weapons found on the floor (better tiers deeper). `hand_cursor` is the bare-hands default.
export const WEAPONS = [
  { name: 'hand_cursor', atk: 0 },
  { name: 'parser_blade', atk: 3 },
  { name: 'regex_lance', atk: 5 },
  { name: 'compiler_axe', atk: 8 },
  { name: 'kernel_scythe', atk: 12 }
];

// Permanent (meta) upgrades bought with banked glyphs — roguelite progression that
// persists across deaths. `cost(level)` is the price of the NEXT level. `apply(stats, n)`
// mutates the run's starting stats. Levels are stored in state.meta.shopUpgrades[id].
export const SHOP_UPGRADES = [
  { id: 'vitality', name: 'Vitality', desc: '+8 max HP', max: 8, apply: (s, n) => { s.maxHp += 8 * n; s.hp = s.maxHp; } },
  { id: 'edge', name: 'Sharper Cursor', desc: '+1 ATK', max: 8, apply: (s, n) => { s.atk += n; } },
  { id: 'guard', name: 'Hardened Types', desc: '+1 DEF', max: 6, apply: (s, n) => { s.def += n; } },
  { id: 'greed', name: 'Glyph Magnet', desc: '+25% glyphs', max: 4, apply: (s, n) => { s.glyphMult = 1 + 0.25 * n; } }
];

const SHOP_BASE = { vitality: 8, edge: 12, guard: 10, greed: 15 };
const SHOP_GROWTH = { vitality: 1.6, edge: 1.7, guard: 1.7, greed: 1.9 };

export function upgradeCost(id, level) {
  return Math.round((SHOP_BASE[id] || 10) * (SHOP_GROWTH[id] || 1.7) ** level);
}

// XP needed to reach the next level (gentle quadratic-ish curve).
export function xpForLevel(level) {
  return 4 + (level - 1) * 4;
}

// Roll a fresh run entity from BASE_STATS + purchased upgrades.
export function rollEntity(shopUpgrades = {}) {
  const stats = { ...BASE_STATS, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, equipment: { weapon: 'hand_cursor' } };
  for (const up of SHOP_UPGRADES) {
    const n = Number(shopUpgrades[up.id] || 0);
    if (n > 0) up.apply(stats, n);
  }
  stats.hp = stats.maxHp;
  return stats;
}

// Pick + scale a monster for a given floor (deterministic via the passed rng).
export function spawnMonster(rng, floor, index) {
  const eligible = MONSTERS.filter((m) => m.minFloor <= floor);
  const def = rng.pick(eligible.length ? eligible : MONSTERS);
  const scale = 1 + (floor - 1) * 0.25;
  const hp = Math.round(def.hp * scale) + (index % 2);
  return {
    id: def.id,
    glyph: def.glyph,
    name: def.name,
    fast: Boolean(def.fast),
    xp: def.xp,
    drop: def.drop,
    hp,
    maxHp: hp,
    atk: Math.round(def.atk * scale),
    alive: true,
    x: 0,
    y: 0
  };
}
