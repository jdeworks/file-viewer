export const FALLBACK_DURATION = 60;
export const PX_PER_SEC = 9;
export const AUDIO_COMPARE_MAX_BYTES = 24 * 1024 * 1024;
export const AUDIO_COMPARE_MAX_RANGE_SECONDS = 90;
export const AUDIO_COMPARE_COLUMNS = 360;
export const VIDEO_COMPARE_MAX_BYTES = 32 * 1024 * 1024;
export const VIDEO_COMPARE_MAX_RANGE_SECONDS = 12;
export const VIDEO_COMPARE_MAX_FRAMES = 8;
export const VIDEO_COMPARE_WIDTH = 128;
export const VIDEO_COMPARE_HEIGHT = 72;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function durationOf(mediaEl) {
  return Number.isFinite(mediaEl?.duration) && mediaEl.duration > 0 ? mediaEl.duration : FALLBACK_DURATION;
}

export function labelOf(intake) {
  return intake?.filename || intake?.file?.name || 'Open media';
}

export function mediaSourceFromIntake(intake) {
  if (intake?.file) return intake.file;
  if (intake?.bytes) {
    const type = intake?.mime || intake?.type || '';
    return new Blob([intake.bytes], { type });
  }
  return null;
}
