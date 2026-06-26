import { MIXER_LIMITS } from './mixer-config.js';

export const CAPABILITY_STATUS = Object.freeze({
  AVAILABLE: 'available',
  OPT_IN: 'opt-in',
  UNSUPPORTED: 'unsupported',
});

export function createRuntimeCapabilities(overrides = {}) {
  return {
    webAudio: overrides.webAudio ?? true,
    nativeAudioDecode: overrides.nativeAudioDecode ?? true,
    nativeVideoPreview: overrides.nativeVideoPreview ?? true,
    imagePreview: overrides.imagePreview ?? true,
    ffmpegEnabled: overrides.ffmpegEnabled ?? false,
    ffmpegLoaded: overrides.ffmpegLoaded ?? false,
    canExportAudioMixBrowser: overrides.canExportAudioMixBrowser ?? true,
    canExportVideoMix: overrides.canExportVideoMix ?? false,
    maxAnalysisBytes: overrides.maxAnalysisBytes ?? MIXER_LIMITS.waveformFullDecodeMaxBytes,
    maxFfmpegInputBytes: overrides.maxFfmpegInputBytes ?? MIXER_LIMITS.ffmpegInputMaxBytes,
  };
}

export function evaluateMixerCapabilities(runtimeInput = {}, project = {}) {
  const runtime = createRuntimeCapabilities(runtimeInput);
  const assets = Array.isArray(project.assets) ? project.assets : [];
  const hasAudio = assets.some((asset) => asset.capabilities?.hasAudio);
  const hasVideo = assets.some((asset) => asset.capabilities?.hasVideo);
  const hasUnsupportedPreview = assets.some((asset) => asset.capabilities?.needsFfmpegForPreview);
  const hasFfmpegExport = assets.some((asset) => asset.capabilities?.needsFfmpegForExport || asset.capabilities?.hasVideo);
  return {
    runtime,
    actions: {
      projectSettings: available('Project settings import/export works without optional media engines.'),
      audioPreview: hasAudio
        ? audioStatus(runtime)
        : unsupported('No audio-capable asset is present.'),
      waveformAnalysis: hasAudio
        ? waveformStatus(runtime)
        : unsupported('No audio-capable asset is present.'),
      nativeVisualPreview: hasVideo
        ? visualStatus(runtime, hasUnsupportedPreview)
        : available('No video asset requires native preview.'),
      browserAudioExport: hasAudio
        ? browserAudioExportStatus(runtime)
        : unsupported('No audio-capable asset is present.'),
      finalVideoExport: hasFfmpegExport
        ? ffmpegStatus(runtime, 'Enable Media Transcoding to render the final video mix.')
        : available('No ffmpeg video export is required for the current project.'),
      ffmpegConversion: hasUnsupportedPreview || hasFfmpegExport
        ? ffmpegStatus(runtime, 'Enable Media Transcoding for conversion, proxy, and final render paths.')
        : available('No conversion is required for the current project.'),
    },
  };
}

export function summarizeReducedCapabilities(evaluation) {
  const actions = evaluation?.actions || {};
  return Object.entries(actions).map(([id, action]) => ({
    id,
    status: action.status,
    message: action.message,
    availableNow: action.status === CAPABILITY_STATUS.AVAILABLE,
    needsOptIn: action.status === CAPABILITY_STATUS.OPT_IN,
  }));
}

function available(message) {
  return { status: CAPABILITY_STATUS.AVAILABLE, message };
}

function optIn(message) {
  return { status: CAPABILITY_STATUS.OPT_IN, message };
}

function unsupported(message) {
  return { status: CAPABILITY_STATUS.UNSUPPORTED, message };
}

function audioStatus(runtime) {
  if (!runtime.webAudio) return unsupported('WebAudio is unavailable; visual project editing and settings export remain available.');
  if (!runtime.nativeAudioDecode) return unsupported('Native audio decode is unavailable; timeline editing remains available.');
  return available('Audio preview can use WebAudio scheduling.');
}

function waveformStatus(runtime) {
  if (!runtime.nativeAudioDecode && !runtime.webAudio) {
    return unsupported('Waveform analysis requires browser audio decode or a future ffmpeg conversion path.');
  }
  return available('Waveform analysis is available within configured memory caps.');
}

function visualStatus(runtime, needsFfmpeg) {
  if (runtime.nativeVideoPreview && !needsFfmpeg) return available('Native browser video preview is available.');
  if (needsFfmpeg) return ffmpegStatus(runtime, 'Enable Media Transcoding to create a preview/proxy for this format.');
  return unsupported('Native video preview is unavailable in this browser/session.');
}

function browserAudioExportStatus(runtime) {
  if (runtime.canExportAudioMixBrowser && runtime.webAudio) return available('Browser audio mix export can be attempted within memory caps.');
  return ffmpegStatus(runtime, 'Enable Media Transcoding for audio export.');
}

function ffmpegStatus(runtime, message) {
  if (runtime.ffmpegEnabled && runtime.ffmpegLoaded) return available('Media Transcoding is loaded.');
  if (runtime.ffmpegEnabled) return optIn('Media Transcoding is enabled but not loaded yet. ' + message);
  return optIn(message);
}

