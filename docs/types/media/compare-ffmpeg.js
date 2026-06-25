import { cancelFfmpeg, formatFfmpegError, loadFfmpeg } from './transcoder.js';
import { buildAudioCompareExtractArgs } from './compare-audio.js';

export const AUDIO_COMPARE_MAX_EXTRACT_BYTES = 64 * 1024 * 1024;

export function formatMb(bytes) {
  const value = Number.isFinite(bytes) ? bytes : 0;
  return `${(value / 1048576).toFixed(1)} MB`;
}

export async function extractAudioRangeToWav(file, sourceRange, label) {
  if (!file) return null;
  if (file.size > AUDIO_COMPARE_MAX_EXTRACT_BYTES) {
    throw new Error(`${label} exceeds ffmpeg compare input cap of ${formatMb(AUDIO_COMPARE_MAX_EXTRACT_BYTES)}.`);
  }

  const ff = await loadFfmpeg();
  const name = file.name || 'input';
  const ext = name.includes('.') ? name.split('.').pop() : 'bin';
  const base = `cmp-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
  const inputName = `${base}.in.${ext}`;
  const outputName = `${base}.out.wav`;

  const cleanup = () => {
    try { ff.FS('unlink', inputName); } catch { /* ignore */ }
    try { ff.FS('unlink', outputName); } catch { /* ignore */ }
  };

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    ff.FS('writeFile', inputName, data);
    const args = buildAudioCompareExtractArgs(inputName, outputName, sourceRange);
    await ff.run(...args);
    const output = ff.FS('readFile', outputName);
    return new Blob([output.buffer], { type: 'audio/wav' });
  } catch (err) {
    try { await cancelFfmpeg(ff); } catch { /* ignore */ }
    throw new Error(formatFfmpegError(err));
  } finally {
    cleanup();
  }
}
