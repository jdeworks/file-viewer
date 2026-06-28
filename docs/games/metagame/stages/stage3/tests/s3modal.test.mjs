// Modal + pagination (presentation pass): the Defrag shop and boon draft render as floating modals,
// paginated ONE item per page. These tests cover the pure pagination DATA the modal pages over —
// page count = #purchasable upgrades / #offered boons, one item per page, buying/picking still works,
// and opening/buying/picking never touches the board/snapshot state (the modal floats over a board
// that stays put). The DOM modal chrome itself is exercised by the Chromium `games` smoke area.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { shopUpgradeList, shopPageHtml, buyUpgrade, upgradeLevel, upgradeCost } from "../shop.js";
import { boonPageHtml, draftOffer, pickBoon, ensureRunBoons } from "../s3boons.js";

// ── Shop pagination: one page per purchasable upgrade ─────────────────────────────────────────
{
  const ups = shopUpgradeList();
  assert(ups.length >= 1, "the shop paginates at least one upgrade");
  // Every page renders that single upgrade's name + a buy/MAX action.
  for (const up of ups) {
    const html = shopPageHtml(defaultState({ now: 1 }), up);
    assert(html.includes(up.name), `page for ${up.id} shows its name`);
    assert(html.includes(`data-buy="${up.id}"`), `page for ${up.id} has a buy button`);
  }
}

// ── Buying stays correct and leaves the board/snapshot untouched ───────────────────────────────
{
  const state = defaultState({ now: 1 });
  state.registers = 100000; // enough to buy
  state.run.marks = "frozen-marks"; // pretend a board is mid-solve underneath the modal
  state.run.solvedCount = 3;
  const before = upgradeLevel(state, "prefetch");
  const cost = upgradeCost("prefetch", before);
  const bankBefore = state.registers;
  const ok = buyUpgrade(state, null, "prefetch");
  assert.equal(ok, true, "a purchase succeeds when affordable");
  assert.equal(upgradeLevel(state, "prefetch"), before + 1, "the upgrade level increments");
  assert.equal(state.registers, bankBefore - cost, "the cost is deducted from registers");
  // The board / run progress is presentation-isolated: buying never disturbs it.
  assert.equal(state.run.marks, "frozen-marks", "board marks are untouched by a purchase");
  assert.equal(state.run.solvedCount, 3, "solved count is untouched by a purchase");
}

// ── Buying is refused when unaffordable (page button would be disabled) ────────────────────────
{
  const state = defaultState({ now: 1 });
  state.registers = 0;
  const ok = buyUpgrade(state, null, "prefetch");
  assert.equal(ok, false, "no purchase when the bank can't afford it");
  assert.equal(upgradeLevel(state, "prefetch"), 0, "level unchanged when refused");
}

// ── Boon pagination: one page per offered boon (the seeded 3-offer is intact) ──────────────────
{
  const state = defaultState({ now: 1 });
  ensureRunBoons(state);
  const offer = draftOffer(state);
  assert.equal(offer.length, 3, "three offered boons → three pages");
  for (const b of offer) {
    const html = boonPageHtml(b);
    assert(html.includes(b.label), `page for ${b.id} shows its label`);
    assert(html.includes(`data-pick="${b.id}"`), `page for ${b.id} has a pick button`);
  }
}

// ── Picking a boon still works and leaves the board/snapshot untouched ─────────────────────────
{
  const state = defaultState({ now: 1 });
  ensureRunBoons(state);
  state.run.marks = "frozen-marks";
  const pick = draftOffer(state)[1].id; // a non-first page proves pagination reaches every offer
  const ok = pickBoon(state, pick);
  assert.equal(ok, true, "drafting an offered boon succeeds");
  assert.deepEqual(state.run.boons, [pick], "the drafted boon is recorded");
  assert.equal(state.run.marks, "frozen-marks", "board marks are untouched by a draft pick");
}

console.log("stage3 modal + pagination tests passed");
