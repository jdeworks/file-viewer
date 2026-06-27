// resources.test.mjs — Stage 8 Scrap + Insight economies.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { status } from "../engine.js";
import {
  scrapYield, insightIncome, earnScrap, earnInsight, spendScrap, spendInsight
} from "../resources.js";

// ── scrap scales with debris tier + value ──────────────────────────────────────────────────────────
{
  const lo = scrapYield({ tier: 1, value: 8 });
  const hi = scrapYield({ tier: 4, value: 80 });
  assert.ok(hi > lo, "deeper-zone richer debris refines more scrap");
  assert.equal(scrapYield({ tier: 2, value: 16 }), 2 * 2 + 2, "tier*2 + floor(value/8)");
}

// ── insight comes only from active Core/Production nodes ────────────────────────────────────────────
{
  const s = defaultState();
  const full = insightIncome(s, status);
  assert.ok(full > 0, "healthy field yields insight");
  // fail every Core + Production node → insight drops to 0 (mid/frontier don't research)
  for (const n of s.nodes) if (/^[CP]/.test(n.id)) n.health = 0;
  assert.equal(insightIncome(s, status), 0, "no research nodes ⇒ no insight");
}

// ── earn/spend bookkeeping with lifetime totals ────────────────────────────────────────────────────
{
  const s = defaultState();
  earnScrap(s, 10);
  earnScrap(s, 5);
  assert.equal(s.scrap, 15, "scrap accrued");
  assert.equal(s.scrapTotal, 15, "scrap lifetime total");
  assert.equal(spendScrap(s, 20), false, "cannot overspend scrap");
  assert.equal(spendScrap(s, 12), true, "affordable scrap spent");
  assert.equal(s.scrap, 3, "scrap debited");
  assert.equal(s.scrapTotal, 15, "lifetime total not refunded on spend");

  earnInsight(s, 4.5);
  assert.equal(s.insight, 4.5, "fractional insight accrues");
  assert.equal(spendInsight(s, 5), false, "cannot overspend insight");
  assert.equal(spendInsight(s, 4), true, "insight spent");
}

console.log("stage8 resources tests passed");
