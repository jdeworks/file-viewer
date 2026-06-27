// Three-act structure (data-driven). The descent is now 9 floors split into three acts of three
// floors each; every act ENDS in a floor-guardian sub-boss posted by the stairs (the existing B6
// guardian mechanic, formalised as the act cap). The acts escalate the verb the player must master:
//   Act I  — The Warrens      (floors 1-3): combat fundamentals (bump-attack, weapons, glyphs).
//   Act II — Cisterns & Emberworks (4-6): hazards + spreading fire.
//   Act III — The Overflow    (floors 7-9): DARKNESS — sight collapses, last-seen ghosts, torches.
// Pure data + tiny helpers; no DOM, no rng. floor.js / runloop.js read this so the geometry of the
// run lives in ONE place.

export const ACTS = [
  { id: 1, name: "The Warrens", from: 1, to: 3, verb: "combat" },
  { id: 2, name: "Cisterns & Emberworks", from: 4, to: 6, verb: "hazard" },
  { id: 3, name: "The Overflow", from: 7, to: 9, verb: "darkness" }
];

// Last floor of each act — where its guardian sub-boss stands. [3, 6, 9].
export const ACT_CAP_FLOORS = ACTS.map((a) => a.to);

// The deepest floor of the body; descending its stairs reaches the boss syntax.
export const FINAL_FLOOR = ACTS[ACTS.length - 1].to;

export function actForFloor(floor) {
  return ACTS.find((a) => floor >= a.from && floor <= a.to) || ACTS[ACTS.length - 1];
}

// A guardian (act cap) floor — a beefed, mechanic-bearing foe blocks the stairs here.
export function isGuardianFloor(floor) {
  return ACT_CAP_FLOORS.includes(floor);
}

// Act III (The Overflow) is the darkness act — the final act cap (floor 9) is its guardian.
export function isOverflowFloor(floor) {
  return actForFloor(floor).verb === "darkness";
}
