import assert from "node:assert/strict";
import test from "node:test";
import { memoryCardModel, cardModels, reviewGridHtml } from "../renderer-grid.js";
import { createReveal } from "../reveal.js";
import { memories } from "../content.js";
import { defaultState } from "../state.js";
import { resolveMemory, witnessEcho, integrateMemory, markMemoryRead } from "../boss.js";

// ── grid derives 9 cards with the correct state glyphs ────────────────────────────────────────────
test("memoryCardModel maps lifecycle to the four state glyphs", () => {
  const m = memories[0];
  const unread = memoryCardModel(m, { state: "unread", echoWitnessed: false });
  assert.deepEqual(unread.glyphs.map((g) => g.on), [false, false, false, false]);

  const read = memoryCardModel(m, { state: "read", echoWitnessed: false });
  assert.deepEqual(read.glyphs.map((g) => g.on), [true, false, false, false]);

  const resolvedWitnessed = memoryCardModel(m, { state: "resolved", echoWitnessed: true });
  // read + stance + echo on, integrated off
  assert.deepEqual(resolvedWitnessed.glyphs.map((g) => g.on), [true, true, true, false]);

  const integrated = memoryCardModel(m, { state: "integrated", echoWitnessed: true });
  assert.deepEqual(integrated.glyphs.map((g) => g.on), [true, true, true, true]);
  // glyphs are text letters, never emoji
  assert.deepEqual(integrated.glyphs.map((g) => g.letter), ["R", "S", "E", "I"]);
});

test("cardModels derives exactly nine cards tracking live state", () => {
  const state = defaultState({ now: 1 });
  markMemoryRead({ state, memoryId: memories[0].id });
  resolveMemory({ state, memoryId: memories[1].id, choice: memories[1].choices[0] });
  witnessEcho({ state, memoryId: memories[1].id });
  integrateMemory({ state, memoryId: memories[1].id });

  const cards = cardModels(state);
  assert.equal(cards.length, 9);
  assert.equal(cards[0].glyphs[0].on, true);         // memory 0 read
  assert.equal(cards[1].glyphs[3].on, true);         // memory 1 integrated
  assert.equal(cards[2].glyphs.every((g) => !g.on), true); // memory 2 untouched
});

// ── review overlay is read-only (no interactive cards / buttons) ─────────────────────────────────
test("reviewGridHtml is read-only — no memory-card hooks or buttons", () => {
  const state = defaultState({ now: 1 });
  resolveMemory({ state, memoryId: memories[0].id, choice: memories[0].choices[1] });
  const html = reviewGridHtml(state);
  assert.ok(!/data-memory-card/.test(html), "must not expose card open hooks");
  assert.ok(!/<button/.test(html), "must contain no buttons");
  assert.ok(html.includes(memories[0].prompt), "shows the original quote");
  assert.ok(html.includes(memories[0].choices[1]), "shows the recorded stance");
});

// ── staged reveal state machine (skippable, reduced-motion instant) ──────────────────────────────
test("createReveal stages beats one at a time and is skippable", () => {
  const r = createReveal(3);
  assert.equal(r.revealed, 1);      // first beat shown immediately
  assert.equal(r.done, false);
  assert.equal(r.shows(0), true);
  assert.equal(r.shows(1), false);
  assert.equal(r.tick(), true);
  assert.equal(r.revealed, 2);
  assert.equal(r.skip(), true);     // jump to the end
  assert.equal(r.revealed, 3);
  assert.equal(r.done, true);
  assert.equal(r.tick(), false);    // no-op once done
  assert.equal(r.skip(), false);
});

test("createReveal under reduced motion starts fully revealed", () => {
  const r = createReveal(4, { reducedMotion: true });
  assert.equal(r.revealed, 4);
  assert.equal(r.done, true);
  assert.equal(r.shows(3), true);
});

test("createReveal handles empty completion gracefully", () => {
  const r = createReveal(0);
  assert.equal(r.revealed, 0);
  assert.equal(r.done, true);
});
