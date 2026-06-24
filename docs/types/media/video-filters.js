// PURE ffmpeg video/timeline filter-arg builders (no ffmpeg, no DOM) so they can be
// unit-tested directly. P6 — the 2-lane video timeline bakes its transitions through
// these. Mirrors audio-filters.js: each function returns plain data (an args array or a
// filter string), and transcoder.js wraps the MEMFS I/O around them.
//
// The three timeline transitions:
//   • xfade      — video dissolve/crossfade between two clips (re-encode; needs matching
//                  resolution/fps/pix_fmt). Audio of the two clips is joined with acrossfade
//                  so audio + video stay aligned across the transition.
//   • acrossfade — audio-only crossfade between two clips (the studio-export stub).
//   • muxMusic   — overlay a music bed UNDER the video's own audio (amix, with optional
//                  duck of the music gain) — a pragmatic "mux music under video".

const round = (n) => Math.round(n * 100) / 100;

// Sanitize a transition name to the xfade vocabulary we expose. Falls back to 'fade'.
const XFADE_TRANSITIONS = new Set(['fade', 'dissolve', 'fadeblack', 'fadewhite', 'wipeleft', 'wiperight', 'slideleft', 'slideright']);
export function normalizeTransition(name) {
  return XFADE_TRANSITIONS.has(name) ? name : 'fade';
}

// offset = where (in seconds, on clip A's timeline) the transition begins. With clip A of
// duration durA and a transition of length d, the standard xfade offset is durA − d so the
// crossfade lands at the tail of A. Clamped to ≥0.
export function xfadeOffset(durA, d) {
  const a = Number(durA);
  const dd = Number(d);
  if (!isFinite(a) || !isFinite(dd) || dd <= 0) return 0;
  return Math.max(0, round(a - dd));
}

// Build the ffmpeg args for a VIDEO dissolve/crossfade between two inputs.
//   inA / inB  — MEMFS input filenames (e.g. 'input.mp4', 'secondary.mp4')
//   out        — output filename
//   opts: { durationA, transition, duration } — durationA = clip-A length (s) for the offset;
//          transition = xfade transition name; duration = transition length (s).
// xfade requires both inputs to share resolution/fps/pix_fmt; transcoder.js wraps the run
// in a friendly error if ffmpeg rejects mismatched inputs. Audio is joined with acrossfade.
export function buildXfadeArgs(inA, inB, out, opts = {}) {
  const transition = normalizeTransition(opts.transition);
  const d = Math.max(0.1, Number(opts.duration) || 1);
  const offset = xfadeOffset(opts.durationA, d);
  const vf = '[0:v][1:v]xfade=transition=' + transition + ':duration=' + round(d) + ':offset=' + offset + '[v]';
  const af = '[0:a][1:a]acrossfade=d=' + round(d) + '[a]';
  return [
    '-i', inA, '-i', inB,
    '-filter_complex', vf + ';' + af,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    out,
  ];
}

// Build the ffmpeg args for an AUDIO-only crossfade between two clips (the export stub
// this P6 unlocks). duration = crossfade length (s).
export function buildAcrossfadeArgs(inA, inB, out, opts = {}) {
  const d = Math.max(0.1, Number(opts.duration) || 1);
  return [
    '-i', inA, '-i', inB,
    '-filter_complex', '[0:a][1:a]acrossfade=d=' + round(d) + '[a]',
    '-map', '[a]',
    out,
  ];
}

// Build the ffmpeg args to MUX a music bed under the video's own audio. The music is
// gain-scaled (duck) and mixed with the original audio via amix; video is stream-copied.
//   opts: { musicGain } — linear multiplier for the music bed (default 0.35 = ducked).
// Uses amix=duration=first so the output length tracks the (longer) video.
export function buildMuxMusicArgs(inVideo, inMusic, out, opts = {}) {
  const g = isFinite(Number(opts.musicGain)) ? Math.max(0, round(Number(opts.musicGain))) : 0.35;
  const fc = '[1:a]volume=' + g + '[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]';
  return [
    '-i', inVideo, '-i', inMusic,
    '-filter_complex', fc,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    out,
  ];
}

// Normalize a single-clip visual trim from the timeline handles. start/end are seconds;
// returns { start, end } where end is null when not set / invalid. PURE helper.
export function trimRange(start, end) {
  const s = Math.max(0, Number(start) || 0);
  const e = Number(end);
  return {
    start: round(s),
    end: isFinite(e) && e > s ? round(e) : null,
  };
}

// Clamp and normalize a trim range to non-crossing values. start/end are seconds.
// If `duration` is finite, end defaults to it (till end) when end is omitted/falsy.
// Returns { start, end } where both are rounded seconds and never cross.
export function clampTrimRange(start, end, duration, minGap = 0.01) {
  const d = Number(duration);
  const max = isFinite(d) && d > 0 ? d : 0;
  const gap = Math.max(0.01, Number(minGap) || 0.01);

  let safeStart = clamp(Number(start) || 0);
  let safeEnd = Number(end);

  if (!isFinite(safeEnd) || safeEnd <= 0) {
    safeEnd = max;
  } else {
    safeEnd = clamp(safeEnd);
  }

  if (max > 0 && safeEnd <= safeStart) {
    if (safeStart >= max) {
      safeStart = Math.max(0, max - gap);
      safeEnd = max;
    } else {
      safeEnd = Math.min(max, safeStart + gap);
    }
  }

  return {
    start: round(safeStart),
    end: isFinite(max) && max > 0 ? round(safeEnd) : (isFinite(safeEnd) ? round(safeEnd) : round(safeStart)),
  };

  function clamp(v) {
    if (!isFinite(v)) return 0;
    return max > 0 ? Math.max(0, Math.min(v, max)) : Math.max(0, v);
  }
}
