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
// PURE filter-string builders live in audio-filters.js (extracted to keep this
// file under the LOC cap after P4 dynamics). Re-exported so existing importers
// (studio-export.js, tests) keep importing them from transcoder.js unchanged.
import { buildAudioFilterChain, audioEncodeArgs, buildAcxExportArgs, buildAcxChapterExportArgs } from './audio-filters.js';
export { buildAudioFilterChain, audioEncodeArgs } from './audio-filters.js';
// P8c/P8e — PURE ACX arg builders (silence-cut, room-tone pad, one-click compliant
// export). Re-exported so the export panel + tests import them from here unchanged.
export { buildAcxFilterChain, buildAcxExportArgs, buildAcxChapterExportArgs, silenceRemoveFilter, roomTonePadFilter } from './audio-filters.js';
// P6 — PURE timeline transition arg builders (xfade / acrossfade / mux music). Kept in
// video-filters.js so they stay unit-testable and this file stays under the LOC cap.
import { buildXfadeArgs, buildAcrossfadeArgs, buildMuxMusicArgs, buildSubtitleBurnArgs, buildVideoExportFilterChain } from './video-filters.js';
export { buildSubtitleBurnArgs, buildVideoExportFilterChain } from './video-filters.js';

let ffmpegInstance = null;
const CORE_JS = vendor('ffmpeg/ffmpeg-core.js');

const FF_MSG_CANCELLED = 'Operation cancelled.';
const FFMSG_ERROR_CANCELLED = /ffmpeg exit/i;
const FFMSG_ERROR_UNSUPPORTED = /(unsupported .*?(?:codec|format|container)|unknown (?:decoder|encoder)|could not find .*?(?:codec|encoder|decoder)|no (?:decoder|encoder) for stream|codec.*not supported)/i;
const FFMSG_ERROR_DECODE = /(invalid data found when processing input|moov atom not found|non-increasing dts|error while decoding|could not decode|stream.*not found|invalid codec parameters|corrupt data|broken pipe)/i;

function ffErrorMessage(err) {
  return err == null ? '' : String(err?.message || err);
}

function ffErrorLines(message) {
  const lines = message.replace(/\r/g, '').split('\n');
  const first = (lines[0] || '').trim() || 'FFmpeg operation failed.';
  const detail = lines.slice(1).join('\n').trim();
  return { first, detail };
}

export function classifyFfmpegError(error) {
  const message = ffErrorMessage(error);
  if (!message) return { headline: 'FFmpeg operation failed.' };
  if (FFMSG_ERROR_CANCELLED.test(message)) return { headline: FF_MSG_CANCELLED };
  if (FFMSG_ERROR_UNSUPPORTED.test(message)) {
    return { headline: 'Unsupported codec or container for this operation.', detail: message };
  }
  if (FFMSG_ERROR_DECODE.test(message)) {
    return { headline: 'Could not decode this media for that operation.', detail: message };
  }
  return ffErrorLines(message);
}

export function formatFfmpegError(error) {
  const { headline, detail } = classifyFfmpegError(error);
  return detail ? `${headline}\n\n${detail}` : headline;
}

// Cancel/reload helper: clear cached ffmpeg instance so `loadFfmpeg()` won't
// return a terminated wrapper after a manual cancel.
export async function cancelFfmpeg(ff) {
  ffmpegInstance = null;
  if (!ff?.exit) return;
  try {
    await ff.exit();
  } catch { /* ignore */ }
}

export function __setFfmpegInstanceForTest(instance) {
  ffmpegInstance = instance;
}

export function __getFfmpegInstanceForTest() {
  return ffmpegInstance;
}

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

// NOTE: buildAudioFilterChain + audioEncodeArgs now live in audio-filters.js
// (imported + re-exported at the top of this file) so this module stays under the
// LOC cap after the P4 dynamics filters (acompressor/alimiter/agate/afftdn) landed.

const MIME = {
  mp4: 'video/mp4', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4',
  opus: 'audio/ogg', flac: 'audio/flac',
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

      // ── P1/P3: bake the live EQ/HPF/LPF/normalize + audio fades into a new audio file ──
      // params: { settings, fades, format } — settings/fades from buildAudioFilterChain().
      // Two-pass loudnorm is impractical in single-threaded ffmpeg.wasm (it needs a JSON
      // round-trip parsed from stderr, which the wrapper doesn't expose), so we use the
      // single-pass dynamic normalizer — accurate enough for export and far cheaper in-browser.
      case 'bakeAudio': {
        // P2: inject the preset/override loudness target into the live EQ settings so
        // loudnorm is emitted ONCE by buildAudioFilterChain (no double-applying), then
        // append -ar / -ac / codec+bitrate from the chosen preset or advanced overrides.
        const baseSettings = params.settings || {};
        const settings = (params.lufsTarget !== undefined && params.lufsTarget !== null)
          ? { ...baseSettings, lufsTarget: params.lufsTarget, truePeak: params.truePeak }
          : baseSettings;
        const chain = buildAudioFilterChain(settings, params.fades || {});
        const enc = audioEncodeArgs(params.container || params.format,
          { bitrate: params.bitrate, cbr: params.cbr });
        outputName = 'out.' + enc.ext; outBase = base + '_processed';
        args = ['-i', inputName, '-vn'];
        if (chain) args.push('-af', chain);
        if (params.sampleRate) args.push('-ar', String(params.sampleRate));
        if (params.channels) args.push('-ac', String(params.channels));
        args.push(...enc.args, outputName);
        break;
      }

      // ── P8c/P8e: one-click ACX-compliant export. loudnorm −20 LUFS / −3 dBTP +
      // silenceremove (dead-air trim) + head/tail room-tone pad, forced to mono /
      // 44.1 kHz / MP3 192 k CBR. params: { lufs, truePeak, silence, pad }. The arg
      // list is built PURE (audio-filters.js) so it's unit-tested without ffmpeg. ──
      case 'acxExport': {
        outputName = 'out.mp3'; outBase = base + '_ACX';
        args = buildAcxExportArgs(inputName, outputName, {
          lufs: params.lufs, truePeak: params.truePeak,
          silence: params.silence, pad: params.pad,
        });
        break;
      }

      // ── P2: web-video preset — re-encode to MP4 720p (H.264 + AAC) or another
      // single-clip video container. params: { video:{codec,preset,scale,audioCodec},
      // container, bitrate, sampleRate, channels }. The live-EQ -af chain + fades
      // still apply to the audio track.
      case 'webvideo': {
        const v = params.video || {};
        const vf = buildVideoExportFilterChain(v, params.transform || {});
        const ext = params.container || 'mp4';
        outputName = 'out.' + ext; outBase = base + '_' + (v.scale ? v.scale.split(':').pop() + 'p' : 'web');
        args = ['-i', inputName];
        if (vf) args.push('-vf', vf);
        args.push('-c:v', v.codec || 'libx264');
        if (v.preset) args.push('-preset', v.preset);
        if (v.codec === 'libvpx-vp9') args.push('-crf', '33', '-b:v', '0');
        else args.push('-crf', '28', '-movflags', '+faststart');
        const aSettings = (params.lufsTarget !== undefined && params.lufsTarget !== null)
          ? { ...(params.settings || {}), lufsTarget: params.lufsTarget, truePeak: params.truePeak }
          : (params.settings || {});
        const aChain = buildAudioFilterChain(aSettings, params.fades || {});
        if (aChain) args.push('-af', aChain);
        if (params.sampleRate) args.push('-ar', String(params.sampleRate));
        if (params.channels) args.push('-ac', String(params.channels));
        args.push('-c:a', v.audioCodec || 'aac', '-b:a', params.bitrate || '192k', outputName);
        break;
      }

      // ── P3: video fade to/from black (single clip). params: { fadeIn, fadeOut, duration } ──
      case 'videofade': {
        const vf = [];
        const fi = Number(params.fadeIn);
        if (isFinite(fi) && fi > 0) vf.push('fade=t=in:st=0:d=' + (Math.round(fi * 100) / 100));
        const fo = Number(params.fadeOut);
        const vdur = Number(params.duration);
        if (isFinite(fo) && fo > 0 && isFinite(vdur) && vdur > fo) {
          vf.push('fade=t=out:st=' + (Math.round((vdur - fo) * 100) / 100) + ':d=' + (Math.round(fo * 100) / 100));
        }
        if (!vf.length) throw new Error('Set a fade-in and/or fade-out duration first.');
        outputName = 'out.mp4'; outBase = base + '_fade';
        // Re-encode video (fade is destructive); keep audio as-is.
        args = ['-i', inputName, '-vf', vf.join(','),
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'copy', outputName];
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

      case 'subtitleBurn': {
        if (!params.secondary) throw new Error('Choose an SRT or VTT subtitle file first.');
        const burnFile = params.secondary;
        const burnExt = (burnFile.name.includes('.') ? burnFile.name.split('.').pop() : 'srt').toLowerCase();
        if (burnExt !== 'srt' && burnExt !== 'vtt') throw new Error('Subtitle burn-in supports .srt and .vtt files.');
        const burnName = 'subtitle.' + burnExt;
        ff.FS('writeFile', burnName, new Uint8Array(await burnFile.arrayBuffer()));
        outputName = 'out.mp4'; outBase = base + '_sub_burned';
        args = buildSubtitleBurnArgs(inputName, burnName, outputName, { ext: burnExt });
        try {
          await ff.run(...args);
        } catch (err) {
          throw new Error('Subtitle burn-in needs a decodable video and valid SRT/VTT cues.\n\n' + (err.message || String(err)));
        } finally {
          try { ff.FS('unlink', burnName); } catch { /* ignore */ }
        }
        const burnResult = ff.FS('readFile', outputName);
        return {
          url: URL.createObjectURL(new Blob([burnResult.buffer], { type: 'video/mp4' })),
          filename: outBase + '.mp4',
          bytes: burnResult.byteLength,
        };
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

      // ── P6: timeline transitions (multi-file). A second clip / music bed is written
      // to MEMFS, then a PURE arg builder (video-filters.js) produces the ffmpeg args.
      // xfade/acrossfade need both inputs decodable; mismatched video → friendly error. ──
      case 'xfade':
      case 'acrossfade':
      case 'muxmusic': {
        if (!params.secondary) throw new Error('No second clip / music file provided.');
        const sec = params.secondary;
        const secExt = (sec.name.includes('.') ? sec.name.split('.').pop() : 'mp4').toLowerCase();
        const secName = 'secondary.' + secExt;
        ff.FS('writeFile', secName, new Uint8Array(await sec.arrayBuffer()));
        let tlArgs, tlOut, tlMime, tlBase;
        if (opId === 'xfade') {
          tlOut = 'out.mp4'; tlMime = 'video/mp4'; tlBase = base + '_xfade';
          tlArgs = buildXfadeArgs(inputName, secName, tlOut,
            { durationA: params.durationA, transition: params.transition, duration: params.duration });
        } else if (opId === 'acrossfade') {
          tlOut = 'out.m4a'; tlMime = 'audio/mp4'; tlBase = base + '_crossfade';
          tlArgs = buildAcrossfadeArgs(inputName, secName, tlOut, { duration: params.duration });
        } else {
          tlOut = 'out.mp4'; tlMime = 'video/mp4'; tlBase = base + '_music';
          tlArgs = buildMuxMusicArgs(inputName, secName, tlOut, { musicGain: params.musicGain });
        }
        try {
          await ff.run(...tlArgs);
        } catch (err) {
          const why = opId === 'xfade'
            ? 'Both clips must share resolution, frame-rate and pixel format for an xfade dissolve. Downscale them to the same size first.'
            : (opId === 'acrossfade'
              ? 'Both clips need a decodable audio track to crossfade.'
              : 'The music bed could not be mixed under the video audio.');
          throw new Error(why + '\n\n' + (err.message || String(err)));
        } finally {
          try { ff.FS('unlink', secName); } catch { /* ignore */ }
        }
        const tlResult = ff.FS('readFile', tlOut);
        const tlExt = tlOut.split('.').pop();
        try { ff.FS('unlink', tlOut); } catch { /* ignore */ }
        return { url: URL.createObjectURL(new Blob([tlResult.buffer], { type: tlMime })),
          filename: tlBase + '.' + tlExt, bytes: tlResult.byteLength };
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

export async function runAcxChapterExports(ff, intake, chapters, options = {}) {
  const srcName = intake.filename || 'input';
  const srcExt  = (srcName.includes('.') ? srcName.split('.').pop() : 'bin').toLowerCase();
  const inputName = 'chapter_input.' + srcExt;
  const data = await readIntake(intake);
  ff.FS('writeFile', inputName, data);

  const files = [];
  try {
    for (let i = 0; i < chapters.length; i += 1) {
      const outputName = 'chapter_' + String(i + 1).padStart(3, '0') + '.mp3';
      const args = buildAcxChapterExportArgs(inputName, outputName, chapters[i], options);
      try {
        if (typeof options.onChapterStart === 'function') options.onChapterStart(i, chapters[i]);
        await ff.run(...args);
        const result = ff.FS('readFile', outputName);
        files.push({ index: i, bytes: new Uint8Array(result), size: result.byteLength });
      } finally {
        try { ff.FS('unlink', outputName); } catch { /* ignore */ }
      }
    }
    return files;
  } finally {
    try { ff.FS('unlink', inputName); } catch { /* ignore */ }
  }
}
