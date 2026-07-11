export const ACTION_NAME = 'recursion_blueprint_read';
export const REQUIRED_ACTION = '4.recursion_blueprint_read';
export const ACHIEVEMENT_ID = 'stage4.recursion_blueprint_read';
export const ACHIEVEMENT_TEXT = 'I looked deeper.';
export const BTS_PATH = '/docs/bts/fractal_bastion.bts';
export const RECURSION_BLUEPRINT_PATH = '/docs/examples/metagame/stage4/towers/upgrades/tier3_blueprints/recursion_points.json';

export const bellMessages = {
  start: 'the path repeats at every scale.',
  unlock: 'the recursion points are no longer guesses.',
  // Shown once the blueprint is read but no tower yet covers a recursion point — teaches the
  // second step of the two-step gate so the ladder doesn't dead-end on a congratulation.
  needsCoverage: 'the points are mapped, but nothing holds them. place a tower so its range covers a marked recursion point, then fight.',
  covered: 'a tower anchors the repeating point.',
  defeated: 'the loop reached its own beginning and stopped.',
};

export const lockedHintLadder = [
  'the weak points are scattered and invisible — cover enough ground and you will find one eventually.',
  'the weak points are not on the surface of the tower list.',
  'follow the tower upgrade folders all the way down.',
  'open towers/upgrades/tier3_blueprints/recursion_points.json for exact coordinates and a damage bonus.',
];
