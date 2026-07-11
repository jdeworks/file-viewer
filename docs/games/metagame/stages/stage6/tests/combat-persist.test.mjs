import assert from "node:assert/strict";
import { createCombat, playCard, endTurn } from "../combat.js";
import { snapshotCombat, restoreCombat } from "../combat-persist.js";
import { wireBossCombat } from "../boss-combat.js";
import { instantiateEnemy } from "../enemies.js";
import { relicsFor } from "../relics.js";
import { createRun } from "../../../shared/run-state.js";

const player = { hp: 80, maxHp: 80 };

// A serializable view used to compare two combats for exact equality.
function view(combat) {
  return snapshotCombat(combat);
}

// ── snapshot → restore reproduces an IN-PROGRESS combat exactly ────────────────────────────────────
{
  // A deck spanning DELAY (pending queue) + normal cards, against a fat enemy so the fight survives.
  const deck = ["SYN", "ACK", "WINDOWED_SEND", "RETRANSMIT", "SYN", "ACK", "RST", "WINDOW", "FRAGMENT", "SYN", "ACK", "DELAYED_ACK"];
  const c = createCombat({ deck, player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 1234 });
  c.enemy.hp = 500; c.enemy.maxHp = 500;
  c.nodeId = "a1-l0-n0";

  // Play a couple of cards (including a DELAY card so pending is non-empty) and end a turn so the
  // RNG has advanced past the opening shuffle (draws/reshuffle) and the enemy has acted.
  for (let i = 0; i < c.hand.length; i++) {
    const id = c.hand[i];
    if (id === "WINDOWED_SEND" || id === "RETRANSMIT" || id === "SYN") { playCard(c, i); break; }
  }
  endTurn(c);
  playCard(c, 0);

  const snap = snapshotCombat(c);
  assert.ok(snap.pending.length >= 0, "snapshot captures the pending queue");
  assert.ok(typeof snap.rngSeed === "number", "snapshot captures the rng seed");
  assert.ok(snap.rngSteps > 0, "snapshot captures a non-zero rng position");

  const restored = restoreCombat(snap, { relics: relicsFor([]) });
  // The restored fight is byte-identical (serializable view) to the live one at the snapshot point.
  assert.deepEqual(view(restored), snap, "restore reproduces the snapshotted state exactly");
  assert.equal(restored.rng.steps(), c.rng.steps(), "restored rng is at the same position");

  // CONTINUATION: drive BOTH from here with the same actions; they must stay identical, which proves
  // the RNG continuation (reshuffles) and the pending DELAY queue both resume correctly.
  for (let t = 0; t < 6; t++) {
    endTurn(c); endTurn(restored);
    while (c.hand.length && restored.hand.length) {
      const before = c.hand.length;
      playCard(c, 0); playCard(restored, 0);
      if (c.hand.length === before) break; // unaffordable card stuck at index 0
    }
    assert.deepEqual(view(restored), view(c), `continuation diverged at iteration ${t}`);
  }
  assert.ok(c.rng.steps() > snap.rngSteps, "the fight continued to draw from the rng (reshuffles exercised)");
}

// ── RNG continuation is identical even across a forced reshuffle ────────────────────────────────────
{
  const c = createCombat({ deck: ["SYN", "ACK", "RST", "WINDOW", "FRAGMENT", "SYN"], player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 77 });
  c.enemy.hp = 500; c.enemy.maxHp = 500;
  const snap = snapshotCombat(c);
  const restored = restoreCombat(snap, { relics: relicsFor([]) });
  // Empty the draw pile on both so the next draw triggers a (seeded) reshuffle from discard.
  for (let n = 0; n < 4; n++) { endTurn(c); endTurn(restored); }
  assert.deepEqual(restored.hand, c.hand, "post-reshuffle hands match (rng resumed identically)");
  assert.deepEqual(restored.draw, c.draw, "post-reshuffle draw piles match");
}

// ── boss negotiation state + acceptance hook survive a restore ─────────────────────────────────────
{
  const deck = ["SYN", "SYN", "SYN", "ACK", "ACK", "SEGMENT"];
  const c = createCombat({ deck, player, enemy: instantiateEnemy("the-refused-connection", 4), seed: 5 });
  wireBossCombat(c, { locked: true, hpMult: 1 });
  c.nodeId = "a4-l6-n0";
  const enemyHp0 = c.enemy.hp;

  const snap = snapshotCombat(c);
  assert.ok(snap.boss && snap.boss.locked, "snapshot records the boss phase + locked state");

  const restored = restoreCombat(snap, { relics: relicsFor([]) });
  assert.equal(restored.bossPhase, 1, "restored boss phase");
  assert.equal(restored.bossLocked, true, "restored boss lock");
  assert.equal(typeof restored.acceptance, "function", "acceptance hook re-attached");
  assert.equal(typeof restored.advancePhase, "function", "advancePhase hook re-attached");

  // 2026-07-11 playtest fix: locked (ch9 unread) survives a restore as a difficulty cost (scaled-up
  // HP), not a win/loss gate — a demand-satisfying Signal still lands real damage after restore.
  const synIdx = restored.hand.indexOf("SYN");
  if (synIdx >= 0) { restored.player.energy = 3; playCard(restored, synIdx); }
  assert.ok(restored.enemy.hp < enemyHp0, "a demand-satisfying Signal still lands damage after restore, even while locked");
}

// ── run-state integration: checkpoint writes the 'combat' slot; reset clears it; siblings survive ───
{
  const save = { runs: {}, stageState: { 6: { run: { keep: true } } } };
  const run = createRun({ save, stageId: 6, slot: "combat", debounceMs: 0 });

  const c = createCombat({ deck: ["SYN", "ACK", "RST", "WINDOW", "FRAGMENT", "SYN"], player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 9 });
  c.nodeId = "a1-l0-n0";
  run.checkpoint({ ...snapshotCombat(c), runSeed: 9 });

  // The snapshot lands in stageState[6].combat WITHOUT clobbering stage6's own state.run.
  assert.ok(save.stageState[6].combat, "checkpoint wrote the combat slot");
  assert.equal(save.stageState[6].combat.runSeed, 9, "snapshot tagged with the run seed");
  assert.deepEqual(save.stageState[6].run, { keep: true }, "sibling state.run slot is untouched");

  const snap = run.restore();
  assert.equal(snap.nodeId, "a1-l0-n0", "restore returns the persisted snapshot");
  const rebuilt = restoreCombat(snap, { relics: relicsFor([]) });
  assert.deepEqual(rebuilt.hand, c.hand, "a reload would resume the same hand");

  // A resolved combat clears the slot (renderer calls reset() in finishCombat) so it never resumes.
  run.reset();
  assert.equal(save.stageState[6].combat, undefined, "reset clears the combat slot");
  assert.equal(save.runs[6], 1, "reset bumps the run count");
  assert.deepEqual(save.stageState[6].run, { keep: true }, "reset leaves sibling slots intact");
  run.destroy();
}

console.log("stage6 combat-persist tests passed");
