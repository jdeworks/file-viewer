// evidence-board.test.mjs — Stage 7: pure evidence-board state (cards / pins / links / established).
import assert from "node:assert/strict";
import {
  drawLink,
  establishFact,
  ensureBoard,
  getCard,
  hasLink,
  isEstablished,
  mintCard,
  pinnedCards,
  togglePin
} from "../evidence-board.js";

// ── mint is idempotent by id ───────────────────────────────────────────────────────────────────
{
  const state = {};
  const a = mintCard(state, { id: "fact:route", kind: "fact", caseId: 2, label: "Route inactive" });
  const again = mintCard(state, { id: "fact:route", kind: "fact", caseId: 2, label: "dup" });
  assert.equal(a, again, "minting the same id returns the existing card");
  assert.equal(ensureBoard(state).cards.length, 1, "no duplicate evidence");
  assert.equal(a.pinned, false, "cards start unpinned");
  assert.equal(getCard(state, "fact:route").label, "Route inactive");
}

// ── pinning ────────────────────────────────────────────────────────────────────────────────────
{
  const state = {};
  mintCard(state, { id: "c1" });
  mintCard(state, { id: "c2" });
  togglePin(state, "c1");
  assert.equal(getCard(state, "c1").pinned, true);
  assert.deepEqual(pinnedCards(state).map((c) => c.id), ["c1"]);
  togglePin(state, "c1");
  assert.equal(getCard(state, "c1").pinned, false, "toggle is reversible");
}

// ── links require both cards pinned; order-insensitive; deduped ──────────────────────────────────
{
  const state = {};
  mintCard(state, { id: "a" });
  mintCard(state, { id: "b" });
  assert.equal(drawLink(state, "a", "b").reason, "unpinned", "cannot link unpinned cards");
  togglePin(state, "a");
  togglePin(state, "b");
  assert.equal(drawLink(state, "a", "b").ok, true);
  assert.equal(hasLink(state, "b", "a"), true, "links are order-insensitive");
  assert.equal(drawLink(state, "a", "b").already, true, "no duplicate links");
  assert.equal(ensureBoard(state).links.length, 1);
  assert.equal(drawLink(state, "a", "a").reason, "invalid", "no self-links");
  assert.equal(drawLink(state, "a", "z").reason, "missing", "unknown card rejected");
}

// ── establishing a fact is persistent + idempotent and locks the supporting links ────────────────
{
  const state = {};
  mintCard(state, { id: "e" });
  mintCard(state, { id: "f" });
  mintCard(state, { id: "g" });
  assert.equal(isEstablished(state, "triad:K"), false);
  establishFact(state, { id: "triad:K", label: "K is the impostor", cards: ["e", "f", "g"] });
  assert.equal(isEstablished(state, "triad:K"), true);
  assert.equal(hasLink(state, "e", "f"), true, "supporting links are added on establish");
  assert.equal(hasLink(state, "f", "g"), true);
  const before = ensureBoard(state).established.length;
  establishFact(state, { id: "triad:K", label: "dup", cards: ["e", "f", "g"] });
  assert.equal(ensureBoard(state).established.length, before, "establishing is idempotent by id");
}

console.log("stage7 evidence-board tests passed");
