// render-track.js — Stage 5 Signal Racer: pure ASCII renderer for the 3-lane track viewport. Draws a
// look-ahead window (far rows on top, the player's current row at the bottom) plus a player row and a
// counter-phase header. No game logic, no timers — given a table + position it returns a string.
//
// SPEED TEXTURE (UX audit #3): lane separators stream as dashes and side gutters carry ≡ marks that
// scroll DOWN as the tick advances (the road reads as moving, not a stamp). Everything is derived from
// the tick counter + the row's world coordinate — DETERMINISTIC, no Date.now / Math.random. With
// reducedMotion the separators are solid and the gutters bare (static road). `laneWidth` widens each
// lane cell so the strip scales into a real road at race-mode font sizes (5 in race, 3 elsewhere).

import { makeRng } from './rng.js';

// Glyph → single display char (cells are padded to laneWidth around this char).
const DISP = {
  empty: '·', '░': '░', '▒': '▒', '▓': '▓', '>>': '»',
  U: 'U', O: 'O', E: 'E', '+': '+', $: '$',
  P: 'p', G: 'g',                    // time-trial ghosts (par + prior-best), drawn lower-case + faint
};
const PLAYER = '▲';

function disp(glyph) { return DISP[glyph] || DISP.empty; }

// Center a single char in a laneWidth-wide cell (e.g. width 5 → "  ▲  ").
function padCell(ch, width) {
  const total = Math.max(0, width - 1);
  const left = Math.floor(total / 2);
  return ' '.repeat(left) + ch + ' '.repeat(total - left);
}

export function renderTrackGrid({
  table, tick, lane, lookAhead = 8, wrap = false, rivals = [], channel = 'lo',
  laneWidth = 3, speed = 0, reducedMotion = false,
}) {
  const rows = [];
  const raw = (t) => {
    if (wrap && table.length) return table[((t % table.length) + table.length) % table.length];
    return table[t];
  };
  // Inside a fork span, draw the committed sub-channel's lanes (HI gates/▓ or LO safe ░).
  const at = (t) => {
    const r = raw(t);
    if (!r || !r.fork) return r;
    return { ...r, lanes: (channel === 'hi' ? r.forkHi : r.forkLo) || r.lanes };
  };
  const here = at(tick) || { counterPhaseLane: null, beatOpen: true };

  // Rival overlay: map "rows-ahead,lane" → rival glyph (only those within the look-ahead window).
  const rivalAt = new Map();
  for (const r of rivals) {
    if (r && r.ahead >= 0 && r.ahead < lookAhead) rivalAt.set(`${r.ahead},${r.lane}`, r.glyph || 'o');
  }

  // Speed texture derivations (deterministic). gapEvery: faster round ⇒ fewer gaps ⇒ denser dashes.
  const dens = speed < 0 ? 0 : speed > 1 ? 1 : speed;
  const gapEvery = 3 + Math.round(dens * 3);
  const sepAt = (w) => (reducedMotion ? '|' : ((w % gapEvery === 0) ? ' ' : '|'));
  const gutterAt = (screenRow) => (reducedMotion ? ' ' : (((tick * 2 + screenRow) % 4 === 0) ? '≡' : ' '));

  // Counter-phase header: '~' marks the current shield lane; '*' marks a beat-open tick.
  const header = [0, 1, 2].map((l) => padCell(l === here.counterPhaseLane ? '~' : ' ', laneWidth)).join(' ');
  rows.push(` ${header}  ${here.beatOpen ? '*' : ' '}`);

  // Obstacle rows: farthest (tick+lookAhead-1) at top, nearest (tick) at the bottom.
  for (let ahead = lookAhead - 1; ahead >= 0; ahead -= 1) {
    const screenRow = lookAhead - 1 - ahead;   // 0 = top; increments downward
    const w = tick + ahead;                     // world coordinate (streams down as tick grows)
    const row = at(tick + ahead);
    const cells = [0, 1, 2].map((l) => {
      const rival = rivalAt.get(`${ahead},${l}`);
      return padCell(rival ? rival : disp(row ? row.lanes[l] : null), laneWidth);
    });
    const g = gutterAt(screenRow);
    rows.push(`${g}${cells.join(sepAt(w))}${g}`);
  }

  // Player row — solid separators, the car centered in its lane.
  const playerCells = [0, 1, 2].map((l) => padCell(l === lane ? PLAYER : '·', laneWidth));
  rows.push(` ${playerCells.join('|')} `);
  return rows.join('\n');
}

// A static, deterministic "attract" road for the SELECT screen (UX audit M3) — a seeded scatter of
// static so a fresh entry shows a road idling rather than an empty void. Pure; motion is CSS-only
// (styles-race.css), so this stays reduced-motion friendly and needs no timer.
export function attractGrid({ seed = 'idle', laneWidth = 5, rows = 8, lane = 1 } = {}) {
  const rng = makeRng(String(seed));
  const table = [];
  for (let i = 0; i < rows; i += 1) {
    table.push({ lanes: [0, 1, 2].map(() => (rng.chance(0.22) ? '░' : null)), beatOpen: true, counterPhaseLane: null });
  }
  return renderTrackGrid({ table, tick: 0, lane, lookAhead: rows, laneWidth, reducedMotion: true });
}
