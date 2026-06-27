// run4.js — Stage 4 Fractal Bastion: the CAMPAIGN state machine (pure, no DOM, no RNG).
//
// Models the whole campaign over the 5 maps (maps.js): which map is active, which are cleared, the
// Glory currency, the Armory purchases, and the screen the renderer should show
// (map-select | combat | armory | boss | won). The TD combat itself lives in engine.js and mutates
// the top-level combat fields (cycles/integrity/waveNumber/towers/enemies); this module RESETS those
// fields when a map is selected and records map outcomes.
//
// THE BOSS GATE (stronger than the old wave-31 gate): "The Infinite Loop" is reachable ONLY when ALL
// FIVE maps are cleared (bossUnlocked). There is no start bypass. A debug-only seatAtBoss() lets the
// smoke reach the boss in one hop without playing 150 waves — it is NOT a player affordance.

import { MAPS, MAP_COUNT, mapByIndex } from './maps.js';
import { armoryEffects } from './armory.js';

const GLORY_PER_WAVE_BASE = 2;        // +mapIndex; +dividend from the Armory
const GLORY_MAP_CLEAR_BASE = 12;      // ×(mapIndex+1) when a whole map is cleared
const WAVE_REGEN = 8;                 // integrity restored between waves
const BOSS_ARENA_CYCLES = 600;        // cycles granted to build coverage in the boss arena

export function createCampaign() {
  return {
    status: 'map-select',     // map-select | combat | armory | boss | won
    mapIndex: 0,              // the active map while in combat / armory
    clearedMaps: [],          // indices of cleared maps
    glory: 0,
    armory: {},               // { upgradeId: level }
  };
}

// Ensure state.campaign exists and is well-formed (idempotent; used by normalizeState + mountStage).
export function ensureCampaign(state) {
  const fresh = createCampaign();
  const c = state.campaign && typeof state.campaign === 'object' ? state.campaign : {};
  c.status = ['map-select', 'combat', 'armory', 'boss', 'won'].includes(c.status) ? c.status : 'map-select';
  c.mapIndex = clampIndex(c.mapIndex);
  c.clearedMaps = Array.isArray(c.clearedMaps)
    ? [...new Set(c.clearedMaps.map(clampIndex))].filter((i) => i >= 0).sort((a, b) => a - b)
    : [];
  c.glory = Number.isFinite(c.glory) ? Math.max(0, c.glory) : 0;
  c.armory = c.armory && typeof c.armory === 'object' ? c.armory : {};
  state.campaign = c;
  return c;
}

// ── map gating ───────────────────────────────────────────────────────────────────────────────────

// Map 0 is always open; map i unlocks once map i-1 is cleared.
export function mapUnlocked(state, i) {
  const idx = clampIndex(i);
  if (idx === 0) return true;
  return (state.campaign?.clearedMaps || []).includes(idx - 1);
}

export function mapCleared(state, i) {
  return (state.campaign?.clearedMaps || []).includes(clampIndex(i));
}

export function allMapsCleared(state) {
  const cleared = state.campaign?.clearedMaps || [];
  return MAPS.every((_, i) => cleared.includes(i));
}

export function bossUnlocked(state) {
  return allMapsCleared(state) && !state.boss?.defeated;
}

// ── transitions ──────────────────────────────────────────────────────────────────────────────────

// Enter a map: gate-check, then reset the combat fields for that map (fresh towers/cycles/integrity).
export function selectMap(state, i) {
  const idx = clampIndex(i);
  if (!mapUnlocked(state, idx)) return { ok: false, reason: 'locked' };
  const c = ensureCampaign(state);
  c.mapIndex = idx;
  c.status = 'combat';
  resetCombatForMap(state, idx);
  return { ok: true, mapIndex: idx };
}

// Reset the top-level combat state for the start of a map (applies Armory bonuses).
export function resetCombatForMap(state, i) {
  const idx = clampIndex(i);
  const map = mapByIndex(idx);
  const fx = armoryEffects(state.campaign);
  state.cycles = map.startCycles + fx.cyclesBonus;
  state.integrity = map.startIntegrity + fx.integrityBonus;
  state.maxIntegrity = map.startIntegrity + fx.integrityBonus;
  state.damageMult = fx.damageMult;
  state.waveNumber = 1;
  state.waveActive = false;
  state.waveFailed = false;
  state.towers = [];
  state.enemies = [];
  state.spawnQueue = [];
  return state;
}

// Record a cleared wave: award Glory + small integrity regen, advance the wave counter, and — if that
// was the map's final wave — mark the map cleared and route to the Armory. Returns a summary.
export function recordWaveCleared(state) {
  const c = ensureCampaign(state);
  const idx = c.mapIndex;
  const map = mapByIndex(idx);
  const fx = armoryEffects(c);
  const gloryGain = GLORY_PER_WAVE_BASE + idx + fx.gloryPerWaveBonus;
  c.glory = Number(c.glory || 0) + gloryGain;
  state.integrity = Math.min(state.maxIntegrity || map.startIntegrity, (state.integrity || 0) + WAVE_REGEN);

  const wasFinal = (state.waveNumber || 1) >= map.waveCount;
  if (wasFinal) {
    const mapGlory = markMapCleared(state, idx);
    return { gloryGain, mapCleared: true, mapGlory };
  }
  state.waveNumber = (state.waveNumber || 1) + 1;
  return { gloryGain, mapCleared: false };
}

function markMapCleared(state, idx) {
  const c = ensureCampaign(state);
  if (!c.clearedMaps.includes(idx)) c.clearedMaps.push(idx);
  c.clearedMaps.sort((a, b) => a - b);
  const mapGlory = GLORY_MAP_CLEAR_BASE * (idx + 1);
  c.glory = Number(c.glory || 0) + mapGlory;
  state.waveActive = false;
  c.status = 'armory';
  return mapGlory;
}

// Leave the Armory back to map-select.
export function leaveArmory(state) {
  ensureCampaign(state).status = 'map-select';
  return { ok: true };
}

// Enter the boss arena (only when all maps are cleared). Resets the board to a tower-placement arena.
export function enterBoss(state) {
  if (!bossUnlocked(state)) return { ok: false, reason: 'locked' };
  const c = ensureCampaign(state);
  c.status = 'boss';
  resetBossArena(state);
  return { ok: true };
}

export function resetBossArena(state) {
  const fx = armoryEffects(state.campaign);
  state.cycles = BOSS_ARENA_CYCLES + fx.cyclesBonus;
  state.integrity = 100 + fx.integrityBonus;
  state.maxIntegrity = 100 + fx.integrityBonus;
  state.damageMult = fx.damageMult;
  state.waveNumber = 1;
  state.waveActive = false;
  state.towers = [];
  state.enemies = [];
  return state;
}

// Mark the boss defeated → campaign won.
export function winCampaign(state) {
  ensureCampaign(state).status = 'won';
  return { ok: true };
}

// TEST/DEBUG ONLY — clear all maps and seat the player in the boss arena in one hop (the smoke uses
// this to reach The Infinite Loop without playing 150 waves). NOT a player affordance.
export function seatAtBoss(state) {
  const c = ensureCampaign(state);
  c.clearedMaps = MAPS.map((_, i) => i);
  return enterBoss(state);
}

// TEST/DEBUG ONLY — instantly mark the active map cleared and route to the Armory.
export function debugClearMap(state) {
  const c = ensureCampaign(state);
  return { ok: true, mapGlory: markMapCleared(state, c.mapIndex) };
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────

export function activeMap(state) {
  return mapByIndex(state.campaign?.mapIndex ?? 0);
}

export function campaignProgress(state) {
  return { cleared: (state.campaign?.clearedMaps || []).length, total: MAP_COUNT };
}

function clampIndex(i) {
  return Math.max(0, Math.min(MAP_COUNT - 1, Math.trunc(Number(i)) || 0));
}
