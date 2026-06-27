// events.js — Stage 8 Entropy Field crisis events. Eight seeded events, each TELEGRAPHED one cycle
// ahead (so the player can pre-repair / bank) and RESOLVED at the start of the next advanceCycle. All
// effects are direct, deterministic state mutations driven by the cycle's seeded rng — no Date.now /
// Math.random — so a run replays identically. engine.advanceCycle calls resolveEvent (start) then
// telegraphNext (end). State carries `pendingEvent` (telegraphed) and `activeEvent` (this cycle).

import { createDebris } from "./state.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const byZone = (state, zonePrefix) => state.nodes.filter((n) => String(n.id).startsWith(zonePrefix));

// Each event: id, label, telegraph (shown a cycle ahead), bad (for UI tone), apply(state, rng)→detail.
export const EVENTS = [
  {
    id: "heat_spike", label: "heat spike", bad: true,
    telegraph: "a heat spike is forming — frontier nodes will take damage next cycle.",
    apply(state) {
      for (const n of byZone(state, "F")) n.health = clamp(n.health - 8, 0, 100);
      return { note: "frontier seared -8" };
    }
  },
  {
    id: "pattern_failure", label: "pattern failure", bad: true,
    telegraph: "a pattern is destabilizing — the weakest node will buckle next cycle.",
    apply(state) {
      const target = [...state.nodes].sort((a, b) => a.health - b.health)[0];
      if (target) target.health = clamp(target.health - 18, 0, 100);
      return { note: `pattern broke on ${target?.id || "?"} -18` };
    }
  },
  {
    id: "jitter_storm", label: "jitter storm", bad: true,
    telegraph: "a jitter storm is inbound — every node will take light damage next cycle.",
    apply(state) {
      for (const n of state.nodes) n.health = clamp(n.health - 3, 0, 100);
      return { note: "field-wide -3" };
    }
  },
  {
    id: "phantom_load", label: "phantom load", bad: true,
    telegraph: "a phantom load is queuing onto a production node next cycle.",
    apply(state, rng) {
      const prod = byZone(state, "P");
      const target = prod.length ? rng.pick(prod) : null;
      if (target) target.health = clamp(target.health - 12, 0, 100);
      return { note: `phantom load on ${target?.id || "?"} -12` };
    }
  },
  {
    id: "negative_entropy_window", label: "negative-entropy window", bad: false,
    telegraph: "a negative-entropy window will open next cycle — a States windfall.",
    apply(state) {
      state.states = Number(state.states || 0) + 25;
      state.totalStatesEarned = Number(state.totalStatesEarned || 0) + 25;
      return { note: "+25 States" };
    }
  },
  {
    id: "resonance_burst", label: "resonance burst", bad: false,
    telegraph: "a resonance burst will wash the mid relays next cycle — free healing.",
    apply(state) {
      for (const n of byZone(state, "M")) n.health = clamp(n.health + 10, 0, 100);
      return { note: "mid relays +10" };
    }
  },
  {
    id: "core_protection", label: "core protection", bad: false,
    telegraph: "a core-protection routine will yield a Stabilizer next cycle.",
    apply(state) {
      state.stabilizers = Number(state.stabilizers || 0) + 1;
      return { note: "+1 stabilizer" };
    }
  },
  {
    id: "data_salvage", label: "data salvage", bad: false,
    telegraph: "a data-salvage cache will surface in /entropy/debris/ next cycle.",
    apply(state, rng) {
      const debris = createDebris({ node: "cache", cycle: state.cycle, tier: 2, value: rng.int(24, 48), decay: 2 });
      state.debris.push(debris);
      return { note: `salvage cache ${debris.id} (+${debris.value} if archived)` };
    }
  }
];

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-12);
}

// resolveEvent — apply the telegraphed pendingEvent (if any) at the START of a cycle. Sets
// state.activeEvent to the resolved event (or null) and returns it.
export function resolveEvent(state, rng) {
  state.activeEvent = null;
  const pending = state.pendingEvent;
  if (!pending) return null;
  state.pendingEvent = null;
  const ev = EVENT_BY_ID.get(pending.id);
  if (!ev) return null;
  const detail = ev.apply(state, rng) || {};
  state.activeEvent = { id: ev.id, label: ev.label, bad: Boolean(ev.bad), ...detail };
  pushLog(state, `${ev.label}: ${detail.note || "resolved"}.`);
  return state.activeEvent;
}

// telegraphNext — at the END of a cycle, maybe schedule the NEXT cycle's crisis (telegraphed). 60%
// per cycle when nothing is already pending; deterministic via the cycle's rng.
export function telegraphNext(state, rng) {
  if (state.pendingEvent) return null;
  if (!rng.chance(0.6)) return null;
  const ev = rng.pick(EVENTS);
  state.pendingEvent = { id: ev.id, label: ev.label, bad: Boolean(ev.bad), telegraph: ev.telegraph };
  state.eventSeq = Number(state.eventSeq || 0) + 1;
  pushLog(state, `telegraph — next cycle: ${ev.telegraph}`);
  return state.pendingEvent;
}
