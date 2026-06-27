// damage.test.mjs — Stage 4 damage-TYPE resolution (resolveDamage): armor / resist / shield matrix.
import assert from 'node:assert/strict';
import { resolveDamage, DAMAGE_TYPES } from '../damage.js';

assert.deepEqual(DAMAGE_TYPES, ['kinetic', 'thermal', 'arc', 'null', 'pure'], 'five damage types');

// ── armor: kinetic is blunted; every other type bypasses armor ──────────────────────────────────
{
  const armored = () => ({ hp: 100, armor: 0.5 });
  let e = armored(); resolveDamage(e, 40, 'kinetic'); assert.equal(e.hp, 80, 'kinetic loses 50% to armor (40→20)');
  e = armored(); resolveDamage(e, 40, 'thermal'); assert.equal(e.hp, 60, 'thermal bypasses armor (full 40)');
  e = armored(); resolveDamage(e, 40, 'arc'); assert.equal(e.hp, 60, 'arc bypasses armor');
  e = armored(); resolveDamage(e, 40, 'null'); assert.equal(e.hp, 60, 'null bypasses armor');
}

// ── caller may override armor (shred folds in) ──────────────────────────────────────────────────
{
  const e = { hp: 100, armor: 0.5 };
  resolveDamage(e, 40, 'kinetic', { armor: 0 }); // shredded to 0 armor → full damage
  assert.equal(e.hp, 60, 'armor override (shred) restores kinetic damage');
}

// ── resistance: per-type reduction; pure ignores it; negatives = vulnerability ───────────────────
{
  let e = { hp: 100, resist: { thermal: 0.5 } };
  resolveDamage(e, 40, 'thermal'); assert.equal(e.hp, 80, 'thermal resist 0.5 halves it');
  e = { hp: 100, resist: { thermal: 0.5 } };
  resolveDamage(e, 40, 'pure'); assert.equal(e.hp, 60, 'pure ignores resistance');
  e = { hp: 100, resist: { kinetic: -0.5 } };
  resolveDamage(e, 40, 'kinetic'); assert.equal(e.hp, 40, 'negative resist = +50% vulnerability');
}

// ── shield: soaked before hp; arc +50% vs shield; null bypasses shield entirely ──────────────────
{
  let e = { hp: 100, shield: 30 };
  let r = resolveDamage(e, 50, 'kinetic');
  assert.equal(e.shield, 0, 'shield fully consumed');
  assert.equal(e.hp, 80, 'remaining 20 spills to hp');
  assert.equal(r.shield, 30, 'reports 30 dealt to shield');

  e = { hp: 100, shield: 30 };
  resolveDamage(e, 20, 'arc'); // 20 arc = 30 effective vs shield → shield gone, no spill
  assert.equal(e.shield, 0, 'arc breaks the 30 shield with only 20 raw');
  assert.equal(e.hp, 100, 'arc spent fully on the shield');

  e = { hp: 100, shield: 30 };
  resolveDamage(e, 40, 'null'); // null ignores shield
  assert.equal(e.shield, 30, 'null leaves the shield untouched');
  assert.equal(e.hp, 60, 'null hits hp directly through the shield');
}

console.log('stage4 damage tests passed');
