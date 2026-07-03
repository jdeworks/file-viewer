// Unified acquisition surface (M1) — the ONE draft folds free boons + purchasable Defrag upgrades into
// a single seeded 1-of-3 offer. These tests prove the fold: the pool contains BOTH kinds, boons stay
// free, upgrades pay registers and bank a permanent level, and picking either resolves the draft.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { acquisitionOffer, pickDraftCard } from "../s3draft.js";
import { draftPending } from "../s3boons.js";
import { upgradeLevel, upgradeCost, SHOP_UPGRADES } from "../shop.js";
import { BOONS } from "../s3boons.js";

const BOON_IDS = new Set(BOONS.map((b) => b.id));
const UP_IDS = new Set(SHOP_UPGRADES.map((u) => u.id));

// The offer is a 3-card MIX (≥1 boon + ≥1 upgrade) when both pools are non-empty — the fold is visible.
{
  const state = defaultState({ now: 1 });
  const offer = acquisitionOffer(state);
  assert.equal(offer.length, 3, "acquire offers 3 cards");
  assert(offer.some((c) => c.kind === "boon" && BOON_IDS.has(c.id)), "offer includes a free boon");
  assert(offer.some((c) => c.kind === "upgrade" && UP_IDS.has(c.id)), "offer includes a purchasable upgrade");
}

// Deterministic for a run seed + draft index.
{
  const a = acquisitionOffer(defaultState({ now: 1 })).map((c) => c.id);
  const b = acquisitionOffer(defaultState({ now: 1 })).map((c) => c.id);
  assert.deepEqual(a, b, "acquisitionOffer is deterministic");
}

// Picking a BOON is free and resolves the draft.
{
  const state = defaultState({ now: 1 });
  state.registers = 500;
  const boon = acquisitionOffer(state).find((c) => c.kind === "boon");
  assert.equal(pickDraftCard(state, null, boon.id), true, "boon pick succeeds");
  assert.deepEqual(state.run.boons, [boon.id], "boon recorded");
  assert.equal(state.registers, 500, "boons cost nothing");
  assert.equal(draftPending(state), false, "the draft is consumed");
}

// Picking an UPGRADE pays registers, banks a permanent level, and resolves the draft (same economy).
{
  const state = defaultState({ now: 1 });
  state.registers = 100000;
  state.retained = 100; // cover the Engram Bank (retained-currency) upgrade too
  const card = acquisitionOffer(state).find((c) => c.kind === "upgrade");
  const before = upgradeLevel(state, card.id);
  const ok = pickDraftCard(state, null, card.id);
  assert.equal(ok, true, "upgrade pick succeeds when affordable");
  assert.equal(upgradeLevel(state, card.id), before + 1, "the upgrade level increments (permanent)");
  assert.equal(draftPending(state), false, "buying an upgrade also consumes the draft (pick-one)");
  assert.equal(state.run.boons.length, 0, "an upgrade pick takes no boon");
}

// An unaffordable upgrade is refused and the draft stays pending.
{
  const state = defaultState({ now: 1 });
  state.registers = 0;
  state.retained = 0;
  const card = acquisitionOffer(state).find((c) => c.kind === "upgrade");
  assert.equal(pickDraftCard(state, null, card.id), false, "unaffordable upgrade refused");
  assert.equal(draftPending(state), true, "draft still pending after a refused buy");
}

console.log("stage3 acquire-fold tests passed");
