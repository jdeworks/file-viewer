// board.js — Stage 4 Fractal Bastion: ASCII board renderer. PURE functions, no DOM writes.
// Single-char grid (40 wide) so columns stay aligned in a monospace <pre>. `boardText` returns the
// plain char string (used for the tap-mapping cols/rows probe + unit tests); `boardHTML` returns the
// SAME grid wrapped in class-carrying <span>s so the renderer can COLOUR it (UX audit #2 — the path was
// invisible in one flat colour). The span text is byte-identical to boardText (entities decode back to
// the same chars), so <pre> layout, char counts, and the DOM-Range tap mapping are unchanged.
// Layering: empty → path → recursion points → towers → enemies, with entry/exit markers.

import { TOWER_TYPES } from './towers.js';

const EMPTY = ".";

const TOWER_CHAR = {
  pulse_node: "P", scatter_array: "S", null_spike: "N",
  attractor_field: "A", resonance_hub: "H", cycle_extractor: "E",
  frost_lattice: "F", thermal_loop: "T", chain_resonator: "C", long_recursor: "L",
  glyph_mortar: "M", shatter_drill: "D", gravity_well: "G", bank_node: "B"
};
const ENEMY_CHAR = {
  recursion: "o", pattern_crawler: "x", null_packet: "=",
  resonance_ghost: "%", fractal_host: "@", depth_crawler: "#",
  swarm_bit: ",", armored_loop: "8", shield_drone: "O", healer_node: "+",
  regenerator: "q", flicker_ghost: '"', burrower: "u"
};

// Enemy → red-family shade class (basic / heavy / special) so per-type threat reads at a glance.
const ENEMY_SHADE = {
  recursion: "e1", pattern_crawler: "e1", swarm_bit: "e1", null_packet: "e1",
  armored_loop: "e2", depth_crawler: "e2", fractal_host: "e2", regenerator: "e2", burrower: "e2",
  resonance_ghost: "e3", shield_drone: "e3", healer_node: "e3", flicker_ghost: "e3",
};

export function boardText(state, pathTiles, width = 40, height = 40) {
  return charGrid(state, pathTiles, width, height).map((row) => row.join("")).join("\n");
}

// Colour-classed span markup for the same grid. `overlay` (optional) paints placement/selection hints:
//   { rings: Set<"x,y"> range-ring cells, foot: {x,y}|null placement footprint, footValid: bool }.
// Returns an HTML string whose textContent === boardText(state, pathTiles).
export function boardHTML(state, pathTiles, overlay = null, width = 40, height = 40) {
  const grid = charGrid(state, pathTiles, width, height);
  const cls = classGrid(state, pathTiles, width, height);
  const rings = overlay?.rings;
  const hits = overlay?.hits;
  const foot = overlay?.foot;
  const footValid = overlay?.footValid !== false;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    let out = "";
    let run = "";
    let runCls = null;
    const flush = () => { if (run) out += `<span class="${runCls}">${run}</span>`; run = ""; };
    for (let x = 0; x < width; x += 1) {
      let c = cls[y][x];
      if (rings && rings.has(`${x},${y}`)) c += " s4c-range";
      if (hits && hits.has(`${x},${y}`)) c += " s4c-hit";
      if (foot && foot.x === x && foot.y === y) c += footValid ? " s4c-foot" : " s4c-foot-bad";
      if (c !== runCls) { flush(); runCls = c; }
      run += esc(grid[y][x]);
    }
    flush();
    rows.push(out);
  }
  return rows.join("\n");
}

// ── internals ──────────────────────────────────────────────────────────────
// buildPath returns only the CORNER waypoints of the L-system route; enemies travel in straight lines
// BETWEEN them (engine placeOnPath interpolates by pathIndex). For the board to read as a continuous
// ROAD (audit #2), we fill the cells between consecutive waypoints too. Returns the intermediate
// segment cells [{x,y,glyph}] (waypoints excluded — the caller stamps their markers on top).
function segmentCells(tiles) {
  const cells = [];
  for (let i = 0; i < tiles.length - 1; i += 1) {
    const a = tiles[i]; const b = tiles[i + 1];
    const dx = Math.sign(b.x - a.x); const dy = Math.sign(b.y - a.y);
    const glyph = dy === 0 ? "-" : dx === 0 ? "|" : "+";
    let x = a.x; let y = a.y;
    while (x !== b.x || y !== b.y) {
      if (!(x === a.x && y === a.y)) cells.push({ x, y, glyph });
      if (x !== b.x) x += dx;
      if (y !== b.y) y += dy;
    }
  }
  return cells;
}

function charGrid(state, pathTiles, width, height) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => EMPTY));
  const put = (x, y, ch) => { if (y >= 0 && y < height && x >= 0 && x < width) grid[y][x] = ch; };
  const tiles = pathTiles || [];
  for (const c of segmentCells(tiles)) put(c.x, c.y, c.glyph); // road first
  tiles.forEach((t, i) => {                                    // waypoint markers over the road
    if (i === 0) return put(t.x, t.y, ">");
    if (i === tiles.length - 1) return put(t.x, t.y, "X");
    if (t.recurve) return put(t.x, t.y, "~");
    put(t.x, t.y, pathGlyph(tiles[i - 1], t, tiles[i + 1]));
  });
  for (const p of state?.recursion?.points || []) {
    if (grid[p.y]?.[p.x] === EMPTY) put(p.x, p.y, "R");
  }
  for (const t of state?.towers || []) put(t.x, t.y, TOWER_CHAR[t.type] || "?");
  for (const e of state?.enemies || []) put(e.x, e.y, ENEMY_CHAR[e.type] || "*");
  return grid;
}

// Per-cell base class (before overlay). Same layering as charGrid so colour matches the glyph shown.
function classGrid(state, pathTiles, width, height) {
  const cls = Array.from({ length: height }, () => Array.from({ length: width }, () => "s4c-empty"));
  const set = (x, y, c) => { if (y >= 0 && y < height && x >= 0 && x < width) cls[y][x] = c; };
  const tiles = pathTiles || [];
  const charAt = charGrid(state, pathTiles, width, height); // authoritative glyph layer
  for (const c of segmentCells(tiles)) set(c.x, c.y, "s4c-path");
  tiles.forEach((t, i) => {
    if (i === 0) return set(t.x, t.y, "s4c-entry");
    if (i === tiles.length - 1) return set(t.x, t.y, "s4c-exit");
    if (t.recurve) return set(t.x, t.y, "s4c-recurve");
    set(t.x, t.y, "s4c-path");
  });
  for (const p of state?.recursion?.points || []) {
    if (charAt[p.y]?.[p.x] === "R") set(p.x, p.y, "s4c-recur");
  }
  for (const t of state?.towers || []) set(t.x, t.y, `s4c-tower s4c-t-${towerDmgType(t.type)}`);
  for (const e of state?.enemies || []) set(e.x, e.y, `s4c-enemy s4c-${ENEMY_SHADE[e.type] || "e1"}`);
  return cls;
}

function towerDmgType(type) {
  const def = TOWER_TYPES[type];
  if (!def) return "support";
  return def.damageType || (def.ignoresArmor ? "null" : "support");
}

function esc(ch) {
  if (ch === "&") return "&amp;";
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  if (ch === '"') return "&quot;";
  return ch;
}

// Horizontal '-', vertical '|', or a corner '+' based on the neighbouring tiles.
function pathGlyph(prev, here, next) {
  if (!prev || !next) return "+";
  if (prev.y === here.y && next.y === here.y) return "-";
  if (prev.x === here.x && next.x === here.x) return "|";
  return "+";
}
