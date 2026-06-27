// The two memory logs the boss un-cheat hinges on. v1 (the intact backup) carries the run's three
// restoration chunks; v2 (corrupted) has them stripped to [missing]. The chunks are SEED-DERIVED
// (state.memoryPair.pieces), so the restoration key changes every run and lives ONLY in the diff —
// the player must open/compare the two files in the real viewer to recover it.

function pieces(state) {
  return Array.isArray(state?.memoryPair?.pieces) ? state.memoryPair.pieces : ["", "", ""];
}

export function memoryV1Text(state) {
  const id = state.memoryPair.runId;
  const [a, b, c] = pieces(state);
  return [
    `MEMORY SNAPSHOT ${id} / v1 (backup)`,
    "sector 01: retained visual boundary",
    `sector 02: restoration chunk ${a}`,
    "sector 03: child process @ still moving",
    `sector 04: restoration chunk ${b}`,
    "sector 05: registers stable",
    `sector 06: restoration chunk ${c}`,
    "sector 07: leak not yet visible"
  ].join("\n");
}

export function memoryV2Text(state) {
  const id = state.memoryPair.runId;
  return [
    `MEMORY SNAPSHOT ${id} / v2 (corrupted)`,
    "sector 01: retained visual boundary",
    "sector 02: restoration chunk [missing]",
    "sector 03: child process @ still moving",
    "sector 04: restoration chunk [missing]",
    "sector 05: registers unstable",
    "sector 06: restoration chunk [missing]",
    "sector 07: leak expanding"
  ].join("\n");
}

// The restoration key = the three chunks concatenated, in order. Recovered by diffing v1 vs v2.
export function diffKeyFromState(state) {
  return pieces(state).join("");
}
