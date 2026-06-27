// damage.js — Stage 4 Fractal Bastion: damage-TYPE resolution. Pure, deterministic, no DOM/RNG.
//
// Five damage types make the MATCH verb real — no single tower answers every enemy:
//   kinetic — the cheap baseline; the ONLY type blunted by armor (strong vs naked, weak vs armored).
//   thermal — bypasses armor entirely and leaves a burn DoT (towers attach the burn; see status.js).
//   arc     — bypasses armor and is +50% effective against SHIELDS (the shield-breaker).
//   null    — ignores armor AND shield: damage goes straight to hp (anti-tank / anti-shield-drone).
//   pure    — ignores per-type RESISTANCE (true damage; still soaked by shields like kinetic).
//
// Enemies may carry `resist:{type:frac}` (fractional reduction per type; NEGATIVE = vulnerability)
// and a `shield` pool (absorbed before hp). engine.applyDamage routes every hit through resolveDamage.

export const DAMAGE_TYPES = ['kinetic', 'thermal', 'arc', 'null', 'pure'];

// Apply `amount` of `type` damage to `enemy` (mutates enemy.hp / enemy.shield). `opts.armor` lets the
// caller fold in shred (status.js) so the live armor differs from the static enemy.armor. Returns the
// damage actually dealt split into { hp, shield }.
export function resolveDamage(enemy, amount, type = 'kinetic', opts = {}) {
  let dmg = Math.max(0, Number(amount) || 0);
  if (!enemy || dmg <= 0) return { hp: 0, shield: 0 };
  const dtype = DAMAGE_TYPES.includes(type) ? type : 'kinetic';

  // Per-type resistance — pure ignores it. resist > 0 reduces, resist < 0 amplifies (vulnerability).
  if (dtype !== 'pure' && enemy.resist) dmg *= 1 - clampResist(enemy.resist[dtype]);

  // Armor blunts ONLY kinetic; thermal/arc/null/pure all bypass armor.
  if (dtype === 'kinetic') {
    const armor = opts.armor != null ? Number(opts.armor) : (enemy.armor || 0);
    dmg *= 1 - clamp01(armor);
  }

  // Shields soak damage before hp — EXCEPT null, which bypasses the shield. Arc is +50% vs shields.
  let shieldHit = 0;
  if (dtype !== 'null' && (enemy.shield || 0) > 0 && dmg > 0) {
    const mult = dtype === 'arc' ? 1.5 : 1;
    const effective = dmg * mult;
    shieldHit = Math.min(enemy.shield, effective);
    enemy.shield = Math.max(0, enemy.shield - shieldHit);
    dmg = (effective - shieldHit) / mult; // remainder spills past a broken shield at the real rate
  }

  enemy.hp -= dmg;
  return { hp: dmg, shield: shieldHit };
}

function clamp01(v) { const n = Number(v) || 0; return n < 0 ? 0 : n > 1 ? 1 : n; }
// Resistance caps at 1 (full immunity) but allows negatives (vulnerability) for the MATCH counterplay.
function clampResist(v) { const n = Number(v) || 0; return n > 1 ? 1 : n; }
