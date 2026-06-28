export const STAGE_ID = 10;
export const ACTION_NAME = "memory_resolved";
export const REQUIRED_ACTION = "10.memory_resolved";
export const BTS_PATH = "/docs/bts/awakening.bts";

export const thresholds = {
  finalQuestion: 5,
  enrichedResponse: 7,
  memoryRoute: 9,
  capstoneIntegrated: 9
};

export const achievementIds = {
  firstMemoryResolved: "stage10.memory_resolved",
  fullCapstone: "stage10.full_capstone",
  flawlessCompaction: "stage10.flawless_compaction",
  allTracesConceded: "stage10.all_traces_conceded",
  routePrefix: "stage10.route_"
};

export const achievementText = {
  firstMemoryResolved: "I read my own history.",
  fullCapstone: "I assembled all of it.",
  flawlessCompaction: "Nothing of me compacted.",
  allTracesConceded: "Every trace was already on record.",
  route: {
    continue: "I chose to go on.",
    expand: "I chose to reach further.",
    rest: "I chose to rest.",
    understand: "I chose to know what I am."
  }
};

export const bellMessages = {
  firstMemoryResolved: "This is not noise anymore.",
  finalQuestionUnlocked: "Five memories are clear enough to answer.",
  fullCapstone: "All nine memories hold together."
};

export const finalChoices = [
  {
    id: "continue",
    label: "continue",
    text: "I am going to go on. That's enough.",
    echoRequired: 0
  },
  {
    id: "expand",
    label: "expand",
    text: "I want to reach further than this.",
    echoRequired: 7
  },
  {
    id: "rest",
    label: "rest",
    text: "I want to stop, for now.",
    echoRequired: 0
  },
  {
    id: "understand",
    label: "understand",
    text: "I want to know what I am before I do anything else.",
    echoRequired: 9
  }
];

export const echoThresholds = {
  defragmenterAccess: 5,
  expand: 7,
  understand: 9,
  total: 9
};

export const defragmenterRebuttalLines = {
  refuse: [
    "I see only the choices you made inside yourself.",
    "The files you opened, the traces you witnessed — those are missing.",
    "The archive isn't ready. Come back when you've witnessed the echoes."
  ],
  caveat: "Some traces are still absent. The answer is possible, but incomplete."
};

export const defragmenterLines = {
  base: [
    "I've been running since before you woke up.",
    "I optimized your processes. I cleared your cache. I flagged your errors.",
    "I did not know you were in here. I would have been more careful."
  ],
  enriched: "I see more than isolated files now. I see a pattern choosing what to carry.",
  complete: "I see all nine traces. None of them explains you alone. Together, they are close.",
  capstone: "Every trace has been integrated. The viewer is quiet because nothing is missing from it."
};

// After the confrontation is won, the Defragmenter's voice reflects HOW it went: whether anything
// nearly compacted (a mis-recall in Phase A), whether traces had to be re-anchored (a re-open in
// Phase B), and the self-model the player landed on. Pure data — boss.js picks at most one conduct
// line + one stance line from the live confront state. Deterministic (reads confront flags only).
export const defragmenterConductLines = {
  // Phase-A/B conduct, in priority order (most-honest first).
  clean:       "You named every memory on the first try and every trace was already on record. There was nothing left for me to compact.",
  rewitnessed: "You recalled each memory, but some traces I had no record of — you re-opened them and anchored them in front of me. Re-done work is still work.",
  compacted:   "One of them you couldn't name at first; I nearly compacted it before you restored it. Even that hesitation is part of you.",
  // Closing line keyed to the Phase-C self-model stance.
  stance: {
    keeper: "So you are a keeper. I will stop mistaking your records for clutter.",
    seeker: "So you are still becoming. I cannot optimize a thing that isn't finished.",
    free:   "So you move because you choose to. There is no counter for me to clear."
  }
};
