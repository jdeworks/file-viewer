// P4 — Dynamics panel UI (compressor / limiter / noise gate / de-noise).
//
// Mirrors the spectrum-panel.js pattern: vanilla DOM, mounts into a container,
// pushes values into the shared WebAudio graph (audio-graph.js). The compressor
// and limiter are LIVE (DynamicsCompressorNode in the graph, zero-latency); the
// noise gate and de-noise are BAKE-ONLY (no good real-time WebAudio analog), so
// their controls are clearly labelled "applied on export" — they only feed the
// ffmpeg `-af` chain via getSettings().
//
// CPU policy: no AudioContext / compressor node is allocated until the user
// actually enables the compressor or limiter (the graph builds those nodes lazily
// on the first setComp/setLimiter with enabled:true). Mounting the panel alone is
// cheap (just DOM).

import { getGraph } from './audio-graph.js';

// One labelled range control. Returns { row, input, val } and wires oninput → fn(value).
function ctrlRow(label, { min, max, step, value, unit, fmt }, onInput) {
  const row = document.createElement('div');
  row.className = 'dyn-ctrl';
  const lbl = document.createElement('label'); lbl.className = 'dyn-ctrl-lbl'; lbl.textContent = label;
  const input = document.createElement('input');
  input.type = 'range'; input.min = String(min); input.max = String(max);
  input.step = String(step); input.value = String(value); input.className = 'dyn-slider';
  const val = document.createElement('span'); val.className = 'dyn-val';
  const show = (v) => { val.textContent = (fmt ? fmt(v) : v) + (unit || ''); };
  show(value);
  input.addEventListener('input', () => { const v = parseFloat(input.value); show(v); onInput(v); });
  row.append(lbl, input, val);
  return { row, input, val };
}

// Build one effect section with an enable checkbox + its controls.
// onToggle(enabled) fires on the checkbox; controls live inside .dyn-body.
function section(title, badge) {
  const sec = document.createElement('div'); sec.className = 'dyn-sec';
  const head = document.createElement('div'); head.className = 'dyn-head';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'dyn-enable';
  const name = document.createElement('span'); name.className = 'dyn-title'; name.textContent = title;
  head.append(cb, name);
  if (badge) { const b = document.createElement('span'); b.className = 'dyn-badge'; b.textContent = badge; head.append(b); }
  const body = document.createElement('div'); body.className = 'dyn-body';
  sec.append(head, body);
  return { sec, cb, body };
}

// Mount the dynamics panel into `container` for `mediaEl`. Returns { destroy() }.
export function mountDynamicsPanel(container, mediaEl) {
  const graph = getGraph(mediaEl);
  if (!graph) {
    const note = document.createElement('div');
    note.className = 'dyn-note'; note.textContent = 'Audio processing unavailable for this media.';
    container.append(note);
    return { destroy() { note.remove(); } };
  }

  const d = graph.getDynamics();
  const wrap = document.createElement('div'); wrap.className = 'dyn-wrap';

  // ── Compressor (LIVE) ──
  const comp = section('Compressor', 'live');
  const c = d.comp;
  comp.body.append(
    ctrlRow('Threshold', { min: -60, max: 0, step: 1, value: c.threshold, unit: ' dB' }, (v) => graph.setComp({ threshold: v })).row,
    ctrlRow('Ratio', { min: 1, max: 20, step: 0.5, value: c.ratio, unit: ':1' }, (v) => graph.setComp({ ratio: v })).row,
    ctrlRow('Attack', { min: 0, max: 0.2, step: 0.001, value: c.attack, unit: ' s', fmt: (v) => v.toFixed(3) }, (v) => graph.setComp({ attack: v })).row,
    ctrlRow('Release', { min: 0.01, max: 1, step: 0.01, value: c.release, unit: ' s', fmt: (v) => v.toFixed(2) }, (v) => graph.setComp({ release: v })).row,
    ctrlRow('Knee', { min: 0, max: 40, step: 1, value: c.knee, unit: ' dB' }, (v) => graph.setComp({ knee: v })).row,
    ctrlRow('Makeup', { min: 0, max: 24, step: 0.5, value: c.makeup, unit: ' dB' }, (v) => graph.setComp({ makeup: v })).row,
  );
  comp.cb.checked = !!c.enabled;
  comp.cb.addEventListener('change', () => graph.setComp({ enabled: comp.cb.checked }));

  // ── Limiter (LIVE) ──
  const lim = section('Limiter (brickwall)', 'live');
  lim.body.append(
    ctrlRow('Ceiling', { min: -12, max: 0, step: 0.5, value: d.limiter.ceiling, unit: ' dBTP' }, (v) => graph.setLimiter({ ceiling: v })).row,
  );
  lim.cb.checked = !!d.limiter.enabled;
  lim.cb.addEventListener('change', () => graph.setLimiter({ enabled: lim.cb.checked }));

  // ── Noise gate (BAKE-ONLY) ──
  const gate = section('Noise gate', 'on export');
  const g = d.gate;
  gate.body.append(
    ctrlRow('Threshold', { min: -80, max: 0, step: 1, value: g.threshold, unit: ' dB' }, (v) => graph.setGate({ threshold: v })).row,
    ctrlRow('Ratio', { min: 1, max: 9, step: 0.5, value: g.ratio, unit: ':1' }, (v) => graph.setGate({ ratio: v })).row,
    ctrlRow('Attack', { min: 0, max: 0.2, step: 0.001, value: g.attack, unit: ' s', fmt: (v) => v.toFixed(3) }, (v) => graph.setGate({ attack: v })).row,
    ctrlRow('Release', { min: 0.01, max: 1, step: 0.01, value: g.release, unit: ' s', fmt: (v) => v.toFixed(2) }, (v) => graph.setGate({ release: v })).row,
  );
  gate.cb.checked = !!g.enabled;
  gate.cb.addEventListener('change', () => graph.setGate({ enabled: gate.cb.checked }));

  // ── De-noise (BAKE-ONLY) ──
  const dn = section('De-noise (broadband)', 'on export');
  dn.body.append(
    ctrlRow('Strength', { min: 1, max: 60, step: 1, value: d.denoise.strength, unit: ' dB' }, (v) => graph.setDenoise({ strength: v })).row,
  );
  dn.cb.checked = !!d.denoise.enabled;
  dn.cb.addEventListener('change', () => graph.setDenoise({ enabled: dn.cb.checked }));

  const hint = document.createElement('p');
  hint.className = 'dyn-hint';
  hint.textContent = 'Compressor + limiter preview live. Noise gate + de-noise are applied on export.';

  wrap.append(comp.sec, lim.sec, gate.sec, dn.sec, hint);
  container.append(wrap);

  return {
    destroy() { wrap.remove(); },
  };
}
