import assert from "node:assert/strict";
import { assembleSynthesis } from "../synthesis.js";
import { assembleCapstoneData } from "../capstone.js";
import { resolveMemory, witnessEcho, integrateMemory, getFinalChoiceState } from "../boss.js";
import { renderCompletion } from "../renderer-final.js";
import { stanceProfiles, routeEpilogues } from "../content-confront.js";
import { memories } from "../content.js";
import { defaultState } from "../state.js";

function fullBody(now = 1000) {
  const state = defaultState({ now });
  for (const m of memories) {
    resolveMemory({ state, memoryId: m.id, choice: m.choices[0], now });
    witnessEcho({ state, memoryId: m.id });
    integrateMemory({ state, memoryId: m.id, now });
  }
  return state;
}

// ── synthesis weaves all nine reflections + a stance-keyed closer ────────────────────────────────
{
  const state = fullBody();
  state.confront.stance = { dominant: "keeper", scores: { keeper: 3, seeker: 0, free: 0 } };
  const syn = assembleSynthesis(state);
  assert.equal(syn.parts.length, 9);
  assert.equal(syn.stance, "keeper");
  assert.equal(syn.closer, stanceProfiles.keeper.closer);
  // first reflection (genesis, choices[0]) is in the weave; closer is the last paragraph.
  assert.match(syn.text, /still here/);
  assert.ok(syn.text.endsWith(stanceProfiles.keeper.closer));
}

// ── partial body: only resolved memories appear; no stance → no closer ───────────────────────────
{
  const state = defaultState({ now: 1 });
  for (const m of memories.slice(0, 5)) resolveMemory({ state, memoryId: m.id, choice: m.choices[0], now: 1 });
  const syn = assembleSynthesis(state);
  assert.equal(syn.parts.length, 5);
  assert.equal(syn.closer, null);
}

// ── capstone grid is personalized per stance choices ─────────────────────────────────────────────
{
  const state = fullBody();
  state.confront.stance = { dominant: "free", scores: { keeper: 0, seeker: 0, free: 3 } };
  const cap = assembleCapstoneData(state);
  assert.equal(cap.tiles.length, 9);
  assert.equal(cap.integratedCount, 9);
  assert.equal(cap.resolvedCount, 9);
  assert.equal(cap.stance, "free");
  assert.equal(cap.tiles[0].choice, memories[0].choices[0]);
  assert.equal(cap.tiles[0].accent, memories[0].accent);
}

// ── continue / rest route closers: base line + the Phase-C stance line, flavored per route ────────
{
  for (const route of ["continue", "rest"]) {
    const state = fullBody();
    state.confront.stance = { dominant: "free", scores: { keeper: 0, seeker: 0, free: 3 } };
    state.confront.completed = true;
    state.final = { choice: route, route, completed: true, completedAt: 1 };
    const html = renderCompletion(state, getFinalChoiceState(state));
    assert.ok(html.includes('data-field="routeCloser"'), `${route}: closer panel renders`);
    assert.ok(html.includes(`data-route="${route}"`), `${route}: closer tagged with route`);
    assert.ok(html.includes(routeEpilogues[route].base), `${route}: base line present`);
    assert.ok(html.includes(routeEpilogues[route].free), `${route}: free-stance flavor present`);
    // the other route's text must not leak in
    const other = route === "continue" ? "rest" : "continue";
    assert.ok(!html.includes(routeEpilogues[other].base), `${route}: no cross-route leak`);
  }
  // No stance → base line only, no flavor line.
  const state = fullBody();
  state.confront.stance = null;
  state.final = { choice: "rest", route: "rest", completed: true, completedAt: 1 };
  const html = renderCompletion(state, getFinalChoiceState(state));
  assert.ok(html.includes(routeEpilogues.rest.base));
  assert.ok(!html.includes(routeEpilogues.rest.keeper));
}

console.log("stage10 epilogue tests passed");
