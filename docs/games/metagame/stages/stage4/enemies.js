// enemies.js — Stage 4 Fractal Bastion: enemy type definitions (data only, no game logic, no DOM).
// engine.js reads ENEMY_TYPES for movement/combat; spawnEnemy mints a fresh live enemy object.

export const ENEMY_TYPES = {
  // ── original six ──────────────────────────────────────────────────────────────────────────────
  recursion:        { glyph: "[ ]",   hp: 50,  speed: 1.0, armor: 0,   reward: 8,  integrityDrain: 5 },
  pattern_crawler:  { glyph: "/\\",   hp: 30,  speed: 2.0, armor: 0,   reward: 6,  integrityDrain: 4, fast: true },
  null_packet:      { glyph: "<>",    hp: 60,  speed: 1.0, armor: 0.5, reward: 10, integrityDrain: 6 },
  resonance_ghost:  { glyph: "<>",    hp: 40,  speed: 1.5, armor: 0,   reward: 9,  integrityDrain: 5, slowImmune: true },
  fractal_host:     { glyph: "[[ ]]", hp: 120, speed: 0.8, armor: 0,   reward: 16, integrityDrain: 8, spawnsOnDeath: { type: "recursion", count: 2 } },
  depth_crawler:    { glyph: "[##]",  hp: 200, speed: 1.2, armor: 0.3, reward: 24, integrityDrain: 10, elite: true },
  // ── expanded roster (depth pass): each leans on the damage-type / status / behavior systems ────
  // Tiny + fast, arrives in big counts — punishes single-target; answered by aoe/chain/freeze.
  swarm_bit:        { glyph: "·",     hp: 14,  speed: 2.4, armor: 0,   reward: 3,  integrityDrain: 2, fast: true, swarm: true },
  // Heavy armor + kinetic RESISTANCE — kinetic bounces; answered by thermal/null/arc or shred.
  armored_loop:     { glyph: "[#]",   hp: 160, speed: 0.9, armor: 0.5, resist: { kinetic: 0.4 }, reward: 20, integrityDrain: 10 },
  // Carries a SHIELD pool soaked before hp — answered by arc (+50% vs shields) or null (bypass).
  shield_drone:     { glyph: "(o)",   hp: 70,  speed: 1.1, armor: 0,   shield: 140, reward: 16, integrityDrain: 7 },
  // Heals nearby enemies each tick (behaviors.js) — focus it down first or the line never falls.
  healer_node:      { glyph: "<+>",   hp: 110, speed: 0.8, armor: 0.1, reward: 18, integrityDrain: 7, heal: { amount: 22, radius: 5 } },
  // Self-regenerates HP — out-DPS it or apply BURN (thermal DoT beats regen); else it walls forever.
  regenerator:      { glyph: "{~}",   hp: 140, speed: 1.0, armor: 0.1, reward: 18, integrityDrain: 8, regen: 18 },
  // Phases out (untargetable) on a deterministic cadence; slow-immune + arc-resistant.
  flicker_ghost:    { glyph: "<·>",   hp: 80,  speed: 1.4, armor: 0,   slowImmune: true, resist: { arc: 0.3 }, reward: 14, integrityDrain: 6, flicker: { onMs: 1400, offMs: 900 } },
  // Burrows on a cadence → high armor while down (kinetic useless then); strike when it surfaces.
  burrower:         { glyph: "vvv",   hp: 130, speed: 1.2, armor: 0.1, reward: 16, integrityDrain: 8, burrow: { upMs: 1500, downMs: 1200, armor: 0.6 } }
};

// Mint a fresh live enemy (ephemeral — never persisted). `idCounter` keeps ids deterministic
// (no Math.random); `seed` is reserved for future per-enemy seeded choices (branch picks, C2). Carries
// resist/shield from the def so the damage-type system has data to react to.
export function spawnEnemy(type, seed, idCounter) {
  const def = ENEMY_TYPES[type] || ENEMY_TYPES.recursion;
  const enemy = {
    id: `e${idCounter}`,
    type: ENEMY_TYPES[type] ? type : "recursion",
    hp: def.hp,
    maxHp: def.hp,
    x: 0,
    y: 0,
    pathIndex: 0,
    speed: def.speed,
    armor: def.armor,
    slowImmune: Boolean(def.slowImmune)
  };
  if (def.resist) enemy.resist = { ...def.resist };
  if (def.shield) { enemy.shield = def.shield; enemy.shieldMax = def.shield; }
  return enemy;
}
