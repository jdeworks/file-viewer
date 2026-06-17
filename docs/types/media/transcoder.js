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
  png: 'image/png', webm: 'video/webm', gif: 'image/gif', webp: 'image/webp',
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

      // ── Phase 3: additional single-file operations ──────────────────────────

      case 'normalize': {
        outputName = 'out.mp4'; outBase = base + '_norm';
        args = ['-i', inputName, '-af', 'loudnorm', '-c:v', 'copy', outputName];
        break;
      }

      case 'gif': {
        const { start: gs, end: ge } = params;
        outputName = 'clip.gif'; outBase = 'clip';
        args = ['-ss', gs, '-to', ge, '-i', inputName,
          '-vf', 'fps=10,scale=480:-1:flags=lanczos', outputName];
        break;
      }

      case 'webp': {
        const { start: ws, end: we } = params;
        outputName = 'clip_anim.webp'; outBase = 'clip_anim';
        args = ['-ss', ws, '-to', we, '-i', inputName,
          '-vf', 'fps=10,scale=480:-1', outputName];
        break;
      }

      case 'thumbstrip': {
        outputName = base + '_strip.png'; outBase = base + '_strip';
        args = ['-i', inputName, '-vf', 'fps=1/10,scale=160:-1,tile=5x2', outputName];
        break;
      }

      case 'rmeta': {
        outputName = 'out.mp4'; outBase = base + '_clean';
        args = ['-i', inputName, '-map_metadata', '-1', '-c:v', 'copy', '-c:a', 'copy', outputName];
        break;
      }

      // ── Phase 3: multi-file operations ──────────────────────────────────────
      // For multi-file ops, params.secondary is the secondary File object.
      // prepareMultiFile() writes both files to MEMFS and returns cleanup fn.

      case 'subtitle': {
        if (!params.secondary) throw new Error('No secondary subtitle file provided.');
        const subFile = params.secondary;
        const subExt = (subFile.name.includes('.') ? subFile.name.split('.').pop() : 'srt').toLowerCase();
        const subName = 'secondary.' + subExt;
        const subBytes = new Uint8Array(await subFile.arrayBuffer());
        ff.FS('writeFile', subName, subBytes);
        outputName = 'out.mp4'; outBase = base + '_sub';
        args = ['-i', inputName, '-i', subName, '-c', 'copy', '-c:s', 'mov_text', outputName];
        try {
          await ff.run(...args);
        } catch (err) {
          throw new Error('Subtitle embedding requires MP4 container.\n\n' + (err.message || String(err)));
        } finally {
          try { ff.FS('unlink', subName); } catch { /* ignore */ }
        }
        // Read result and clean up before returning
        const subResult = ff.FS('readFile', outputName);
        const subBlob = new Blob([subResult.buffer], { type: 'video/mp4' });
        return { url: URL.createObjectURL(subBlob), filename: outBase + '.mp4', bytes: subResult.byteLength };
      }

      case 'concat': {
        if (!params.secondary) throw new Error('No secondary video file provided.');
        const concatFile = params.secondary;
        const concatExt = (concatFile.name.includes('.') ? concatFile.name.split('.').pop() : 'mp4').toLowerCase();
        const concatSecName = 'secondary.' + concatExt;
        const concatBytes = new Uint8Array(await concatFile.arrayBuffer());
        ff.FS('writeFile', concatSecName, concatBytes);
        const concatTxt = `file 'input.${srcExt}'\nfile '${concatSecName}'\n`;
        ff.FS('writeFile', 'concat.txt', concatTxt);
        outputName = 'combined.mp4'; outBase = 'combined';
        args = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', outputName];
        try {
          await ff.run(...args);
        } catch (err) {
          throw new Error(
            'Videos must have same codec and resolution for stream-copy concatenation. Try re-encoding (may be slow).\n\n'
            + (err.message || String(err))
          );
        } finally {
          try { ff.FS('unlink', concatSecName); } catch { /* ignore */ }
          try { ff.FS('unlink', 'concat.txt'); } catch { /* ignore */ }
        }
        const concatResult = ff.FS('readFile', outputName);
        const concatBlob = new Blob([concatResult.buffer], { type: 'video/mp4' });
        return { url: URL.createObjectURL(concatBlob), filename: 'combined.mp4', bytes: concatResult.byteLength };
      }

      case 'audioreplace': {
        if (!params.secondary) throw new Error('No secondary audio file provided.');
        const audioFile = params.secondary;
        const audioExt = (audioFile.name.includes('.') ? audioFile.name.split('.').pop() : 'mp3').toLowerCase();
        const audioSecName = 'secondary.' + audioExt;
        const audioBytes = new Uint8Array(await audioFile.arrayBuffer());
        ff.FS('writeFile', audioSecName, audioBytes);
        outputName = 'out.mp4'; outBase = base + '_swapped';
        args = ['-i', inputName, '-i', audioSecName, '-c:v', 'copy', '-map', '0:v', '-map', '1:a', outputName];
        try {
          await ff.run(...args);
        } finally {
          try { ff.FS('unlink', audioSecName); } catch { /* ignore */ }
        }
        const arResult = ff.FS('readFile', outputName);
        const arBlob = new Blob([arResult.buffer], { type: 'video/mp4' });
        return { url: URL.createObjectURL(arBlob), filename: outBase + '.mp4', bytes: arResult.byteLength };
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
