export const MIXER_PROJECT_SCHEMA = 'file-viewer.media-mixer.project';
export const MIXER_PROJECT_VERSION = 1;

export const MIXER_LIMITS = {
  fullHashMaxBytes: 16 * 1024 * 1024,
  partialHashWindowBytes: 1024 * 1024,
  decodedAudioCacheBytes: 200 * 1024 * 1024,
  waveformFullDecodeMaxBytes: 64 * 1024 * 1024,
  ffmpegInputMaxBytes: 512 * 1024 * 1024,
  defaultFps: 30,
  defaultSampleRate: 48000,
  defaultChannels: 2,
  defaultImageDurationMs: 5000,
};

export const MIXER_REAPPLY_CHOICES = Object.freeze({
  APPLY_ALL: 'apply-all',
  ASK_PER_ELEMENT: 'ask-per-element',
  DO_NOT_CHANGE_MEDIA: 'do-not-change-media',
});

export function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function nowIso() {
  return new Date().toISOString();
}

