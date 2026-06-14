// Lazy ffmpeg.wasm loader and transcoder. Imported only when the user has enabled
// media transcoding in Advanced settings. The WASM binary (~23 MB) downloads on
// first invocation; the service worker caches it for offline reuse.
//
// Uses @ffmpeg/ffmpeg@0.11.6 + @ffmpeg/core-st@0.11.1 (single-threaded — no
// SharedArrayBuffer or COOP/COEP headers required).

import { loadGlobal, vendor } from '../../core/script-loader.js';

let ffmpegInstance = null;
const CORE_JS = vendor('ffmpeg/ffmpeg-core.js');

// Formats that browsers typically cannot play natively. Extension-based check only;
// the renderer falls back here after a native error event too.
export const TRANSCODE_EXTS = new Set([
  'avi', 'wmv', 'wma', 'flv', 'rm', 'rmvb', 'ts', 'm2ts', 'm2v',
  'asf', 'divx', 'vob', '3gp', 'f4v', 'swf',
]);

export function likelyNeedsTranscode(intake) {
  const name = (intake.filename || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return TRANSCODE_EXTS.has(ext);
}

// Load the ffmpeg.wasm wrapper + core once, cache for the session.
export async function loadFfmpeg(onProgress) {
  if (ffmpegInstance) {
    if (onProgress) ffmpegInstance.setProgress(onProgress);
    return ffmpegInstance;
  }
  const FFmpeg = await loadGlobal(vendor('ffmpeg/ffmpeg.min.js'), 'FFmpeg');
  const ff = FFmpeg.createFFmpeg({ corePath: CORE_JS, log: false });
  if (onProgress) ff.setProgress(onProgress);
  await ff.load();
  ffmpegInstance = ff;
  return ff;
}

// Transcode the intake to MP4 (video) or M4A (audio). Returns a blob: URL; caller
// must call URL.revokeObjectURL when done. onProgress: ({ratio}) => void, ratio 0–1.
export async function transcode(intake, kind, onProgress) {
  const ff = await loadFfmpeg(onProgress);

  const name = intake.filename || 'input';
  const ext = (name.includes('.') ? name.split('.').pop() : 'bin').toLowerCase();
  const inputName = 'input.' + ext;
  const outputName = kind === 'video' ? 'output.mp4' : 'output.m4a';

  // Read the file into memory (ffmpeg.wasm MEMFS).
  let data;
  if (intake.file) {
    data = new Uint8Array(await intake.file.arrayBuffer());
  } else {
    data = intake.bytes instanceof Uint8Array ? intake.bytes : new Uint8Array(intake.bytes.buffer || intake.bytes);
  }
  ff.FS('writeFile', inputName, data);

  try {
    if (kind === 'video') {
      // ultrafast preset keeps transcoding time reasonable in-browser.
      await ff.run('-i', inputName, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outputName);
    } else {
      await ff.run('-i', inputName, '-c:a', 'aac', '-b:a', '128k', outputName);
    }
    const result = ff.FS('readFile', outputName);
    const mime = kind === 'video' ? 'video/mp4' : 'audio/mp4';
    return URL.createObjectURL(new Blob([result.buffer], { type: mime }));
  } finally {
    try { ff.FS('unlink', inputName); } catch { /* ignore */ }
    try { ff.FS('unlink', outputName); } catch { /* ignore */ }
  }
}
