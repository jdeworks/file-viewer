// Stage 2 escalation: status-effect substrate (A5), monster behaviour archetypes (A1) and elites (A3).
import { applyStatus, tickStatuses, hasStatus, skipsTurn } from "../status.js";
import { monsterTurn, detonate, hasLOS, pressureSpawn } from "../monsters.js";
import { buildFloor, step, exitDistanceField, stepToExit } from "../engine.js";
import { spawnMonster } from "../data.js";
import { enterHazard, hazardIndex } from "../hazards.js";
import { springTrap } from "../traps.js";
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

// ── A5 status substrate ─────────────────────────────────────────────────────────────────────────
const ent = { hp: 20, maxHp: 20, statuses: {} };
applyStatus(ent, "poison", 3, 2);
ok(hasStatus(ent, "poison"), "applyStatus sets poison");
const ev0 = { log: [], damageTaken: 0, died: false };
tickStatuses(ent, ev0, true);
ok(ent.hp === 18 && ev0.damageTaken === 2, "poison DoT subtracts power & routes to events");
applyStatus(ent, "poison", 1, 5);
ok(ent.statuses.poison.power === 5 && ent.statuses.poison.turns >= 1, "re-apply tops up power/duration, no unbounded stack");
const stunned = { statuses: {} };
applyStatus(stunned, "stun", 1);
ok(skipsTurn(stunned) === true, "stun makes an entity skip its turn");
const slow = { statuses: {} };
applyStatus(slow, "slow", 10);
ok(skipsTurn(slow) !== skipsTurn(slow), "slow acts every other turn (alternates)");

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

// ── A2 hazards: on-enter effects + monster avoidance ─────────────────────────────────────────────
{
  const w = arena();
  w.floor = 6;
  const player = { hp: 100, def: 0, statuses: {} };
  const ev = { log: [], damageTaken: 0, died: false };
  enterHazard(w, player, "lava", ev);
  ok(player.hp < 100 && hasStatus(player, "burn"), "lava deals damage and sets burn");
  const ev2 = { log: [], damageTaken: 0, died: false };
  enterHazard(w, { hp: 100, def: 0, statuses: {} }, "chasm", ev2);
  ok(ev2.descend === true && ev2.fell === true, "chasm triggers a fall to the next floor");
}
{
  // A monster won't step onto lava: block every route except a lava cell.
  const w = arena(7);
  w.hazards = [{ x: 3, y: 1, type: "lava" }];
  w.hazardAt = hazardIndex(w);
  const m = foe({ x: 2, y: 1, chasing: false, dir: "right" });
  w.monsters = [m];
  w.pos = { x: 5, y: 1 }; // player on the far floor cell; lava at x=3 walls off the single corridor
  monsterTurn(w, { hp: 100, def: 0, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(m.x === 2, "monster refuses to step onto a lava tile");
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

// ── B4 traps: spring once, alarm wakes foes ──────────────────────────────────────────────────────
{
  const w = arena();
  w.floor = 5;
  const player = { hp: 100, def: 0, statuses: {} };
  const dart = { x: 5, y: 1, type: "dart", sprung: false };
  const ev = { log: [], damageTaken: 0, died: false };
  springTrap(w, player, dart, ev);
  ok(player.hp < 100 && dart.sprung === true && ev.trap === "dart", "dart trap fires and marks itself sprung");
  const w2 = arena();
  w2.floor = 5;
  const sleeper = foe({ x: 3, y: 1, chasing: false });
  w2.monsters = [sleeper];
  w2.pos = { x: 5, y: 1 };
  springTrap(w2, { hp: 100, def: 0, statuses: {} }, { x: 5, y: 1, type: "alarm", sprung: false }, { log: [], damageTaken: 0, died: false });
  ok(sleeper.chasing === true, "alarm trap wakes nearby foes");
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

console.log(failed ? `\nSTAGE 2 COMBAT FAILED (${failed})` : "\nSTAGE 2 COMBAT PASSED");
if (failed) process.exit(1);
