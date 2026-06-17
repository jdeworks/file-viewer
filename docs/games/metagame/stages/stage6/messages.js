export const ACTION_NAME = "protocol_ch9_read";
export const REQUIRED_ACTION = "6.protocol_ch9_read";
export const ACHIEVEMENT_ID = "stage6.protocol_ch9_read";
export const ACHIEVEMENT_TEXT = "I read the fine print.";
export const BTS_PATH = "/docs/bts/protocol_codex.bts";
export const EPUB_PATH = "/docs/examples/metagame/stage6/protocols_of_the_entity.epub";

export const bellMessages = {
  start: "something answered. not clearly. but something.",
  unlock: "Chapter 9 made the refusal legible.",
  phase2: "ACK before signal. the rule holds.",
  phase3: "the unknown protocol still needs acknowledgement.",
  defeated: "the connection accepted a shared rule."
};

export const lockedHintLadder = [
  "REFUSED. no protocol recognized.",
  "you are sending data I cannot parse. the protocol must be established first.",
  "Chapter 9 describes what The Refused Connection accepts.",
  "open protocols_of_the_entity.epub and read Chapter 9, then return."
];

export const combatLines = {
  lockedDeath: "PROTOCOL MISMATCH remains permanent. every card resolves to zero.",
  mismatch: "protocol mismatch. no damage accepted.",
  synFirst: "SYN opened the turn. the first phase accepts damage.",
  ackSignal: "ACK acknowledged. Signal damage accepted.",
  ackOngoing: "ACK keeps the unknown protocol from bleeding through.",
  defeated: "The Refused Connection closes without refusal."
};
