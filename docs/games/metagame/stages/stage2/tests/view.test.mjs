// Stage 2 flair pass: red ASCII HP bars, depth-scaled maps (fixed camera viewport), and the
// events.attack payload the renderer turns into the @/foe clash animation.
import { hpBar, lightRadius } from "../view.js";
import { buildFloor, step } from "../engine.js";

let failed = 0;
const ok = (condition, message) => {
  console.log(`${condition ? "OK" : "FAIL"} ${message}`);
  if (!condition) failed += 1;
};

// hpBar maps health % to a width-N bar: '#' kept, '.' lost (#####, ####., ##...).
ok(hpBar(30, 30, 5).filled === 5, "full HP -> 5 filled");
ok(hpBar(24, 30, 5).filled === 4, "80% -> 4 filled (####.)");
ok(hpBar(12, 30, 5).filled === 2, "40% -> 2 filled (##...)");
ok(hpBar(1, 30, 5).filled === 1, "alive sliver never reads empty");
ok(hpBar(0, 30, 5).filled === 0, "dead -> 0 filled");
ok(hpBar(50, 100, 10).empty === 5, "wide bar tracks empty count");

// Maps grow with depth while the viewport stays fixed, so deeper floors are explored in chunks.
const f1 = buildFloor("seed", 1);
const f5 = buildFloor("seed", 5);
ok(f5.width > f1.width && f5.grid.length > f1.grid.length, "map is bigger at depth");
ok(f5.width >= 90 && f5.grid.length >= 45, "floor 5 dwarfs the 48x22 camera viewport");

// A bump-attack records events.attack { foeIndex, killed } so view.js can lunge @ and the foe.
const world = buildFloor("seed", 1);
const foe = world.monsters[0];
foe.hp = 1;
foe.x = world.pos.x + 1;
foe.y = world.pos.y;
world.grid[foe.y] = world.grid[foe.y].slice(0, foe.x) + "." + world.grid[foe.y].slice(foe.x + 1);
const player = { atk: 99, def: 0, hp: 30, maxHp: 30, level: 1, xp: 0, glyphsThisRun: 0, glyphMult: 1 };
const ev = step(world, player, "right");
ok(ev.attack && ev.attack.foeIndex === 0 && ev.attack.killed === true, "kill emits events.attack {foeIndex, killed}");
ok(ev.killed === true, "foe is marked killed");

// C4 darkness: shallow floors see the full camera; deeper bands shrink the sight radius.
ok(lightRadius(1) === null && lightRadius(3) === null, "floors 1-3 have no darkness (full camera)");
ok(lightRadius(5).rx === 13 && lightRadius(8).rx === 9 && lightRadius(11).rx === 7, "sight radius shrinks with depth");
ok(lightRadius(11).ry < lightRadius(11).rx, "vertical radius is tighter (cells are taller than wide)");

console.log(failed ? `\nSTAGE 2 VIEW FAILED (${failed})` : "\nSTAGE 2 VIEW PASSED");
if (failed) process.exit(1);
