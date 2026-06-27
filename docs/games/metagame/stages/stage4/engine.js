// engine.js — Stage 4 Fractal Bastion: the tower-defense tick loop (no DOM). Deterministic — all
// timing is driven by the deltaMs the caller passes (rAF in the renderer, fixed steps in tests).
// Moves enemies along the L-system path, fires towers, drains integrity, handles fractal-host splits
// and recurve double-damage. RNG is never used here.

import { ENEMY_TYPES, spawnEnemy } from "./enemies.js";
import { TOWER_TYPES } from "./towers.js";
import { waveComposition, SPAWN_INTERVAL_MS } from "./waves.js";
import { mapWaveComposition } from "./wavegen.js";
import { spawnSubBoss, subBossDef } from "./subboss.js";
import { applyExtractorIncome } from "./upgrades.js";

// Resolve a live enemy's definition — ENEMY_TYPES for trash, a synthesized def for a sub-boss.
function enemyDef(enemy) {
  if (enemy?.subBoss) {
    const sb = subBossDef(enemy.subBoss);
    if (sb) return { glyph: sb.glyph, reward: sb.reward, integrityDrain: sb.drain };
  }
  return ENEMY_TYPES[enemy?.type] || ENEMY_TYPES.recursion;
}

// Populate the spawn queue for a wave and reset per-wave combat state. The composition comes from the
// active campaign map (wavegen.js) when state.campaign exists; otherwise it falls back to the legacy
// single-map table (waves.js) so older tests / save shapes keep working. A sub-boss (if any) is queued
// LAST as a sentinel `subboss:<id>` so the guardian enters after its escort. `pathTiles` is unused here.
export function startWave(state, waveNum, pathTiles) {
  const comp = state.campaign
    ? mapWaveComposition(state.campaign.mapIndex || 0, waveNum)
    : waveComposition(waveNum, state.recursion?.pointSetId || "x");
  const queue = [];
  for (const grp of comp.enemies) for (let i = 0; i < grp.count; i++) queue.push(grp.type);
  if (comp.subBoss) queue.push(`subboss:${comp.subBoss}`);
  state.waveNumber = waveNum;
  state.waveActive = true;
  state.waveFailed = false;
  state.enemies = [];
  state.spawnQueue = queue;
  state.spawnTimerMs = SPAWN_INTERVAL_MS; // first enemy enters on the first tick
  state.combatClockMs = 0;
  state.enemyNextId = 1;
  for (const t of state.towers) t.lastFiredMs = -Infinity;
  if (comp.subBoss) {
    const sb = subBossDef(comp.subBoss);
    if (sb) pushLog(state, `${sb.glyph} ${sb.name} approaches — it ${sb.telegraph}.`);
  }
  return state;
}

export function tick(state, deltaMs, pathTiles) {
  if (!state.waveActive || !Array.isArray(pathTiles) || pathTiles.length < 2) return state;
  const dt = Math.max(0, Number(deltaMs) || 0);
  const exitIndex = pathTiles.length - 1;
  state.combatClockMs = (state.combatClockMs || 0) + dt;

  spawnDueEnemies(state, dt, pathTiles);
  moveEnemies(state, dt, pathTiles, exitIndex);
  fireTowers(state, pathTiles);
  reap(state, pathTiles);
  return state;
}

// On-death effects: award Cycles, fractal-host split, log. Returns the Cycles earned.
export function resolveDeath(state, enemy, pathTiles) {
  const def = enemyDef(enemy);
  state.cycles = (state.cycles || 0) + (def.reward || 0);
  if (def.spawnsOnDeath) {
    for (let i = 0; i < def.spawnsOnDeath.count; i++) {
      const child = spawnEnemy(def.spawnsOnDeath.type, state.recursion?.pointSetId || "x", state.enemyNextId++);
      child.pathIndex = enemy.pathIndex;
      placeOnPath(child, pathTiles);
      state.enemies.push(child);
    }
    pushLog(state, `${def.glyph} fractures into ${def.spawnsOnDeath.count}.`);
  }
  return def.reward || 0;
}

// True (once) when the wave's spawns are exhausted and no enemies remain — awards extractor income.
export function waveComplete(state) {
  if (!state.waveActive) return false;
  if ((state.spawnQueue?.length || 0) > 0 || state.enemies.length > 0) return false;
  state.waveActive = false;
  applyExtractorIncome(state); // cycle-extractor towers pay out on wave clear
  return true;
}

// ── internals ────────────────────────────────────────────────────────────────────────────────────

function spawnDueEnemies(state, dt, pathTiles) {
  state.spawnTimerMs = (state.spawnTimerMs || 0) + dt;
  while ((state.spawnQueue?.length || 0) > 0 && state.spawnTimerMs >= SPAWN_INTERVAL_MS) {
    state.spawnTimerMs -= SPAWN_INTERVAL_MS;
    const type = state.spawnQueue.shift();
    const e = String(type).startsWith('subboss:')
      ? spawnSubBoss(type.slice('subboss:'.length), state.enemyNextId++)
      : spawnEnemy(type, state.recursion?.pointSetId || "x", state.enemyNextId++);
    if (!e) continue;
    placeOnPath(e, pathTiles);
    state.enemies.push(e);
  }
}

function moveEnemies(state, dt, pathTiles, exitIndex) {
  const survivors = [];
  for (const e of state.enemies) {
    const slowed = !e.slowImmune && inAttractorField(state, e, pathTiles);
    const eff = e.speed * (slowed ? 0.5 : 1);
    e.pathIndex += eff * (dt / 1000);
    if (e.pathIndex >= exitIndex) {
      const def = enemyDef(e);
      state.integrity = Math.max(0, (state.integrity || 0) - (def.integrityDrain || 0));
      if (state.integrity <= 0) state.waveFailed = true;
      pushLog(state, `${def.glyph} reached the core.`);
      continue; // enemy exits (removed)
    }
    placeOnPath(e, pathTiles);
    survivors.push(e);
  }
  state.enemies = survivors;
}

function fireTowers(state, pathTiles) {
  const now = state.combatClockMs;
  for (const tower of state.towers) {
    const def = TOWER_TYPES[tower.type];
    if (!def || !def.fireRate || !def.damage) continue; // support towers don't fire
    if (now - (tower.lastFiredMs ?? -Infinity) < 1000 / def.fireRate) continue;
    const inRange = state.enemies.filter((e) => dist(tower, e) <= def.range);
    if (!inRange.length) continue;
    tower.lastFiredMs = now;
    const bonus = 1 + 0.3 * hubsCovering(state, tower);
    const targets = def.aoe ? inRange : [selectTarget(inRange, tower)];
    for (const e of targets) applyDamage(state, tower, def, e, bonus, pathTiles);
  }
}

function applyDamage(state, tower, def, enemy, bonus, pathTiles) {
  let dmg = def.damage * bonus * (state.damageMult || 1); // Armory "Overclocked Emitters" scales all damage
  const tile = pathTiles[Math.floor(enemy.pathIndex)];
  if (tile?.recurve) dmg *= 2; // depth-3 fold-back tiles deal double
  if (!def.ignoresArmor) dmg *= 1 - (enemy.armor || 0);
  enemy.hp -= dmg;
  if (enemy.subBoss && !enemy.abilityFired) maybeFireSubBossAbility(state, enemy, pathTiles);
}

// A sub-boss fires its single telegraphed ability ONCE when it first drops below its trigger fraction.
function maybeFireSubBossAbility(state, enemy, pathTiles) {
  const sb = subBossDef(enemy.subBoss);
  if (!sb || enemy.hp > enemy.maxHp * sb.trigger) return;
  enemy.abilityFired = true;
  if (sb.ability === 'recurse') {
    for (let i = 0; i < 3; i++) {
      const child = spawnEnemy('recursion', state.recursion?.pointSetId || 'x', state.enemyNextId++);
      child.pathIndex = Math.max(0, enemy.pathIndex - (i + 1));
      placeOnPath(child, pathTiles);
      state.enemies.push(child);
    }
    pushLog(state, `${sb.glyph} ${sb.name} RECURSES — copies pour out.`);
  } else if (sb.ability === 'haste') {
    enemy.speed *= 1.6;
    pushLog(state, `${sb.glyph} ${sb.name} HASTES — it surges forward.`);
  } else if (sb.ability === 'shield') {
    enemy.armor = Math.min(0.9, (enemy.armor || 0) + 0.3);
    pushLog(state, `${sb.glyph} ${sb.name} raises a SHIELD.`);
  }
}

function reap(state, pathTiles) {
  const survivors = [];
  for (const e of state.enemies) {
    if (e.hp <= 0) resolveDeath(state, e, pathTiles);
    else survivors.push(e);
  }
  state.enemies = survivors;
}

function inAttractorField(state, enemy, pathTiles) {
  for (const t of state.towers) {
    const def = TOWER_TYPES[t.type];
    if (def?.slow && dist(t, enemy) <= def.range) return true;
  }
  return false;
}

function hubsCovering(state, tower) {
  let n = 0;
  for (const t of state.towers) {
    if (t === tower) continue;
    const def = TOWER_TYPES[t.type];
    if (def?.adjacencyBonus && dist(t, tower) <= def.range) n += 1;
  }
  return n;
}

// Per-tower targeting modes. Each comparator returns true when candidate `a` is a BETTER target than
// the current best `b`; all ties break by furthest-along (highest pathIndex) so selection is fully
// deterministic regardless of enemy array order. `first` reproduces the old leader() behaviour.
const TARGET_COMPARATORS = {
  first: (a, b) => a.pathIndex > b.pathIndex,
  last: (a, b) => a.pathIndex < b.pathIndex,
  strongest: (a, b) => a.hp > b.hp || (a.hp === b.hp && a.pathIndex > b.pathIndex),
  weakest: (a, b) => a.hp < b.hp || (a.hp === b.hp && a.pathIndex > b.pathIndex),
  closest: (a, b, tower) => {
    const da = dist(tower, a);
    const db = dist(tower, b);
    return da < db || (da === db && a.pathIndex > b.pathIndex);
  },
};

export function selectTarget(enemies, tower) {
  if (!Array.isArray(enemies) || !enemies.length) return null;
  const cmp = TARGET_COMPARATORS[tower?.targetMode] || TARGET_COMPARATORS.first;
  return enemies.reduce((best, e) => (cmp(e, best, tower) ? e : best), enemies[0]);
}

function placeOnPath(enemy, pathTiles) {
  const tile = pathTiles[Math.min(pathTiles.length - 1, Math.max(0, Math.floor(enemy.pathIndex)))];
  if (tile) { enemy.x = tile.x; enemy.y = tile.y; }
}

function dist(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-12);
}
