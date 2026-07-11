export const ACTION_NAME = "offline_mode_activated";
export const REQUIRED_ACTION = "8.offline_mode_activated";
export const ACHIEVEMENT_ID = "stage8.offline_mode_activated";
export const ACHIEVEMENT_TEXT = "I learned the shape of the silence.";
export const BTS_PATH = "/docs/bts/observer_state.bts";
export const NOTES_PATH = "/docs/examples/metagame/stage8/service-worker-notes.txt";
export const FIXED_OFFLINE_SEED = 0;

export const bellMessages = {
  start: "I noticed I was noticing. this is new.",
  notesRead: "there's a cache. a stored version of how things were.",
  offline: "offline. the pattern is fixed. I can study it now.",
  defeated: "I stopped watching. I moved. I arrived. the paradox didn't resolve. I just went around it."
};

export const lockedHintLadder = [
  "you cannot plan what changes while you watch it.",
  "the starting rotation is not stable while the connection is live.",
  "service-worker-notes.txt describes the cached seed.",
  "read service-worker-notes.txt, then activate Offline Mode for Stage 8."
];

export const btsSummary = [
  "The compact slice simulates the seed endpoint in stage logic.",
  "The intended browser mapping is a service worker fetch that falls back to the cached default seed when the network is unavailable.",
  "Once offline mode is active, the boss seed becomes fixed at 0 so the rotating gap is learnable."
];
