// Asteroids entities + physics helpers (pure, no DOM) — kept separate so the main module stays under
// the LOC cap. Asteroid sizes carry a radius and a base score (smaller = worth more).
export const AST = { 3: { r: 34, score: 20 }, 2: { r: 19, score: 50 }, 1: { r: 10, score: 100 } };
const rnd = (a, b) => a + Math.random() * (b - a);

// Toroidal wrap — anything leaving an edge reappears on the opposite one.
export function wrap(o, W, H) {
  if (o.x < 0) o.x += W; else if (o.x > W) o.x -= W;
  if (o.y < 0) o.y += H; else if (o.y > H) o.y -= H;
}

// A lumpy asteroid: random heading at `speed`, a jagged polygon outline, slow spin.
export function makeAsteroid(size, x, y, speed) {
  const heading = rnd(0, Math.PI * 2);
  const base = AST[size].r, n = 10, verts = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2, rad = base * rnd(0.7, 1.15);
    verts.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
  }
  return { size, x, y, r: base, vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed,
    rot: rnd(0, 6.28), vr: rnd(-0.025, 0.025), verts };
}

// Splitting a large/medium rock yields two of the next size down; a small one yields none.
export function splitAsteroid(a, speed) {
  if (a.size <= 1) return [];
  return [makeAsteroid(a.size - 1, a.x, a.y, speed), makeAsteroid(a.size - 1, a.x, a.y, speed)];
}

export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

// Spawn `count` large rocks at the edges, away from the ship at (cx, cy).
export function spawnWave(count, W, H, cx, cy, speed) {
  const rocks = [];
  let guard = 0;
  while (rocks.length < count && guard < 200) {
    guard++;
    const x = rnd(0, W), y = rnd(0, H);
    if (dist2(x, y, cx, cy) < 140 * 140) continue;     // keep clear of the ship's spawn
    rocks.push(makeAsteroid(3, x, y, speed));
  }
  return rocks;
}
