// road-entities.js — Stage 5 Signal Racer: PURE mapping from the discrete game state (obstacle rows,
// rivals) to positioned road entities the canvas draws. No DOM/canvas — node-testable.
//
// The game logic stays discrete: the player sits on a row (one per logical tick), moves ±1 lane per
// tick, and reads a look-ahead window of rows. This module maps a row index → a world z (row i is
// i·ROW_SPACING_Z down the track) and a lane → a normalised road offset, then gathers the hazards,
// pickups, gates and rivals currently ahead of the player. The canvas layer interpolates the sub-tick
// motion (camera scroll + rival/player easing) using these positions; the mapping itself is exact.

import { isBlock, isGate } from './track.js';
import { isPowerup, powerupType } from './powerups.js';
import { resolveRow } from './fork.js';
import { ROW_SPACING_Z, LANE_OFFSETS } from './road.js';

export function rowToZ(row) { return row * ROW_SPACING_Z; }
export function zToRow(z) { return z / ROW_SPACING_Z; }
export function laneToOffset(lane) { return LANE_OFFSETS[Math.max(0, Math.min(2, Number(lane) || 0))]; }

// Classify one lane glyph into a drawable entity kind (or null for an empty lane).
export function classifyGlyph(glyph) {
  if (glyph == null) return null;
  if (isGate(glyph)) return { kind: 'gate' };
  if (isBlock(glyph)) return { kind: 'block', glyph };
  if (isPowerup(glyph)) return { kind: 'pickup', ptype: powerupType(glyph) };
  return null;
}

// The row a reader should draw for scroll-tick t, honouring circuit wrap + the committed fork channel.
function rowReader(view) {
  const table = view.table || [];
  const len = table.length;
  const wrap = view.archetype === 'circuit';
  const channel = view.channel || 'lo';
  return (t) => {
    let r;
    if (wrap && len) r = table[((t % len) + len) % len];
    else r = table[t];
    return resolveRow(r, channel);
  };
}

// Hazards / pickups / gates within the look-ahead window, tagged with rows-ahead (0 = the player's row)
// and lane. `ahead` is a plain integer row offset; the canvas turns it into a z via rowToZ + camera.
export function collectTrackEntities(view) {
  const lookAhead = Math.max(1, Number(view.lookAhead) || 8);
  const at = rowReader(view);
  const tick = Number(view.tick) || 0;
  const out = [];
  for (let ahead = 0; ahead < lookAhead; ahead += 1) {
    const row = at(tick + ahead);
    if (!row) continue;
    for (let lane = 0; lane < 3; lane += 1) {
      const info = classifyGlyph(row.lanes[lane]);
      if (info) out.push({ ...info, ahead, lane });
    }
  }
  return out;
}

// Rivals (and time-trial ghosts) as entities. `ahead` here can be fractional/negative — it comes from
// the loop's rival view (effective distance minus the player's distance), so a rival can be just ahead,
// level, or (ahead < 0) already behind the camera; the canvas skips anything behind.
export function collectRivalEntities(view) {
  const out = [];
  for (const r of (view.rivals || [])) {
    if (!r) continue;
    out.push({ kind: r.ghost ? 'ghost' : 'rival', glyph: r.glyph, ahead: Number(r.ahead) || 0, lane: Number(r.lane) || 0 });
  }
  return out;
}
