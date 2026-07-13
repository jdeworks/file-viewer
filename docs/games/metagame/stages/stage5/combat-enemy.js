// combat-enemy.js — Stage 5 enemy turn: intent selection + resolution.
//
// The enemy follows a fixed, looping intent script (enemies.js), so its behaviour is fully
// telegraphed and deterministic. enemyTurn runs one enemy action then ticks its statuses and checks
// for player death; resolveIntent applies the chosen intent (attack/block/ramp/congest/mirror/…).

import { dealToPlayer, addStatus, tickStatuses, tickCorruption, log } from "./combat-damage.js";
import { checkPlayerDead, checkEnemyDead } from "./combat.js";
import { runHook } from "./combat-ctx.js";

export function currentIntent(combat) {
  const script = combat.enemy.script;
  return script[combat.enemy.intentIndex % script.length];
}

export function enemyTurn(combat) {
  const enemy = combat.enemy;
  enemy.block = 0;
  // CORRUPTION (Act 5): the DoT ticks at the enemy's turn start before it acts — it can kill outright.
  tickCorruption(combat);
  checkEnemyDead(combat);
  if (combat.over) return;
  const intent = currentIntent(combat);
  const hpBefore = combat.player.hp;
  if (enemy.skipNext) {
    enemy.skipNext = false;
    enemy.rttStacks = 0; // DELAY: interrupting a Round-Trip Timer resets its growing hit
    log(combat, `${enemy.name} action interrupted.`);
  } else {
    resolveIntent(combat, intent);
    enemy.rttStacks = (enemy.rttStacks || 0) + 1; // uninterrupted turns ramp the RTT hit
  }
  // Relics that react to incoming damage (onDamageTaken) fire when the enemy's action actually cost
  // HP this turn; the amount lost is exposed as combat.lastDamageTaken. Inert by default.
  const lost = hpBefore - combat.player.hp;
  if (lost > 0) { combat.lastDamageTaken = lost; runHook(combat, "onDamageTaken"); }
  enemy.intentIndex += 1;
  tickStatuses(enemy);
  enemy.unhurt = true; // reset for the upcoming player turn (Stack Overflow fortify checks this)
  checkPlayerDead(combat);
}

export function resolveIntent(combat, intent) {
  const enemy = combat.enemy;
  if (intent.block) enemy.block += intent.block;
  if (intent.attack) {
    // CHAIN (Act 6): a `rampHits` intent repeats once more for each uninterrupted enemy turn
    // (Infinite Loop / Segfault) — interrupt it (skipEnemyNext) to reset the loop.
    const hits = (intent.hits || 1) + (intent.rampHits ? (enemy.rttStacks || 0) : 0);
    // DELAY: a `ramp` intent grows its DAMAGE by the number of uninterrupted enemy turns (Round-Trip Timer).
    const dmg = intent.attack + (intent.ramp ? intent.ramp * (enemy.rttStacks || 0) : 0);
    for (let i = 0; i < hits; i++) dealToPlayer(combat, dmg, { pierce: Boolean(intent.pierce) });
  }
  // CORRUPTION (Act 5): Heisenbug cleanses its own debuffs (incl. corruption) — punishes slow DoT.
  if (intent.cleanse) {
    delete enemy.statuses.corruption;
    delete enemy.statuses.weak;
    delete enemy.statuses.vulnerable;
    log(combat, `${enemy.name} cleansed itself.`);
  }
  // CORRUPTION (Act 5): Stack Overflow fortifies — gains armor if the player did not damage it.
  if (intent.fortify && enemy.unhurt) enemy.armor += intent.fortify;
  // THROUGHPUT: a congestion punisher deals damage scaling with the energy you spent last turn.
  if (intent.congest) dealToPlayer(combat, intent.congest * (combat.energySpentThisTurn || 0));
  // Man-in-the-Middle: reflect the player's just-finished turn — damage scales with cards played.
  if (intent.mirror) dealToPlayer(combat, intent.mirror * combat.cardsPlayedThisTurn);
  if (intent.applySelf) addStatus(enemy, intent.applySelf.status, intent.applySelf.value);
  if (intent.applyPlayer) addStatus(combat.player, intent.applyPlayer.status, intent.applyPlayer.value);
}
