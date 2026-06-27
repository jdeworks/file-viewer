export const ACTION_NAME = 'diff_key_restored';
export const REQUIRED_ACTION = '3.diff_key_restored';
export const ACHIEVEMENT_ID = 'stage3.diff_key_restored';
export const ACHIEVEMENT_TEXT = 'I found the difference.';
export const BTS_PATH = '/docs/bts/memory_grid.bts';
export const MEMORY_V1_PATH = '/docs/examples/metagame/stage3/memory_v1.log';
export const MEMORY_V2_PATH = '/docs/examples/metagame/stage3/memory_v2.log';
export const MEMORY_V3_PATH = '/docs/examples/metagame/stage3/memory_v3.log';

export const bellMessages = {
  start: 'a memory is not a file until it survives being changed.',
  unlock: 'the difference restored the missing key.',
  defeated: 'the leak stopped widening.',
};

// Shown while the BODY is incomplete (corruption has not yet peaked at 8). The boss is unreachable —
// no diff key is even accepted — until the run has been played to maximum corruption.
export const bodyHint = 'the leak is still spreading. keep restoring snapshots until corruption peaks (8).';

export const lockedHintLadder = [
  'the grid remembers less every time you ask it.',
  'THREE snapshots disagree. one chunk corrupts between each pair.',
  'diff v1↔v2: the chunk lost there is the FIRST key piece. diff v2↔v3: the chunk lost there is the SECOND. the chunk still intact in v3 is the THIRD.',
  'compare memory_v1.log, memory_v2.log and memory_v3.log — read the three chunks in corruption order, then enter the restoration key.',
];
