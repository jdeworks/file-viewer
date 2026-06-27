// run4.test.mjs — Stage 4 campaign state machine + Armory.
import assert from 'node:assert/strict';
import { defaultState, normalizeState } from '../state.js';
import {
  ensureCampaign, mapUnlocked, allMapsCleared, bossUnlocked, selectMap, recordWaveCleared,
  leaveArmory, enterBoss, seatAtBoss, debugClearMap, campaignProgress,
} from '../run4.js';
import { armoryEffects, buyArmory, armoryCost, armoryLevel } from '../armory.js';
import { MAPS } from '../maps.js';

// Fresh state starts at map-select with only map 0 open and the boss locked.
{
  const s = defaultState();
  assert.equal(s.campaign.status, 'map-select');
  assert.ok(mapUnlocked(s, 0), 'map 0 always open');
  assert.ok(!mapUnlocked(s, 1), 'map 1 locked at start');
  assert.ok(!bossUnlocked(s), 'boss locked at start — no start bypass');
  assert.equal(campaignProgress(s).total, MAPS.length);
}

// Selecting a locked map fails; map 0 succeeds and resets combat.
{
  const s = defaultState();
  assert.equal(selectMap(s, 2).ok, false, 'cannot jump to a locked map');
  const r = selectMap(s, 0);
  assert.ok(r.ok && s.campaign.status === 'combat');
  assert.equal(s.waveNumber, 1, 'combat resets to wave 1');
  assert.equal(s.towers.length, 0, 'towers reset on map entry');
  assert.equal(s.cycles, MAPS[0].startCycles, 'start cycles from the map');
}

// Clearing every wave of map 0 marks it cleared, awards glory, routes to the Armory, unlocks map 1.
{
  const s = defaultState();
  selectMap(s, 0);
  let summary;
  for (let w = 1; w <= MAPS[0].waveCount; w++) summary = recordWaveCleared(s);
  assert.ok(summary.mapCleared, 'final wave clears the map');
  assert.equal(s.campaign.status, 'armory', 'routes to the Armory after a map');
  assert.ok(s.campaign.glory > 0, 'glory earned');
  assert.ok(mapUnlocked(s, 1), 'map 1 unlocks after map 0');
  leaveArmory(s);
  assert.equal(s.campaign.status, 'map-select');
}

// The boss is reachable ONLY when all five maps are cleared.
{
  const s = defaultState();
  for (let m = 0; m < MAPS.length; m++) {
    selectMap(s, m);
    debugClearMap(s);
    leaveArmory(s);
  }
  assert.ok(allMapsCleared(s), 'all maps cleared');
  assert.ok(bossUnlocked(s), 'boss now unlocked');
  const r = enterBoss(s);
  assert.ok(r.ok && s.campaign.status === 'boss');
  assert.ok(s.cycles >= 600, 'boss arena grants placement cycles');
}

// seatAtBoss (debug) jumps straight to the boss from a fresh state.
{
  const s = defaultState();
  assert.ok(!bossUnlocked(s));
  seatAtBoss(s);
  assert.equal(s.campaign.status, 'boss');
  assert.ok(allMapsCleared(s));
}

// Armory: buying upgrades spends glory and changes the combat config.
{
  const s = defaultState();
  s.campaign.glory = 1000;
  const before = armoryEffects(s.campaign);
  const r = buyArmory(s.campaign, 'reinforced-core');
  assert.ok(r.ok && armoryLevel(s.campaign, 'reinforced-core') === 1);
  assert.ok(armoryEffects(s.campaign).integrityBonus > before.integrityBonus, 'integrity bonus rises');
  // Cost escalates with level.
  const c1 = armoryCost(s.campaign, 'reinforced-core');
  buyArmory(s.campaign, 'reinforced-core');
  assert.ok(armoryCost(s.campaign, 'reinforced-core') > c1, 'cost escalates per level');
  // Damage upgrade flows into selectMap's reset.
  buyArmory(s.campaign, 'overclocked-emitters');
  selectMap(s, 0);
  assert.ok(s.damageMult > 1, 'damage multiplier applied on map entry');
  assert.ok(s.integrity > MAPS[0].startIntegrity, 'integrity bonus applied on map entry');
}

// Campaign survives normalizeState round-trips.
{
  const s = defaultState();
  selectMap(s, 0);
  s.campaign.glory = 42;
  const round = normalizeState(JSON.parse(JSON.stringify(s)));
  assert.equal(round.campaign.glory, 42, 'glory persists');
  assert.equal(round.campaign.status, 'combat', 'status persists');
}

console.log('stage4 run4/armory tests passed');
