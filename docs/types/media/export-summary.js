import { describeDynamics } from './audio-filters.js';
import { describeParams } from './export-presets.js';

export function formatKhz(rate) {
  const n = Number(rate);
  if (!isFinite(n)) return '';
  return n >= 1000 ? `${n / 1000}k` : `${n} Hz`;
}

export function formatPresetName(preset) {
  if (!preset?.label) return '';
  return preset.label.split(' (')[0];
}

export function describePresetTarget(preset) {
  const bits = [];
  if (preset.acxChain) bits.push('ACX-targeted chain (source edge spacing preserved)');
  bits.push(`container ${preset.container || 'source'}`);
  if (preset.channels) bits.push(preset.channels === 1 ? 'mono' : `${preset.channels} ch`);
  else bits.push('channels match source');
  if (preset.sampleRate) bits.push(formatKhz(preset.sampleRate));
  else bits.push('sample rate match source');
  if (preset.bitrate) bits.push(preset.cbr ? `${preset.bitrate} CBR` : preset.bitrate);
  else bits.push('VBR');
  if (preset.cleanupChain) bits.push('export cleanup chain');
  if (preset.lufsTarget !== null && preset.lufsTarget !== undefined) bits.push(`loudnorm target ${preset.lufsTarget} LUFS`);
  if (preset.truePeak !== null && preset.truePeak !== undefined) bits.push(`loudnorm TP target ${preset.truePeak} dBTP`);
  if (preset.masterBus) bits.push('master bus');
  return bits.join(', ');
}

export function describeLiveSummary(settings = {}, fades = { fadeIn: 0, fadeOut: 0 }) {
  const bits = [];
  const gains = settings.gains || [];
  const activeBands = gains.filter((gain) => Math.abs(gain) >= 0.1).length;
  if (activeBands) bits.push(`${activeBands} EQ band${activeBands === 1 ? '' : 's'}`);
  if (settings.hpf > 20) bits.push(`HPF ${Math.round(settings.hpf)}Hz`);
  if (settings.lpf < 20000) bits.push(`LPF ${Math.round(settings.lpf)}Hz`);
  const dyn = describeDynamics(settings.dynamics);
  if (dyn) bits.push(dyn);
  if (fades.fadeIn > 0) bits.push(`fade-in ${fades.fadeIn}s`);
  if (fades.fadeOut > 0) bits.push(`fade-out ${fades.fadeOut}s`);
  return bits;
}

export function collectFades(mediaEl, fadeInInput, fadeOutInput) {
  return {
    fadeIn: Math.max(0, parseFloat(fadeInInput.value) || 0),
    fadeOut: Math.max(0, parseFloat(fadeOutInput.value) || 0),
    duration: isFinite(mediaEl.duration) ? mediaEl.duration : 0,
  };
}

export function collectVideoTransform(transformSel, lookSel) {
  return {
    transform: transformSel?.value || 'none',
    look: lookSel?.value || 'source',
  };
}

export function acxChainOptions(p) {
  return {
    lufs: p.lufsTarget,
    truePeak: p.truePeak,
  };
}

function countActiveBands(settings) {
  return (settings.gains || []).filter((gain) => Math.abs(gain) >= 0.1).length;
}

export function buildAudioSummary(preset, resolvedParams, settings, fades, chain) {
  const chainBits = describeLiveSummary(settings, fades);
  const processLabel = resolvedParams.acxChain
    ? 'dedicated ACX chain'
    : (chainBits.join(', ') || 'flat');
  return `Profile ${formatPresetName(preset)}: live chain = ${processLabel}
Output = ${describePresetTarget(resolvedParams)}
Provenance = -af "${chain || 'none'}"`;
}

export function buildVideoSummary({
  preset,
  resolvedParams,
  settings,
  fades,
  videoTransform,
  videoLookLabel,
  videoTransformLabel,
  videoFilterChain,
  audioFilterChain,
}) {
  const bits = [];
  const summary = describeParams(resolvedParams);
  if (summary) bits.push(summary);
  if (videoTransform?.transform !== 'none') bits.push(`transform ${videoTransformLabel(videoTransform.transform)}`);
  if (videoTransform?.look !== 'source') bits.push(`look ${videoLookLabel(videoTransform.look)}`);
  const activeBands = countActiveBands(settings);
  if (activeBands) bits.push(`${activeBands} EQ band${activeBands === 1 ? '' : 's'}`);
  if (settings.hpf > 20) bits.push(`HPF ${Math.round(settings.hpf)}Hz`);
  if (settings.lpf < 20000) bits.push(`LPF ${Math.round(settings.lpf)}Hz`);
  const dyn = describeDynamics(settings.dynamics);
  if (dyn) bits.push(dyn);
  if (fades.fadeIn > 0) bits.push(`fade-in ${fades.fadeIn}s`);
  if (fades.fadeOut > 0) bits.push(`fade-out ${fades.fadeOut}s`);
  const label = preset.id === 'custom' ? 'Custom' : formatPresetName(preset);
  const provenance = [];
  if (videoFilterChain) provenance.push(`-vf "${videoFilterChain}"`);
  if (audioFilterChain) provenance.push(`-af "${audioFilterChain}"`);

  const details = bits.length ? ` — ${bits.join(', ')}` : '';
  const prov = provenance.length ? `  —  Provenance = ${provenance.join('; ')}` : '';
  return `Will bake: ${label}${details}${prov}`;
}
