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
  "the arena has structure. you cannot cross a pattern without understanding it.",
  "there is a passage. it is written down.",
  "cipher.txt knows the way.",
  "search cipher.txt for PASSAGE. mark PASSAGE:247, then return."
];

export const combatLines = {
  floorAdvance: [
    "floor grammar accepted.",
    "glyph shard recovered.",
    "a door becomes a sentence."
  ],
  lockedDeath: "the pattern closes. no route remains.",
  unlocked: "north pillar active. a two-tile passage opens.",
  defeated: "the expression resolves to one meaning."
};
