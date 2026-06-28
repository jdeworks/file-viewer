// Stairwell Sense — L2 route reconstruction + the two-tier shop cost + the L2 trail gate.
import { buildFloor, exitDistanceField, reconstructRoute } from "../engine.js";
import { upgradeCost, SHOP_UPGRADES, stairTrailEnabled } from "../data.js";

let failed = 0;
const ok = (condition, message) => {
  console.log(`${condition ? "OK" : "FAIL"} ${message}`);
  if (!condition) failed += 1;
};

// Route reconstruction yields a connected @→stairs path on a known seed: every consecutive cell is a
// 4-neighbour step onto floor (never a wall), starting on @ and ending on the stairs, distance-to-exit
// strictly decreasing the whole way.
const world = buildFloor("seed", 2);
const field = exitDistanceField(world);
const route = reconstructRoute(world, field);
const W = world.width;
ok(route.length >= 2, "route spans at least two cells (@ is not already on the stairs)");
ok(route[0].x === world.pos.x && route[0].y === world.pos.y, "route starts on @");
const last = route[route.length - 1];
ok(last.x === world.exit.x && last.y === world.exit.y, "route ends on the stairs >");
let connected = true;
let strictlyDecreasing = true;
for (let i = 1; i < route.length; i += 1) {
  const a = route[i - 1];
  const b = route[i];
  const manhattan = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  if (manhattan !== 1) connected = false;
  if (world.grid[b.y][b.x] === "#") connected = false;
  if (field.dist[b.y * W + b.x] >= field.dist[a.y * W + a.x]) strictlyDecreasing = false;
}
ok(connected, "every step is a 4-neighbour move onto floor (a connected path)");
ok(strictlyDecreasing, "distance-to-exit strictly decreases along the route");

// Two-level cost: base 1000 * 1.5^level → L1 buy = 1000, L2 buy = 1500.
ok(upgradeCost("compass", 0) === 1000, "Stairwell Sense L1 costs 1000");
ok(upgradeCost("compass", 1) === 1500, "Stairwell Sense L2 costs 1500");
const compass = SHOP_UPGRADES.find((u) => u.id === "compass");
ok(compass && compass.max === 2, "Stairwell Sense is now a two-tier upgrade (max 2)");

// The on-map trail only lights up at level >= 2 (L1 is the HUD compass only).
ok(stairTrailEnabled(0) === false, "no compass → no trail");
ok(stairTrailEnabled(1) === false, "L1 (HUD compass) does not draw the trail");
ok(stairTrailEnabled(2) === true, "L2 draws the trail");

console.log(failed ? `\nSTAGE 2 ROUTE FAILED (${failed})` : "\nSTAGE 2 ROUTE PASSED");
if (failed) process.exit(1);
