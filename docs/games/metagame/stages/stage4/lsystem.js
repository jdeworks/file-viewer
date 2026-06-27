// lsystem.js — Stage 4 Fractal Bastion: seeded L-system path generator.
//
// PURE module: no DOM, no state mutation, fully deterministic. The enemy path is a Koch-curve
// variant walked by a turtle, then scaled to fit the 40×40 board. Depth grows the path (and, at
// depth 3, produces recurve zones where the curve folds back over itself — the double-damage tiles).
// `seed` is reserved for the depth-2 branch junctions added in a later increment (C2); the base
// curve is deterministic on its own. Engine/board/renderer all import the path from here.

const GRID = 40;
const MARGIN = 2;            // keep the path off the very edge
const LO = MARGIN;
const HI = GRID - 1 - MARGIN; // 37

const AXIOM = "F";
const RULE = "F+F-F-F+F";    // Koch-variant: zig-zags at depth 1, folds/recurves by depth 3

// Wave → path depth (wave group). Waves 1–10 → 1, 11–20 → 2, 21–31 → 3.
export function waveGroupDepth(waveNum) {
  const n = Number(waveNum) || 1;
  if (n <= 10) return 1;
  if (n <= 20) return 2;
  return 3;
}

// Path depth for a given wave ON A MAP: the wave-group depth, capped at the map's maximum depth. This
// is what drives the per-wave-group RESHAPE — on a depth-2 map the path folds from depth 1 (waves 1–10)
// to depth 2 (wave 11+); on a depth-3 map it folds 1→2→3 at waves 11 and 21. Depth-1 maps never reshape
// (onboarding stays stable). Pure + deterministic — same (mapDepth, wave) ⇒ same depth, every run.
export function mapPathDepth(mapDepth, waveNum) {
  const cap = Math.max(1, Math.min(3, Math.trunc(Number(mapDepth)) || 1));
  return Math.min(cap, waveGroupDepth(waveNum));
}

// Build the deterministic path for a given depth. Returns:
//   { tiles: [{x,y,branch}], entry, exit, recurveTiles: Set<"x,y"> }
export function buildPath(seed, depth = 1) {
  const d = Math.max(1, Math.min(3, Math.trunc(Number(depth)) || 1));
  const instructions = expand(d);

  // Raw turtle walk in unbounded integer space (start east-facing at the origin).
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  let x = 0, y = 0, dir = 0;
  const raw = [{ x, y }];
  for (const ch of instructions) {
    if (ch === "+") dir = (dir + 1) & 3;        // turn right
    else if (ch === "-") dir = (dir + 3) & 3;   // turn left
    else if (ch === "F") { x += DX[dir]; y += DY[dir]; raw.push({ x, y }); }
  }

  // Scale + translate the raw walk to fit [LO,HI]² so it spans the board.
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = HI - LO;
  const sx = maxX > minX ? span / (maxX - minX) : 0;
  const sy = maxY > minY ? span / (maxY - minY) : 0;
  const mapped = raw.map((p) => ({
    x: LO + Math.round((p.x - minX) * sx),
    y: LO + Math.round((p.y - minY) * sy)
  }));

  // Collapse consecutive duplicate cells into a clean traversable list; count visits for recurve.
  const visits = new Map();
  const tiles = [];
  for (const p of mapped) {
    const k = `${p.x},${p.y}`;
    visits.set(k, (visits.get(k) || 0) + 1);
    const last = tiles[tiles.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) tiles.push({ x: p.x, y: p.y, branch: null });
  }

  const recurveTiles = new Set();
  for (const [k, count] of visits) if (count > 1) recurveTiles.add(k);
  // Flag recurve tiles on the traversable list too (engine reads tile.recurve, not the wave number).
  for (const t of tiles) if (recurveTiles.has(`${t.x},${t.y}`)) t.recurve = true;

  return { tiles, entry: tiles[0], exit: tiles[tiles.length - 1], recurveTiles };
}

// Map "x,y" → first index on the path, for O(1) tower-range / position lookups.
export function pathTileIndex(tiles) {
  const map = new Map();
  (tiles || []).forEach((t, i) => {
    const k = `${t.x},${t.y}`;
    if (!map.has(k)) map.set(k, i);
  });
  return map;
}

// ── internals ────────────────────────────────────────────────────────────────────────────────────

function expand(depth) {
  let s = AXIOM;
  for (let i = 0; i < depth; i++) {
    let out = "";
    for (const ch of s) out += ch === "F" ? RULE : ch;
    s = out;
  }
  return s;
}
