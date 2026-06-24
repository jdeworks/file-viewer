// Sokoban level-set registry. Sokoban is a FAMILY of level sets behind an in-game picker (the chosen
// set persists in localStorage). Microban ships today; each additional set is its own
// sokoban-<id>-levels.js / sokoban-<id>-solutions.js pair, registered here. `solutions` may be a
// shorter/empty array than `levels` — the Solve button degrades gracefully ("No stored solution").
// Every set's stored solutions are replayed by tests/sokoban-levels.test.mjs, so a broken solution
// (or a levels/solutions length mismatch beyond the pending budget) fails the build.
import { LEVELS as microbanLevels } from './sokoban-levels.js';
import { SOLUTIONS as microbanSolutions } from './sokoban-solutions.js';
import { LEVELS as mb2Levels } from './sokoban-microban2-levels.js';
import { SOLUTIONS as mb2Solutions } from './sokoban-microban2-solutions.js';
import { LEVELS as mb3Levels } from './sokoban-microban3-levels.js';
import { SOLUTIONS as mb3Solutions } from './sokoban-microban3-solutions.js';
import { LEVELS as mb4Levels } from './sokoban-microban4-levels.js';
import { SOLUTIONS as mb4Solutions } from './sokoban-microban4-solutions.js';

export const SETS = [
  { id: 'microban', name: 'Microban', levels: microbanLevels, solutions: microbanSolutions },
  { id: 'microban2', name: 'Microban II', levels: mb2Levels, solutions: mb2Solutions },
  { id: 'microban3', name: 'Microban III', levels: mb3Levels, solutions: mb3Solutions },
  { id: 'microban4', name: 'Microban IV', levels: mb4Levels, solutions: mb4Solutions },
];

export const DEFAULT_SET = 'microban';
export const getSet = (id) => SETS.find((s) => s.id === id) || SETS[0];
