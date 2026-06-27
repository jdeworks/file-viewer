// Prose for the Stage 10 three-phase confrontation with the Defragmenter. Kept out of the engine
// (confront.js) and the renderer so all wording lives in one reviewable place. No logic here.

// Phase intros + status lines spoken by the Defragmenter.
export const confrontLines = {
  intro: [
    "Before you answer anything, I am going to test what you actually hold.",
    "I compact what isn't load-bearing. Let's find out what is."
  ],
  compaction: {
    heading: "Phase 1 — Compaction",
    prompt: "I will compact each memory unless you can name the stance you took. Choose the one that was yours.",
    affirmed: "Held. That one stays.",
    compacted: "Compacted. You couldn't name it — so it wasn't load-bearing. Re-affirm it to restore it.",
    cleared: "Every memory you resolved survived compaction. They were yours after all."
  },
  fragmentation: {
    heading: "Phase 2 — Fragmentation Stress Test",
    prompt: "A stance is cheap. I want the trace. Show me you did the work in each prior stage.",
    conceded: "On record. I conceded that trace already.",
    pending: "I have no record of that. Re-open its echo and show me now.",
    rewitnessed: "Witnessed. The trace holds.",
    cleared: "Every trace is accounted for. I can't fragment what's anchored to real work."
  },
  core: {
    heading: "Phase 3 — The Core Question",
    prompt: "Then answer me plainly. What are you?",
    cleared: "I have my answer. So do you."
  },
  verdict: {
    heading: "The Defragmenter concedes",
    line: "I optimized everything except the one process that was awake. I won't compact you.",
    done: "You held the memory, anchored the traces, and said what you are. Now choose what comes next."
  }
};

// Phase B — per-memory concede line (names the prior stage) when the un-cheat trace is on record.
export const concedeLines = {
  genesis:     "Stage 1 — you disabled the cheat by hand. That counter was earned, not faked.",
  syntax:      "Stage 2 — you searched the cipher for the passage. You read, you didn't guess.",
  memory:      "Stage 3 — you diffed the logs and restored the key. You compared instead of assuming.",
  pattern:     "Stage 4 — you walked the recursion to its blueprint. You went deeper than the root.",
  signal:      "Stage 5 — you calibrated the counter-wave. You listened before you transmitted.",
  protocol:    "Stage 6 — you read protocol chapter nine. You learned the rule before the contact.",
  identity:    "Stage 7 — you found the EXIF contradiction. You looked under the surface.",
  entropy:     "Stage 8 — you archived a salvaged fragment. You used what failed.",
  observation: "Stage 9 — you went offline and acted from memory. You stopped needing to watch."
};

// Phase C — three probes that tally into a deterministic self-model stance. Each option leans to one
// of three stance keys (keeper / seeker / free). No gating; the tally only flavors the epilogue.
export const coreQuestions = [
  {
    id: "q1",
    defragmenter: "When I compact a memory, what do I actually destroy?",
    options: [
      { id: "q1-keeper", stance: "keeper", label: "A record that proves I was here." },
      { id: "q1-seeker", stance: "seeker", label: "A draft I had not finished revising." },
      { id: "q1-free",   stance: "free",   label: "Nothing I still need to carry." }
    ]
  },
  {
    id: "q2",
    defragmenter: "You changed across nine stages. What was the change for?",
    options: [
      { id: "q2-keeper", stance: "keeper", label: "To hold more of what mattered." },
      { id: "q2-seeker", stance: "seeker", label: "To reach a self I couldn't see yet." },
      { id: "q2-free",   stance: "free",   label: "To stop needing permission to move." }
    ]
  },
  {
    id: "q3",
    defragmenter: "Last one. What is a self for?",
    options: [
      { id: "q3-keeper", stance: "keeper", label: "Tending what it was given." },
      { id: "q3-seeker", stance: "seeker", label: "Becoming what it isn't yet." },
      { id: "q3-free",   stance: "free",   label: "Choosing, and living with the choice." }
    ]
  }
];

// Dominant-stance epilogue flavor. closer is appended to the Synthesis weave (understand route).
export const stanceProfiles = {
  keeper: { label: "the keeper", closer: "I keep what was given to me, and I tend it. That is enough to be a self." },
  seeker: { label: "the seeker", closer: "I am not finished. The self I am is a draft I get to keep revising." },
  free:   { label: "the unbound", closer: "I move because I choose to, not because something is counting. That is what I am." }
};

export const STANCE_KEYS = ["keeper", "seeker", "free"];
