// Stage 2 game data: monsters, weapons, the glyph shop, base stats and the XP curve.
// Kept separate from the engine so balance lives in one readable place.

// Player starting stats before any meta (shop) upgrades are applied.
export const BASE_STATS = { hp: 30, maxHp: 30, atk: 5, def: 2, sight: 7 };

// Monster roster. `minFloor` gates when a type can appear; stats scale with depth in
// spawnMonster(). `fast` foes retaliate twice. Glyph drop = `glyph` count on death.
// Behaviour flags (A1) are unlocked by depth via `minFloor` and carried onto the spawned monster:
//   fast (strike twice), ranged (spitter), summon (forkbomb), explode (segfault), ambush (dangling).
export const MONSTERS = [
  { id: 'mite', glyph: 'm', name: 'parse mite', hp: 16, atk: 5, xp: 2, drop: 1, minFloor: 1 },
  { id: 'spider', glyph: 's', name: 'syntax spider', hp: 20, atk: 6, xp: 3, drop: 1, minFloor: 1 },
  { id: 'null', glyph: 'n', name: 'null pointer', hp: 18, atk: 9, xp: 4, drop: 2, minFloor: 2 },
  { id: 'ambusher', glyph: 'a', name: 'dangling ref', hp: 24, atk: 8, xp: 6, drop: 3, minFloor: 3, ambush: true },
  { id: 'race', glyph: 'r', name: 'race condition', hp: 22, atk: 7, xp: 6, drop: 2, minFloor: 3, fast: true },
  { id: 'leak', glyph: 'L', name: 'memory leak', hp: 40, atk: 6, xp: 5, drop: 3, minFloor: 3 },
  { id: 'spitter', glyph: 'y', name: 'syntax spitter', hp: 18, atk: 7, xp: 6, drop: 3, minFloor: 4, ranged: true },
  { id: 'exploder', glyph: 'x', name: 'segfault', hp: 16, atk: 6, xp: 5, drop: 3, minFloor: 4, explode: true },
  { id: 'overflow', glyph: 'O', name: 'stack overflow', hp: 52, atk: 13, xp: 9, drop: 4, minFloor: 4 },
  { id: 'summoner', glyph: 'u', name: 'fork bomb', hp: 30, atk: 5, xp: 8, drop: 4, minFloor: 5, summon: true },
  // Overflow act (darkness) foes — see overflow.js for their behaviour.
  { id: 'lighteater', glyph: 'e', name: 'light eater', hp: 26, atk: 7, xp: 8, drop: 4, minFloor: 7, lighteater: true },
  { id: 'mirror', glyph: 'M', name: 'mirror', hp: 34, atk: 6, xp: 9, drop: 4, minFloor: 7, mirror: true },
  // Phantom: leaves NO last-seen ghost (untrackable in the dark, view.js) and full speed in true
  // darkness, but torchlight pins it (phantomTick slows it). The pure stealth-vs-light foe.
  { id: 'phantom', glyph: 'ψ', name: 'null phantom', hp: 28, atk: 9, xp: 9, drop: 4, minFloor: 8, fast: true, phantom: true }
];

// Behaviour flags copied verbatim from the roster entry onto a spawned monster.
const BEHAVIOURS = ['fast', 'ranged', 'summon', 'explode', 'ambush', 'lighteater', 'mirror', 'phantom'];

// Elites (A3): a marked, prefixed, beefed-up variant. Chance + strength rise with depth. They get a
// guaranteed cache on death (engine.dropElite). One random prefix shapes the bonus.
const ELITE_PREFIXES = [
  { key: 'armored', name: 'armored', hpMult: 1.8, atkMult: 1.1 },
  { key: 'venomous', name: 'venomous', hpMult: 1.3, atkMult: 1.3, venom: true },
  { key: 'frenzied', name: 'frenzied', hpMult: 1.4, atkMult: 1.5, fast: true }
];
function eliteChance(floor) { return Math.min(0.28, 0.04 + (floor - 1) * 0.05); }

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
// Permanent (meta) upgrades. `apply(stats,n)` mutates the run's STARTING stats; the *_level
// upgrades instead set a per-level field that awardXp() reads on each level-up. `compass` is a
// one-time unlock (max 1) read by the renderer (the stairs HUD compass), so its apply is a no-op.
export const SHOP_UPGRADES = [
  { id: 'vitality', name: 'Vitality', desc: '+8 starting max HP', max: 8, apply: (s, n) => { s.maxHp += 8 * n; s.hp = s.maxHp; } },
  { id: 'hp_level', name: 'Cell Growth', desc: '+2 max HP per level', max: 5, apply: (s, n) => { s.hpPerLevel = 2 * n; } },
  { id: 'edge', name: 'Sharper Cursor', desc: '+1 starting ATK', max: 8, apply: (s, n) => { s.atk += n; } },
  { id: 'atk_level', name: 'Adaptive Edge', desc: '+1 ATK per level', max: 4, apply: (s, n) => { s.atkPerLevel = n; } },
  { id: 'guard', name: 'Hardened Types', desc: '+1 starting DEF', max: 6, apply: (s, n) => { s.def += n; } },
  { id: 'def_level', name: 'Tempered Types', desc: '+1 DEF per level', max: 4, apply: (s, n) => { s.defPerLevel = n; } },
  { id: 'greed', name: 'Glyph Magnet', desc: '+25% glyphs', max: 4, apply: (s, n) => { s.glyphMult = 1 + 0.25 * n; } },
  { id: 'torchcraft', name: 'Torchbearer', desc: '+12 torch steps & start each run with a torch (per level)', max: 4, apply: (s, n) => { s.torchSteps = 12 * n; s.startTorches = n; } },
  { id: 'compass', name: 'Stairwell Sense', desc: 'reveals the way to the stairs (HUD compass)', max: 1, apply: () => {} }
];

// Run modifiers (C3, "Heat") — opt-in difficulty toggles set in the shop. Each active one raises the
// run's banked-glyph reward by HEAT_PER_MOD. Applied in buildFloor (swarm/drought/elite storm).
export const RUN_MODS = [
  { id: 'swarm', name: 'Swarm', desc: '+60% monsters' },
  { id: 'no_potions', name: 'Drought', desc: 'no health potions on the floor' },
  { id: 'elite_storm', name: 'Elite Storm', desc: 'far more elites' }
];
export const HEAT_PER_MOD = 0.25;
export function runHeat(runMods = {}) {
  return 1 + HEAT_PER_MOD * RUN_MODS.filter((m) => runMods[m.id]).length;
}

const SHOP_BASE = { vitality: 8, hp_level: 20, edge: 12, atk_level: 30, guard: 10, def_level: 25, greed: 15, torchcraft: 40, compass: 1000 };
const SHOP_GROWTH = { vitality: 1.6, hp_level: 1.8, edge: 1.7, atk_level: 1.9, guard: 1.7, def_level: 1.9, greed: 1.9, torchcraft: 1.8, compass: 1 };

export function upgradeCost(id, level) {
  return Math.round((SHOP_BASE[id] || 10) * (SHOP_GROWTH[id] || 1.7) ** level);
}

// XP needed to reach the next level. Deliberately slow so a couple of kills don't snowball the
// player past floor-1 monsters (which used to refund all chip damage via the level-up heal).
export function xpForLevel(level) {
  return 6 + (level - 1) * 5;
}

// Roll a fresh run entity from BASE_STATS + purchased upgrades.
export function rollEntity(shopUpgrades = {}) {
  const stats = { ...BASE_STATS, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, equipment: { weapon: 'hand_cursor' }, affix: null, inventory: {}, statuses: {} };
  for (const up of SHOP_UPGRADES) {
    const n = Number(shopUpgrades[up.id] || 0);
    if (n > 0) up.apply(stats, n);
  }
  stats.hp = stats.maxHp;
  // Torchbearer: stock the run inventory with starting torches so you enter the Overflow act lit.
  if (stats.startTorches > 0) stats.inventory.torch = Number(stats.startTorches);
  return stats;
}

// Pick + scale a monster for a given floor (deterministic via the passed rng).
export function spawnMonster(rng, floor, index) {
  const eligible = MONSTERS.filter((m) => m.minFloor <= floor);
  const def = rng.pick(eligible.length ? eligible : MONSTERS);
  const scale = 1 + (floor - 1) * 0.35;
  let hp = Math.round(def.hp * scale) + (index % 2);
  let atk = Math.round(def.atk * scale);
  const m = {
    id: def.id,
    glyph: def.glyph,
    name: def.name,
    fast: Boolean(def.fast),
    xp: def.xp,
    drop: def.drop,
    alive: true,
    x: 0,
    y: 0,
    // Patrol heading + how far it can spot @ (set at generation; fast foes are more alert).
    dir: rng.pick(['up', 'down', 'left', 'right']),
    sight: def.fast || def.ranged ? 7 : 5,
    chasing: false,
    // Which of the 5 shared real-time movement clocks this monster ticks on (0=fastest .4s).
    bucket: rng.int(0, 4),
    // Faction (C5): two rival camps that fight each other when not engaged with @ — bait them.
    faction: rng.int(0, 1)
  };
  for (const b of BEHAVIOURS) if (def[b]) m[b] = true;
  if (m.ambush) m.hidden = true; // disguised as a wall until @ steps close

  // Promote to an elite on a depth-scaled roll: a prefix, a stat bump, a guaranteed cache, a mark.
  if (floor >= 2 && rng.float() < eliteChance(floor)) {
    const p = rng.pick(ELITE_PREFIXES);
    hp = Math.round(hp * p.hpMult);
    atk = Math.round(atk * p.atkMult);
    m.elite = true;
    m.prefix = p.key;
    m.name = `${p.name} ${def.name}`;
    m.drop = def.drop + 2;
    m.xp = def.xp + 4;
    if (p.fast) m.fast = true;
    if (p.venom) m.venom = true; // bites apply poison (read by the bite path)
    m.sight = Math.max(m.sight, 7);
  }
  m.hp = hp;
  m.maxHp = hp;
  m.atk = atk;
  return m;
}
