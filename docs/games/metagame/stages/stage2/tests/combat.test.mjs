// Stage 2 escalation: status-effect substrate (A5), monster behaviour archetypes (A1) and elites (A3).
import { applyStatus, tickStatuses, hasStatus, skipsTurn } from "../status.js";
import { monsterTurn, detonate, hasLOS, pressureSpawn } from "../monsters.js";
import { buildFloor, step, exitDistanceField, stepToExit } from "../engine.js";
import { spawnMonster, rollEntity } from "../data.js";
import { TORCH_STEPS } from "../darkness.js";
import { enterHazard, hazardIndex } from "../hazards.js";
import { springTrap } from "../traps.js";
import { useConsumable } from "../consumables.js";
import { affixDamage, applyHitAffix } from "../affixes.js";
import { runHeat } from "../data.js";
import { igniteCell, tickFire } from "../fire.js";
import { interact, elementStrike, applyElement, gasExplosion, BRITTLE_MULT, SHATTER_BONUS } from "../elements.js";
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

// ── B3 consumables: firebolt spends + burns; freeze locks; empty fizzles ──────────────────────────
{
  const w = arena(12);
  w.floor = 4;
  w.monsters = [foe({ x: 5, y: 1, hp: 30, name: "target" })];
  const player = { hp: 50, def: 0, statuses: {}, inventory: { firebolt: 1, freeze: 0 } };
  const ev = { log: [], damageTaken: 0, died: false };
  ok(useConsumable(w, player, "firebolt", ev) && w.monsters[0].hp < 30 && hasStatus(w.monsters[0], "burn"), "firebolt damages + burns the nearest foe and is spent");
  ok(player.inventory.firebolt === 0, "firebolt count decremented");
  ok(useConsumable(w, player, "freeze", { log: [], damageTaken: 0, died: false }) === false, "an empty consumable can't be used");
  const w2 = arena(12);
  const f2 = foe({ x: 3, y: 1, name: "icy" });
  w2.monsters = [f2];
  w2.pos = { x: 4, y: 1 };
  const p2 = { hp: 50, def: 0, statuses: {}, inventory: { freeze: 1 } };
  useConsumable(w2, p2, "freeze", { log: [], damageTaken: 0, died: false });
  ok(hasStatus(f2, "frozen"), "freeze locks nearby foes");
}

// ── C2 weapon affixes ────────────────────────────────────────────────────────────────────────────
{
  ok(affixDamage({ atk: 7, affix: "double" }) === 14, "double-strike doubles hit damage");
  const w = arena(7);
  const target = foe({ x: 2, y: 1, hp: 30 });
  w.monsters = [target];
  const vamp = { hp: 20, maxHp: 50, atk: 10, affix: "vampiric" };
  applyHitAffix(w, vamp, target, 10, { log: [] });
  ok(vamp.hp > 20, "vampiric heals the player on hit");
  const burner = { hp: 50, maxHp: 50, atk: 10, affix: "burning" };
  applyHitAffix(w, burner, target, 10, { log: [] });
  ok(hasStatus(target, "burn"), "burning affix sets burn on the struck foe");
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

// ── C3 run modifiers (Heat) ──────────────────────────────────────────────────────────────────────
{
  const base = buildFloor("heat-test", 4);
  const swarm = buildFloor("heat-test", 4, { run: { swarm: true } });
  ok(swarm.monsters.length > base.monsters.length, "Swarm modifier adds monsters");
  ok(buildFloor("heat-test", 4, { run: { no_potions: true } }).potions.length === 0, "Drought removes all floor potions");
  const storm = buildFloor("heat-test", 4, { run: { elite_storm: true } });
  ok(storm.monsters.filter((m) => m.elite).length > base.monsters.filter((m) => m.elite).length, "Elite Storm adds elites");
  ok(runHeat({}) === 1 && runHeat({ swarm: true, no_potions: true }) === 1.5, "each active modifier raises the glyph multiplier");
}

// ── C1 spreading fire: chains through spores, bounded by fuel, burns out ──────────────────────────
{
  const grid = ["##########", "#........#", "##########"];
  const w = { floor: 5, width: 10, grid, pos: { x: 9, y: 1 }, monsters: [], hazards: [] };
  for (let x = 2; x <= 7; x += 1) w.hazards.push({ x, y: 1, type: "spores" });
  w.hazardAt = hazardIndex(w);
  igniteCell(w, 2, 1);
  let peak = 0;
  for (let t = 0; t < 12; t += 1) { tickFire(w, { hp: 100, maxHp: 100, statuses: {} }, { log: [], damageTaken: 0, died: false }); peak = Math.max(peak, w.fires.length); }
  ok(peak > 1 && w.burned.length === 6, "fire chains across the spore field (all 6 cells burned)");
  ok(w.fires.length === 0, "fire burns out — it's fuel-bounded, not endless");

  const w2 = { floor: 5, width: 6, grid: ["######", "#....#", "######"], pos: { x: 5, y: 1 }, monsters: [], hazards: [] };
  w2.hazardAt = hazardIndex(w2);
  igniteCell(w2, 2, 1);
  for (let t = 0; t < 8; t += 1) tickFire(w2, { hp: 100, maxHp: 100, statuses: {} }, { log: [], damageTaken: 0, died: false });
  ok(w2.fires.length === 0, "fire never spreads across bare floor (no fuel)");
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

// ── Element interaction matrix (elements.js) ─────────────────────────────────────────────────────
{
  // The matrix is symmetric and only defines the real combos.
  ok(interact("fire", "gas") === "explode" && interact("gas", "fire") === "explode", "fire+gas → explode (order-independent)");
  ok(interact("fire", "frost") === "melt", "fire+frost → melt");
  ok(interact("acid", "frost") === "brittle", "acid+frost → brittle");
  ok(interact("fire", "fire") === null && interact("frost", "bogus") === null, "no interaction for same/unknown elements");
}
{
  // elementStrike: corroded foe is brittle (×1.4); frozen foe shatters (+60%); both stack higher.
  const plain = elementStrike({ statuses: {} }, 100);
  ok(plain.total === 100 && !plain.shattered, "a clean foe takes the raw hit");
  const corroded = { statuses: {} }; applyElement(corroded, "acid");
  ok(elementStrike(corroded, 100).total === Math.round(100 * BRITTLE_MULT), "acid → corroded foe takes amplified (brittle) damage");
  const frozen = { statuses: {} }; applyElement(frozen, "frost");
  const fr = elementStrike(frozen, 100);
  ok(fr.total === 100 + Math.round(100 * SHATTER_BONUS) && fr.shattered, "frost → frozen foe SHATTERS for bonus damage");
  ok(!frozen.statuses.frozen, "shatter consumes (thaws) the frozen status");
  const both = { statuses: {} }; applyElement(both, "acid"); applyElement(both, "frost");
  const bb = elementStrike(both, 100);
  ok(bb.total > Math.round(100 * BRITTLE_MULT) + Math.round(100 * SHATTER_BONUS) - 1 && bb.shattered, "acid+frost is the deadliest strike (brittle + bigger shatter)");
}
{
  // fire+gas explosion: igniting a spore cell next to a foe bursts it for AoE damage.
  const grid = ["########", "#......#", "########"];
  const w = { floor: 6, width: 8, grid, pos: { x: 7, y: 1 }, monsters: [foe({ x: 4, y: 1, hp: 8, name: "near" })], hazards: [] };
  for (let x = 2; x <= 5; x += 1) w.hazards.push({ x, y: 1, type: "spores" });
  w.hazardAt = hazardIndex(w);
  igniteCell(w, 2, 1);
  const ev = { log: [], damageTaken: 0, died: false };
  for (let t = 0; t < 8; t += 1) tickFire(w, { hp: 100, maxHp: 100, statuses: {} }, ev);
  ok(ev.gasExplode > 0, "fire reaching gas detonates the spore cloud (fire+gas → explode)");
  ok(!w.monsters[0].alive, "the gas explosion kills an adjacent foe");
}
{
  // Direct gasExplosion: player adjacent takes the burst, foes in radius 1 hurt.
  const w = { floor: 5, width: 8, monsters: [foe({ x: 3, y: 1, hp: 5 })], pos: { x: 3, y: 1 } };
  const player = { hp: 50, def: 0, statuses: {} };
  const ev = { log: [], damageTaken: 0, died: false };
  gasExplosion(w, 3, 1, player, ev);
  ok(player.hp < 50 && ev.damageTaken > 0 && !w.monsters[0].alive, "gasExplosion blasts the player + a co-located foe");
}
{
  // Acid consumable corrodes nearby foes; then a bump-attack lands amplified (engine integration).
  const w = buildFloor("acid-seed", 4);
  const target = w.monsters[0];
  target.alive = true; target.hp = 200; target.maxHp = 200; target.statuses = {};
  target.x = w.pos.x + 1; target.y = w.pos.y;
  w.grid[target.y] = w.grid[target.y].slice(0, target.x) + "." + w.grid[target.y].slice(target.x + 1);
  const player = { atk: 10, def: 0, hp: 50, maxHp: 50, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, statuses: {}, inventory: { acid: 1 } };
  ok(useConsumable(w, player, "acid", { log: [], damageTaken: 0, died: false }) && hasStatus(target, "corroded"), "acid flask corrodes a nearby foe and is spent");
  const hpBefore = target.hp;
  step(w, player, "right"); // bump the corroded foe — brittle amplifies the hit
  ok(hpBefore - target.hp === Math.round(10 * BRITTLE_MULT), "a corroded foe takes amplified bump-attack damage");
}
{
  // Freeze → shatter through the engine: freeze a foe, then a bump-attack shatters it.
  const w = buildFloor("shatter-seed", 4);
  const target = w.monsters[0];
  target.alive = true; target.hp = 200; target.maxHp = 200; target.statuses = {};
  target.x = w.pos.x + 1; target.y = w.pos.y;
  w.grid[target.y] = w.grid[target.y].slice(0, target.x) + "." + w.grid[target.y].slice(target.x + 1);
  const player = { atk: 10, def: 0, hp: 50, maxHp: 50, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, statuses: {}, inventory: { freeze: 1 } };
  useConsumable(w, player, "freeze", { log: [], damageTaken: 0, died: false });
  ok(hasStatus(target, "frozen"), "freeze rune freezes the adjacent foe");
  const hpBefore = target.hp;
  const ev = step(w, player, "right");
  ok(ev.shattered && hpBefore - target.hp > 10, "bumping a frozen foe SHATTERS it for bonus damage");
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
{
  // Void rift: snuffs the torch, deals shadow damage, and slows the player.
  const w = arena(); w.floor = 8; w.torch = 20;
  const player = { hp: 100, def: 0, statuses: {} };
  const ev = { log: [], damageTaken: 0, died: false };
  enterHazard(w, player, "rift", ev);
  ok(w.torch === 0 && ev.riftSnuff === true, "a void rift swallows a lit torch");
  ok(player.hp < 100 && hasStatus(player, "slow"), "a void rift deals shadow damage and slows you");
}
{
  // The rift only enters the hazard pool in the Overflow act (floor 7+).
  const shallow = buildFloor("rift-shallow", 4);
  ok(!shallow.hazards.some((h) => h.type === "rift"), "no rift hazard on mid-act floors");
  let deepRift = false;
  for (let s = 0; s < 8 && !deepRift; s += 1) if (buildFloor("rift-deep" + s, 8).hazards.some((h) => h.type === "rift")) deepRift = true;
  ok(deepRift, "void rifts appear in the Overflow act");
}

// ── Torch economy: Torchbearer upgrade + extended torch duration ─────────────────────────────────
{
  const base = rollEntity({});
  ok(!(base.inventory && base.inventory.torch), "no starting torch without the Torchbearer upgrade");
  const e = rollEntity({ torchcraft: 2 });
  ok(e.inventory.torch === 2 && e.torchSteps === 24, "Torchbearer stocks starting torches + extends torch steps");
  // The extended duration actually applies when a torch is struck.
  const w = arena(); w.floor = 7;
  const player = { hp: 50, def: 0, statuses: {}, torchSteps: 12, inventory: { torch: 1 } };
  useConsumable(w, player, "torch", { log: [], damageTaken: 0, died: false });
  ok(w.torch === TORCH_STEPS + 12, "Torchbearer makes each struck torch burn longer");
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

console.log(failed ? `\nSTAGE 2 COMBAT FAILED (${failed})` : "\nSTAGE 2 COMBAT PASSED");
if (failed) process.exit(1);
