// ghost.js — Stage 5 Signal Racer: time-trial ghosts. A "ghost" exposes the SAME read-only surface
// as a seeded rival (laneAt(t) / distAt(t) / finishTick) so the renderer + game-loop treat it like
// any other corridor occupant. Two kinds, both fully DETERMINISTIC (no RNG, no clock):
//   • PAR ghost     — a synthetic constant-pace pacer derived purely from raceLength. It is the
//                     beat-the-clock GATE: you only clear a time-trial by finishing before it.
//   • REPLAY ghost  — a recording of YOUR prior clean run (lane[] + distance[] captured tick-by-tick
//                     during a previous clear). Replayed translucent so you race your past self.
//
// A recording is stored compactly in the save as { tick, lanes: "1120…", dist: [int,…] }; it is a
// pure transcript, so replaying it is byte-identical every reload — the determinism the lane needs.

function clampLane(l) {
  return Math.max(0, Math.min(2, Number(l) || 0));
}

// Constant-pace pacer. distAt grows by `pace` per tick (capped at raceLength); it rides the middle
// lane (cosmetic — par is judged on time, not lane). pace < 1.0 ⇒ slightly slower than a clean run,
// so optimal play beats it but a bump-heavy / dawdling run does not.
export function makeParGhost(raceLength, pace = 0.9) {
  const len = Math.max(1, Number(raceLength) || 1);
  const p = Math.max(0.05, Number(pace) || 0.9);
  const finishTick = Math.ceil(len / p);
  return {
    kind: 'par',
    glyph: 'P',
    finishTick,
    laneAt: () => 1,
    distAt: (t) => Math.min(len, Math.max(0, Number(t) || 0) * p),
  };
}

// Wrap a stored recording into the ghost surface. Tolerates a missing/short transcript by clamping.
export function ghostFromRecording(rec, glyph = 'G') {
  if (!rec || typeof rec !== 'object') return null;
  const lanes = String(rec.lanes || '');
  const dist = Array.isArray(rec.dist) ? rec.dist : [];
  const last = Math.max(0, Math.max(lanes.length, dist.length) - 1);
  const finishTick = Number.isFinite(Number(rec.tick)) ? Number(rec.tick) : last;
  return {
    kind: 'replay',
    glyph,
    finishTick,
    laneAt: (t) => clampLane(Number(lanes[Math.min(Math.max(0, t | 0), last)]) || 0),
    distAt: (t) => Number(dist[Math.min(Math.max(0, t | 0), last)]) || 0,
  };
}

// A live recorder fed one sample per tick from the game-loop; finalize() emits the storable transcript.
export function createRecorder() {
  const lanes = [];
  const dist = [];
  return {
    sample(lane, distance) {
      lanes.push(clampLane(lane));
      dist.push(Math.round(Math.max(0, Number(distance) || 0)));
    },
    finalize(finishTick) {
      return { tick: Number(finishTick) || lanes.length, lanes: lanes.join(''), dist };
    },
  };
}

// Medal tier for a finish time against par: gold = comfortably under, silver = under, bronze = at/over.
export function medalFor(finishTick, parTick) {
  const f = Number(finishTick);
  const par = Number(parTick);
  if (!Number.isFinite(f) || !Number.isFinite(par) || par <= 0) return 'bronze';
  if (f <= par * 0.85) return 'gold';
  if (f <= par) return 'silver';
  return 'bronze';
}

// Pick the better of two recordings (lower finish tick wins); used when banking a new best.
export function bestRecording(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return Number(b.tick) < Number(a.tick) ? b : a;
}
