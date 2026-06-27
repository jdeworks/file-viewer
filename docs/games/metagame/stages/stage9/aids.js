// aids.js — Stage 9 Observer State: the CLARITY SPEND. Clarity accrues from clearing movements; here it
// buys OPTIONAL calibration aids. None of them bypass the offline un-cheat: the Single-Frame peek is
// OFFLINE-ONLY (online the seed reseeds every OBSERVE, so there is nothing stable to reveal), and the
// Stabilizer/Tachometer only ease/annotate timing — you still have to CROSS, and the back third still
// demands Offline Mode. Pure data + bookkeeping; the renderer applies the per-frame effects.

export const AIDS = [
  { id: "stabilizer", label: "Stabilizer Lens", cost: 20, desc: "+60% tolerance on your next CROSS (one charge)." },
  { id: "tachometer", label: "Tachometer", cost: 30, desc: "permanent numeric readout: gap angle + speed." },
  { id: "peek", label: "Single-Frame", cost: 15, desc: "offline only: reveal the gap's angle right now." }
];

export const STABILIZER_TOLERANCE_MULT = 1.6;

export function aidById(id) { return AIDS.find((a) => a.id === id) || null; }

export function defaultAids() { return { stabilizer: 0, tachometer: false }; }

export function normalizeAids(aids) {
  const t = aids && typeof aids === "object" ? aids : {};
  const stabilizer = Number.isFinite(Number(t.stabilizer)) ? Math.max(0, Math.floor(Number(t.stabilizer))) : 0;
  return { stabilizer, tachometer: Boolean(t.tachometer) };
}

// Attempt to buy an aid with clarity. ctx.offline gates the offline-only peek. Mutates state.clarity +
// state.aids. Returns { ok, reason, aid }.
export function buyAid(state, id, { offline = false } = {}) {
  const aid = aidById(id);
  if (!aid) return { ok: false, reason: "unknown" };
  state.aids = normalizeAids(state.aids);
  if (id === "peek" && !offline) return { ok: false, reason: "offline-only", aid };
  if (id === "tachometer" && state.aids.tachometer) return { ok: false, reason: "owned", aid };
  const clarity = Number(state.clarity || 0);
  if (clarity < aid.cost) return { ok: false, reason: "insufficient", aid };
  state.clarity = clarity - aid.cost;
  if (id === "stabilizer") state.aids.stabilizer += 1;
  if (id === "tachometer") state.aids.tachometer = true;
  return { ok: true, aid };
}

// If a Stabilizer charge is armed, consume one and return the tolerance multiplier; else 1 (no effect).
export function consumeStabilizer(state) {
  state.aids = normalizeAids(state.aids);
  if (state.aids.stabilizer > 0) { state.aids.stabilizer -= 1; return STABILIZER_TOLERANCE_MULT; }
  return 1;
}
