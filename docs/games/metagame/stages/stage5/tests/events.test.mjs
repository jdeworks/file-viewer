import assert from "node:assert/strict";
import { EVENTS, eventForNode, eventById, applyEventChoice } from "../events.js";
import { createRun } from "../run.js";

// Phase G item 3 — authored events: deterministic act-weighted selection + working choice handlers.

// ── there are 14 events (Defragmenter + 13 new) and the legacy one survives ───────────────────────
{
  assert.equal(EVENTS.length, 14, "14 authored events");
  assert.ok(eventById("defragmenter"), "the original Defragmenter is still present");
  // Every event has at least one choice with an apply function.
  for (const e of EVENTS) {
    assert.ok(e.choices.length >= 1, `${e.id} has choices`);
    for (const c of e.choices) assert.equal(typeof c.apply, "function", `${e.id}.${c.id} has an apply`);
  }
}

// ── selection is deterministic per node and act-gated ──────────────────────────────────────────────
{
  for (const seed of [1, 7, 42, 1234]) {
    const a = createRun({ seed });
    const b = createRun({ seed });
    a.currentNodeId = b.currentNodeId = "a1-l2-n0";
    assert.equal(eventForNode(a).id, eventForNode(b).id, `seed ${seed}: same node ⇒ same event`);
  }
  // Honeypot is act 2+ only; Buffer Bloat is acts 1–2 only. Confirm act-gating excludes them.
  const run = createRun({ seed: 5 });
  run.act = 1;
  const act1ids = new Set();
  for (let n = 0; n < 60; n++) { run.currentNodeId = `probe-${n}`; act1ids.add(eventForNode(run).id); }
  assert.ok(!act1ids.has("honeypot"), "Honeypot never appears in act 1");
  run.act = 4;
  const act4ids = new Set();
  for (let n = 0; n < 60; n++) { run.currentNodeId = `probe-${n}`; act4ids.add(eventForNode(run).id); }
  assert.ok(!act4ids.has("buffer-bloat"), "Buffer Bloat never appears in act 4");
}

// ── handler: Garbage Collector removes a card deterministically ────────────────────────────────────
{
  const a = createRun({ seed: 11 }); a.currentNodeId = "ev1";
  const b = createRun({ seed: 11 }); b.currentNodeId = "ev1";
  const lenBefore = a.deck.length;
  const ra = applyEventChoice(a, "garbage-collector", "collect");
  const rb = applyEventChoice(b, "garbage-collector", "collect");
  assert.ok(ra.ok, "choice resolved");
  assert.equal(a.deck.length, lenBefore - 1, "a card was reaped");
  assert.deepEqual(a.deck, b.deck, "same seed+node ⇒ same card reaped (deterministic)");
}

// ── handler: Buffer Bloat trades handshakes for max HP ─────────────────────────────────────────────
{
  const run = createRun({ seed: 1, handshakes: 40 });
  run.currentNodeId = "ev2"; run.act = 1;
  const maxBefore = run.maxHp;
  applyEventChoice(run, "buffer-bloat", "expand");
  assert.equal(run.maxHp, maxBefore + 12, "max HP grows by 12");
  assert.equal(run.handshakes, 25, "15 handshakes spent");
}

// ── handler: Orphaned Socket pays handshakes for HP ────────────────────────────────────────────────
{
  const run = createRun({ seed: 1 }); run.currentNodeId = "ev3"; run.hp = 40;
  applyEventChoice(run, "orphaned-socket", "claim");
  assert.equal(run.handshakes, 18, "+18 handshakes");
  assert.equal(run.hp, 35, "−5 HP");
}

// ── handler: Mirror Port duplicates a card (deck grows by 1) ────────────────────────────────────────
{
  const run = createRun({ seed: 3 }); run.currentNodeId = "ev4"; run.act = 1;
  const len = run.deck.length;
  const r = applyEventChoice(run, "mirror-port", "duplicate");
  assert.ok(r.ok && run.deck.length === len + 1, "a card was duplicated");
}

// ── unknown choice is a clean no-op ────────────────────────────────────────────────────────────────
{
  const run = createRun({ seed: 1 }); run.currentNodeId = "ev5";
  const r = applyEventChoice(run, "defragmenter", "nope");
  assert.equal(r.ok, false, "unknown choice rejected");
}

// ── handler: Defragmenter's scan still pays 12 (back-compat) ───────────────────────────────────────
{
  const run = createRun({ seed: 1 }); run.currentNodeId = "ev6";
  applyEventChoice(run, "defragmenter", "scan");
  assert.equal(run.handshakes, 12, "Defragmenter scan pays 12 handshakes");
}

console.log("stage5 events tests passed");
