// The THREE memory logs the boss un-cheat hinges on. The run's restoration key is split across three
// seed-derived chunks (state.memoryPair.pieces, KEY order) placed into three display sectors in a
// seed-shuffled order (state.memoryPair.slots) so reading any single log top-to-bottom gives the
// WRONG order. The chunks corrupt on a fixed schedule as the snapshots age:
//   pieces[0] (key part 1) — intact in v1, [missing] in v2 and v3   (lost between v1→v2)
//   pieces[1] (key part 2) — intact in v1 and v2, [missing] in v3   (lost between v2→v3)
//   pieces[2] (key part 3) — intact in all three                    (the survivor)
// To recover the key the player must do a real THREE-WAY diff: find which sector changed between
// which pair (and which never changed), then read those chunks in corruption order. The key is never
// stored as such — it lives only in the diff of the three logs.

const DISPLAY_SECTORS = ["02", "04", "06"]; // fixed visual order; each holds one (shuffled) chunk

function pieces(state) {
  return Array.isArray(state?.memoryPair?.pieces) ? state.memoryPair.pieces : ["", "", ""];
}

function slots(state) {
  const s = state?.memoryPair?.slots;
  return Array.isArray(s) && s.length === 3 ? s.map(Number) : [0, 1, 2];
}

// Is chunk `chunkIndex` still intact in version v (1/2/3)? Fixed corruption schedule (see header).
function presentIn(chunkIndex, v) {
  if (v === 1) return true;            // v1 backup: everything intact
  if (v === 2) return chunkIndex !== 0; // a is gone by v2
  return chunkIndex === 2;             // v3: only the survivor remains
}

// Build one version's text. Restoration sectors are listed in fixed display order; each shows its
// assigned chunk's value if still intact in this version, else [missing].
function memoryText(state, v, label, leakLine) {
  const id = state.memoryPair.runId;
  const p = pieces(state);
  const sl = slots(state); // sl[sectorIdx] = chunkIndex
  const body = [
    `MEMORY SNAPSHOT ${id} / v${v} (${label})`,
    "sector 01: retained visual boundary",
  ];
  DISPLAY_SECTORS.forEach((sec, i) => {
    const chunkIndex = sl[i];
    const value = presentIn(chunkIndex, v) ? p[chunkIndex] : "[missing]";
    body.push(`sector ${sec}: restoration chunk ${value}`);
  });
  body.push("sector 07: child process @ still moving");
  body.push(leakLine);
  return body.join("\n");
}

export function memoryV1Text(state) {
  return memoryText(state, 1, "backup", "sector 08: leak not yet visible");
}

export function memoryV2Text(state) {
  return memoryText(state, 2, "ageing", "sector 08: leak expanding");
}

export function memoryV3Text(state) {
  return memoryText(state, 3, "corrupted", "sector 08: leak critical");
}

// The restoration key = the three chunks concatenated in KEY order. Recovered by 3-way-diffing the
// logs: chunk lost v1→v2, then chunk lost v2→v3, then the chunk intact in v3.
export function diffKeyFromState(state) {
  return pieces(state).join("");
}
