// Biome bands (B1) — every floor band gets an identity (a name + a terrain accent), so descending
// feels like going *somewhere*, not just onto a bigger grid. The mechanical escalation is carried by
// hazards / behaviours / elites; this is the cheap identity layer — a data-attribute on the root
// swaps CSS vars (no redraw cost) and the HUD shows where you are.
export const BIOMES = [
  { id: "warrens", name: "The Warrens", maxFloor: 3 },
  { id: "cisterns", name: "Flooded Cisterns", maxFloor: 6 },
  { id: "emberworks", name: "Emberworks", maxFloor: 9 },
  { id: "overflow", name: "The Overflow", maxFloor: Infinity }
];

export function biomeForFloor(floor) {
  return BIOMES.find((b) => floor <= b.maxFloor) || BIOMES[BIOMES.length - 1];
}
