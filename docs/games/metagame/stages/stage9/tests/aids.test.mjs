// aids.test.mjs — Stage 9: the clarity SPEND. Aids cost clarity; the Single-Frame peek is offline-only
// so it can never bypass the un-cheat; the Stabilizer is a consumable tolerance widener.
import assert from "node:assert/strict";
import { AIDS, buyAid, consumeStabilizer, normalizeAids, shouldRevealAids, shouldRevealPeek, STABILIZER_TOLERANCE_MULT } from "../aids.js";

// catalog is well formed
assert.ok(AIDS.length >= 3, "at least three aids");
for (const a of AIDS) assert.ok(a.id && a.label && a.cost > 0, "aid has id/label/cost");

// insufficient clarity is rejected, clarity untouched
{
  const state = { clarity: 5, aids: normalizeAids() };
  const r = buyAid(state, "tachometer");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "insufficient");
  assert.equal(state.clarity, 5, "no clarity spent on a failed buy");
}

// tachometer: bought once, permanent, second buy rejected as owned
{
  const state = { clarity: 100, aids: normalizeAids() };
  assert.equal(buyAid(state, "tachometer").ok, true);
  assert.equal(state.aids.tachometer, true);
  assert.equal(state.clarity, 70, "tachometer costs 30");
  assert.equal(buyAid(state, "tachometer").reason, "owned");
}

// peek: OFFLINE-ONLY — online it cannot be bought (never bypasses the un-cheat); offline it can.
{
  const state = { clarity: 100, aids: normalizeAids() };
  assert.equal(buyAid(state, "peek", { offline: false }).reason, "offline-only");
  assert.equal(state.clarity, 100, "an offline-only buy spends nothing online");
  assert.equal(buyAid(state, "peek", { offline: true }).ok, true);
  assert.equal(state.clarity, 85, "peek costs 15 offline");
}

// stabilizer: a consumable charge that yields a tolerance multiplier exactly once
{
  const state = { clarity: 100, aids: normalizeAids() };
  assert.equal(buyAid(state, "stabilizer").ok, true);
  assert.equal(state.aids.stabilizer, 1);
  assert.equal(consumeStabilizer(state), STABILIZER_TOLERANCE_MULT, "armed charge widens tolerance");
  assert.equal(state.aids.stabilizer, 0, "charge consumed");
  assert.equal(consumeStabilizer(state), 1, "no charge ⇒ no bonus");
}

// disclosure (UX audit M1): the calibration shop appears only once clarity income exists, and stays
// visible afterwards (sticky via aidsRevealed); the offline-only peek card waits for Offline Mode.
{
  assert.equal(shouldRevealAids({ clarity: 0, aids: normalizeAids() }), false, "fresh save: shop hidden");
  assert.equal(shouldRevealAids({ clarity: 5, aids: normalizeAids() }), true, "clarity income reveals the shop");
  assert.equal(shouldRevealAids({ clarity: 0, aids: { stabilizer: 1, tachometer: false } }), true, "owning an aid reveals the shop");
  assert.equal(shouldRevealAids({ clarity: 0, aids: normalizeAids(), aidsRevealed: true }), true, "sticky once revealed");
  assert.equal(shouldRevealAids(null), false, "no state ⇒ hidden");
  assert.equal(shouldRevealPeek(false), false, "peek hidden while online");
  assert.equal(shouldRevealPeek(true), true, "peek revealed once offline");
}

// aid catalog carries a visible description (UX audit #5) and flags the offline-only peek.
for (const a of AIDS) assert.ok(typeof a.desc === "string" && a.desc.length > 0, `${a.id} has a visible description`);
assert.equal(AIDS.find((a) => a.id === "peek").offlineOnly, true, "the Single-Frame peek is flagged offline-only");

console.log("stage9 aids tests passed");
