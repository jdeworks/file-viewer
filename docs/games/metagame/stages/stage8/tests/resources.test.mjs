// resources.test.mjs — Stage 8 merged SALVAGE PARTS economy (UX-audit 2026-07: scrap+insight → parts).
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { status } from "../engine.js";
import {
  partsYield, partsIncome, earnParts, spendParts
} from "../resources.js";

// ── parts refined from archived debris scale with tier + value ──────────────────────────────────────
{
  const lo = partsYield({ tier: 1, value: 8 });
  const hi = partsYield({ tier: 4, value: 80 });
  assert.ok(hi > lo, "deeper-zone richer debris refines more parts");
  assert.equal(partsYield({ tier: 2, value: 16 }), 2 * 2 + 2, "tier*2 + floor(value/8)");
}

// ── per-cycle parts income comes only from active Core/Production/Research nodes ─────────────────────
{
  const s = defaultState();
  const full = partsIncome(s, status);
  assert.ok(full > 0, "healthy field yields parts income");
  // fail every Core + Production node → income drops to 0 (mid/frontier don't research; core sector has
  // no research labs yet, so C* + P* are the only earners at boot)
  for (const n of s.nodes) if (/^[CP]/.test(n.id)) n.health = 0;
  assert.equal(partsIncome(s, status), 0, "no research-capable nodes ⇒ no parts income");
}

// ── earn/spend bookkeeping with a lifetime total ─────────────────────────────────────────────────────
{
  const s = defaultState();
  earnParts(s, 10);
  earnParts(s, 5.5);
  assert.equal(s.parts, 15.5, "parts accrued (fractional income allowed)");
  assert.equal(s.partsTotal, 15.5, "parts lifetime total");
  assert.equal(spendParts(s, 20), false, "cannot overspend parts");
  assert.equal(spendParts(s, 12), true, "affordable parts spent");
  assert.equal(s.parts, 3.5, "parts debited");
  assert.equal(s.partsTotal, 15.5, "lifetime total not refunded on spend");
}

console.log("stage8 resources tests passed");
