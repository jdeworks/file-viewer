// enemies.js — Stage 4 Fractal Bastion: enemy type definitions (data only, no game logic, no DOM).
// engine.js reads ENEMY_TYPES for movement/combat; spawnEnemy mints a fresh live enemy object.

export const ENEMY_TYPES = {
  recursion:        { glyph: "[ ]",   hp: 50,  speed: 1.0, armor: 0,   reward: 8,  integrityDrain: 5 },
  pattern_crawler:  { glyph: "/\\",   hp: 30,  speed: 2.0, armor: 0,   reward: 6,  integrityDrain: 4, fast: true },
  null_packet:      { glyph: "<>",    hp: 60,  speed: 1.0, armor: 0.5, reward: 10, integrityDrain: 6 },
  resonance_ghost:  { glyph: "<>",    hp: 40,  speed: 1.5, armor: 0,   reward: 9,  integrityDrain: 5, slowImmune: true },
  fractal_host:     { glyph: "[[ ]]", hp: 120, speed: 0.8, armor: 0,   reward: 16, integrityDrain: 8, spawnsOnDeath: { type: "recursion", count: 2 } },
  depth_crawler:    { glyph: "[##]",  hp: 200, speed: 1.2, armor: 0.3, reward: 24, integrityDrain: 10, elite: true }
};

// Mint a fresh live enemy (ephemeral — never persisted). `idCounter` keeps ids deterministic
// (no Math.random); `seed` is reserved for future per-enemy seeded choices (branch picks, C2).
export function spawnEnemy(type, seed, idCounter) {
  const def = ENEMY_TYPES[type] || ENEMY_TYPES.recursion;
  return {
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
}
