// subboss.js — Stage 4 Fractal Bastion: the named floor-guardian elites that cap each map's arcs.
//
// A sub-boss is a single very tanky enemy appended to the END of its wave's spawn queue (it enters
// last, after the escort trash). Each has ONE telegraphed ability that fires once when it first drops
// below its trigger HP fraction — the telegraph is logged at wave start so the player can prepare.
// Pure data + a spawn helper; engine.js reads `enemy.subBoss` to apply HP / fire the ability.

export const SUB_BOSSES = {
  // Map 0
  'shell-warden':      { name: 'Shell Warden',      glyph: 'Ω', hp: 600,  speed: 0.7, armor: 0.2, reward: 80,  drain: 20, trigger: 0.5, ability: 'recurse', telegraph: 'will RECURSE (spawn copies) at half integrity' },
  // Map 1
  'echo-sentinel':     { name: 'Echo Sentinel',     glyph: 'Ψ', hp: 800,  speed: 0.9, armor: 0.1, reward: 90,  drain: 20, trigger: 0.5, ability: 'haste',   telegraph: 'will HASTE itself when wounded' },
  'hall-keeper':       { name: 'Hall Keeper',       glyph: 'Φ', hp: 1200, speed: 0.7, armor: 0.3, reward: 120, drain: 25, trigger: 0.5, ability: 'recurse', telegraph: 'will RECURSE at half integrity' },
  // Map 2
  'mirror-prefect':    { name: 'Mirror Prefect',    glyph: 'Δ', hp: 1800, speed: 0.8, armor: 0.2, reward: 150, drain: 25, trigger: 0.5, ability: 'shield',  telegraph: 'will raise a SHIELD (armor surge) when wounded' },
  'atrium-regent':     { name: 'Atrium Regent',     glyph: 'Θ', hp: 2600, speed: 0.7, armor: 0.3, reward: 200, drain: 30, trigger: 0.5, ability: 'recurse', telegraph: 'will RECURSE at half integrity' },
  // Map 3
  'cascade-anchor':    { name: 'Cascade Anchor',    glyph: 'Λ', hp: 3000, speed: 0.7, armor: 0.3, reward: 220, drain: 30, trigger: 0.5, ability: 'shield',  telegraph: 'will raise a SHIELD when wounded' },
  'descent-marshal':   { name: 'Descent Marshal',   glyph: 'Ξ', hp: 4200, speed: 0.8, armor: 0.25, reward: 280, drain: 35, trigger: 0.5, ability: 'haste',  telegraph: 'will HASTE when wounded' },
  'cascade-sovereign': { name: 'Cascade Sovereign', glyph: 'Σ', hp: 5600, speed: 0.7, armor: 0.35, reward: 360, drain: 40, trigger: 0.5, ability: 'recurse', telegraph: 'will RECURSE at half integrity' },
  // Map 4
  'approach-vanguard': { name: 'Approach Vanguard', glyph: 'Π', hp: 6000, speed: 0.8, armor: 0.3, reward: 380, drain: 40, trigger: 0.5, ability: 'shield',  telegraph: 'will raise a SHIELD when wounded' },
  'event-horizon':     { name: 'Event Horizon',     glyph: '◉', hp: 8000, speed: 0.7, armor: 0.35, reward: 460, drain: 45, trigger: 0.5, ability: 'recurse', telegraph: 'will RECURSE at half integrity' },
  'penultimate-knot':  { name: 'Penultimate Knot',  glyph: '╬', hp: 10000, speed: 0.7, armor: 0.4, reward: 560, drain: 50, trigger: 0.5, ability: 'haste',  telegraph: 'will HASTE when wounded' },
  'final-bastion':     { name: 'Final Bastion',     glyph: '█', hp: 14000, speed: 0.6, armor: 0.4, reward: 720, drain: 60, trigger: 0.5, ability: 'recurse', telegraph: 'will RECURSE at half integrity' },
};

export function subBossDef(id) {
  return SUB_BOSSES[id] || null;
}

// Mint a fresh live sub-boss enemy (ephemeral). Carries `subBoss` (its id) + `abilityFired` so the
// engine fires its telegraphed ability exactly once. Deterministic id from the counter (no RNG).
export function spawnSubBoss(id, idCounter) {
  const def = SUB_BOSSES[id];
  if (!def) return null;
  return {
    id: `sb${idCounter}`,
    type: 'subboss',
    subBoss: id,
    hp: def.hp,
    maxHp: def.hp,
    x: 0,
    y: 0,
    pathIndex: 0,
    speed: def.speed,
    armor: def.armor,
    slowImmune: false,
    abilityFired: false,
  };
}
