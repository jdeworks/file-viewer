// Biome bands (B1) — every floor band gets an identity (a name + a terrain accent), so descending
// feels like going *somewhere*, not just onto a bigger grid. The mechanical escalation is carried by
// hazards / behaviours / elites; this is the cheap identity layer — a data-attribute on the root
// swaps CSS vars (no redraw cost) and the HUD shows where you are.
// Biome bands map onto the 3-act, 9-floor structure (acts.js): Act I = Warrens (1-3),
// Act II = Flooded Cisterns (4-5) then Emberworks at its guardian floor (6), Act III = Overflow (7-9).
export const BIOMES = [
  { id: "warrens", name: "The Warrens", maxFloor: 3 },
  { id: "cisterns", name: "Flooded Cisterns", maxFloor: 5 },
  { id: "emberworks", name: "Emberworks", maxFloor: 6 },
  { id: "overflow", name: "The Overflow", maxFloor: Infinity }
];

export function biomeForFloor(floor) {
  return BIOMES.find((b) => floor <= b.maxFloor) || BIOMES[BIOMES.length - 1];
}
