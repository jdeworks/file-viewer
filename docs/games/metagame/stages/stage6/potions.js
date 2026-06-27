// potions.js — Stage 6 Protocol Codex consumables (the potion belt).
//
// A potion is a ONE-SHOT effect the player triggers during combat. Each potion's effect(ctx) mutates
// the fight through the SAME ctx API cards use (combat-ctx.js): deal/block/draw/gainEnergy/heal/
// applyEnemy/returnLastPlayed — so consumables stay declarative and reuse the engine. Potions live in
// run.potions (a 2-slot belt, see run.js); they are found as combat rewards, bought in shops, or
// granted by events. Rolling is deterministic (seeded). No RNG in the effects themselves.
//
// Each potion: { id, name, rarity, text, effect(ctx) }.

export const POTIONS = [
  {
    id: "hotfix", name: "Hotfix", rarity: "common",
    text: "Heal 12 HP.",
    effect: (ctx) => ctx.heal(12)
  },
  {
    id: "burst-buffer", name: "Burst Buffer", rarity: "common",
    text: "Gain 2 energy this turn.",
    effect: (ctx) => ctx.gainEnergy(2)
  },
  {
    id: "smoke-test", name: "Smoke Test", rarity: "common",
    text: "Gain 15 block.",
    effect: (ctx) => ctx.block(15)
  },
  {
    id: "fuzzer", name: "Fuzzer", rarity: "uncommon",
    text: "Apply 3 Vulnerable to the enemy.",
    effect: (ctx) => ctx.applyEnemy("vulnerable", 3)
  },
  {
    id: "snapshot", name: "Snapshot", rarity: "uncommon",
    text: "Draw 3 cards.",
    effect: (ctx) => ctx.draw(3)
  },
  {
    id: "rollback", name: "Rollback", rarity: "uncommon",
    text: "Return the last card you played to your hand.",
    effect: (ctx) => ctx.returnLastPlayed()
  },
  {
    id: "core-dump-vial", name: "Core Dump Vial", rarity: "rare",
    text: "Deal 25 to the enemy and apply 2 Weak.",
    effect: (ctx) => { ctx.deal(25); ctx.applyEnemy("weak", 2); }
  }
];

const BY_ID = new Map(POTIONS.map((p) => [p.id, p]));

export function potionById(id) {
  return BY_ID.get(id) || null;
}

// ── The belt (run-state operations) ────────────────────────────────────────────────────────────────
// Kept here (not run.js) so all potion logic lives together; these are pure functions over a `run`
// object — they never touch the engine (the renderer applies a potion's effect via applyPotionEffect).
export const POTION_SLOTS = 2;       // belt capacity
export const POTION_COST = 35;       // flat shop price
export const POTION_DROP_CHANCE = 0.40; // chance a cleared combat/elite also drops a potion

// Add a potion to the belt. If full (POTION_SLOTS) the caller must pass replaceIndex to swap one out,
// else the add is rejected as "full". Returns { ok, full?, replaced? }.
export function addPotion(run, potionId, replaceIndex) {
  if (!run.potions) run.potions = [];
  if (!potionById(potionId)) return { ok: false, reason: "unknown" };
  if (run.potions.length < POTION_SLOTS) { run.potions.push(potionId); return { ok: true }; }
  if (Number.isInteger(replaceIndex) && replaceIndex >= 0 && replaceIndex < run.potions.length) {
    const replaced = run.potions[replaceIndex];
    run.potions[replaceIndex] = potionId;
    return { ok: true, replaced };
  }
  return { ok: false, full: true };
}

// Remove the potion at belt index (it was just consumed). The renderer applies its effect to the live
// combat via applyPotionEffect — keeping belt bookkeeping (here) separate from combat mutation.
export function usePotion(run, index) {
  if (!run.potions || index < 0 || index >= run.potions.length) return { ok: false };
  const [id] = run.potions.splice(index, 1);
  return { ok: true, id };
}

// Grab the pending reward's potion into the belt (optionally replacing slot replaceIndex). Clears
// reward.potion once taken; does NOT end the reward screen (the card choice does that).
export function takePotion(run, replaceIndex) {
  const id = run.pendingReward?.potion;
  if (!id) return { ok: false, reason: "none" };
  const r = addPotion(run, id, replaceIndex);
  if (r.ok) run.pendingReward.potion = null;
  return r;
}

// Buy a potion at the shop (deterministic stock; flat price). Belt-full requires replaceIndex.
export function buyPotion(run, potionId, cost = POTION_COST, replaceIndex) {
  if (run.handshakes < cost) return { ok: false, reason: "poor", cost };
  const r = addPotion(run, potionId, replaceIndex);
  if (!r.ok) return { ...r, cost };
  run.handshakes -= cost;
  return { ok: true, cost, replaced: r.replaced };
}

// Rarity weighting for drops/shops: commons are the bread-and-butter, rares are a treat.
const RARITY_WEIGHT = { common: 4, uncommon: 2, rare: 1 };

// Pick a potion id deterministically from a seeded value, weighted by rarity. Pure (no live entropy).
export function rollPotion(seed) {
  let h = (Number(seed) || 1) >>> 0;
  // one mulberry32 step so the pick is stable but well-mixed from the seed
  h = (h + 0x6d2b79f5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  const total = POTIONS.reduce((sum, p) => sum + (RARITY_WEIGHT[p.rarity] || 1), 0);
  let pick = r * total;
  for (const p of POTIONS) {
    pick -= RARITY_WEIGHT[p.rarity] || 1;
    if (pick < 0) return p.id;
  }
  return POTIONS[POTIONS.length - 1].id;
}
