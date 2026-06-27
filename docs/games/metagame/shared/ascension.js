// ascension.js — shared, generic opt-in difficulty ladder for the metagame stages.
//
// The cheapest replay depth (Slay-the-Spire's "Ascension"): once a stage is cleared, the player may
// re-run it at a HIGHER ascension level, each level ADDING one more rule on top of every lower level
// (cumulative). It's pure data: a stage supplies an ordered list of modifier defs (each with an
// `apply(config, def)` that folds its rule into the stage's base config) and gets a deterministic,
// DOM-free ladder that owns the currently-selected level, what's unlocked, and the modifier fold.
// The fold reuses the SAME effects-fold idiom as shared/shop.js applyAll and shared/economy.js.
//
// Construct with `createAscension({ save, stageId, modifiers, slot = 'ascension' })`. Pure (no
// Date.now / Math.random / DOM). NOT imported by any stage yet (Phase 0 foundation); tested
// standalone and retrofitted later, so it never enters a stage's `stage.generated.js` bundle.
//
// CRITICAL save-shape constraint (see CLAUDE.md): metagame.js lazy-seeds a stage's defaultState ONLY
// while `stageState[id]` is empty. So the per-stage SELECTED level lives in `stageState[id][slot]`
// (written on mount — fine), but the cross-stage COMPLETION SUMMARY the future hub/meta-goal needs
// must live in `save.global` (a top-level container that survives even when a stage is never visited).
// recordClear() therefore writes BOTH: the stage's own slot AND the global summary, and load()
// reconciles the two (taking the max) so they can't silently diverge.

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function intOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

// Normalize the supplied modifier defs into an ordered, level-keyed list (ascension 1..N). A def is
// { level, id, label, desc, apply }. Defs are sorted by their declared level; if a def omits `level`
// it takes its 1-based position. The resulting `level` field is authoritative for activation.
function normalizeModifiers(modifiers) {
  const raw = Array.isArray(modifiers) ? modifiers.filter((m) => plainObject(m)) : [];
  const ordered = raw
    .map((m, i) => ({ def: m, level: Number.isFinite(Number(m.level)) ? Math.floor(Number(m.level)) : i + 1 }))
    .sort((a, b) => a.level - b.level);
  return ordered.map((entry, i) => ({
    level: entry.level > 0 ? entry.level : i + 1,
    id: entry.def.id != null ? entry.def.id : `a${i + 1}`,
    label: entry.def.label || `Ascension ${i + 1}`,
    desc: entry.def.desc || '',
    apply: typeof entry.def.apply === 'function' ? entry.def.apply : null,
  }));
}

// createAscension — own a stage's ascension ladder (selected level + cleared summary) in the save.
//
//   save      — the versioned save object (see save.js). Per-stage state lives at
//               save.stageState[stageId][slot]; the cross-stage summary at save.global.
//   stageId   — the stage this ladder belongs to.
//   modifiers — ordered list of { level, id, label, desc, apply } (ascension 1..N, cumulative).
//   slot      — sub-key under stageState[stageId] for the per-stage state (default 'ascension').
//
// Per-stage state at stageState[stageId][slot]: { selected, cleared }
//   - selected — the currently-chosen ascension level for the NEXT run (0 = base; clamped to unlocked).
//   - cleared  — highest ascension level this stage has been beaten at (0 = none).
// Cross-stage summary in save.global:
//   - maxAscension     — single highest level cleared across ALL stages (completionist meta-goal).
//   - ascensionCleared — map stageId -> highest level cleared for that stage.
export function createAscension({ save, stageId, modifiers = [], slot = 'ascension' } = {}) {
  const defs = normalizeModifiers(modifiers);
  const maxLevel = defs.length; // highest ascension level the ladder offers.

  // Resolve (creating if needed) save.global and its summary maps.
  function globalRef() {
    if (!plainObject(save)) return null;
    if (!plainObject(save.global)) save.global = {};
    const g = save.global;
    if (typeof g.maxAscension !== 'number' || !Number.isFinite(g.maxAscension)) g.maxAscension = 0;
    if (!plainObject(g.ascensionCleared)) g.ascensionCleared = {};
    return g;
  }

  // Resolve (creating if needed) save.stageState[stageId][slot] and merge a defaults shape under any
  // existing data without clobbering sibling slots. Reconciles `cleared` against the global summary
  // (takes the max) so the two homes can't drift. Returns the live object inside the save.
  function load() {
    const g = globalRef();
    const globalCleared = g ? intOrZero(g.ascensionCleared[stageId]) : 0;
    if (!plainObject(save) || !plainObject(save.stageState)) {
      return { selected: 0, cleared: globalCleared };
    }
    let st = save.stageState[stageId];
    if (!plainObject(st)) { st = {}; save.stageState[stageId] = st; }
    const cur = plainObject(st[slot]) ? st[slot] : {};
    const cleared = Math.min(maxLevel, Math.max(intOrZero(cur.cleared), globalCleared));
    const merged = {
      selected: Math.max(0, intOrZero(cur.selected)),
      cleared,
    };
    // Clamp the persisted selection to what the (reconciled) cleared level unlocks.
    merged.selected = Math.min(merged.selected, Math.min(maxLevel, cleared + 1));
    st[slot] = merged;
    // Keep the global summary in sync if the slot was ahead (e.g. an older save).
    if (g && cleared > globalCleared) {
      g.ascensionCleared[stageId] = cleared;
      if (cleared > g.maxAscension) g.maxAscension = cleared;
    }
    return merged;
  }

  const data = load();

  function maxCleared() {
    return data.cleared;
  }

  // Highest level the player may currently select: one above the highest cleared, capped at the
  // ladder length. A never-cleared stage unlocks level 1 (the first ascension) only once base is beaten.
  function maxUnlocked() {
    return Math.min(maxLevel, data.cleared + 1);
  }

  function level() {
    return data.selected;
  }

  // setLevel(n) — choose the ascension level for the next run, clamped to 0..maxUnlocked().
  function setLevel(n) {
    data.selected = Math.max(0, Math.min(intOrZero(n), maxUnlocked()));
    return data.selected;
  }

  // recordClear(level) — record that the stage was beaten at `level` (defaults to the selected level).
  // Raises the per-stage cleared high-water mark AND the cross-stage global summary. Returns the new
  // per-stage cleared level.
  function recordClear(lvl = data.selected) {
    const beaten = Math.min(maxLevel, Math.max(0, intOrZero(lvl)));
    if (beaten > data.cleared) data.cleared = beaten;
    const g = globalRef();
    if (g) {
      if (beaten > intOrZero(g.ascensionCleared[stageId])) g.ascensionCleared[stageId] = beaten;
      if (beaten > g.maxAscension) g.maxAscension = beaten;
    }
    return data.cleared;
  }

  // activeModifiers(level=current) — every modifier whose level is ≤ the given level, in ladder order
  // (cumulative: ascension N includes all of 1..N).
  function activeModifiers(lvl = data.selected) {
    const cap = Math.max(0, intOrZero(lvl));
    return defs.filter((d) => d.level <= cap);
  }

  // applyModifiers(baseConfig, level=current) — fold each active modifier's apply(config, def) into a
  // clone of baseConfig, in ladder order (same effects-fold idiom as shop.applyAll). A modifier's
  // apply may return a new config (used as the next accumulator) or mutate-and-return the same object;
  // a return of undefined/non-object keeps the prior accumulator. Pure: baseConfig is never mutated.
  function applyModifiers(baseConfig = {}, lvl = data.selected) {
    let acc = plainObject(baseConfig) ? { ...baseConfig } : baseConfig;
    for (const def of activeModifiers(lvl)) {
      if (!def.apply) continue;
      const next = def.apply(acc, def);
      if (next !== undefined) acc = next;
    }
    return acc;
  }

  return {
    stageId,
    slot,
    modifiers: defs,
    maxLevel,
    level,
    setLevel,
    maxUnlocked,
    maxCleared,
    recordClear,
    activeModifiers,
    applyModifiers,
    state: () => ({ selected: data.selected, cleared: data.cleared, maxLevel }),
  };
}
