// synergy.test.mjs — Stage 5: the hover "connections" derivation (combat-synergy.js).
import assert from "node:assert/strict";
import { tagsFor, relatedHandIndices, keywordsFor, isAttack } from "../combat-synergy.js";
import { CARDS } from "../cards.js";

// ── tags derive from rules text + archetype type ────────────────────────────────────────────────────
{
  assert.ok(tagsFor("SYN").has("ack"), "SYN references ACK → 'ack' tag");
  assert.ok(tagsFor("ACK").has("type:Protocol"), "ACK carries its archetype type tag");
  assert.ok(tagsFor("PREAMBLE").has("lead"), "PREAMBLE is a first-card (lead) card");
  assert.ok(tagsFor("MEMORY_LEAK").has("corruption"), "MEMORY_LEAK applies Corruption");
  // upgraded "<ID>+" tags identically to its base
  assert.deepEqual([...tagsFor("SYN+")].sort(), [...tagsFor("SYN")].sort(), "upgraded form shares base tags");
}

// ── relatedHandIndices links cards that share a tag or type ──────────────────────────────────────────
{
  const hand = ["SYN", "ACK", "PING", "MEMORY_LEAK"];
  // SYN (ack + type:Signal) relates to ACK (ack) and PING (type:Signal), not the Daemon corruption card.
  const rel = relatedHandIndices("SYN", hand);
  assert.ok(rel.includes(1), "SYN connects to ACK (shared 'ack')");
  assert.ok(rel.includes(2), "SYN connects to PING (shared Signal type)");
  assert.ok(!rel.includes(3), "SYN does not connect to an unrelated Daemon card");
}

// ── keyword glossary + attack detection ──────────────────────────────────────────────────────────────
{
  assert.ok(keywordsFor("SYN").includes("ACK"), "SYN surfaces the ACK keyword");
  assert.ok(isAttack("SYN"), "SYN is an attack (deals damage)");
  assert.ok(!isAttack("ACK"), "ACK is not an attack (pure block)");
}

// ── every card produces a (possibly empty) tag set without throwing ──────────────────────────────────
for (const card of CARDS) {
  assert.doesNotThrow(() => tagsFor(card.id), `tagsFor(${card.id}) must not throw`);
}

console.log("stage5 synergy tests passed");
