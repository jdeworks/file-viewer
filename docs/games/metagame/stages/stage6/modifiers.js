// modifiers.js — prestige (Protocol Version) as Ascension-style stacking RULE modifiers.
//
// Each Protocol Version adds ONE rule change (harder texture), stacked in order: version N applies
// the first N modifiers. This is on top of the existing per-version +HP / +starting-relic, so a
// higher version is a richer start AND a harsher ruleset. Each modifier just sets a run-level field
// that the relevant system reads (run.js economy/rest; renderer combat plumbing).

export const MODIFIERS = [
  {
    id: "lean-rewards",
    text: "Lean economy — handshake rewards are reduced by 25%.",
    apply: (r) => { r.handshakeMult = (r.handshakeMult ?? 1) * 0.75; }
  },
  {
    id: "stingy-rest",
    text: "Stingy rests — rest sites heal 10% less.",
    apply: (r) => { r.restHealMod = (r.restHealMod ?? 0) - 0.10; }
  },
  {
    id: "tight-window",
    text: "Tight windows — the Act-3 congestion cap is 1 lower.",
    apply: (r) => { r.windowCapMod = (r.windowCapMod ?? 0) - 1; }
  },
  {
    id: "meaner-elites",
    text: "Meaner elites — elites gain +24 HP.",
    apply: (r) => { r.eliteHpBonus = (r.eliteHpBonus ?? 0) + 24; }
  },
  {
    id: "tougher-boss",
    text: "Tougher negotiation — The Refused Connection has +30% phase HP.",
    apply: (r) => { r.bossHpMult = (r.bossHpMult ?? 1) * 1.3; }
  }
];

// Apply the first `version` modifiers to a run (deterministic; clamped to the available count).
export function applyModifiers(run, version) {
  const n = Math.max(0, Math.min(Number(version) || 0, MODIFIERS.length));
  run.modifiers = MODIFIERS.slice(0, n).map((m) => m.id);
  for (let i = 0; i < n; i++) MODIFIERS[i].apply(run);
  return run;
}
