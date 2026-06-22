export const ACTION_NAME = "salvage_archived";
export const REQUIRED_ACTION = "8.salvage_archived";
export const OPTIONAL_EXTERNAL_ACTION = "8.external_debris_imported";
export const ACHIEVEMENT_ID = "stage8.salvage_archived";
export const ACHIEVEMENT_TEXT = "I sorted the wreckage.";
export const BTS_PATH = "/docs/bts/entropy_field.bts";
export const SALVAGE_REQUIRED = 72;

export const bellMessages = {
  start: "something is degrading. I noticed too late to stop it.",
  debris: "there was something left in the wreckage. it won't last long.",
  archive: "if I can't stop it, I can use what remains.",
  warning: "a cascade is coming. I don't know how large. I am saving what I can.",
  defeated: "I held. the universe didn't care. I did.",
  failed: "there was more. it was in the debris files. I didn't move them in time."
};

export const lockedHintLadder = [
  "the collapse is not waiting for a heroic moment.",
  "you keep defending the field. what it discards does not vanish — it settles somewhere outside the fight.",
  "the States from failed nodes cool into .sav debris in /entropy/debris/.",
  "move that debris into /entropy/active_archive/ — the Archive button or drag/drop — and bank enough before Heat Death."
];

export const btsSummary = [
  "Stage 8 uses internal drag and drop because OS file dragging behaves differently across browsers, touch devices, and assistive technology.",
  "The critical lesson is still the file action: a generated .sav moves from debris into an active archive before decay.",
  "External import can exist as a bonus, but Heat Death is balanced around the internal archive path and its accessible fallback."
];
