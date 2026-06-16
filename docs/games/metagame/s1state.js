// s1state.js — Stage 1 save schema, defaults, base64 encode/decode, v1→v2 migration.
// Pure ES module, no DOM.

import { fromNumber, fromStore } from './bignum.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SAVE_KEY = 'fv:games:metagame';
export const SAVE_VERSION = 2;

// ---------------------------------------------------------------------------
// Default state factory
// ---------------------------------------------------------------------------

export function defaultState() {
  return {
    version: 2,
    bits: { m: 0, e: 0 },             // BigNum ZERO
    totalBits: { m: 0, e: 0 },        // BigNum ZERO
    owned: {},                          // { [tierId]: number }
    timedStates: {},                    // { [tierId]: { active, startedAt, duration_ms } }
    managers: {},                       // { [managerId]: { level, paused, lastFire } }
    pullFactors: [],                    // number[]
    milestones: [],                     // string[]
    achievements: [],                   // string[]
    stage: 1,
    defeated: [],
    bossSeen: false,
    bossLossCount: 0,
    totalBought: 0,
    buyMult: 1,
    runStartedAt: Date.now(),
    introStages: [],
    claimed: {},
    tabsUnlocked: false,   // phase 2 gate: tabs appear once bits ≥ 250
  };
}

// ---------------------------------------------------------------------------
// base64 encode/decode (§9.1)
// unescape(encodeURIComponent(...)) makes btoa safe for non-ASCII / emoji.
// ---------------------------------------------------------------------------

export function encodeSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function decodeSave(str) {
  return JSON.parse(decodeURIComponent(escape(atob(str))));
}

// ---------------------------------------------------------------------------
// Migration v1 → v2 (§9.2)
// Legacy saves have bits as a plain number and no version field.
// ---------------------------------------------------------------------------

export function migrate(s) {
  // Convert legacy plain-number bits to BigNum.
  if (typeof s.bits === 'number') s.bits = fromNumber(s.bits);
  if (typeof s.totalBits === 'number' || s.totalBits == null)
    s.totalBits = fromNumber(s.totalBits || 0);

  // Ensure new fields exist with their defaults.
  s.owned        ||= {};
  s.timedStates  ||= {};
  s.managers     ||= {};
  s.pullFactors  ||= [];
  s.achievements ||= [];
  s.milestones   ||= [];
  s.runStartedAt ||= Date.now();
  s.bossSeen      = s.bossSeen     ?? false;
  s.bossLossCount = s.bossLossCount ?? 0;
  s.defeated     ||= [];
  s.introStages  ||= [];
  s.claimed      ||= {};
  s.totalBought  ||= 0;
  s.buyMult       = s.buyMult ?? 1;
  s.tabsUnlocked  = s.tabsUnlocked ?? false;

  s.version = 2;
  return s;
}

// ---------------------------------------------------------------------------
// Load
// Tries base64 v2 first; falls back to legacy plain JSON (v1); returns
// defaultState() on any parse failure or missing key.
// ---------------------------------------------------------------------------

export function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return defaultState();

  let s;
  try {
    // Try base64 first (v2 format).
    s = decodeSave(raw);
  } catch {
    // Fall back to legacy plain JSON (v1 format).
    try { s = JSON.parse(raw); }
    catch { return defaultState(); }
  }

  if (!s || typeof s !== 'object') return defaultState();

  // Run migration if the schema version is missing or outdated.
  if (!s.version || s.version < 2) s = migrate(s);

  // Normalize BigNum fields in case they came from plain JSON or a migration.
  s.bits      = fromStore(s.bits);
  s.totalBits = fromStore(s.totalBits);

  return s;
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, encodeSave(state));
  } catch { /* private mode or storage quota */ }
}
