// run-state.js — shared run/checkpoint framework for the metagame stages.
//
// A single, pure, reusable helper that owns the two things every "run-based" stage needs and has
// historically hand-rolled (and gotten subtly wrong on reload): a DETERMINISTIC seeded RNG, and a
// debounced CHECKPOINT into the versioned save so a run can resume mid-flight after a reload.
//
// Construct with `createRun({ save, stageId, slot = 'run', seedParts = [] })`. Nothing here needs the
// DOM — every browser API (setTimeout, document, window) is feature-detected so Node unit tests run
// clean. NOT imported by any stage yet (Phase 0 foundation); it's tested standalone and retrofitted
// in a later phase, so it never enters a stage's `stage.generated.js` bundle.

// ── seeded RNG (xmur3 + mulberry32 — the exact pattern the stages' rng.js already use) ────────────
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build an RNG bundle from a string seed: float(), int range [lo,hi] inclusive, pick(array),
// chance(p), shuffle(array) (copy, Fisher–Yates). Same surface as the stages' makeRng.
export function makeRng(seed) {
  const next = mulberry32(xmur3(String(seed))());
  const float = () => next();
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const chance = (p) => next() < p;
  const shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { float, int, pick, chance, shuffle };
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

const DEFAULT_DEBOUNCE_MS = 400;

// createRun — own a run's seeded RNG + its checkpoint slot inside the save.
//
//   save      — the versioned save object (see save.js). `save.stageState[stageId][slot]` holds the
//               resumable run snapshot; `save.runs[stageId]` holds the run-count used for seeding.
//   stageId   — the stage this run belongs to.
//   slot      — sub-key under stageState[stageId] for the snapshot (default 'run'); a stage may keep
//               several concurrent runs by using distinct slots.
//   seedParts — extra deterministic parts appended to the seed string (e.g. a node id).
//
// The seed is `${stageId}:${runCount}:${seedParts.join(':')}`, so the SAME run replays identically
// across reloads, and reset() bumps runCount → the NEXT run gets a fresh (but still deterministic)
// seed. The debounce timer is UI plumbing (setTimeout); the snapshot CONTENT is always deterministic.
export function createRun({ save, stageId, slot = 'run', seedParts = [], debounceMs = DEFAULT_DEBOUNCE_MS } = {}) {
  const runCount = Number(save?.runs?.[stageId]) || 0;
  const parts = [stageId, runCount, ...(Array.isArray(seedParts) ? seedParts : [seedParts])];
  const seed = parts.join(':');
  const rng = makeRng(seed);

  let queued = null; // merged partials awaiting a flush
  let timer = null;
  let onVis = null;
  let onUnload = null;
  let destroyed = false;

  // Resolve (optionally creating) save.stageState[stageId].
  function stageRef(create) {
    if (!plainObject(save) || !plainObject(save.stageState)) return null;
    let st = save.stageState[stageId];
    if (!plainObject(st)) {
      if (!create) return null;
      st = {};
      save.stageState[stageId] = st;
    }
    return st;
  }

  function writeNow(partial) {
    const st = stageRef(true);
    if (!st) return;
    const current = plainObject(st[slot]) ? st[slot] : {};
    st[slot] = { ...current, ...(partial && typeof partial === 'object' ? partial : {}) };
  }

  function clearTimer() {
    if (timer != null && typeof clearTimeout === 'function') clearTimeout(timer);
    timer = null;
  }

  function scheduleFlush() {
    if (debounceMs <= 0 || typeof setTimeout !== 'function') { flush(); return; }
    if (timer != null) return; // a flush is already pending; the merged `queued` will carry the rest
    timer = setTimeout(() => { timer = null; flush(); }, debounceMs);
  }

  // checkpoint(partial) — MERGE `partial` into the run snapshot (never clobber), debounce-written.
  function checkpoint(partial) {
    if (destroyed) return runState;
    queued = { ...(queued || {}), ...(partial && typeof partial === 'object' ? partial : {}) };
    scheduleFlush();
    return runState;
  }

  // flush() — write any pending merged snapshot immediately (cancels the debounce).
  function flush() {
    clearTimer();
    if (queued) { writeNow(queued); queued = null; }
    return runState;
  }

  // restore() — the persisted snapshot for this slot, or null if none yet (resume entry point).
  function restore() {
    const st = stageRef(false);
    if (!st || !plainObject(st[slot])) return null;
    return st[slot];
  }

  // reset() — clear the slot (on death/clear) AND bump the stage's run-count so the next createRun
  // for this stage derives a fresh seed.
  function reset() {
    clearTimer();
    queued = null;
    const st = stageRef(true);
    if (st) delete st[slot];
    if (plainObject(save)) {
      if (!plainObject(save.runs)) save.runs = {};
      save.runs[stageId] = runCount + 1;
    }
    return runState;
  }

  function attachListeners() {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      onVis = () => { if (document.visibilityState === 'hidden') flush(); };
      document.addEventListener('visibilitychange', onVis);
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      onUnload = () => flush();
      window.addEventListener('beforeunload', onUnload);
    }
  }

  function detachListeners() {
    if (onVis && typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', onVis);
    }
    if (onUnload && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('beforeunload', onUnload);
    }
    onVis = null;
    onUnload = null;
  }

  // destroy() — clean unmount: flush pending writes, drop listeners, ignore further checkpoints.
  function destroy() {
    if (destroyed) return runState;
    flush();
    detachListeners();
    destroyed = true;
    return runState;
  }

  attachListeners();

  const runState = {
    rng,
    seed,
    runCount,
    stageId,
    slot,
    checkpoint,
    flush,
    restore,
    reset,
    destroy,
    // RNG surface mirrored onto the run for convenience.
    float: rng.float,
    int: rng.int,
    pick: rng.pick,
    chance: rng.chance,
    shuffle: rng.shuffle,
  };
  return runState;
}
