// Lightweight mastering-chain stage summaries for the Tune and Export surfaces.
// Pure data in, stage objects out; no decode/ffmpeg work here.

function activeBands(settings = {}) {
  const gains = Array.isArray(settings.gains) ? settings.gains : [];
  const freqs = Array.isArray(settings.freqs) ? settings.freqs : [];
  return gains
    .map((gain, i) => ({ gain: Number(gain), freq: Number(freqs[i]) }))
    .filter((band) => isFinite(band.gain) && Math.abs(band.gain) >= 0.1);
}

function fmtFreq(freq) {
  const n = Number(freq);
  if (!isFinite(n)) return '';
  return n >= 1000 ? (Math.round(n / 100) / 10) + 'kHz' : Math.round(n) + 'Hz';
}

function fmtLufs(value) {
  return Number(value) + ' LUFS';
}

function tuneSummary(settings = {}) {
  const bits = [];
  const bands = activeBands(settings);
  if (bands.length) {
    const preview = bands.slice(0, 3)
      .map((band) => fmtFreq(band.freq) + ' ' + (band.gain > 0 ? '+' : '') + band.gain + 'dB');
    bits.push(bands.length + ' EQ band' + (bands.length === 1 ? '' : 's') + ' (' + preview.join(', ') + ')');
  }
  if (Number(settings.hpf) > 20) bits.push('HPF ' + fmtFreq(settings.hpf));
  if (Number(settings.lpf) < 20000) bits.push('LPF ' + fmtFreq(settings.lpf));
  if (settings.lufsTarget !== null && settings.lufsTarget !== undefined && isFinite(Number(settings.lufsTarget))) {
    bits.push('live normalize ' + fmtLufs(settings.lufsTarget));
  }
  return { active: bits.length > 0, detail: bits.join(', ') || 'No live EQ, filters, or LUFS target.' };
}

function dynamicsSummary(settings = {}) {
  const dyn = settings.dynamics || {};
  const bits = [];
  if (dyn.comp?.enabled) bits.push('compressor live');
  if (dyn.limiter?.enabled) bits.push('limiter live');
  if (dyn.gate?.enabled) bits.push('gate export-only');
  if (dyn.denoise?.enabled) bits.push('de-noise export-only');
  return { active: bits.length > 0, detail: bits.join(', ') || 'No compressor, limiter, gate, or de-noise enabled.' };
}

function outputSummary(params = {}) {
  params = params || {};
  const bits = [];
  const hasLoudnessTarget = params.lufsTarget !== null
    && params.lufsTarget !== undefined
    && isFinite(Number(params.lufsTarget));
  const hasTpStage = hasLoudnessTarget || params.acxChain || params.cleanupChain || params.masterBus;
  if (params.acxChain) bits.push('ACX chain');
  if (params.cleanupChain) bits.push('Cleanup chain');
  if (params.masterBus) bits.push('Master bus');
  if (hasLoudnessTarget) bits.push('loudnorm ' + fmtLufs(params.lufsTarget));
  if (hasTpStage && params.truePeak !== null && params.truePeak !== undefined) bits.push('TP ' + params.truePeak + ' dBTP');
  if (params.sampleRate) bits.push((Number(params.sampleRate) / 1000) + ' kHz');
  else if (params.sampleRate === null) bits.push('sample rate matches source');
  if (params.channels === 1) bits.push('mono');
  else if (params.channels === 2) bits.push('stereo');
  else if (params.channels === null) bits.push('channels match source');
  if (params.bitrate) bits.push(params.bitrate + (params.cbr ? ' CBR' : ''));
  if (params.container) bits.push(String(params.container).toUpperCase());
  return {
    active: bits.length > 0,
    detail: bits.join(', ') || 'Export preset/output target chosen in Export.',
  };
}

export function summarizeMasteringStages(settings = {}, params = null) {
  const tune = tuneSummary(settings);
  const dynamics = dynamicsSummary(settings);
  const master = params ? outputSummary(params) : outputSummary(null);
  return [
    { id: 'raw', label: 'Raw source', active: true, detail: 'Unchanged source signal.' },
    { id: 'tune', label: 'Tune/EQ', active: tune.active, detail: tune.detail },
    { id: 'dynamics', label: 'Dynamics', active: dynamics.active, detail: dynamics.detail },
    { id: 'master', label: 'Master bus', active: master.active, detail: master.detail },
  ];
}

export function renderStageCompare(el, stages) {
  if (!el) return;
  el.replaceChildren(...stages.map((stage) => {
    const item = document.createElement('div');
    item.className = 'sp-stage' + (stage.active ? ' sp-stage--active' : '');
    const label = document.createElement('div');
    label.className = 'sp-stage-label';
    label.textContent = stage.label;
    const detail = document.createElement('div');
    detail.className = 'sp-stage-detail';
    detail.textContent = stage.detail;
    item.append(label, detail);
    return item;
  }));
}
