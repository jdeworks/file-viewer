// Video studio controls — the "movie mixing" surface.
//
// Two parts, both lazy from the renderer's video branch:
//   1. Extended CSS video filters (live preview, no re-encode): brightness,
//      contrast, color, hue, blur, grayscale, invert. Composed into one
//      el.style.filter string so they stack.
//   2. Audio mixing: routes the <video>'s audio track through the SAME shared
//      WebAudio EQ/analyser graph the audio player uses (audio-graph.js), so the
//      user can de-ess / HPF-LPF / EQ / LUFS-normalize a movie's audio AND watch
//      the overlaid original-vs-processed spectrum while it plays.
//
// CPU policy: the spectrum panel's own RAF only runs while playing AND the panel
// is open (mountSpectrumPanel handles that); we destroy it when the toggle closes.

// CSS filter spec: each slider contributes one filter function. unit/suffix lets
// hue use deg and blur use px while the rest are bare multipliers.
const FILTERS = [
  { id: 'brightness', label: 'Brightness', min: 0.5, max: 2, step: 0.05, def: 1, fn: 'brightness', suffix: '' },
  { id: 'contrast', label: 'Contrast', min: 0.5, max: 2, step: 0.05, def: 1, fn: 'contrast', suffix: '' },
  { id: 'saturate', label: 'Color', min: 0, max: 2, step: 0.05, def: 1, fn: 'saturate', suffix: '' },
  { id: 'hue', label: 'Hue', min: 0, max: 360, step: 1, def: 0, fn: 'hue-rotate', suffix: 'deg' },
  { id: 'blur', label: 'Blur', min: 0, max: 10, step: 0.5, def: 0, fn: 'blur', suffix: 'px' },
  { id: 'grayscale', label: 'Grayscale', min: 0, max: 1, step: 0.05, def: 0, fn: 'grayscale', suffix: '' },
  { id: 'invert', label: 'Invert', min: 0, max: 1, step: 0.05, def: 0, fn: 'invert', suffix: '' },
];

const FILTER_PRESETS = [
  { id: 'neutral', label: 'Neutral', values: { brightness: 1, contrast: 1, saturate: 1, hue: 0, blur: 0, grayscale: 0, invert: 0 } },
  { id: 'brighter', label: 'Brighter', values: { brightness: 1.2, contrast: 1.05, saturate: 1.08, hue: 0, blur: 0, grayscale: 0, invert: 0 } },
  { id: 'cinema', label: 'Cinema', values: { brightness: 0.95, contrast: 1.22, saturate: 1.15, hue: 4, blur: 0, grayscale: 0, invert: 0 } },
  { id: 'high-contrast', label: 'High contrast', values: { brightness: 1.05, contrast: 1.35, saturate: 1.08, hue: 0, blur: 0, grayscale: 0, invert: 0 } },
  { id: 'soft-blur', label: 'Soft / Blur', values: { brightness: 0.97, contrast: 0.95, saturate: 1.04, hue: 0, blur: 1.4, grayscale: 0, invert: 0 } },
  { id: 'monochrome', label: 'Monochrome', values: { brightness: 1.03, contrast: 1.08, saturate: 0, hue: 0, blur: 0, grayscale: 1, invert: 0 } },
];

const PRESET_BY_ID = new Map(FILTER_PRESETS.map((p) => [p.id, p]));

function buildFilterPanel(el) {
  const wrap = document.createElement('div');
  wrap.className = 'media-video-filters';

  const values = {};
  FILTERS.forEach((f) => { values[f.id] = f.def; });
  const sliderEls = [];
  let activeIntentId = 'neutral';

  const intentCard = document.createElement('div');
  intentCard.className = 'media-tune-intent-card';
  const intentHeading = document.createElement('div');
  intentHeading.className = 'media-tune-intent-heading';
  intentHeading.textContent = 'Quick look';
  const intentStatus = document.createElement('div');
  intentStatus.className = 'media-tune-intent-status';
  const intentRow = document.createElement('div');
  intentRow.className = 'media-tune-intent-row';

  function formatFilterValue(f, value) {
    if (f.id === 'hue' || f.id === 'blur') return `${value}${f.suffix}`;
    if (Number.isInteger(value)) return String(value);
    return String(Math.round(value * 100) / 100).replace(/\.00$/, '');
  }

  function findIntentByValues(snapshot = values) {
    return FILTER_PRESETS.find((preset) => FILTERS.every((f) => Math.abs((snapshot[f.id] ?? f.def) - preset.values[f.id]) <= 0.0001));
  }

  function refreshActiveIntent(id) {
    activeIntentId = id;
    const intentMatch = findIntentByValues();
    const activeId = (activeIntentId && PRESET_BY_ID.has(activeIntentId))
      ? activeIntentId
      : (intentMatch ? intentMatch.id : 'custom');
    const activePresetLabel = activeId === 'custom'
      ? 'Custom'
      : (PRESET_BY_ID.get(activeId)?.label || 'Custom');
    const changed = FILTERS
      .filter((f) => values[f.id] !== f.def)
      .map((f) => `${f.label}: ${formatFilterValue(f, values[f.id])}`);

    intentStatus.textContent = `Look: ${activePresetLabel}${changed.length ? ' · ' + changed.join(' · ') : ' · default'}`;

    intentRow.querySelectorAll('.media-tune-intent-btn').forEach((btn) => {
      const isActive = btn.dataset.intent === activeId;
      btn.classList.toggle('media-tune-intent-btn--active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function emitFilter() {
    const parts = FILTERS
      .filter((f) => values[f.id] !== f.def)
      .map((f) => `${f.fn}(${values[f.id]}${f.suffix})`);
    el.style.filter = parts.join(' ');
    refreshActiveIntent(activeIntentId);
  }

  function applyPreset(id) {
    const preset = PRESET_BY_ID.get(id) || PRESET_BY_ID.get('neutral');
    activeIntentId = preset?.id || 'neutral';
    for (const { f, slider } of sliderEls) {
      const next = preset.values[f.id];
      values[f.id] = next;
      slider.value = String(next);
    }
    emitFilter();
  }

  // Keep quick presets before raw sliders, and keep raw controls under disclosure.
  FILTER_PRESETS.forEach((preset) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'media-tune-intent-btn';
    btn.dataset.intent = preset.id;
    btn.textContent = preset.label;
    btn.title = `${preset.label} preset`;
    btn.addEventListener('click', () => applyPreset(preset.id));
    intentRow.append(btn);
  });

  const customBtn = document.createElement('button');
  customBtn.type = 'button';
  customBtn.className = 'media-tune-intent-btn';
  customBtn.dataset.intent = 'custom';
  customBtn.textContent = 'Custom';
  customBtn.title = 'Manual controls';
  customBtn.addEventListener('click', () => {
    activeIntentId = 'custom';
    refreshActiveIntent('custom');
  });
  intentRow.append(customBtn);

  const quickResetBtn = document.createElement('button');
  quickResetBtn.type = 'button';
  quickResetBtn.className = 'media-track-btn media-filter-reset';
  quickResetBtn.textContent = 'Reset';
  quickResetBtn.title = 'Reset filters to default';
  quickResetBtn.addEventListener('click', () => applyPreset('neutral'));

  intentCard.append(intentHeading, intentStatus, intentRow);

  const details = document.createElement('details');
  details.className = 'media-filter-panel';
  const summary = document.createElement('summary');
  summary.textContent = 'Advanced controls';
  details.appendChild(summary);

  for (const f of FILTERS) {
    const row = document.createElement('div');
    row.className = 'media-filter-row';
    const lbl = document.createElement('label');
    lbl.textContent = f.label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(f.min);
    slider.max = String(f.max);
    slider.step = String(f.step);
    slider.value = String(f.def);
    slider.dataset.filter = f.id;
    slider.addEventListener('input', () => {
      values[f.id] = parseFloat(slider.value);
      activeIntentId = 'custom';
      emitFilter();
    });
    sliderEls.push({ slider, f });
    row.append(lbl, slider);
    details.appendChild(row);
  }

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'media-track-btn media-filter-reset';
  resetBtn.textContent = 'Reset';
  resetBtn.title = 'Reset filters to default';
  resetBtn.addEventListener('click', () => applyPreset('neutral'));

  details.appendChild(resetBtn);
  wrap.append(intentCard, quickResetBtn, details);
  applyPreset('neutral');

  return wrap;
}

// Build the audio-mixing toggle + lazily-mounted Spectrum & EQ panel for the video.
function buildAudioMixer(el) {
  const wrap = document.createElement('div');
  wrap.className = 'media-video-audio-wrap';
  const card = document.createElement('div');
  card.className = 'media-tune-intent-card';

  const audioHeading = document.createElement('div');
  audioHeading.className = 'media-tune-intent-heading';
  audioHeading.textContent = 'Movie audio';
  const audioStatus = document.createElement('div');
  audioStatus.className = 'media-tune-intent-status';
  audioStatus.textContent = 'Spectrum & EQ';

  const panelWrap = document.createElement('div');
  panelWrap.className = 'media-wv-wrap media-vid-mixer';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'media-wv-toggle';
  toggle.textContent = '▶ Spectrum & EQ';

  const panel = document.createElement('div');
  panel.className = 'media-sp-panel';
  panel.hidden = true;
  panelWrap.append(toggle, panel);
  card.append(audioHeading, audioStatus, panelWrap);
  wrap.append(card);

  let spController = null;
  toggle.addEventListener('click', async () => {
    panel.hidden = !panel.hidden;
    toggle.textContent = panel.hidden ? '▶ Spectrum & EQ' : '▼ Spectrum & EQ';
    if (panel.hidden) {
      spController?.destroy();
      spController = null;
      return;
    }

    if (!spController) {
      const { mountSpectrumPanel } = await import('./spectrum-panel.js');
      spController = mountSpectrumPanel(panel, el);
    }
  });

  return { wrap, destroy() { spController?.destroy(); spController = null; } };
}

// Mount the full video studio into a controls container. `el` is the <video>.
// Returns { controls, mixer, destroy }.
export function buildVideoStudio(el) {
  const controls = document.createElement('div');
  controls.className = 'media-video-controls';

  const seekBack = mkBtn('⏪ 10s', 'Seek back 10 seconds');
  seekBack.addEventListener('click', () => { el.currentTime = Math.max(0, el.currentTime - 10); });
  const seekFwd = mkBtn('⏩ 10s', 'Seek forward 10 seconds');
  seekFwd.addEventListener('click', () => { el.currentTime = Math.min(el.duration || 0, el.currentTime + 10); });
  const fsBtn = mkBtn('⛶ Full', 'Enter fullscreen');
  fsBtn.addEventListener('click', () => { (el.closest('.media-doc') || el).requestFullscreen?.(); });

  const quickRow = document.createElement('div');
  quickRow.className = 'media-video-control-row';
  quickRow.append(seekBack, seekFwd, fsBtn);

  const filterPanel = buildFilterPanel(el);
  const audioMixer = buildAudioMixer(el);

  controls.append(quickRow, filterPanel);

  return { controls, mixer: audioMixer.wrap, destroy: audioMixer.destroy };
}

function mkBtn(label, title) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  b.className = 'media-track-btn';
  return b;
}
