// Glyph Dungeon — run/floor lifecycle + small presentation helpers, split out of renderer.js so the
// controller stays focused. Pure functions over `state` (and the viewer/bts handles); no DOM here
// beyond the damage-noise string the renderer paints.

import { buildFloor, attachGrid } from "./engine.js";
import { rollEntity, runHeat } from "./data.js";
import { CIPHER_PATH, BTS_PATH } from "./messages.js";
import { FINAL_FLOOR } from "./acts.js";

// Floors per run before the boss (the descent length) — the deepest act cap (3 acts × 3 floors).
export const MAX_FLOOR = FINAL_FLOOR;

// The active opt-in run modifiers (C3 Heat), passed into buildFloor as mods.run.
function runMods(state) { return (state.meta && state.meta.runMods) || {}; }

// ── Floor / run lifecycle ─────────────────────────────────────────────────────────────────────
export function ensureWorld(state) {
  const run = state.run;
  if (!run.seed) run.seed = `s2-run${state.meta.runCount || 0}`;
  if (!run.world || run.world.floor !== run.floor || !Array.isArray(run.world.monsters)) {
    run.world = buildFloor(run.seed, run.floor, { run: runMods(state) });
  } else if (!run.world.grid) {
    // Loaded from a save: the grid is non-enumerable so it wasn't serialised. Regenerate the
    // deterministic terrain (entities kept their saved positions) and re-attach it in memory.
    attachGrid(run.world, run.seed, run.world.floor);
  }
}

export function descend(state, opts = {}) {
  const run = state.run;
  run.entity.glyphsThisRun += 3;
  run.active = true;
  state.meta.bestFloor = Math.max(Number(state.meta.bestFloor || 0), run.floor);
  state.meta.floorsCleared[run.floor] = true;
  if (run.floor >= MAX_FLOOR) {
    run.boss.reached = true;
    appendLog(state, "the stairs end at the boss syntax. it waits.");
    return;
  }
  run.floor += 1;
  run.world = buildFloor(run.seed, run.floor, { branch: Boolean(opts.branch), run: runMods(state) });
  if (opts.branch) appendLog(state, `you take the branching stair — a deadlier, richer floor ${run.floor}.`);
  else appendLog(state, `floor ${run.floor - 1} parsed. descending. +3 glyphs.`);
}

// Bank the run's glyphs, roll a fresh entity from purchased upgrades, and draw a new dungeon.
export function resetRun(state, { banked, death }) {
  const run = state.run;
  if (banked) {
    // Heat (C3): the active run modifiers multiply the whole run's banked glyphs.
    const earned = Math.round(Number(run.entity.glyphsThisRun || 0) * runHeat(runMods(state)));
    state.meta.glyphsBanked = Number(state.meta.glyphsBanked || 0) + earned;
  }
  if (death) state.meta.deaths = Number(state.meta.deaths || 0) + 1;
  state.meta.runCount = Number(state.meta.runCount || 0) + 1;
  run.seed = `s2-run${state.meta.runCount}`;
  run.entity = rollEntity(state.meta.shopUpgrades);
  run.floor = 1;
  run.active = false;
  run.boss.reached = false;
  run.world = buildFloor(run.seed, 1, { run: runMods(state) });
}

// ── Rendering helpers ─────────────────────────────────────────────────────────────────────────
// Cardinal arrow for the next step of the Stairwell Sense route (one of the four move dirs).
export const DIR_ARROW = { up: "↑", down: "↓", left: "←", right: "→" };

const NOISE_CHARS = "╳✕X#▓░*/\\";
export function damageNoise(fatal) {
  const rows = fatal ? 7 : 4;
  const cols = fatal ? 34 : 26;
  const lines = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < cols; x += 1) {
      line += Math.random() < 0.7 ? NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)] : " ";
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export function appendLog(state, line) {
  state.run.combatLog = [...state.run.combatLog, line].slice(-6);
}

export function openCipher(viewer) {
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(CIPHER_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(CIPHER_PATH);
}

export function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(2);
  else if (bts && typeof bts.openBts === "function") bts.openBts(2);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}

export function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
