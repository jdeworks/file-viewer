// board.js — Stage 4 Fractal Bastion: ASCII board renderer. PURE function, returns a string (no DOM).
// Single-char grid (40 wide) so columns stay aligned in a monospace <pre>. The renderer styles it.
// Layering: empty → path → recursion points → towers → enemies, with entry/exit markers.

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

export function boardText(state, pathTiles, width = 40, height = 40) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => EMPTY));
  const put = (x, y, ch) => { if (y >= 0 && y < height && x >= 0 && x < width) grid[y][x] = ch; };

  // Path (directional glyphs; recurve tiles stand out; entry/exit marked).
  const tiles = pathTiles || [];
  tiles.forEach((t, i) => {
    if (i === 0) return put(t.x, t.y, ">");
    if (i === tiles.length - 1) return put(t.x, t.y, "X");
    if (t.recurve) return put(t.x, t.y, "~");
    put(t.x, t.y, pathGlyph(tiles[i - 1], t, tiles[i + 1]));
  });

  // Recursion points (boss-vulnerability targets) — only where the path didn't claim the cell.
  for (const p of state?.recursion?.points || []) {
    if (grid[p.y]?.[p.x] === EMPTY) put(p.x, p.y, "R");
  }

  // Towers, then enemies on top (enemies are what the player tracks moment-to-moment).
  for (const t of state?.towers || []) put(t.x, t.y, TOWER_CHAR[t.type] || "?");
  for (const e of state?.enemies || []) put(e.x, e.y, ENEMY_CHAR[e.type] || "*");

  return grid.map((row) => row.join("")).join("\n");
}

// Horizontal '-', vertical '|', or a corner '+' based on the neighbouring tiles.
function pathGlyph(prev, here, next) {
  if (!prev || !next) return "+";
  if (prev.y === here.y && next.y === here.y) return "-";
  if (prev.x === here.x && next.x === here.x) return "|";
  return "+";
}
