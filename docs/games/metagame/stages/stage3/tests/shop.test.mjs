// Defrag shop: the retained-fragment sink (round 4). The Engram Bank upgrade is bought with RETAINED
// fragments (not registers), giving that slow currency a real use, and its cost is small + linear.
import assert from "node:assert/strict";
import { SHOP_UPGRADES, upgradeCost, upgradeCurrency } from "../shop.js";

const engram = SHOP_UPGRADES.find((u) => u.id === "engram");
assert(engram, "the Engram Bank upgrade exists");
assert.equal(engram.currency, "retained", "Engram Bank is priced in retained fragments");
assert.equal(engram.max, 4, "Engram Bank caps at level 4");

assert.equal(upgradeCurrency("engram"), "retained", "engram currency is retained");
assert.equal(upgradeCurrency("oracle"), "registers", "register upgrades default to registers");

// Retained cost is small + linear (fragments accrue ~1 per 4 solves): 2, 3, 4, 5.
assert.equal(upgradeCost("engram", 0), 2, "first engram level costs 2 fragments");
assert.equal(upgradeCost("engram", 1), 3, "engram cost climbs linearly");
assert.equal(upgradeCost("engram", 3), 5, "engram top level costs 5 fragments");

// Register upgrades keep their exponential pricing.
assert(upgradeCost("oracle", 1) > upgradeCost("oracle", 0), "register upgrades still scale up");

console.log("stage3 shop retained-sink tests passed");
