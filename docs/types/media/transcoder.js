// Lazy ffmpeg.wasm loader and transcoder. Imported only when the user has enabled
// media transcoding in Advanced settings. The WASM binary (~23 MB) downloads on
// first invocation; the service worker caches it for offline reuse.
//
// Uses @ffmpeg/ffmpeg@0.11.6 + @ffmpeg/core-st@0.11.1 (single-threaded — no
// SharedArrayBuffer or COOP/COEP headers required).
//
// Exports:
//   loadFfmpeg(onProgress?)  → ffmpeg instance
//   transcode(intake, kind, onProgress)  → blob URL  (Phase 1 / format-convert)
//   runOperation(ff, opId, params, intake)  → { url, filename, bytes }  (Phase 2 editor)

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

// ── Phase 2: editor operations ──────────────────────────────────────────────
//
// runOperation(ff, opId, params, intake)
//   ff       — loaded ffmpeg instance (from loadFfmpeg)
//   opId     — one of: trim | audio | mute | screenshot | downscale | volume | speed | webm
//   params   — operation-specific object (see below)
//   intake   — file descriptor {filename, file, bytes}
//
// Returns: { url: blobUrl, filename: string, bytes: number }
// Caller is responsible for URL.revokeObjectURL(url) when done.

async function readIntake(intake) {
  if (intake.file) return new Uint8Array(await intake.file.arrayBuffer());
  return intake.bytes instanceof Uint8Array
    ? intake.bytes
    : new Uint8Array(intake.bytes.buffer || intake.bytes);
}

const MIME = {
  mp4: 'video/mp4', mp3: 'audio/mpeg', ogg: 'audio/ogg',
  png: 'image/png', webm: 'video/webm',
};

export async function runOperation(ff, opId, params, intake) {
  const srcName = intake.filename || 'input';
  const srcExt  = (srcName.includes('.') ? srcName.split('.').pop() : 'bin').toLowerCase();
  const inputName = 'input.' + srcExt;
  const base = srcName.replace(/\.[^.]+$/, '');

  const data = await readIntake(intake);
  ff.FS('writeFile', inputName, data);

  let outputName, args, outBase;

  try {
    switch (opId) {
      case 'trim': {
        // Stream-copy (fast) unless precise re-encode is requested.
        const { start, end, precise } = params;
        outputName = 'out.mp4'; outBase = base + '_trim';
        if (precise) {
          args = ['-i', inputName, '-ss', start, '-to', end,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', outputName];
        } else {
          // Input-seeking (pre-input -ss) = fast stream-copy; post-input -ss = frame-accurate but re-encodes.
          args = ['-ss', start, '-to', end, '-i', inputName, '-c', 'copy', outputName];
        }
        break;
      }

      case 'audio': {
        const fmt = params.format || 'mp3';
        if (fmt === 'mp3') {
          outputName = 'out.mp3'; outBase = base + '_audio';
          args = ['-i', inputName, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', outputName];
        } else {
          outputName = 'out.ogg'; outBase = base + '_audio';
          args = ['-i', inputName, '-vn', '-c:a', 'libvorbis', '-q:a', '4', outputName];
        }
        break;
      }

      case 'mute': {
        outputName = 'out.mp4'; outBase = base + '_muted';
        args = ['-i', inputName, '-c:v', 'copy', '-an', outputName];
        break;
      }

      case 'screenshot': {
        const ts = params.ts || '00:00:00';
        outputName = 'thumb.png'; outBase = base + '_thumb';
        // Input-seeking for speed, then limit to 1 frame.
        args = ['-ss', ts, '-i', inputName, '-frames:v', '1', outputName];
        break;
      }

      case 'downscale': {
        // Use force_original_aspect_ratio=decrease to avoid stretching.
        // trunc(X/2)*2 ensures even dimensions so libx264 doesn't refuse.
        const [W, H] = (params.res || '1280:720').split(':');
        const scaleFilter = 'scale=' + W + ':' + H
          + ':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2';
        outputName = 'out.mp4'; outBase = base + '_' + H + 'p';
        args = ['-i', inputName, '-vf', scaleFilter, '-c:a', 'copy', outputName];
        break;
      }

      case 'volume': {
        const level = parseFloat(params.level || 1).toFixed(2);
        outputName = 'out.mp4'; outBase = base + '_vol';
        args = ['-i', inputName, '-af', 'volume=' + level, '-c:v', 'copy', outputName];
        break;
      }

      case 'speed': {
        const rate = parseFloat(params.rate || 0.5);
        // setpts inverse of speed: 0.5× → setpts=2.0*PTS; 2× → setpts=0.5*PTS
        const pts   = (1 / rate).toFixed(4);
        const tempo = rate.toFixed(4);   // atempo range: 0.5–2.0 — both 0.5 and 2.0 are safe
        outputName = 'out.mp4'; outBase = base + '_speed';
        args = ['-i', inputName,
          '-filter:v', 'setpts=' + pts + '*PTS',
          '-filter:a', 'atempo=' + tempo,
          outputName];
        break;
      }

      case 'webm': {
        outputName = 'out.webm'; outBase = base + '_converted';
        args = ['-i', inputName,
          '-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0',
          '-c:a', 'libopus',
          outputName];
        break;
      }

      default:
        throw new Error('Unknown operation: ' + opId);
    }

    await ff.run(...args);

    const result = ff.FS('readFile', outputName);
    const ext = outputName.split('.').pop();
    const mime = MIME[ext] || 'application/octet-stream';
    const blob = new Blob([result.buffer], { type: mime });
    const url  = URL.createObjectURL(blob);
    const filename = outBase + '.' + ext;
    return { url, filename, bytes: result.byteLength };

  } finally {
    try { ff.FS('unlink', inputName); } catch { /* ignore */ }
    if (outputName) { try { ff.FS('unlink', outputName); } catch { /* ignore */ } }
  }
}
