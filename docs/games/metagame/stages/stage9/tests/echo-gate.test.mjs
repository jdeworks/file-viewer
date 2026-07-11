import assert from "node:assert/strict";
import { onEchoAction } from "../echo-gate.js";
import { echoTokenFor } from "../echo-token.js";
import { resolveMemory, witnessEcho } from "../boss.js";
import { answerCompaction, challengedMemoryIds, fragStatus, startConfront } from "../confront.js";
import { memories } from "../content.js";
import { defaultState } from "../state.js";

// Drive a fresh state into Phase B (fragmentation): resolve + witness every memory, start the
// confront, then affirm each compaction. save=null → no prior un-cheats on record → all pending.
function inFragmentation() {
  const state = defaultState({ now: 100 });
  for (const m of memories) resolveMemory({ state, memoryId: m.id, choice: m.choices[0], now: 200 });
  for (const m of memories) witnessEcho({ state, memoryId: m.id });
  startConfront(state);
  for (const id of challengedMemoryIds(state)) answerCompaction({ state, memoryId: id, choice: state.memories[id].choice, save: null });
  return state;
}

// ── Phase B re-witness goes through the token-verified gate, NOT a bare click ──────────────────────
{
  const state = inFragmentation();
  assert.equal(state.confront.phase, "fragmentation");
  assert.equal(fragStatus(state, null, "genesis"), "pending");

  // Ignored: wrong stage / non-echo action. (This stage is 9 as of the 2026-07-11 renumbering —
  // stage 8 here is a deliberately WRONG stage number, not this stage's own old id.)
  assert.deepEqual(onEchoAction({ state, detail: { stage: 8, action: "echo_genesis", token: echoTokenFor("genesis") } }), { ignored: true });
  assert.deepEqual(onEchoAction({ state, detail: { stage: 9, action: "memory_resolved" } }), { ignored: true });

  // A bare click only OPENS the artifact — no token-carrying action is dispatched. The closest a
  // forged click can get is an echo action with no/wrong token, which is rejected here.
  assert.equal(onEchoAction({ state, detail: { stage: 9, action: "echo_genesis" } }).spoofed, true);
  assert.equal(onEchoAction({ state, detail: { stage: 9, action: "echo_genesis", token: "bogus" } }).spoofed, true);
  assert.equal(fragStatus(state, null, "genesis"), "pending", "a spoof / bare click advances nothing");

  // A genuine, token-carrying echo (a real viewer action returning from the viewer) re-anchors it.
  const r = onEchoAction({ state, detail: { stage: 9, action: "echo_genesis", token: echoTokenFor("genesis") }, save: null });
  assert.equal(r.rewitnessed, true);
  assert.equal(fragStatus(state, null, "genesis"), "rewitnessed");
}

// ── Outside Phase B a genuine echo witnesses but does not re-anchor ────────────────────────────────
{
  const state = defaultState({ now: 100 });
  const r = onEchoAction({ state, detail: { stage: 9, action: "echo_syntax", token: echoTokenFor("syntax") } });
  assert.equal(r.witnessed, true);
  assert.equal(r.rewitnessed, false);
  assert.equal(state.memories.syntax.echoWitnessed, true);
}

console.log("stage9 echo-gate tests passed");
