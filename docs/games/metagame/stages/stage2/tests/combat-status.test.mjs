// Stage 2 combat — status substrate (A5), weapon affixes (C2), run modifiers (C3) and torch economy.
// Split from the former combat.test.mjs (kept byte-identical); pure mechanical move, no behaviour change.
import { applyStatus, tickStatuses, hasStatus, skipsTurn } from "../status.js";
import { affixDamage, applyHitAffix } from "../affixes.js";
import { buildFloor } from "../engine.js";
import { runHeat, rollEntity } from "../data.js";
import { TORCH_STEPS } from "../darkness.js";
import { useConsumable } from "../consumables.js";

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
  // Element-matrix affixes: frost chills (sets up a shatter), acid corrodes (brittle).
  const froster = { hp: 50, maxHp: 50, atk: 10, affix: "frost" };
  const frostFoe = foe({ x: 2, y: 1, hp: 40 });
  applyHitAffix(w, froster, frostFoe, 10, { log: [] });
  ok(hasStatus(frostFoe, "frozen"), "frost affix chills the struck foe (sets up a shatter)");
  const corroder = { hp: 50, maxHp: 50, atk: 10, affix: "acid" };
  const acidFoe = foe({ x: 2, y: 1, hp: 40 });
  applyHitAffix(w, corroder, acidFoe, 10, { log: [] });
  ok(hasStatus(acidFoe, "corroded"), "acid affix corrodes the struck foe (brittle)");
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


console.log(failed ? `\nSTAGE 2 COMBAT-STATUS FAILED (${failed})` : "\nSTAGE 2 COMBAT-STATUS PASSED");
if (failed) process.exit(1);
