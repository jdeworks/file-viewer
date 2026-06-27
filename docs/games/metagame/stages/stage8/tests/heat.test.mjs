// heat.test.mjs — Stage 8 thermal resource: generation, venting, decay/entropy coupling.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { makeRng } from "../rng.js";
import { advanceCycle, status, toggleHighLoad } from "../engine.js";
import {
  computeHeatDelta, heatGeneration, thermalDecayBonus, thermalEntropy,
  BASE_VENT, THERMAL_THRESHOLD, ventFromStructures
} from "../heat.js";

// ── generation: a full healthy field generates heat from every online active node ──────────────────
{
  const s = defaultState();
  const gen = heatGeneration(s, status);
  assert.ok(gen > 0, "healthy field generates heat");
  const { vent } = computeHeatDelta(s, status);
  assert.equal(vent, BASE_VENT, "base vent with no structures");
}

// ── high-load doubles a node's heat contribution ───────────────────────────────────────────────────
{
  const s = defaultState();
  const before = heatGeneration(s, status);
  toggleHighLoad(s, "P1");
  const after = heatGeneration(s, status);
  assert.ok(after > before, "high-load raises heat generation");
}

// ── structures vent: heatVentBonus reduces net delta ───────────────────────────────────────────────
{
  const s = defaultState();
  assert.equal(ventFromStructures(s), 0, "no vent bonus by default");
  s.heatVentBonus = 5;
  assert.equal(ventFromStructures(s), 5, "structural vent counted");
  const { vent } = computeHeatDelta(s, status);
  assert.equal(vent, BASE_VENT + 5, "structural vent added to base");
}

// ── coupling: heat above threshold amplifies decay and reads into entropy ──────────────────────────
{
  assert.equal(thermalDecayBonus(THERMAL_THRESHOLD), 0, "no thermal decay at threshold");
  assert.ok(thermalDecayBonus(100) > thermalDecayBonus(THERMAL_THRESHOLD + 10), "hotter ⇒ more decay");
  assert.equal(thermalEntropy(THERMAL_THRESHOLD - 1), 0, "no thermal entropy below threshold");
  assert.ok(thermalEntropy(100) > 0, "thermal entropy at high heat");
}

// ── heat tracks through advanceCycle and is reported as a rate ──────────────────────────────────────
{
  const s = defaultState();
  const res = advanceCycle(s, makeRng("8:1"));
  assert.ok(Number.isFinite(s.heat) && s.heat >= 0, "heat is a finite non-negative number after a cycle");
  assert.equal(s.heatRate, res.heatRate, "heat rate reported on the cycle result");
}

console.log("stage8 heat tests passed");
