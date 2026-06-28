// Stage 2 combat — hazards (A2), traps (B4), consumables (B3), spreading fire (C1), the element
// interaction matrix, the void rift, and E1 ice patches. Split from the former combat.test.mjs
// (kept byte-identical); pure mechanical move, no behaviour change.
import { hasStatus } from "../status.js";
import { monsterTurn } from "../monsters.js";
import { buildFloor, step } from "../engine.js";
import { enterHazard, hazardIndex, iceSlide } from "../hazards.js";
import { springTrap } from "../traps.js";
import { useConsumable } from "../consumables.js";
import { igniteCell, tickFire } from "../fire.js";
import { interact, elementStrike, applyElement, gasExplosion, BRITTLE_MULT, SHATTER_BONUS } from "../elements.js";

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

// ── E1 ice patches: wet→ice glaze, slide direction, slide-into-chasm kill, player slide ──────────
function playerEnt() {
  return { hp: 50, def: 0, atk: 5, statuses: {}, inventory: {}, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1, equipment: {} };
}

// iceSlide helper — pure positional outcome (wall slam / chasm kill / open glide).
{
  const w = arena(12);
  w.hazards = [{ x: 6, y: 1, type: "chasm" }];
  w.hazardAt = hazardIndex(w);
  ok(iceSlide(w, 5, 1, 1, 0).chasm === true, "iceSlide over a chasm reports a kill");
  const glide = iceSlide(w, 8, 1, 1, 0);
  ok(glide.x === 9 && !glide.chasm && !glide.wall, "iceSlide onto open floor glides one cell on");
  ok(iceSlide(w, 10, 1, 1, 0).wall === true, "iceSlide into a wall reports a slam");
}

// Freeze rune glazes a nearby wet cell into ice; the live hazard index reflects the mutation.
{
  const w = arena(12); // floor 5 (Act II)
  w.hazards = [{ x: 6, y: 1, type: "wet" }];
  w.hazardAt = hazardIndex(w);
  w.pos = { x: 5, y: 1 };
  const p = playerEnt(); p.inventory.freeze = 1;
  ok(useConsumable(w, p, "freeze", { log: [], damageTaken: 0, died: false }), "freeze rune is spent");
  ok(w.hazards[0].type === "ice", "freeze rune glazes a nearby wet cell into ice");
  ok(w.hazardAt(6, 1) === "ice", "hazard index reflects the live wet→ice mutation (no rebuild)");
}

// A monster that steps onto ice slides one extra cell — into a chasm it dies.
{
  const w = arena(12);
  w.hazards = [{ x: 5, y: 1, type: "ice" }, { x: 6, y: 1, type: "chasm" }];
  w.hazardAt = hazardIndex(w);
  w.pos = { x: 8, y: 1 }; // player to the right, so the foe greedily steps right onto the ice
  const m = foe({ x: 4, y: 1, sight: 10, chasing: true });
  w.monsters = [m];
  monsterTurn(w, { hp: 100, def: 0, atk: 5, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(!m.alive, "a foe that slides off ice into a chasm is killed");
}

// A monster that steps onto ice with open floor beyond slides one cell (not stuck on the ice).
{
  const w = arena(12);
  w.hazards = [{ x: 5, y: 1, type: "ice" }];
  w.hazardAt = hazardIndex(w);
  w.pos = { x: 8, y: 1 };
  const m = foe({ x: 4, y: 1, sight: 10, chasing: true });
  w.monsters = [m];
  monsterTurn(w, { hp: 100, def: 0, atk: 5, statuses: {} }, { log: [], damageTaken: 0, died: false }, () => true);
  ok(m.alive && m.x === 6, "a foe slides one extra cell past the ice in its heading");
}

// The player also slides on ice — and falls if the slide ends over a chasm.
{
  const w = arena(12);
  w.exit = { x: 0, y: 0 };
  w.hazards = [{ x: 6, y: 1, type: "ice" }];
  w.hazardAt = hazardIndex(w);
  w.pos = { x: 5, y: 1 };
  const ev = step(w, playerEnt(), "right");
  ok(w.pos.x === 7 && ev.slid, "@ stepping onto ice slides one extra cell");
}
{
  const w = arena(12);
  w.exit = { x: 0, y: 0 };
  w.hazards = [{ x: 6, y: 1, type: "ice" }, { x: 7, y: 1, type: "chasm" }];
  w.hazardAt = hazardIndex(w);
  w.pos = { x: 5, y: 1 };
  const ev = step(w, playerEnt(), "right");
  ok(ev.descend === true, "@ sliding off ice into a chasm falls to the next floor");
}

// E1 is an Act-II (floors 4-6) terrain feature: those floors get wet cells, others do not.
{
  const wetA = buildFloor("ice-floor", 5).hazards.some((h) => h.type === "wet");
  const wetI = buildFloor("ice-floor", 1).hazards.some((h) => h.type === "wet");
  ok(wetA, "Cisterns/Act-II floors scatter wet cells");
  ok(!wetI, "Act-I floors have no wet cells");
}


console.log(failed ? `\nSTAGE 2 COMBAT-HAZARDS FAILED (${failed})` : "\nSTAGE 2 COMBAT-HAZARDS PASSED");
if (failed) process.exit(1);
