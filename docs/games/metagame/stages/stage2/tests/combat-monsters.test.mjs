// Stage 2 combat — monster behaviour archetypes (A1), elites (A3), pressure (A4), freed ally (B2),
// branch/guardian (B5/B6), stairwell routing, faction infighting (C5), Overflow-act monsters and
// act-escalating guardians. Split from the former combat.test.mjs (kept byte-identical); no behaviour change.
import { hasStatus } from "../status.js";
import { monsterTurn, detonate, hasLOS, pressureSpawn } from "../monsters.js";
import { buildFloor, step, exitDistanceField, stepToExit } from "../engine.js";
import { spawnMonster } from "../data.js";
import { phantomTick } from "../overflow.js";
import { makeRng } from "../rng.js";

let failed = 0;
const ok = (condition, message) => {
  console.log(`${condition ? "OK" : "FAIL"} ${message}`);
  if (!condition) failed += 1;
};

// A tiny all-floor arena (one row of floor surrounded by wall) for deterministic behaviour tests.
function arena(width = 12) {
  const top = "#".repeat(width);
  const mid = "#" + ".".repeat(width - 2) + "#";
  const grid = [top, mid, top];
  return { floor: 5, width, grid, pos: { x: 1, y: 1 }, monsters: [], weapons: [], potions: [], glyphs: [], hidden: [], seed: "t" };
}
function foe(over) {
  return { alive: true, x: 5, y: 1, hp: 20, maxHp: 20, atk: 10, name: "foe", glyph: "f", sight: 8, bucket: 0, chasing: false, dir: "left", ...over };
}

// ── A1 spitter: fires down LOS + poisons instead of closing ──────────────────────────────────────
{
  const w = arena();
  w.monsters = [foe({ ranged: true, x: 6, y: 1, atk: 10 })];
  const player = { hp: 100, def: 0, statuses: {} };
  const ev = { log: [], damageTaken: 0, died: false };
  ok(hasLOS(w, 6, 1, 1, 1), "clear LOS across the arena row");
  monsterTurn(w, player, ev, () => true);
  ok(player.hp < 100 && hasStatus(player, "poison"), "spitter hits at range and applies poison");
  ok(w.monsters[0].x === 6, "spitter holds position to shoot (cooldown), doesn't close");
}

// ── A1 exploder: detonates an area blast on death ────────────────────────────────────────────────
{
  const w = arena();
  const x = foe({ explode: true, x: 2, y: 1, atk: 10 });
  w.monsters = [x];
  const player = { hp: 100, def: 0, statuses: {} };
  const ev = { log: [], damageTaken: 0, died: false };
  detonate(w, x, player, ev); // player at (1,1) is adjacent
  ok(player.hp < 100 && ev.blast, "adjacent player takes blast damage on detonation");
}

// ── A1 ambusher: disguised until @ steps within 2, then springs ──────────────────────────────────
{
  const w = arena(14);
  const amb = foe({ ambush: true, hidden: true, x: 9, y: 1 });
  w.monsters = [amb];
  const player = { hp: 100, def: 0, statuses: {} };
  w.pos = { x: 1, y: 1 }; // far away
  monsterTurn(w, player, { log: [], damageTaken: 0, died: false }, () => true);
  ok(amb.hidden === true && amb.x === 9, "ambusher stays disguised & still while @ is far");
  w.pos = { x: 8, y: 1 }; // adjacent-ish (dist 1)
  monsterTurn(w, player, { log: [], damageTaken: 0, died: false }, () => true);
  ok(amb.hidden === false && amb.chasing === true, "ambusher springs when @ steps close");
}

// ── A3 elites: depth-scaled, and drop a guaranteed cache on death ────────────────────────────────
{
  const rng = makeRng("elite-seed");
  let elites = 0;
  for (let i = 0; i < 400; i += 1) if (spawnMonster(rng, 5, i).elite) elites += 1;
  ok(elites > 0, "elites spawn at depth");
}
{
  const w = buildFloor("cacheseed", 4);
  const before = w.weapons.length;
  const e = w.monsters[0];
  e.elite = true; e.hp = 1; e.x = w.pos.x + 1; e.y = w.pos.y;
  w.grid[e.y] = w.grid[e.y].slice(0, e.x) + "." + w.grid[e.y].slice(e.x + 1);
  const player = { atk: 999, def: 0, hp: 50, maxHp: 50, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, statuses: {} };
  step(w, player, "right");
  ok(w.weapons.length > before, "killing an elite drops a guaranteed weapon cache");
}

// ── A4 lingering pressure: off-camera wanderers as the player lingers ────────────────────────────
{
  const w = buildFloor("pressure-test", 5);
  const before = w.monsters.length;
  let spawned = 0;
  for (let s = 0; s < 200; s += 1) { w.stepCount = s; spawned += pressureSpawn(w); }
  ok(spawned > 0, "lingering on a floor spawns wanderers");
  const off = w.monsters.slice(before).every((m) => Math.abs(m.x - w.pos.x) > 26 || Math.abs(m.y - w.pos.y) > 13);
  ok(off, "wanderers appear off-camera");
}

// ── B2 freed ally: hunts hostiles, never the player ──────────────────────────────────────────────
{
  const w = arena(10);
  const ally = foe({ x: 2, y: 1, ally: true, atk: 7, name: "ally", sight: 8 });
  const enemy = foe({ x: 4, y: 1, hp: 20, name: "enemy" });
  w.monsters = [ally, enemy];
  w.pos = { x: 8, y: 1 };
  const onlyAlly = (m) => m.ally; // isolate the ally so the enemy doesn't wander mid-assert
  // step 1: ally closes on the enemy (not the far player)
  monsterTurn(w, { hp: 100, def: 0, statuses: {} }, { log: [], damageTaken: 0, died: false }, onlyAlly);
  ok(ally.x === 3, "ally advances toward the hostile, not the player");
  // step 2: now adjacent → ally bites the enemy, player untouched
  const ev = { log: [], damageTaken: 0, died: false };
  monsterTurn(w, { hp: 100, def: 0, statuses: {} }, ev, onlyAlly);
  ok(enemy.hp < 20, "ally bites the hostile");
  ok(ev.damageTaken === 0, "the freed ally never damages the player");
}

// ── B5 branch stair + B6 guardian ────────────────────────────────────────────────────────────────
{
  let normal = null;
  let branch = null;
  for (let s = 0; s < 30 && !(normal && branch); s += 1) {
    const w = buildFloor("branch-find" + s, 3);
    if (w.branchExit && !branch) branch = buildFloor("branch-find" + s, 3, { branch: true });
    if (!normal) normal = buildFloor("branch-find" + s, 3);
  }
  ok(branch && branch.monsters.length > normal.monsters.length, "branch floor is deadlier than the normal floor");
}
{
  const w = buildFloor("guardian", 3);
  const g = w.monsters.find((m) => m.guardian);
  ok(g && (g.summon || g.split) && Math.abs(g.x - w.exit.x) + Math.abs(g.y - w.exit.y) <= 2, "a guardian with a mechanic posts by the stairs on band floors");
  ok(!buildFloor("guardian", 2).monsters.some((m) => m.guardian), "no guardian on a non-band floor");
}

// ── Stairwell Sense routing: BFS-from-stairs next step is the true shortest path ─────────────────
{
  const w = buildFloor("route-test", 3);
  w.monsters = [];
  const field = exitDistanceField(w);
  const startDist = field.dist[w.pos.y * w.width + w.pos.x];
  let steps = 0;
  let guard = startDist + 20;
  while (!(w.pos.x === w.exit.x && w.pos.y === w.exit.y) && guard-- > 0) {
    const n = stepToExit(w, field);
    step(w, { hp: 1e9, maxHp: 1e9, atk: 1, def: 0, statuses: {} }, n.dir);
    steps += 1;
  }
  ok(w.pos.x === w.exit.x && w.pos.y === w.exit.y && steps === startDist, "compass routes the exact shortest path to the stairs");
}

// ── C5 faction infighting: idle rivals trade blows; same camp doesn't ────────────────────────────
{
  const w = arena(7);
  w.pos = { x: 6, y: 1 }; // player on the wall → no LOS, foes idle
  const red = foe({ x: 2, y: 1, hp: 20, faction: 0, chasing: false, sight: 4 });
  const orange = foe({ x: 3, y: 1, hp: 20, faction: 1, chasing: false, sight: 4 });
  w.monsters = [red, orange];
  monsterTurn(w, { hp: 100, def: 0, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(red.hp < 20 && orange.hp < 20, "idle rival factions bite each other");
  const w2 = arena(7);
  w2.pos = { x: 6, y: 1 };
  const a = foe({ x: 2, y: 1, hp: 20, faction: 0, chasing: false, sight: 4 });
  const b = foe({ x: 3, y: 1, hp: 20, faction: 0, chasing: false, sight: 4 });
  w2.monsters = [a, b];
  monsterTurn(w2, { hp: 100, def: 0, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(a.hp === 20 && b.hp === 20, "same-faction foes don't infight");
}

// ── Overflow-act monsters (darkness) ──────────────────────────────────────────────────────────
{
  // Light eater FEEDS in true darkness (Overflow act, torch off) and STARVES once a torch burns.
  const w = arena(); w.floor = 7; // Overflow act
  w.monsters = [foe({ id: "lighteater", lighteater: true, x: 8, y: 1, hp: 26, maxHp: 26, atk: 7 })];
  const m = w.monsters[0];
  const player = { hp: 999, def: 0, statuses: {}, atk: 5 };
  for (let t = 0; t < 4; t += 1) monsterTurn(w, player, { log: [], damageTaken: 0, died: false }, () => true);
  ok(m.atk > 7 && m.maxHp > 26, "light eater grows in the dark (gains ATK + max HP)");
  const grownAtk = m.atk;
  w.torch = 20; // strike a torch — the glare starves it
  for (let t = 0; t < 3; t += 1) monsterTurn(w, player, { log: [], damageTaken: 0, died: false }, () => true);
  ok(m.atk < grownAtk, "torchlight withers the light eater back down");
}
{
  // Mirror copies the player's ATK (85%), so out-statting your own damage feeds it.
  const w = arena(); w.floor = 7;
  w.monsters = [foe({ id: "mirror", mirror: true, x: 8, y: 1, hp: 34, maxHp: 34, atk: 6 })];
  const m = w.monsters[0];
  const player = { hp: 999, def: 0, statuses: {}, atk: 40 };
  monsterTurn(w, player, { log: [], damageTaken: 0, died: false }, () => true);
  ok(m.atk === Math.round(40 * 0.85), "mirror copies 85% of the player's ATK");
}

// ── Overflow content: phantom foe + void rift hazard ─────────────────────────────────────────────
{
  // The phantom only joins the spawn pool in the deep Overflow act (floor 8+) and carries its flag.
  const shallow = makeRng("phantom-shallow");
  let earlyPhantom = false;
  for (let i = 0; i < 300; i += 1) if (spawnMonster(shallow, 6, i).phantom) earlyPhantom = true;
  ok(!earlyPhantom, "no phantom spawns before the deep Overflow (floor 8)");
  const deep = makeRng("phantom-deep");
  let phantoms = 0;
  for (let i = 0; i < 400; i += 1) if (spawnMonster(deep, 9, i).phantom) phantoms += 1;
  ok(phantoms > 0, "phantom spawns in the deep Overflow act");
}
{
  // Torchlight pins the phantom (slowed); true darkness leaves it free.
  const dark = arena(); dark.floor = 8; dark.torch = 0;
  const m1 = foe({ phantom: true, x: 5, y: 1, statuses: {} });
  phantomTick(dark, m1);
  ok(!hasStatus(m1, "slow"), "a phantom in true darkness is not slowed");
  const lit = arena(); lit.floor = 8; lit.torch = 12;
  const m2 = foe({ phantom: true, x: 5, y: 1, statuses: {} });
  phantomTick(lit, m2);
  ok(hasStatus(m2, "slow"), "torchlight pins the phantom (slowed)");
}

// ── Act-escalating guardians (combat → hazard → darkness) ────────────────────────────────────────
{
  const g3 = buildFloor("guard-esc", 3).monsters.find((m) => m.guardian);
  ok(g3 && (g3.summon || g3.split) && !g3.lighteater, "act-I guardian is a combat spike (summon/split)");
  const g6 = buildFloor("guard-esc", 6).monsters.find((m) => m.guardian);
  ok(g6 && g6.explode && g6.split, "act-II guardian is a hazard spike (explodes + splits)");
  const g9 = buildFloor("guard-esc", 9).monsters.find((m) => m.guardian);
  ok(g9 && g9.lighteater && g9.phantom, "act-III guardian is darkness-aware (feeds on dark + no ghost)");
}


console.log(failed ? `\nSTAGE 2 COMBAT-MONSTERS FAILED (${failed})` : "\nSTAGE 2 COMBAT-MONSTERS PASSED");
if (failed) process.exit(1);
