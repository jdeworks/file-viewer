export const ACTION_NAME = "search_passage";
export const REQUIRED_ACTION = "2.search_passage";
export const ACHIEVEMENT_ID = "stage2.search_passage";
export const ACHIEVEMENT_TEXT = "the passage was marked.";
export const BTS_PATH = "/docs/bts/glyph_dungeon.bts";
export const CIPHER_PATH = "/docs/examples/metagame/stage2/cipher.txt";

export const bellMessages = {
  start: "tokens. not bits. different.",
  unlock: "there was something in the text that I wouldn't have found otherwise.",
  phase2: "it changed form. I waited.",
  phase3: "it changed again. faster now. I have to be faster.",
  defeated: "I parsed it correctly. the grammar held."
};

export const lockedHintLadder = [
  "the arena has structure. cross it blind and it will cost you.",
  "there is an easier way through. it is written down.",
  "cipher.txt knows the way.",
  "search cipher.txt for PASSAGE. mark PASSAGE:247, then return — the crossing gets a lot safer."
];

export const combatLines = {
  floorAdvance: [
    "floor grammar accepted.",
    "glyph shard recovered.",
    "a door becomes a sentence."
  ],
  // 2026-07-11 playtest fix: PASSAGE is a buff now, not a gate — a blind strike still lands, it
  // just costs a counter-hit back. "no route remains" is retired; see renderer.js's challengeBoss.
  lockedExchange: "the strike lands, but the pattern bites back.",
  unlocked: "north pillar active. a two-tile passage opens.",
  defeated: "the expression resolves to one meaning."
};
