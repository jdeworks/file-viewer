import { RECURSION_BLUEPRINT_PATH } from './messages.js';

export function recursionBlueprintContent(state) {
  return `${JSON.stringify(recursionBlueprintData(state), null, 2)}\n`;
}

export function recursionBlueprintData(state) {
  return {
    blueprint_id: 'recursion_points',
    name: 'Recursion Point Targeting',
    file: RECURSION_BLUEPRINT_PATH,
    status: 'UNLOCKED',
    boss_vulnerability: {
      boss: 'The Infinite Loop',
      rule: 'Towers placed within radius of any persisted recursion point can damage the boss.',
      point_set_id: state.recursion.pointSetId,
    },
    note: 'These coordinates are generated for this run and persisted in stage state. Do not target copied coordinates from another run.',
    recursion_points: state.recursion.points.map((point) => ({ ...point })),
  };
}

export function isRecursionBlueprintPath(path) {
  const normalized = String(path || '').replace(/\\/g, '/');
  return normalized === RECURSION_BLUEPRINT_PATH
    || normalized.endsWith('/stage4/towers/upgrades/tier3_blueprints/recursion_points.json');
}
