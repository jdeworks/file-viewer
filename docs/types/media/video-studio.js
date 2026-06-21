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
  { id: 'brightness', label: 'Brightness', min: 0.5, max: 2,   step: 0.05, def: 1, fn: 'brightness', suffix: '' },
  { id: 'contrast',   label: 'Contrast',   min: 0.5, max: 2,   step: 0.05, def: 1, fn: 'contrast',   suffix: '' },
  { id: 'saturate',   label: 'Color',      min: 0,   max: 2,   step: 0.05, def: 1, fn: 'saturate',   suffix: '' },
  { id: 'hue',        label: 'Hue',        min: 0,   max: 360, step: 1,    def: 0, fn: 'hue-rotate', suffix: 'deg' },
  { id: 'blur',       label: 'Blur',       min: 0,   max: 10,  step: 0.5,  def: 0, fn: 'blur',       suffix: 'px' },
  { id: 'grayscale',  label: 'Grayscale',  min: 0,   max: 1,   step: 0.05, def: 0, fn: 'grayscale',  suffix: '' },
  { id: 'invert',     label: 'Invert',     min: 0,   max: 1,   step: 0.05, def: 0, fn: 'invert',     suffix: '' },
];

function buildFilterPanel(el) {
  const details = document.createElement('details');
  details.className = 'media-filter-panel';
  const summary = document.createElement('summary');
  summary.textContent = 'Video filters';
  details.appendChild(summary);

  const values = {};
  FILTERS.forEach(f => { values[f.id] = f.def; });
  const sliderEls = [];

  function apply() {
    // Only emit filter functions that differ from their no-op default → keeps the
    // CSS string short and avoids a needless blur/grayscale at 0.
    const parts = FILTERS
      .filter(f => values[f.id] !== f.def)
      .map(f => `${f.fn}(${values[f.id]}${f.suffix})`);
    el.style.filter = parts.join(' ');
  }

  for (const f of FILTERS) {
    const row = document.createElement('div');
    row.className = 'media-filter-row';
    const lbl = document.createElement('label');
    lbl.textContent = f.label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(f.min); slider.max = String(f.max); slider.step = String(f.step);
    slider.value = String(f.def);
    slider.dataset.filter = f.id;
    slider.addEventListener('input', () => { values[f.id] = parseFloat(slider.value); apply(); });
    sliderEls.push({ slider, f });
    row.append(lbl, slider);
    details.appendChild(row);
  }

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'media-track-btn';
  resetBtn.textContent = 'Reset';
  resetBtn.title = 'Reset filters to default';
  resetBtn.addEventListener('click', () => {
    for (const { slider, f } of sliderEls) { values[f.id] = f.def; slider.value = String(f.def); }
    el.style.filter = '';
  });
  details.appendChild(resetBtn);
  return details;
}

// Build the audio-mixing toggle + lazily-mounted Spectrum & EQ panel for the video.
function buildAudioMixer(el) {
  const wrap = document.createElement('div');
  wrap.className = 'media-wv-wrap media-vid-mixer';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'media-wv-toggle';
  toggle.textContent = '▶ Audio mixer (EQ)';
  const panel = document.createElement('div');
  panel.className = 'media-sp-panel';
  panel.hidden = true;
  wrap.append(toggle, panel);

  let spController = null;
  toggle.addEventListener('click', async () => {
    panel.hidden = !panel.hidden;
    toggle.textContent = panel.hidden ? '▶ Audio mixer (EQ)' : '▼ Audio mixer (EQ)';
    if (panel.hidden) { spController?.destroy(); spController = null; return; }
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

  const filterPanel = buildFilterPanel(el);
  controls.append(seekBack, seekFwd, fsBtn, filterPanel);

  const audioMixer = buildAudioMixer(el);

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
