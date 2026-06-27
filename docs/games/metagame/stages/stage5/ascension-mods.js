// ascension-mods.js — Stage 5 Signal Racer: the opt-in difficulty ladder (cumulative rungs) fed to
// shared/ascension.js. Each rung's apply() folds one rule into a plain CONFIG object the game-loop
// reads to harden a run: faster rival field, tighter hull, denser noise, sharper static. Pure data —
// the fold is deterministic, so a given ascension level always produces the same harder run.

// The neutral config a level-0 (base) run uses; every field is a no-op multiplier/bonus.
export const BASE_ASCENSION_CONFIG = {
  rivalSpeedMult: 1,   // ×rival top speed (faster ghosts)
  integrityMult: 1,    // ×starting hull cap (less room for mistakes)
  densityBonus: 0,     // +obstacle density per lane (more hazards)
  noiseDamageBonus: 0, // +static hit damage
};

export const ASCENSION_MODS = [
  { level: 1, id: 'fasterField', label: 'A1 · Faster Field',
    desc: 'The rival field runs noticeably quicker.',
    apply: (c) => { c.rivalSpeedMult *= 1.07; return c; } },
  { level: 2, id: 'hairlineHull', label: 'A2 · Hairline Hull',
    desc: 'Less integrity to spend on mistakes (−15% hull).',
    apply: (c) => { c.integrityMult *= 0.85; return c; } },
  { level: 3, id: 'denserNoise', label: 'A3 · Denser Noise',
    desc: 'More static crowds every lane.',
    apply: (c) => { c.densityBonus += 0.06; return c; } },
  { level: 4, id: 'sharpStatic', label: 'A4 · Sharp Static',
    desc: 'Static bites harder (+1 damage per ░).',
    apply: (c) => { c.noiseDamageBonus += 1; return c; } },
];
