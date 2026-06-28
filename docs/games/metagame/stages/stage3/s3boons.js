// Per-run build draft (the roguelite verb) — between the permanent Defrag shop (registers → stacking
// upgrades that survive the run) and the run itself, the player drafts a few RUN-SCOPED boons. At the
// run start and at two later milestones a seeded offer of 3 boons appears; the player PICKS one. Boons
// apply only for the current run (they live in state.run.boons and reset when a fresh run is drawn),
// so each run has a real build decision layered on top of the permanent upgrades.
//
// Pure data + a small DOM panel (mirrors shop.js). Deterministic — offers are seeded from the run seed
// + draft index, never Date.now()/Math.random().

import { makeRng } from "./rng.js";
import { buildPaginatedModal } from "./s3modal.js";

// Solve milestones at which a draft becomes available (3 picks across the ~13-solve body).
export const DRAFT_AT = [0, 5, 10];

// Boon catalogue. effect keys are additive bonuses read by the renderer:
//   prefetch  — extra pre-filled cells each snapshot
//   oracle    — extra Oracle hints per snapshot
//   parity    — extra Parity checks per snapshot
//   throughput— extra Throughput "levels" (+25% registers each)
//   volatile  — extra moves a volatile cell survives
//   decayPct  — fractional extra instability headroom (decay threshold ×(1+sum))
export const BOONS = [
  { id: "cache", label: "Cache Primer", desc: "+2 cells pre-filled each snapshot (this run)", effect: { prefetch: 2 } },
  { id: "oracle_echo", label: "Oracle Echo", desc: "+1 hint per snapshot (this run)", effect: { oracle: 1 } },
  { id: "parity_echo", label: "Parity Echo", desc: "+1 integrity check per snapshot (this run)", effect: { parity: 1 } },
  { id: "overread", label: "Overclocked Read", desc: "+50% registers per solve (this run)", effect: { throughput: 2 } },
  { id: "stabilizer", label: "Stabilizer Field", desc: "volatile cells survive +2 moves (this run)", effect: { volatile: 2 } },
  { id: "pressure_valve", label: "Pressure Valve", desc: "+40% instability headroom (this run)", effect: { decayPct: 0.4 } },
];

const BY_ID = new Map(BOONS.map((b) => [b.id, b]));

// Lazily ensure the run carries boon-draft fields (older saves / fresh runs).
export function ensureRunBoons(state) {
  if (!state || !state.run) return;
  if (!Array.isArray(state.run.boons)) state.run.boons = [];
  if (!Number.isFinite(state.run.draftsTaken)) state.run.draftsTaken = 0;
}

// How many draft milestones the current solvedCount has unlocked.
function milestonesReached(state) {
  const solved = Number(state.run.solvedCount || 0);
  return DRAFT_AT.filter((m) => solved >= m).length;
}

// A draft is pending when the player has unlocked more milestones than picks taken.
export function draftPending(state) {
  ensureRunBoons(state);
  return state.run.draftsTaken < milestonesReached(state);
}

// The current seeded offer: 3 boons not yet taken this run, drawn from the run seed + draft index.
export function draftOffer(state) {
  ensureRunBoons(state);
  const taken = new Set(state.run.boons);
  const pool = BOONS.filter((b) => !taken.has(b.id));
  if (!pool.length) return [];
  const rng = makeRng(`${state.run.seed}:draft:${state.run.draftsTaken}`);
  return rng.shuffle(pool).slice(0, Math.min(3, pool.length));
}

// Pick a boon by id (must be in the current offer). Returns true on success.
export function pickBoon(state, id) {
  ensureRunBoons(state);
  if (!draftPending(state)) return false;
  if (!BY_ID.has(id) || state.run.boons.includes(id)) return false;
  if (!draftOffer(state).some((b) => b.id === id)) return false;
  state.run.boons.push(id);
  state.run.draftsTaken += 1;
  return true;
}

// Sum of a given effect key across the run's chosen boons.
export function boonBonus(state, key) {
  if (!state || !state.run || !Array.isArray(state.run.boons)) return 0;
  let total = 0;
  for (const id of state.run.boons) {
    const b = BY_ID.get(id);
    if (b && b.effect && typeof b.effect[key] === "number") total += b.effect[key];
  }
  return total;
}

// HTML for ONE offered boon's page (name, description, "draft this" button).
export function boonPageHtml(boon) {
  return `<div class="s3-item">
    <div class="s3-item-name"><strong>${boon.label}</strong></div>
    <div class="s3-item-desc">${boon.desc}</div>
    <button type="button" class="s3-item-action" data-pick="${boon.id}">draft this boon</button>
  </div>`;
}

// Draft as a true floating modal, paginated one offered boon per page. Picking a boon closes the
// draft (as before). The seeded 3-offer logic is unchanged.
export function buildDraftPanel({ state, save, onClose }) {
  const offer = draftOffer(state);
  const remaining = Math.max(0, milestonesReached(state) - state.run.draftsTaken);
  return buildPaginatedModal({
    title: "BOON DRAFT",
    accentClass: "s3-modal-draft",
    note: "run-scoped boons — they apply to this run's snapshots only.",
    bank: () => `pick 1 · ${remaining} draft${remaining === 1 ? "" : "s"} pending`,
    count: () => offer.length,
    page: (i) => boonPageHtml(offer[i]),
    wire: (pageEl, i, modal) => {
      const btn = pageEl.querySelector("[data-pick]");
      btn?.addEventListener("click", () => { if (pickBoon(state, offer[i].id)) { save?.(); modal.close(); } });
    },
    onClose,
  });
}
