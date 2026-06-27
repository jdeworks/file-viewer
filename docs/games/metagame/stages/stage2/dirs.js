// The four cardinal moves, shared by the engine (player), the monster AI and pathfinding.
export const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};
export const DIR_LIST = ["up", "down", "left", "right"];
