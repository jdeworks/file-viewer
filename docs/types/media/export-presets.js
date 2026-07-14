// P2 — Export presets + advanced-override UI for the Media Studio export panel.
//
// Two concerns, kept out of studio-export.js so that file stays a thin UI shell
// (LOC cap):
//   1. EXPORT_PRESETS — a PURE data table (no DOM, no ffmpeg) mapping a preset id to
//      concrete export params (container/codec, bitrate, sample rate, channels,
//      loudness target, true-peak). Unit-testable.
//   2. buildAdvancedOverrides() — the vanilla-DOM "Custom" override controls
//      (container / bitrate / sample-rate / channels / loudness) that compose ON TOP
//      of the live-EQ `-af` chain. Revealed when the "Custom" preset is chosen.
//
// The params shape consumed by transcoder.js bakeAudio / webvideo / acxExport is:
//   { kind, container, bitrate, sampleRate, channels, lufsTarget, truePeak, video }
// where bitrate is an ffmpeg `-b:a` value (e.g. '192k') or null for VBR/default,
// lufsTarget is a number (LUFS) or null (no loudnorm), truePeak is the loudnorm TP dB,
// and acxChain marks presets that must use the dedicated ACX export op. cleanupChain
// names an export-only ffmpeg mastering cleanup chain expanded by audio-filters.js.
//
// masterBus is an opt-in mastering stage flag:
// - false / undefined -> no master-bus processing
// - true -> default master-bus preset in audio-filters.js

// ── Preset table ─────────────────────────────────────────────────────────────
// kind: 'audio' presets apply to both audio & video sources (extract/encode audio);
//       'video' presets only appear when the source is a video.
export const EXPORT_PRESETS = [
  {
    id: 'custom', label: 'Custom (advanced)…', kind: 'audio',
    container: null, bitrate: null, sampleRate: null, channels: null,
    lufsTarget: undefined, truePeak: undefined,
  },
  {
    id: 'podcast-mp3', label: 'Podcast MP3 (−16 LUFS, 44.1k, 192k)', kind: 'audio',
    container: 'mp3', bitrate: '192k', sampleRate: 44100, channels: 2,
    lufsTarget: -16, truePeak: -1.5,
  },
  {
    id: 'podcast-mp3-master-bus', label: 'Podcast MP3 + Master Bus (−16 LUFS, 44.1k, 192k)', kind: 'audio',
    container: 'mp3', bitrate: '192k', sampleRate: 44100, channels: 2,
    lufsTarget: -16, truePeak: -1.5, masterBus: true,
  },
  {
    id: 'podcast-cleanup-mp3', label: 'Podcast Cleanup MP3 (source rate/ch, −16 LUFS, 192k)', kind: 'audio',
    container: 'mp3', bitrate: '192k', sampleRate: null, channels: null,
    lufsTarget: -16, truePeak: -1.5,
    cleanupChain: 'spoken-cleanup',
  },
  {
    id: 'acx-mp3', label: 'Audiobook ACX-targeted MP3 (mono, 44.1k, 192k CBR, −20 LUFS)', kind: 'audio',
    container: 'mp3', bitrate: '192k', sampleRate: 44100, channels: 1,
    lufsTarget: -20, truePeak: -3, cbr: true,
    acxChain: true,
  },
  {
    id: 'web-mp4-720p', label: 'Web video (MP4 720p)', kind: 'video',
    container: 'mp4', bitrate: '192k', sampleRate: 48000, channels: 2,
    lufsTarget: undefined, truePeak: undefined,
    video: { codec: 'libx264', preset: 'ultrafast', scale: '-2:720', audioCodec: 'aac' },
  },
  {
    id: 'small-webm', label: 'Small clip (WebM)', kind: 'video',
    container: 'webm', bitrate: null, sampleRate: null, channels: null,
    lufsTarget: undefined, truePeak: undefined,
    video: { codec: 'libvpx-vp9', audioCodec: 'libopus' },
  },
];

export function presetById(id) {
  return EXPORT_PRESETS.find((p) => p.id === id) || EXPORT_PRESETS[0];
}

// Audio containers offered in the advanced override picker.
export const AUDIO_CONTAINERS = [
  ['mp3', 'MP3'], ['wav', 'WAV (PCM)'], ['m4a', 'M4A / AAC'],
  ['ogg', 'OGG / Vorbis'], ['opus', 'Opus'], ['flac', 'FLAC (lossless)'],
];

// Resolve the final export params from a preset + the advanced-override controls.
// When the preset is 'custom', the override values win; otherwise the preset's
// concrete values are used (overrides are hidden). PURE — no DOM beyond reading
// the passed plain values. `srcExt` is the source extension (for 'source' container).
export function resolveExportParams(preset, overrides, srcExt) {
  if (preset.id !== 'custom') {
    return {
      kind: preset.kind,
      container: preset.container,
      bitrate: preset.bitrate,
      sampleRate: preset.sampleRate,
      channels: preset.channels,
      lufsTarget: preset.lufsTarget === undefined ? null : preset.lufsTarget,
      truePeak: preset.truePeak === undefined ? -1.5 : preset.truePeak,
      cbr: !!preset.cbr,
      acxChain: !!preset.acxChain,
      masterBus: !!preset.masterBus,
      cleanupChain: preset.cleanupChain || null,
      video: preset.video || null,
    };
  }
  // Custom: read the override controls.
  let container = overrides.container;
  if (container === 'source') {
    container = ['mp3', 'wav', 'm4a', 'ogg', 'opus', 'flac'].includes(srcExt) ? srcExt : 'mp3';
  }
  return {
    kind: 'audio',
    container,
    bitrate: overrides.bitrate || null,
    sampleRate: overrides.sampleRate ? Number(overrides.sampleRate) : null,
    channels: overrides.channels ? Number(overrides.channels) : null,
    lufsTarget: (overrides.lufsTarget === '' || overrides.lufsTarget === 'off' || overrides.lufsTarget == null)
      ? null : Number(overrides.lufsTarget),
    truePeak: -1.5,
    masterBus: false,
    cleanupChain: null,
    cbr: false,
    acxChain: false,
    video: null,
  };
}

// Build audio settings that feed ffmpeg filter-chain builders from resolved export params
// and the live graph settings. This stays pure for unit tests.
export function resolveExportAudioSettings(p, settings = {}) {
  const chainSettings = { ...settings };
  if (p.lufsTarget !== null && p.lufsTarget !== undefined) {
    chainSettings.lufsTarget = p.lufsTarget;
    chainSettings.truePeak = p.truePeak;
  }
  if (p.masterBus) chainSettings.masterBus = true;
  if (p.cleanupChain) chainSettings.cleanupChain = p.cleanupChain;
  return chainSettings;
}

// Human-readable params summary fragment ("ACX-targeted chain, mono, 44.1k, 192k CBR,
// normalize −20 LUFS").
export function describeParams(p) {
  const bits = [];
  if (p.acxChain) bits.push('ACX-targeted chain');
  if (p.cleanupChain) bits.push('cleanup: de-hum, de-noise, de-plosive, leveler');
  if (p.masterBus) bits.push('master bus');
  if (p.video) {
    if (p.video.scale) bits.push(p.video.scale.split(':').pop() + 'p');
    bits.push((p.video.codec || 'video').replace('lib', ''));
  }
  if (p.channels === 1) bits.push('mono');
  else if (p.channels === 2) bits.push('stereo');
  if (p.sampleRate) bits.push((p.sampleRate / 1000) + 'k');
  if (p.bitrate) bits.push(p.bitrate + (p.cbr ? ' CBR' : ''));
  if (p.lufsTarget !== null && p.lufsTarget !== undefined) {
    bits.push('loudnorm target ' + p.lufsTarget + ' LUFS'
      + (p.truePeak !== null && p.truePeak !== undefined ? ' / TP ' + p.truePeak + ' dBTP' : ''));
  }
  return bits.join(', ');
}

// ── Advanced-override UI (vanilla DOM) ───────────────────────────────────────
function mkSelect(cls, opts, initial) {
  const sel = document.createElement('select');
  sel.className = cls;
  opts.forEach(([v, t]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = t;
    if (v === initial) o.selected = true;
    sel.appendChild(o);
  });
  return sel;
}

function labelled(text, control) {
  const l = document.createElement('label');
  l.className = 'media-export-adv-field';
  l.append(document.createTextNode(text + ' '), control);
  return l;
}

// Build the collapsible advanced-override controls. Returns { el, read(), onChange() }.
// read() returns { container, bitrate, sampleRate, channels, lufsTarget } (strings).
export function buildAdvancedOverrides() {
  const wrap = document.createElement('div');
  wrap.className = 'media-export-adv';

  const container = mkSelect('media-export-fmt media-export-container',
    [['source', 'Match source'], ...AUDIO_CONTAINERS], 'mp3');
  const bitrate = mkSelect('media-export-bitrate',
    [['', 'VBR (default)'], ['128k', '128 kbps'], ['192k', '192 kbps'],
     ['256k', '256 kbps'], ['320k', '320 kbps']], '192k');
  const sampleRate = mkSelect('media-export-sr',
    [['', 'Match source'], ['44100', '44.1 kHz'], ['48000', '48 kHz']], '');
  const channels = mkSelect('media-export-ac',
    [['', 'Match source'], ['1', 'Mono'], ['2', 'Stereo']], '');
  const lufsTarget = mkSelect('media-export-lufs',
    [['off', 'Off'], ['-14', '−14 LUFS'], ['-16', '−16 LUFS'],
     ['-18', '−18 LUFS'], ['-20', '−20 LUFS'], ['-23', '−23 LUFS']], 'off');

  wrap.append(
    labelled('Container', container),
    labelled('Bitrate', bitrate),
    labelled('Sample rate', sampleRate),
    labelled('Channels', channels),
    labelled('Loudness', lufsTarget),
  );

  return {
    el: wrap,
    read() {
      return {
        container: container.value,
        bitrate: bitrate.value,
        sampleRate: sampleRate.value,
        channels: channels.value,
        lufsTarget: lufsTarget.value,
      };
    },
    onChange(fn) {
      [container, bitrate, sampleRate, channels, lufsTarget]
        .forEach((s) => s.addEventListener('change', fn));
    },
  };
}
