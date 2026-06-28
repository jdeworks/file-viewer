// Stage 2 Round-4 depth additions: D3 shadow-step void ref, D4 Lights Out run modifier,
// E2 acid terrain pools, E3 wych-gas ceiling pockets. Deterministic — seeded RNG / pure logic only.
import { monsterTurn } from "../monsters.js";
import { buildFloor, step } from "../engine.js";
import { enterHazard, hazardIndex } from "../hazards.js";
import { igniteCell, tickFire } from "../fire.js";
import { applyStatus, hasStatus } from "../status.js";
import { runHeat, RUN_MODS } from "../data.js";
import { effectiveLight, DARK_RADIUS } from "../darkness.js";

let failed = 0;
const ok = (condition, message) => {
  console.log(`${condition ? "OK" : "FAIL"} ${message}`);
  if (!condition) failed += 1;
};
const near = (a, b) => Math.abs(a - b) < 1e-9;

// A single-row arena (floor between walls) for deterministic AI tests.
function arena(width = 12) {
  const top = "#".repeat(width);
  const mid = "#" + ".".repeat(width - 2) + "#";
  return { floor: 5, width, grid: [top, mid, top], monsters: [], weapons: [], potions: [], glyphs: [], hidden: [], seed: "t" };
}
function foe(over) {
  return { alive: true, x: 5, y: 1, hp: 20, maxHp: 20, atk: 10, name: "foe", glyph: "f", sight: 8, bucket: 0, chasing: false, dir: "left", statuses: {}, faction: 0, ...over };
}
function playerEnt(over) {
  return { hp: 80, maxHp: 80, def: 0, atk: 10, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, statuses: {}, inventory: {}, equipment: {}, affix: null, ...over };
}
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// ── D3 void ref: shadow-step out of the dark; a torch reveals + defangs it ────────────────────────
{
  // floor 7 (dark act), no torch → DARK ring rx6. A void ref at dx 8 is UNLIT but within range 9.
  const w = arena(22); w.floor = 7; w.pos = { x: 10, y: 1 };
  const vr = foe({ shadow: true, x: 18, y: 1, sight: 5, chasing: false });
  w.monsters = [vr];
  monsterTurn(w, { hp: 999, def: 0, atk: 5, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(man(vr, w.pos) === 1, "an unlit void ref shadow-steps to a cell beside @");
}
{
  // Same setup, but a lit torch floods the wide ring → the void ref is LIT → no blink, plain chase.
  const w = arena(22); w.floor = 7; w.torch = 20; w.pos = { x: 10, y: 1 };
  const vr = foe({ shadow: true, x: 18, y: 1, sight: 5, chasing: false });
  w.monsters = [vr];
  monsterTurn(w, { hp: 999, def: 0, atk: 5, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(vr.x === 17 && man(vr, w.pos) > 1, "a torch reveals the void ref and freezes its shadow-step — it just chases");
}
{
  // A void ref lurks (does NOT patrol into view) while unlit and beyond shadow range.
  const w = arena(40); w.floor = 7; w.pos = { x: 2, y: 1 };
  const vr = foe({ shadow: true, x: 30, y: 1, sight: 5, dir: "left" });
  w.monsters = [vr];
  monsterTurn(w, { hp: 999, def: 0, atk: 5, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(vr.x === 30, "an unlit void ref far from @ lurks in place (doesn't wander into the light)");
}
{
  // The void ref joins the spawn pool only in the Overflow act (minFloor 7) and carries its flag.
  let deep = false;
  for (let s = 0; s < 8 && !deep; s += 1) if (buildFloor("vr-deep" + s, 7).monsters.some((m) => m.shadow)) deep = true;
  ok(deep, "void refs spawn in the Overflow act (floor 7+)");
}

// ── D4 Lights Out run modifier ────────────────────────────────────────────────────────────────────
{
  ok(near(runHeat({ lights_out: true }), 1.35), "Lights Out is a +35% glyph multiplier (mastery tier)");
  ok(near(runHeat({ swarm: true, lights_out: true }), 1.60), "Lights Out stacks with other Heat mods");
  ok(near(runHeat({}), 1) && near(runHeat({ swarm: true, no_potions: true }), 1.5), "existing mods keep their +25% each");
  const lit = effectiveLight({ floor: 7, _lightsOutPenalty: 2 });
  ok(lit.rx === DARK_RADIUS.rx - 2 && lit.ry === Math.max(1, DARK_RADIUS.ry - 2), "Lights Out shaves the dark ring by 2 (clamped)");
  ok(effectiveLight({ floor: 7 }).rx === DARK_RADIUS.rx, "no penalty without the modifier");
  ok(buildFloor("lo-on", 7, { run: { lights_out: true } })._lightsOutPenalty === 2, "buildFloor wires _lightsOutPenalty from the run mod");
  ok(buildFloor("lo-off", 7)._lightsOutPenalty === 0, "no penalty on a normal run");
  const lo = RUN_MODS.find((m) => m.id === "lights_out");
  ok(lo.unlock({ bestFloor: 6 }) === false && lo.unlock({ bestFloor: 7 }) === true, "Lights Out unlocks only after reaching the Overflow");
}

// ── E2 acid terrain pools ─────────────────────────────────────────────────────────────────────────
{
  // Stepping in acid damages @ and applies `corroded` (the same matrix status the acid flask uses).
  const w = arena(); w.floor = 6;
  const p = playerEnt();
  const ev = { log: [], damageTaken: 0, died: false };
  enterHazard(w, p, "acid", ev);
  ok(p.hp < 80 && hasStatus(p, "corroded"), "an acid pool damages @ and corrodes the cursor");
}
{
  // A corroded cursor hits softer; Acid Resistance offsets the penalty.
  const dmgWith = (over) => {
    const w = buildFloor("acid-atk", 6);
    const t = w.monsters[0];
    t.alive = true; t.hp = 500; t.maxHp = 500; t.statuses = {};
    t.x = w.pos.x + 1; t.y = w.pos.y;
    w.grid[t.y] = w.grid[t.y].slice(0, t.x) + "." + w.grid[t.y].slice(t.x + 1);
    const p = playerEnt(over);
    const before = t.hp;
    step(w, p, "right");
    return before - t.hp;
  };
  const clean = dmgWith({ atk: 10 });
  const corroded = dmgWith({ atk: 10, statuses: { corroded: { turns: 3, power: 1 } } });
  const resisted = dmgWith({ atk: 10, acidResist: 2, statuses: { corroded: { turns: 3, power: 1 } } });
  ok(clean - corroded === 2, "a corroded cursor deals 2 less melee damage");
  ok(resisted === clean, "Acid Resistance fully negates the corrosion penalty");
}
{
  // Monsters refuse to step onto acid (same funnel rule as lava): acid walls off the only corridor.
  const w = arena(7);
  w.hazards = [{ x: 3, y: 1, type: "acid" }];
  w.hazardAt = hazardIndex(w);
  const m = foe({ x: 2, y: 1, chasing: false, dir: "right" });
  w.monsters = [m];
  w.pos = { x: 5, y: 1 };
  monsterTurn(w, { hp: 100, def: 0, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(m.x === 2, "a monster refuses to step onto an acid pool (funnel)");
}
{
  // Acid pools scatter from floor 5; not on the early floors.
  let deep = false;
  for (let s = 0; s < 8 && !deep; s += 1) if (buildFloor("acid-deep" + s, 6).hazards.some((h) => h.type === "acid")) deep = true;
  ok(deep, "acid pools appear on the late hazard floors (5+)");
  ok(!buildFloor("acid-shallow", 2).hazards.some((h) => h.type === "acid"), "no acid pools on the early floors");
}

// ── E3 wych-gas ceiling pockets ───────────────────────────────────────────────────────────────────
{
  // Flame cardinally adjacent to a gas pocket detonates it (a downward blast onto a foe beneath).
  const grid = ["########", "#......#", "########"];
  const w = { floor: 6, width: 8, grid, pos: { x: 7, y: 1 }, monsters: [foe({ x: 5, y: 1, hp: 30, name: "below" })], hazards: [], gasPockets: [{ x: 5, y: 1, blown: false }] };
  w.hazardAt = hazardIndex(w);
  igniteCell(w, 4, 1); // fire one cell left of the pocket
  const ev = { log: [], damageTaken: 0, died: false };
  tickFire(w, { hp: 100, maxHp: 100, statuses: {} }, ev);
  ok(ev.gasPocket > 0 && w.gasPockets[0].blown, "fire adjacent to a wych-gas pocket detonates it once");
  ok(w.monsters[0].hp < 30, "the wych-gas blast hits a foe beneath the pocket");
  ok(ev.blast && ev.blast.x === 5, "the detonation flags events.blast for the screen flash");
  // The pocket itself catches, so the chain can keep spreading from the pocket cell.
  ok(w.fires.some((f) => f.x === 5 && f.y === 1), "a blown pocket ignites its own cell (seeds further spread)");
}
{
  // A pocket NOT next to fire stays dormant.
  const grid = ["########", "#......#", "########"];
  const w = { floor: 6, width: 8, grid, pos: { x: 7, y: 1 }, monsters: [], hazards: [], gasPockets: [{ x: 5, y: 1, blown: false }] };
  w.hazardAt = hazardIndex(w);
  igniteCell(w, 2, 1); // far from the pocket
  tickFire(w, { hp: 100, maxHp: 100, statuses: {} }, { log: [], damageTaken: 0, died: false });
  ok(!w.gasPockets[0].blown, "a wych-gas pocket with no adjacent flame stays dormant");
}
{
  // Gas pockets are placed on the fire-heavy floors (5+) and absent earlier.
  ok(buildFloor("gas-deep", 6).gasPockets.length > 0, "wych-gas pockets scatter on deep fire floors (5+)");
  ok(buildFloor("gas-shallow", 2).gasPockets.length === 0, "no wych-gas pockets on the early floors");
}

console.log(failed ? `\nSTAGE 2 DEPTH FAILED (${failed})` : "\nSTAGE 2 DEPTH PASSED");
if (failed) process.exit(1);
