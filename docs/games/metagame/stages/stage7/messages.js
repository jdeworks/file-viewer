export const ACTION_NAME = "exif_contradiction_found";
export const REQUIRED_ACTION = "7.exif_contradiction_found";
export const ACHIEVEMENT_ID = "stage7.exif_contradiction_found";
export const ACHIEVEMENT_TEXT = "I looked beyond the surface of the image.";
export const BTS_PATH = "/docs/bts/identity_arbiter.bts";
export const ENTITY_A_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_a_verification.png";
export const ENTITY_F_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_f_verification.png";
export const ENTITY_METADATA_SIDECAR_PATH = "/docs/examples/metagame/stage7/entity_metadata.json";

export const bellMessages = {
  start: "something presented itself. I had to decide.",
  unlock: "the image knew more than the image showed. the GPS was outside any layer.",
  wrongCommit: "incorrect. one of them was not what it appeared.",
  defeated: "I know which one. I chose. I was right."
};

export const lockedHintLadder = [
  "one of them looks exactly like the description. that does not mean it is real.",
  "the documents leave Entity A and Entity F tied.",
  "the photo shows something the document does not. the metadata holds the answer.",
  "open Entity F's image metadata and inspect GPSInfo, then commit to Entity A."
];

export const arbiterLines = {
  fContradicted: "Entity F contradicted: GPSInfo is outside every known entity layer.",
  stillChoose: "Entity F is eliminated. Judgment still requires selecting Entity A.",
  defeated: "The Name Collision resolves to Entity A."
};
