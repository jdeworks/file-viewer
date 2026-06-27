// events.test.mjs — Stage 8 crisis events: telegraph one cycle ahead, resolve deterministically.
import assert from "node:assert/strict";
import { EVENTS, EVENT_BY_ID, resolveEvent, telegraphNext } from "../events.js";
import { defaultState } from "../state.js";
import { makeRng } from "../rng.js";

// catalog shape: 8 events, each with a telegraph + apply.
{
  assert.equal(EVENTS.length, 8, "eight events");
  for (const e of EVENTS) {
    assert.ok(e.id && e.label && e.telegraph, `event ${e.id} has id/label/telegraph`);
    assert.equal(typeof e.apply, "function", `event ${e.id} has apply`);
  }
}

// telegraphNext schedules pendingEvent (one cycle ahead) without applying any effect yet.
{
  const s = defaultState();
  const before = s.states;
  // force a telegraph by seeding an rng that passes the chance gate
  let scheduled = null;
  for (let i = 0; i < 20 && !scheduled; i += 1) scheduled = telegraphNext(s, makeRng(`t:${i}`));
  assert.ok(scheduled, "an event was telegraphed within a few seeds");
  assert.ok(s.pendingEvent, "pendingEvent set");
  assert.equal(s.states, before, "telegraph alone does not change reserves");
}

// resolveEvent applies the telegraphed event's effect and clears pendingEvent.
{
  const s = defaultState();
  s.pendingEvent = { id: "negative_entropy_window" };
  const active = resolveEvent(s, makeRng("r:1"));
  assert.equal(active.id, "negative_entropy_window");
  assert.equal(s.states, 25, "windfall applied");
  assert.equal(s.pendingEvent, null, "pending cleared");
  assert.equal(s.activeEvent.id, "negative_entropy_window");
}

// a bad event damages the right zone (heat spike → frontier only).
{
  const s = defaultState();
  s.pendingEvent = { id: "heat_spike" };
  resolveEvent(s, makeRng("r:2"));
  for (const n of s.nodes) {
    if (n.id.startsWith("F")) assert.equal(n.health, 92, "frontier seared");
    else assert.equal(n.health, 100, "non-frontier untouched");
  }
}

// resolving with no pending event is a no-op (returns null).
{
  const s = defaultState();
  assert.equal(resolveEvent(s, makeRng("r:3")), null);
}

// deterministic: same state + same seed ⇒ same telegraph choice.
{
  const a = defaultState(); const ea = telegraphNext(a, makeRng("seed:x"));
  const b = defaultState(); const eb = telegraphNext(b, makeRng("seed:x"));
  assert.deepEqual(ea, eb, "telegraph is deterministic");
}

// every catalog id round-trips through EVENT_BY_ID and applies without throwing.
{
  for (const e of EVENTS) {
    const s = defaultState();
    s.pendingEvent = { id: e.id };
    assert.ok(EVENT_BY_ID.has(e.id));
    assert.doesNotThrow(() => resolveEvent(s, makeRng(`each:${e.id}`)), `${e.id} resolves cleanly`);
  }
}

console.log("stage8 events tests passed");
