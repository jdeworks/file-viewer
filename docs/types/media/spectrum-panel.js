// Shared Spectrum & EQ panel UI. Builds the canvases, 9-band EQ sliders, HPF/LPF,
// presets, A/B, LUFS readout + LUFS-normalization target — wired to a graph from
// audio-graph.js. Used by both the audio-only panel (spectrum.js) and the video
// studio's audio-mixing panel.
//
// CPU policy: the RAF loop runs ONLY while the media is playing AND the panel is
// shown (start()/stop() are wired to play/pause/ended and to panel open/close).

import { getGraph, EQ_FREQS, EQ_LABELS } from './audio-graph.js';
import {
  PRESETS, LUFS_TARGETS, drawSpectrum, drawBandEnergy, measureLufs, fmtLufsColor,
} from './spectrum-draw.js';

// Mount the panel into `container`, processing `mediaEl`'s audio. Returns
// { destroy() }. Returns a no-op controller if WebAudio is unavailable or the
// element's source was already claimed incompatibly.
export function mountSpectrumPanel(container, mediaEl) {
  const graph = getGraph(mediaEl);
  if (!graph) {
    const note = document.createElement('div');
    note.className = 'sp-lufs-row';
    note.textContent = 'Audio processing unavailable for this media.';
    container.append(note);
    return { destroy() { note.remove(); } };
  }

  let gains = graph.getGains();
  const currentHpf = graph.getHpf();
  const currentLpf = graph.getLpf();
  let rafId = 0;
  let abSlot = null;          // stored A-slot gains
  let lufsTarget = null;      // current LUFS normalization target (or null)
  let lufsEwma = null;        // smoothed measured LUFS for stable normalization

  const wrap = document.createElement('div');
  wrap.className = 'sp-wrap';

  const specCanvas = document.createElement('canvas');
  specCanvas.className = 'sp-canvas'; specCanvas.height = 120;

  const bandCanvas = document.createElement('canvas');
  bandCanvas.className = 'sp-band-canvas'; bandCanvas.height = 48;

  // Legend (so the overlaid curves are self-explanatory).
  const legend = document.createElement('div');
  legend.className = 'sp-legend';
  legend.innerHTML =
    '<span class="sp-leg sp-leg-proc">▮ Processed</span>'
    + '<span class="sp-leg sp-leg-orig">— Original</span>'
    + '<span class="sp-leg sp-leg-eq">— EQ curve</span>';

  // LUFS row: measured value + normalization target selector.
  const lufsRow = document.createElement('div');
  lufsRow.className = 'sp-lufs-row';
  const lufsLabel = document.createElement('span');
  lufsLabel.className = 'sp-lufs-label'; lufsLabel.textContent = 'LUFS';
  const lufsVal = document.createElement('span');
  lufsVal.className = 'sp-lufs-val'; lufsVal.textContent = '—';
  const normLabel = document.createElement('span');
  normLabel.className = 'sp-lufs-label'; normLabel.textContent = 'Normalize';
  const normSel = document.createElement('select');
  normSel.className = 'sp-preset-sel';
  LUFS_TARGETS.forEach(t => {
    const o = document.createElement('option'); o.value = t.id; o.textContent = t.name; normSel.append(o);
  });
  normSel.addEventListener('change', () => {
    const t = LUFS_TARGETS.find(x => x.id === normSel.value);
    lufsTarget = t ? t.target : null;
    graph.setLufsTarget(lufsTarget);   // mirror into the graph so the offline export can read it
    if (lufsTarget === null) { graph.setMakeupGain(1); lufsEwma = null; }
  });
  const normGainVal = document.createElement('span');
  normGainVal.className = 'sp-lufs-val'; normGainVal.textContent = '';
  lufsRow.append(lufsLabel, lufsVal, normLabel, normSel, normGainVal);

  // EQ sliders
  const eqRow = document.createElement('div');
  eqRow.className = 'sp-eq-row';
  const sliders = EQ_FREQS.map((freq, i) => {
    const col = document.createElement('div'); col.className = 'sp-eq-col';
    const g = Number(gains[i] || 0);
    const val = document.createElement('span'); val.className = 'sp-eq-val'; val.textContent = g > 0 ? '+' + g : String(g);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '-15'; slider.max = '15'; slider.step = '0.5';
    slider.value = String(g); slider.className = 'sp-eq-slider';
    const lbl = document.createElement('span'); lbl.className = 'sp-eq-lbl'; lbl.textContent = EQ_LABELS[i];
    slider.addEventListener('input', () => {
      const g = parseFloat(slider.value);
      gains[i] = g;
      val.textContent = g > 0 ? '+' + g : String(g);
      graph.setBandGain(i, g);
    });
    col.append(val, slider, lbl);
    return { slider, val, col };
  });
  sliders.forEach(s => eqRow.append(s.col));

  // HPF / LPF row
  const filterRow = document.createElement('div');
  filterRow.className = 'sp-filter-row';
  const hpfLabel = document.createElement('label'); hpfLabel.textContent = 'HPF ';
  const hpfInput = document.createElement('input');
  hpfInput.type = 'range'; hpfInput.min = '20'; hpfInput.max = '500'; hpfInput.value = '20';
  hpfInput.className = 'sp-filter-slider';
  const hpfVal = document.createElement('span'); hpfVal.className = 'sp-filter-val'; hpfVal.textContent = '20Hz';
  hpfInput.addEventListener('input', () => {
    const f = parseInt(hpfInput.value); graph.setHpf(f); hpfVal.textContent = f + 'Hz';
  });
  const lpfLabel = document.createElement('label'); lpfLabel.textContent = 'LPF ';
  const lpfInput = document.createElement('input');
  lpfInput.type = 'range'; lpfInput.min = '5000'; lpfInput.max = '20000'; lpfInput.value = '20000';
  lpfInput.className = 'sp-filter-slider';
  const lpfVal = document.createElement('span'); lpfVal.className = 'sp-filter-val'; lpfVal.textContent = '20kHz';
  lpfInput.addEventListener('input', () => {
    const f = parseInt(lpfInput.value); graph.setLpf(f);
    lpfVal.textContent = f >= 1000 ? Math.round(f / 100) / 10 + 'kHz' : f + 'Hz';
  });
  filterRow.append(hpfLabel, hpfInput, hpfVal, lpfLabel, lpfInput, lpfVal);

  // Preset + A/B row
  const presetRow = document.createElement('div');
  presetRow.className = 'sp-preset-row';
  const presetSel = document.createElement('select');
  presetSel.className = 'sp-preset-sel';
  PRESETS.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; presetSel.append(o); });
  const currentPreset = PRESETS.find((p) => {
    if (p.hpf !== currentHpf || p.lpf !== currentLpf) return false;
    if (p.gains.length !== gains.length) return false;
    return p.gains.every((g, i) => Math.abs((gains[i] || 0) - g) <= 0.0001);
  });
  if (currentPreset) presetSel.value = currentPreset.id;
  presetSel.addEventListener('change', () => applyPreset(PRESETS.find(p => p.id === presetSel.value)));

  const storeABtn = mkBtn('Store A');
  storeABtn.addEventListener('click', () => {
    abSlot = gains.slice();
    storeABtn.textContent = 'A stored ✓';
    setTimeout(() => { storeABtn.textContent = 'Store A'; }, 1500);
  });
  const recallABtn = mkBtn('Recall A');
  recallABtn.addEventListener('click', () => { if (abSlot) applyGains(abSlot); });
  const resetBtn = mkBtn('Flat');
  resetBtn.addEventListener('click', () => { applyPreset(PRESETS[0]); presetSel.value = 'flat'; });
  presetRow.append(presetSel, storeABtn, recallABtn, resetBtn);

  hpfInput.value = String(currentHpf);
  hpfVal.textContent = `${currentHpf}Hz`;
  lpfInput.value = String(currentLpf);
  lpfVal.textContent = currentLpf >= 1000 ? Math.round(currentLpf / 100) / 10 + 'kHz' : `${currentLpf}Hz`;

  wrap.append(specCanvas, legend, bandCanvas, lufsRow, eqRow, filterRow, presetRow);
  container.append(wrap);

  function mkBtn(text) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sp-ab-btn'; b.textContent = text;
    return b;
  }
  function applyGains(g) {
    gains = g.slice();
    sliders.forEach((s, i) => {
      s.slider.value = String(g[i] || 0);
      s.val.textContent = g[i] > 0 ? '+' + g[i] : String(g[i] || 0);
    });
    graph.setAllGains(gains);
  }
  function applyPreset(p) {
    if (!p) return;
    applyGains(p.gains);
    hpfInput.value = String(p.hpf); hpfVal.textContent = p.hpf + 'Hz'; graph.setHpf(p.hpf);
    lpfInput.value = String(p.lpf);
    lpfVal.textContent = p.lpf >= 1000 ? Math.round(p.lpf / 100) / 10 + 'kHz' : p.lpf + 'Hz';
    graph.setLpf(p.lpf);
  }

  // ── RAF loop (dual analysers → overlaid spectrum; LUFS measure + normalize) ──
  let lufsTimer = 0;
  function tick() {
    rafId = requestAnimationFrame(tick);
    drawSpectrum(specCanvas, graph.postAnalyser, gains, graph.preAnalyser);
    drawBandEnergy(bandCanvas, graph.postAnalyser);

    if (++lufsTimer % 15 === 0) {   // ~250ms
      // Measure the PRE-makeup (post-EQ) loudness so normalization converges to the
      // target rather than chasing its own gain.
      const raw = measureLufs(graph.postAnalyser) - 20 * Math.log10(Math.max(graph.getMakeupGain(), 1e-6));
      if (isFinite(raw)) {
        lufsEwma = lufsEwma === null ? raw : lufsEwma * 0.8 + raw * 0.2;
        const shown = lufsEwma + 20 * Math.log10(Math.max(graph.getMakeupGain(), 1e-6));
        lufsVal.textContent = shown.toFixed(1) + ' LUFS';
        lufsVal.style.color = fmtLufsColor(shown);
        if (lufsTarget !== null && isFinite(lufsEwma)) {
          // Required makeup (dB) to lift the pre-makeup loudness to the target,
          // clamped to ±12 dB so a silent frame can't blow up the gain.
          const deltaDb = Math.max(-12, Math.min(12, lufsTarget - lufsEwma));
          graph.setMakeupGain(Math.pow(10, deltaDb / 20));
          normGainVal.textContent = (deltaDb >= 0 ? '+' : '') + deltaDb.toFixed(1) + ' dB';
        } else {
          normGainVal.textContent = '';
        }
      }
    }
  }

  function start() {
    if (rafId) return;
    graph.resume();
    tick();
  }
  function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

  mediaEl.addEventListener('play', start);
  mediaEl.addEventListener('pause', stop);
  mediaEl.addEventListener('ended', stop);
  if (!mediaEl.paused) start();

  return {
    destroy() {
      stop();
      mediaEl.removeEventListener('play', start);
      mediaEl.removeEventListener('pause', stop);
      mediaEl.removeEventListener('ended', stop);
      // Reset makeup so a later open doesn't inherit a stale normalization gain.
      // (The LUFS target is intentionally LEFT in the graph so the export panel can
      // still read the user's chosen normalization after they close the EQ panel.)
      graph.setMakeupGain(1);
      wrap.remove();
    },
  };
}
