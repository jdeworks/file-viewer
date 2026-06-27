// render-track.js — Stage 5 Signal Racer: pure ASCII renderer for the 3-lane track viewport. Draws a
// look-ahead window (far rows on top, the player's current row at the bottom) plus a player row and a
// counter-phase header. No game logic, no timers — given a table + position it returns a string.

const CELL = {
  empty: ' · ', '░': ' ░ ', '▒': ' ▒ ', '▓': ' ▓ ', '>>': '>> ',
  // powerup pickups (placed by powerups.js into clear lanes)
  U: ' U ', O: ' O ', E: ' E ', '+': ' + ', $: ' $ ',
  // time-trial ghosts (overlaid like rivals, drawn faint with parentheses)
  P: '(P)', G: '(G)',
};

export function renderTrackGrid({ table, tick, lane, lookAhead = 8, wrap = false, rivals = [] }) {
  const rows = [];
  const at = (t) => {
    if (wrap && table.length) return table[((t % table.length) + table.length) % table.length];
    return table[t];
  };
  const here = at(tick) || { counterPhaseLane: null, beatOpen: true };

  // Rival overlay: map "rows-ahead,lane" → rival glyph (only those within the look-ahead window).
  const rivalAt = new Map();
  for (const r of rivals) {
    if (r && r.ahead >= 0 && r.ahead < lookAhead) rivalAt.set(`${r.ahead},${r.lane}`, r.glyph || 'o');
  }

  // Counter-phase header: '~' marks the current shield lane; '*' marks a beat-open tick.
  const header = [0, 1, 2].map((l) => (l === here.counterPhaseLane ? ' ~ ' : '   ')).join(' ');
  rows.push(`${header} ${here.beatOpen ? '*' : ' '}`);

  // Obstacle rows: farthest (tick+lookAhead-1) at top, nearest (tick) at the bottom.
  for (let ahead = lookAhead - 1; ahead >= 0; ahead -= 1) {
    const row = at(tick + ahead);
    const cells = [0, 1, 2].map((l) => {
      const rival = rivalAt.get(`${ahead},${l}`);
      return rival ? ` ${rival} ` : cell(row ? row.lanes[l] : null);
    });
    rows.push(cells.join('|'));
  }

  // Player row.
  const playerCells = [0, 1, 2].map((l) => (l === lane ? '[>]' : ' · '));
  rows.push(playerCells.join('|'));
  return rows.join('\n');
}

function cell(glyph) {
  return CELL[glyph] || CELL.empty;
}
