// canvas-race.js — Stage 5 Signal Racer: the canvas orchestrator. Owns the <canvas>, its DPR sizing,
// the colour palette (kept in the stage's signal-warfare language — teal you, amber rivals, red
// hazards, cyan gates), and the per-FRAME draw. Split out of renderer.js so renderer.js stays under
// the LOC cap and the DOM chrome (HUD/panels/overlay) is cleanly separate from the pixel pipeline.
//
// INTERPOLATION: the game logic is discrete (one row per tick). renderFrame(prevView, curView, alpha)
// draws a sub-tick frame by interpolating between the two most recent tick snapshots — the standard
// fixed-timestep scheme (rendered = lerp(previous, current, alpha)). The camera + hazards scroll off
// the PREVIOUS snapshot's frame (each hazard is one row closer at alpha=1); rivals/player lane ease
// between the snapshots. The camera rides CAMERA_LAG rows behind the player so its own row sits near
// the bottom of the screen at a sane scale.

import {
  buildRoad, CAMERA_DEPTH, SEG_PER_ROW, ROW_SPACING_Z,
} from './road.js';
import { renderRoad, drawSky } from './draw-road.js';
import { drawPlayerCar, drawEntitySprite } from './draw-sprites.js';
import { collectTrackEntities, laneToOffset } from './road-entities.js';

const CAMERA_LAG = 1.2;          // rows the camera trails the player (keeps the player's row on-screen)
const MIN_SPRITE_W = 2;          // skip sub-pixel sprites
const KIND_W = { block: 0.55, gate: 0.62, pickup: 0.42, rival: 0.5, ghost: 0.5 };
// Near-field caps (fractions of the canvas width): the projected half-road-width balloons past the
// canvas near the camera plane, so an uncapped sprite there fills the screen. Distant sprites keep
// pure perspective scaling; the cap only bites on the last few rows before a sprite passes the car.
const PLAYER_W_CAP = 0.16;
const ENTITY_W_CAP = 0.22;

// Palette — mirrors styles.css's --s5-* language so the canvas still reads as Signal Racer.
const PALETTE = {
  skyTop: '#0a0612', skyBottom: '#1a1030',
  ridgeFar: '#160c2a', ridgeNear: '#20143f',
  grassDark: '#0f0720', grassLight: '#140a2a',
  roadDark: '#1a1030', roadLight: '#241748',
  rumbleDark: '#7a2090', rumbleLight: '#a340c0',
  lane: '#5dcaa5', fog: '#0d0815', fogDensity: 5,
  playerBody: '#5dcaa5', playerGlass: '#eafff7',
  rivalBody: '#ef9f27', rivalGlass: '#ffe6b0', ghost: '#7b7ba6',
  blockStatic: '#ff8a5b', blockPulse: '#ff5d7e', blockDense: '#ff2f2f',
  gatePost: '#57e0ff', gateBanner: '#d4537e',
  pickupBuff: '#b98cff', pickupRepair: '#5fe08a', pickupCache: '#ffd24d',
};

const lerp = (a, b, f) => a + (b - a) * f;

export function createCanvasRace(seed) {
  const canvas = document.createElement('canvas');
  canvas.className = 's5-track-canvas';
  canvas.setAttribute('aria-label', 'signal racer track');
  const ctx = canvas.getContext('2d');
  let road = buildRoad(seed);
  let w = 0;
  let h = 0;
  let redraw = null; // replays the last STATIC frame (attract) after a resize clears the backing store

  // Size the backing store to the layout box × DPR. NOTE: assigning canvas.width/height CLEARS the
  // canvas, so a resize must be followed by a redraw (onResize replays the last static frame; during a
  // live race the engine's next onRender repaints anyway).
  function measure() {
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = cssW;
    h = cssH;
  }
  function onResize() { measure(); if (redraw) redraw(); }
  const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(onResize) : null;
  ro?.observe(canvas);

  // Interpolate a fractional segment anchor from the projected road (screen x/y + half-road-width).
  function anchorAt(projected, segIndex) {
    const i = Math.floor(segIndex);
    if (i < 1 || i >= projected.length - 1) return null;
    const a = projected[i];
    if (a.p1.camera.z <= CAMERA_DEPTH) return null; // behind the camera plane
    const b = projected[i + 1];
    const f = segIndex - i;
    const s = a.p1.screen;
    const t = b.p1.screen;
    return { x: lerp(s.x, t.x, f), y: lerp(s.y, t.y, f), w: lerp(s.w, t.w, f) };
  }

  // Approximate the upcoming bend (sum of curves ahead) for parallax scroll + player lean.
  function bendAt(position) {
    const base = road.findSegment(position);
    const n = road.segments.length;
    let bend = 0;
    for (let i = 0; i < 40; i += 1) bend += road.segments[(base.index + i) % n].curve;
    return bend;
  }

  // Rivals + ghosts as entities: z interpolated between snapshots, lane eased for smooth lane changes.
  function rivalEntities(prevView, curView, alpha) {
    const prevR = (prevView && prevView.rivals) || [];
    const curR = (curView && curView.rivals) || [];
    const out = [];
    for (let i = 0; i < Math.max(prevR.length, curR.length); i += 1) {
      const p = prevR[i];
      const c = curR[i];
      const src = c || p;
      if (!src) continue;
      const aheadI = (p && c) ? lerp(p.ahead, c.ahead, alpha) : src.ahead;
      const oP = laneToOffset((p || src).lane);
      const oC = laneToOffset((c || src).lane);
      out.push({
        kind: src.ghost ? 'ghost' : 'rival', glyph: src.glyph,
        seg: (aheadI + CAMERA_LAG) * SEG_PER_ROW, offset: lerp(oP, oC, alpha),
      });
    }
    return out;
  }

  function drawScene({ baseTick, alpha, obsView, prevView, curView, playerOffset, suppressed }) {
    if (!w || !h) measure();
    if (!w || !h) return;
    const rawPos = (baseTick + alpha - CAMERA_LAG) * ROW_SPACING_Z;
    const position = ((rawPos % road.length) + road.length) % road.length;
    const bend = bendAt(position);
    ctx.clearRect(0, 0, w, h);
    drawSky(ctx, w, Math.round(h / 2), position * 0.2 + bend * 6, PALETTE);
    const projected = renderRoad(ctx, road, position, w, h, PALETTE);

    // Hazards / pickups / gates off the reference (previous) frame — one row closer at alpha=1.
    const entities = collectTrackEntities(obsView).map((e) => ({
      ...e, seg: (e.ahead - alpha + CAMERA_LAG) * SEG_PER_ROW, offset: laneToOffset(e.lane),
    }));
    entities.push(...rivalEntities(prevView, curView, alpha));
    entities.sort((p, q) => q.seg - p.seg); // painter's algorithm: far first
    for (const e of entities) {
      const anchor = anchorAt(projected, e.seg);
      if (!anchor || anchor.w < MIN_SPRITE_W) continue;
      const ew = Math.min(anchor.w * (KIND_W[e.kind] || 0.5), w * ENTITY_W_CAP);
      drawEntitySprite(ctx, e, anchor.x + e.offset * anchor.w, anchor.y, ew, PALETTE);
    }

    // Player car — always drawn at its own (near) row, frontmost, leaning into the bend.
    const pa = anchorAt(projected, CAMERA_LAG * SEG_PER_ROW);
    if (pa) {
      const lean = Math.max(-1, Math.min(1, bend * 0.02 + playerOffset * 0.25));
      // Clamp the anchor row's y into frame: the player row can project just below the canvas bottom
      // (it sits between the camera plane and the first fully-visible segment), which would crop the car.
      const py = Math.min(pa.y, h - 8);
      drawPlayerCar(ctx, pa.x + playerOffset * pa.w, py, Math.min(pa.w * 0.5, w * PLAYER_W_CAP), PALETTE, lean);
    }
    if (suppressed) drawSuppression(ctx, w, h);
  }

  return {
    el: canvas,
    setSeed(s) { road = buildRoad(s); },
    resize: measure,
    // Draw one interpolated race frame. prevView/curView are consecutive tick snapshots; alpha ∈ [0,1).
    renderFrame(prevView, curView, alpha) {
      const cur = curView || prevView;
      if (!cur) return;
      redraw = null; // live race: the next frame repaints, so no static replay on resize
      const prev = prevView || cur;
      const a = prevView ? Math.max(0, Math.min(1, alpha)) : 0;
      drawScene({
        baseTick: Number(prev.tick) || 0, alpha: a, obsView: prev, prevView: prev, curView: cur,
        playerOffset: lerp(laneToOffset(prev.lane), laneToOffset(cur.lane), a),
        suppressed: Boolean(cur.suppressionActive),
      });
    },
    // A single static frame of the empty road for the attract / select screen (replayed on resize).
    drawAttract(lane = 1) {
      redraw = () => drawScene({
        baseTick: 0, alpha: 0, obsView: { table: [], tick: 0, lookAhead: 0 },
        prevView: { rivals: [] }, curView: { rivals: [] },
        playerOffset: laneToOffset(lane), suppressed: false,
      });
      redraw();
    },
    destroy() { ro?.disconnect(); },
  };
}

function drawSuppression(ctx, w, h) {
  ctx.save();
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  grad.addColorStop(0, 'rgba(239,159,39,0)');
  grad.addColorStop(1, 'rgba(239,159,39,0.32)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
