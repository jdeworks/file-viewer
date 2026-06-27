// economy.js — shared, generic per-stage economy + prestige primitive for the metagame stages.
//
// Every "currency" stage (Bits, Glyphs, Registers, Cycles, Packets, Handshakes, Addresses, States,
// Clarity…) has independently hand-rolled the same three things: an on-hand balance with earn/spend,
// a lifetime-earned counter, and a PRESTIGE — a soft reset that wipes the on-hand pile but keeps a
// permanent, compounding multiplier (Stage 1's `globalPull` / Gravitational Pull is the proven
// model). This generalizes that: each stage supplies its own currency noun + prestige name as config
// and gets a deterministic, DOM-free economy that persists into `stageState[stageId][slot]`.
//
// Construct with `createEconomy({ save, stageId, currency, slot = 'economy', start = 0, prestige })`.
// Pure (no Date.now / Math.random / DOM). NOT imported by any stage yet (Phase 0 foundation); it's
// tested standalone and retrofitted later, so it never enters a stage's `stage.generated.js` bundle.
//
// CRITICAL save-shape constraint (see CLAUDE.md): metagame.js lazy-seeds a stage's defaultState ONLY
// while `stageState[id]` is empty, so this module MUST only read/write `stageState[id][slot]` once the
// stage has mounted (the normal case — the economy is created on mount). We MERGE into the slot and
// never clobber sibling keys.

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNonNeg(n) {
  return n > 0 ? n : 0;
}

// The default prestige-gain curve, generalized from Stage 1's pullGain (§8.3): the further PAST the
// threshold you push before resetting, the bigger the permanent factor. `2` at exactly the threshold,
// climbing with the log of the over-shoot. Stages can override with their own `prestige.gain(ctx)`.
export function defaultPrestigeGain({ totalEarned, threshold }) {
  const t = threshold > 0 ? threshold : 1;
  const ratio = Math.max(1, finiteNumber(totalEarned) / t);
  return Math.max(2, 2 + Math.pow(Math.log10(ratio), 1.92));
}

// createEconomy — own a stage's currency balance + prestige stack inside the versioned save.
//
//   save      — the versioned save object (see save.js).
//   stageId   — the stage this economy belongs to.
//   currency  — display noun for the currency (e.g. 'Bits', 'Glyphs'); informational only.
//   slot      — sub-key under stageState[stageId] for the snapshot (default 'economy'); a stage may
//               run several independent currencies by using distinct slots.
//   start     — starting balance for a brand-new economy (default 0).
//   prestige  — { name, threshold, gain } config:
//                 name      — display noun for the prestige resource (e.g. 'Gravity', 'Clarity').
//                 threshold — min lifetime-earned required before a prestige is allowed (default 0).
//                 gain      — (ctx) => factor pushed onto the multiplicative stack on prestige;
//                             ctx = { balance, totalEarned, totalSpent, level, threshold }.
//                             Defaults to defaultPrestigeGain.
//
// State persisted at stageState[stageId][slot]:
//   { balance, totalEarned, totalSpent, level, factors }
//   - balance     — on-hand, spendable; RESET to `start` on prestige.
//   - totalEarned — lifetime earned; PERMANENT (never reset) — drives the prestige curve.
//   - totalSpent  — lifetime spent; PERMANENT — spent currency is gone for good, prestige never
//                   refunds it (shop levels bought with it persist in their own slot).
//   - level       — prestige count; PERMANENT.
//   - factors     — multiplicative prestige factors; PERMANENT. prestigeMultiplier = Π(factors).
export function createEconomy({
  save,
  stageId,
  currency = 'units',
  slot = 'economy',
  start = 0,
  prestige = {},
} = {}) {
  const prestigeName = prestige.name || 'Prestige';
  const threshold = clampNonNeg(finiteNumber(prestige.threshold, 0));
  const gainFn = typeof prestige.gain === 'function' ? prestige.gain : defaultPrestigeGain;

  function defaults() {
    return {
      balance: clampNonNeg(finiteNumber(start, 0)),
      totalEarned: 0,
      totalSpent: 0,
      level: 0,
      factors: [],
    };
  }

  // Resolve (creating if needed) save.stageState[stageId], then MERGE defaults under any existing
  // slot data without clobbering it. Returns the live data object that lives inside the save, so all
  // mutations below write straight through — the host's persist() then serializes the whole save.
  function load() {
    if (!plainObject(save) || !plainObject(save.stageState)) return defaults();
    let st = save.stageState[stageId];
    if (!plainObject(st)) { st = {}; save.stageState[stageId] = st; }
    const cur = plainObject(st[slot]) ? st[slot] : {};
    const d = defaults();
    const merged = {
      balance: clampNonNeg(finiteNumber(cur.balance, d.balance)),
      totalEarned: clampNonNeg(finiteNumber(cur.totalEarned, d.totalEarned)),
      totalSpent: clampNonNeg(finiteNumber(cur.totalSpent, d.totalSpent)),
      level: Math.max(0, Math.floor(finiteNumber(cur.level, d.level))),
      factors: Array.isArray(cur.factors) ? cur.factors.map((f) => finiteNumber(f, 1)) : d.factors,
    };
    st[slot] = merged;
    return merged;
  }

  const data = load();

  function prestigeMultiplier() {
    return data.factors.reduce((acc, f) => acc * (f > 0 ? f : 1), 1);
  }

  // earn(n, opts) — credit n to the balance (and lifetime total). By default the permanent prestige
  // multiplier is applied (the whole point of the stack); pass { raw: true } to credit n verbatim.
  function earn(n, opts = {}) {
    let amount = finiteNumber(n, 0);
    if (amount <= 0) return data.balance;
    if (!opts.raw) amount *= prestigeMultiplier();
    data.balance += amount;
    data.totalEarned += amount;
    return data.balance;
  }

  function canAfford(n) {
    return data.balance >= finiteNumber(n, 0);
  }

  // spend(n) — debit n if affordable; records it as permanently spent. Returns true on success.
  function spend(n) {
    const amount = finiteNumber(n, 0);
    if (amount < 0 || data.balance < amount) return false;
    data.balance -= amount;
    data.totalSpent += amount;
    return true;
  }

  // The factor a prestige RIGHT NOW would push onto the stack (preview for UI / gating).
  function gainPreview() {
    return Math.max(1, finiteNumber(gainFn({
      balance: data.balance,
      totalEarned: data.totalEarned,
      totalSpent: data.totalSpent,
      level: data.level,
      threshold,
    }), 1));
  }

  function canPrestige() {
    return data.totalEarned >= threshold;
  }

  // prestige(opts) — soft reset: push a permanent multiplicative factor, bump the level, and wipe the
  // ON-HAND balance back to `start`. Lifetime totals and the factor stack survive (spent stays spent).
  // opts.factor overrides the computed gain; opts.force bypasses the threshold gate.
  // Returns { ok, level, factor, multiplier }.
  function prestigeNow(opts = {}) {
    if (!opts.force && !canPrestige()) {
      return { ok: false, level: data.level, factor: 1, multiplier: prestigeMultiplier() };
    }
    const factor = Math.max(1, finiteNumber(opts.factor != null ? opts.factor : gainPreview(), 1));
    data.factors.push(factor);
    data.level += 1;
    data.balance = clampNonNeg(finiteNumber(start, 0));
    return { ok: true, level: data.level, factor, multiplier: prestigeMultiplier() };
  }

  // set(n) — overwrite the on-hand balance (dev / cheat affordance; does not touch lifetime totals).
  function set(n) {
    data.balance = clampNonNeg(finiteNumber(n, 0));
    return data.balance;
  }

  return {
    currency,
    prestigeName,
    threshold,
    stageId,
    slot,
    balance: () => data.balance,
    totalEarned: () => data.totalEarned,
    totalSpent: () => data.totalSpent,
    prestigeLevel: () => data.level,
    prestigeMultiplier,
    multiplier: prestigeMultiplier,
    earn,
    spend,
    canAfford,
    canPrestige,
    prestigeGainPreview: gainPreview,
    prestige: prestigeNow,
    set,
    state: () => ({ ...data, factors: data.factors.slice() }),
  };
}
