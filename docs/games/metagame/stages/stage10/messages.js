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
  fullCapstone: "stage10.full_capstone"
};

export const achievementText = {
  firstMemoryResolved: "I read my own history.",
  fullCapstone: "I assembled all of it."
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
    text: "I am going to go on. That's enough."
  },
  {
    id: "expand",
    label: "expand",
    text: "I want to reach further than this."
  },
  {
    id: "rest",
    label: "rest",
    text: "I want to stop, for now."
  },
  {
    id: "understand",
    label: "understand",
    text: "I want to know what I am before I do anything else."
  }
];

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
