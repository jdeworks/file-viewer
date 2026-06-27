// The darkness verb (Act III — The Overflow). Shallow floors see the full camera; deeper bands
// shrink the sight radius (terrain fog, the original C4 behaviour). The Overflow act (floors 7-9)
// makes that fog LOAD-BEARING: the light radius collapses to a tight ring, monsters beyond it are
// HIDDEN, and the renderer keeps "last-seen ghosts" — a dim echo of each foe at the tile where you
// last saw it, until you re-sight it. The torch consumable is the light↔stealth tradeoff: it floods
// a wide radius for a stretch of steps, but its glare wakes foes from much farther (TORCH_AGGRO).
//
// Pure data + helpers; no DOM. lightRadius stays the terrain-fog baseline (and is re-exported by
// view.js for the unit test); effectiveLight layers the Overflow tightening + torch on top.

// Terrain-fog baseline by depth (rendering only — monster AI keeps its own LOS sight). null = full
// camera. ry < rx because monospace cells are ~2× taller than wide, so the lit area reads as a circle.
export function lightRadius(floor) {
  if (floor <= 3) return null;
  if (floor <= 6) return { rx: 13, ry: 7 };
  if (floor <= 9) return { rx: 9, ry: 5 };
  return { rx: 7, ry: 4 };
}

// First floor of the Overflow (darkness) act.
export const OVERFLOW_FLOOR = 7;
export function isDarkAct(floor) {
  return floor >= OVERFLOW_FLOOR;
}

// Overflow ring sizes. Torch OFF → a claustrophobic ring (spatial memory matters). Torch ON → a wide
// flood that out-reaches even the mid-floor fog.
export const DARK_RADIUS = { rx: 6, ry: 3 };
export const TORCH_RADIUS = { rx: 15, ry: 8 };
export const TORCH_STEPS = 28;   // how many player steps a torch stays lit
export const TORCH_AGGRO = 4;    // extra monster sight while a torch burns (the stealth cost)

// The radius actually used for rendering (terrain + which monsters are shown). In the Overflow act
// the torch state overrides the baseline; elsewhere it's the plain depth fog.
export function effectiveLight(world) {
  if (isDarkAct(world.floor)) return torchLit(world) ? TORCH_RADIUS : DARK_RADIUS;
  return lightRadius(world.floor);
}

export function torchLit(world) {
  return Number(world && world.torch) > 0;
}

// Monster sight bonus from a burning torch (only while in the dark act — a torch in daylight floors
// does nothing). Read by the monster AI so the glare really does draw foes in.
export function torchSightBonus(world) {
  return isDarkAct(world.floor) && torchLit(world) ? TORCH_AGGRO : 0;
}
