// metagame-playtime.mjs — REAL per-stage playtime analysis (no human guessing). Imports the actual
// pure game modules and computes:
//   • engine-forced wall-clock (exact, from tick/rotation math)   — stages 4, 5, 9
//   • required interaction count (exact, the clicks a run demands) — all stages
//   • reading load (exact word count ÷ a stated WPM)              — stages 7, 10
// Bodies only (no boss). A bot solves instantly, so we measure what the GAME forces, not solver speed.
//
// Run: node scripts/metagame-playtime.mjs

const WPM = 230;                 // adult silent-reading speed (stated assumption; the only non-exact input)
const CLICK_S = 1.5;            // seconds of deliberation per required interaction (stated assumption)
const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
const wordsOf = (...strs) => strs.join(" ").trim().split(/\s+/).filter(Boolean).length;

const rows = [];
const note = [];

// ── Stage 4 — Fractal Bastion (tower defense): spawn cadence + last-enemy traversal, per wave ───────
{
  const { waveComposition, SPAWN_INTERVAL_MS, WAVE_GAP_MS, FINAL_WAVE } = await import("../docs/games/metagame/stages/stage4/waves.js");
  const { ENEMY_TYPES } = await import("../docs/games/metagame/stages/stage4/enemies.js");
  const { buildPath, waveGroupDepth } = await import("../docs/games/metagame/stages/stage4/lsystem.js");

  // Floor = you can't clear a wave before all its enemies spawn (last spawns at (n-1)*interval),
  // then it must leave the field. With effective towers it dies ~immediately, so floor ≈ spawn + gap.
  // The traversal tail (last enemy walking the whole path uncontested) is the worst case if towers
  // underperform — reported separately, NOT added to the floor.
  let floorMs = 0;
  let tailMs = 0;
  let totalEnemies = 0;
  for (let w = 1; w < FINAL_WAVE; w++) {          // waves 1..30 (31 = boss, excluded)
    const comp = waveComposition(w, "x");
    const n = comp.enemies.reduce((s, e) => s + e.count, 0);
    totalEnemies += n;
    const tiles = buildPath("x", waveGroupDepth(w)).tiles;
    let pathCells = 0; for (let i = 0; i < tiles.length - 1; i++) pathCells += Math.abs(tiles[i + 1].x - tiles[i].x) + Math.abs(tiles[i + 1].y - tiles[i].y);
    const CELL_SPEED = 8; // must match engine.js moveEnemies (cell-normalized enemy pace)
    const slowest = Math.min(...comp.enemies.map((e) => ENEMY_TYPES[e.type]?.speed || 1));
    floorMs += Math.max(0, n - 1) * SPAWN_INTERVAL_MS + WAVE_GAP_MS;
    tailMs += (pathCells / (slowest * CELL_SPEED)) * 1000; // residual cell-traversal of the last enemy if never killed
  }
  rows.push({ stage: "4 Fractal Bastion", body: "30 waves", forced: fmt(floorMs / 1000), interactions: "tower placements (open)", reading: "—",
    realistic: `${fmt(floorMs / 1000)} – ${fmt((floorMs + tailMs) / 1000)}`, kind: "engine-timed" });
  note.push(`Stage 4: ${totalEnemies} enemies / 30 waves. Floor = spawn cadence (${SPAWN_INTERVAL_MS / 1000}s) + ${WAVE_GAP_MS / 1000}s placement gap. Upper bound adds full-path traversal tails (${fmt(tailMs / 1000)}) if towers kill nothing.`);
}

// ── Stage 5 — Signal Racer: exact Σ(tickCount × tickMs) over rounds 1–6 ────────────────────────────
{
  const { ROUNDS } = await import("../docs/games/metagame/stages/stage5/rounds.js");
  const body = ROUNDS.filter((r) => r.id < 7);
  const perRound = body.map((r) => (r.tickCount * r.tickMs) / 1000);
  const sum = perRound.reduce((a, b) => a + b, 0);
  rows.push({ stage: "5 Signal Racer", body: "6 rounds", forced: fmt(sum), interactions: "lane switches (continuous)", reading: "—",
    realistic: `${fmt(sum)} (1st-try) · ${fmt(sum * 2.5)} (w/ retries)`, kind: "engine-timed" });
  note.push(`Stage 5: per-round forced time = [${perRound.map((s) => Math.round(s) + "s").join(", ")}]; total ${Math.round(sum)}s clean. Integrity loss forces full-round replays (×2–4 realistic).`);
}

// ── Stage 9 — Observer State: rotation period + earliest-solve per sublevel (12–17) ────────────────
{
  const { levelConfig, rotSpeedFor, solveElapsed, sublevelSeed } = await import("../docs/games/metagame/stages/stage9/game.js");
  let minSolve = 0;
  const lines = [];
  for (let lvl = 12; lvl <= 17; lvl++) {
    const seed = sublevelSeed(lvl);
    const speed = rotSpeedFor(seed, lvl);
    const period = 360 / speed;                 // seconds per full rotation
    const solveS = solveElapsed(seed, lvl) / 1000; // earliest moment the gap is at the top
    minSolve += solveS;
    lines.push(`L${lvl} b${levelConfig(lvl).band}: ${period.toFixed(1)}s/rev, 1st-window ${solveS.toFixed(1)}s`);
  }
  // realistic: a player watches ~2 revolutions to read the timing, then crosses, per sublevel
  const watchS = [...Array(6)].reduce((a, _, i) => a + 2 * (360 / rotSpeedFor(sublevelSeed(12 + i), 12 + i)), 0);
  rows.push({ stage: "9 Observer State", body: "6 sublevels (12–17)", forced: fmt(minSolve), interactions: "OBSERVE/CROSS per level", reading: "—",
    realistic: `${fmt(minSolve)} (perfect) · ${fmt(minSolve + watchS)}+ (learning)`, kind: "engine-timed" });
  note.push(`Stage 9: ${lines.join(" | ")}. 'Perfect' = cross on the first window; 'learning' adds ~2 revolutions watched per sublevel.`);
}

// ── Stage 7 — Identity Arbiter: interaction count + reading load (SS1–SS4, no boss) ────────────────
{
  const { entityFields, ambientFacts, entityFEventLog, metadataRows, SCAN_ENTITIES } = await import("../docs/games/metagame/stages/stage7/content.js");
  // required interactions: 4 flags (SS1) + 1 diff (SS2) + 1 timeline mark (SS3) + 1 anchor open (SS4)
  const interactions = SCAN_ENTITIES.length + 1 + 1 + 1;
  // reading: ambient facts + all scanned entity field labels/values + F/A dossier rows + the event log
  let words = wordsOf(...ambientFacts);
  for (const id of SCAN_ENTITIES) for (const f of entityFields[id]) words += wordsOf(f.label, f.value, f.reason || "");
  for (const [f, v] of [...metadataRows.A, ...metadataRows.F]) words += wordsOf(f, v);
  for (const e of entityFEventLog) words += wordsOf(e.cycle, e.event, e.reason || "");
  const readS = (words / WPM) * 60;
  const clickS = interactions * CLICK_S;
  rows.push({ stage: "7 Identity Arbiter", body: "SS1–SS4", forced: "—", interactions: String(interactions), reading: `${words}w ≈ ${fmt(readS)}`,
    realistic: fmt(readS + clickS), kind: "read+click" });
  note.push(`Stage 7: ${interactions} required interactions + ~${words} words of evidence prose. Reading-paced, not engine-paced.`);
}

// ── Stage 10 — Awakening: interaction count + reading load (9 memories, no final-choice = "boss") ──
{
  const { memories } = await import("../docs/games/metagame/stages/stage10/content.js");
  // required interactions per memory: read + resolve + open-echo + integrate (+8 Next steps between)
  const interactions = memories.length * 4 + (memories.length - 1);
  let words = 0;
  for (const m of memories) {
    words += wordsOf(m.prompt, m.unreadText, m.readText, m.resolvedText, m.integratedText, m.echo);
    words += Object.values(m.reflections).reduce((a, r) => a + wordsOf(r), 0);
  }
  const readS = (words / WPM) * 60;
  const clickS = interactions * CLICK_S;
  rows.push({ stage: "10 Awakening", body: "9 memories", forced: "—", interactions: String(interactions), reading: `${words}w ≈ ${fmt(readS)}`,
    realistic: fmt(readS + clickS), kind: "read+click" });
  note.push(`Stage 10: ${interactions} required interactions (incl. 9 echo file-opens) + ~${words} words. Reading-paced finale.`);
}

// ── render ─────────────────────────────────────────────────────────────────────────────────────────
console.log("\nMETAGAME — REAL playtime per stage BODY (boss excluded)\n");
console.log(`  Assumptions (stated, not measured): reading ${WPM} wpm · ${CLICK_S}s per required click.\n`);
const pad = (s, n) => String(s).padEnd(n);
console.log("  " + pad("Stage", 20) + pad("Body", 22) + pad("Forced", 12) + pad("Reading", 16) + "Realistic body");
console.log("  " + "-".repeat(86));
for (const r of rows) {
  console.log("  " + pad(r.stage, 20) + pad(r.body, 22) + pad(r.forced, 12) + pad(r.reading, 16) + r.realistic);
}
console.log("\n  Stages 8 (cycle/click survival) is interaction-driven with no forced clock — omitted from the timed table.\n");
console.log("  Notes:");
for (const n of note) console.log("   • " + n);
console.log("");
