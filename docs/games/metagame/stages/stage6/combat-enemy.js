// combat-enemy.js — Stage 6 enemy turn: intent selection + resolution.
//
// The enemy follows a fixed, looping intent script (enemies.js), so its behaviour is fully
// telegraphed and deterministic. enemyTurn runs one enemy action then ticks its statuses and checks
// for player death; resolveIntent applies the chosen intent (attack/block/ramp/congest/mirror/…).

import { dealToPlayer, addStatus, tickStatuses, log } from "./combat-damage.js";
import { checkPlayerDead } from "./combat.js";

export function currentIntent(combat) {
  const script = combat.enemy.script;
  return script[combat.enemy.intentIndex % script.length];
}

export function enemyTurn(combat) {
  const enemy = combat.enemy;
  enemy.block = 0;
  const intent = currentIntent(combat);
  if (enemy.skipNext) {
    enemy.skipNext = false;
    enemy.rttStacks = 0; // DELAY: interrupting a Round-Trip Timer resets its growing hit
    log(combat, `${enemy.name} action interrupted.`);
  } else {
    resolveIntent(combat, intent);
    enemy.rttStacks = (enemy.rttStacks || 0) + 1; // uninterrupted turns ramp the RTT hit
  }
  enemy.intentIndex += 1;
  tickStatuses(enemy);
  checkPlayerDead(combat);
}

export function resolveIntent(combat, intent) {
  const enemy = combat.enemy;
  if (intent.block) enemy.block += intent.block;
  if (intent.attack) {
    const hits = intent.hits || 1;
    // DELAY: a `ramp` intent grows by the number of uninterrupted enemy turns (Round-Trip Timer).
    const dmg = intent.attack + (intent.ramp ? intent.ramp * (enemy.rttStacks || 0) : 0);
    for (let i = 0; i < hits; i++) dealToPlayer(combat, dmg, { pierce: Boolean(intent.pierce) });
  }
  // THROUGHPUT: a congestion punisher deals damage scaling with the energy you spent last turn.
  if (intent.congest) dealToPlayer(combat, intent.congest * (combat.energySpentThisTurn || 0));
  // Man-in-the-Middle: reflect the player's just-finished turn — damage scales with cards played.
  if (intent.mirror) dealToPlayer(combat, intent.mirror * combat.cardsPlayedThisTurn);
  if (intent.applySelf) addStatus(enemy, intent.applySelf.status, intent.applySelf.value);
  if (intent.applyPlayer) addStatus(combat.player, intent.applyPlayer.status, intent.applyPlayer.value);
}
