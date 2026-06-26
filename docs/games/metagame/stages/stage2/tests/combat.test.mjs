// Stage 2 escalation: status-effect substrate (A5), monster behaviour archetypes (A1) and elites (A3).
import { applyStatus, tickStatuses, hasStatus, skipsTurn } from "../status.js";
import { monsterTurn, detonate, hasLOS } from "../monsters.js";
import { buildFloor, step } from "../engine.js";
import { spawnMonster } from "../data.js";
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

console.log(failed ? `\nSTAGE 2 COMBAT FAILED (${failed})` : "\nSTAGE 2 COMBAT PASSED");
if (failed) process.exit(1);
