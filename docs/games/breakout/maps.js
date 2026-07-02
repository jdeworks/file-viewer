// Breakout brick maps + brick-type model. Glyphs per cell: ' ' empty · '1' normal (1 hit) ·
// '2' tough (2 hits) · '#' indestructible wall (bounces, never breaks, not counted for clearing).
// Layouts follow well-known Breakout/Arkanoid patterns (wall, pyramid, checkerboard, fortress,
// tunnels, lanes, invaders) with a twist or two of our own. Maps never fully ring a breakable brick
// in walls, so the board is always clearable. Maps cycle as you level up (the ball keeps getting faster).
export const COLS = 12;
export const ROW_COLORS = ['#e57373', '#ffb74d', '#ffd54f', '#81c784', '#4dd0e1', '#7986cb', '#ba68c8', '#f06292'];

export const MAPS = [
  // 1 — classic wall with a tough band
  ['111111111111', '112222222211', '111111111111', '111111111111'],
  // 2 — pyramid
  ['     11     ', '    1221    ', '   112211   ', '  11222211  ', ' 1112222111 '],
  // 3 — checkerboard (twist: alternating tough)
  ['1 2 1 2 1 2 ', ' 2 1 2 1 2 1', '1 2 1 2 1 2 ', ' 2 1 2 1 2 1', '111111111111'],
  // 4 — fortress: solid corners, tough core
  ['#1111111111#', '112222222211', '1122####2211', '112222222211', '#1111111111#'],
  // 5 — tunnels: solid pillars with an open floor
  ['11#111111#11', '11#222222#11', '11#111111#11', '111111111111', '  11111111  '],
  // 6 — zigzag twist: staggered solid ends
  ['11111111111#', '#11111111111', '11112222111#', '#11122221111', '11111111111#'],
  // 7 — lane splitter
  ['111#1111#111', '222#2222#222', '111111111111', '   111111   ', '111111111111'],
  // 8 — crown
  ['  11    11  ', ' 1221  1221 ', '112222222211', ' 1111111111 ', '   112211   '],
  // 9 — gates
  ['##11111111##', '111222222111', '111 1111 111', '222 2222 222', '111111111111'],
  // 10 — invader
  [' 11 1111 11 ', '111111111111', '221122221122', '  11111111  ', ' 11 1  1 11 '],
  // 11 — staircase
  ['1           ', '11          ', '111         ', '1111    2222', '11111  22222', '111111222222'],
  // 12 — finale: wide wall, solid bumpers
  ['111111111111', '122222222221', '11#111111#11', '122222222221', '111111111111', '#1111111111#'],
];

// Build the brick list for a map at the given geometry. Returns { bricks, brickW }.
export function buildBricks(mapIndex, W, GAP, BRICK_H, TOP) {
  const map = MAPS[mapIndex % MAPS.length];
  const brickW = (W - GAP * (COLS + 1)) / COLS;
  const bricks = [];
  map.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = row[c] || ' ';
      if (ch === ' ') continue;
      const x = GAP + c * (brickW + GAP), y = TOP + r * (BRICK_H + GAP);
      if (ch === '#') bricks.push({ x, y, w: brickW, h: BRICK_H, type: 'solid', hp: Infinity, val: 0, color: '#5c6470' });
      else if (ch === '2') bricks.push({ x, y, w: brickW, h: BRICK_H, type: 'tough', hp: 2, val: 30, color: ROW_COLORS[r % ROW_COLORS.length] });
      else bricks.push({ x, y, w: brickW, h: BRICK_H, type: 'normal', hp: 1, val: 10, color: ROW_COLORS[r % ROW_COLORS.length] });
    }
  });
  return { bricks, brickW };
}

export const breakableLeft = (bricks) => bricks.filter((b) => b.type !== 'solid').length;
