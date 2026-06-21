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

// ── P1/P3: serialize the live studio graph into an ffmpeg `-af` filter chain ──
//
// Pure (no ffmpeg, no DOM) so it can be unit-tested directly. Builds the audio
// filter list in the canonical order the roadmap specifies:
//   highpass → EQ bands (equalizer) → lowpass → fade-in → fade-out → loudnorm
//
// settings: { freqs:number[], gains:number[](dB), hpf:number, lpf:number, lufsTarget:number|null }
//           (the shape returned by audio-graph.js getSettings()). Any field may be absent.
// fades:    { fadeIn:number, fadeOut:number, duration:number } — seconds. duration is the
//           clip length (needed to place the out-fade); 0/undefined skips the out-fade.
//
// Conventions:
//   • A band is "active" only when |gain| ≥ 0.1 dB (skips the 9 flat bands → shorter chain).
//   • HPF emitted only when cutoff > 20 Hz; LPF only when cutoff < 20000 Hz (defaults = no-op).
//   • equalizer width is in octaves (width_type=o), width=1 (≈ the live BiquadFilter Q≈1.2).
//   • loudnorm is single-pass here (see bakeAudio for the two-pass note).
export function buildAudioFilterChain(settings = {}, fades = {}) {
  const out = [];
  const round = (n) => Math.round(n * 100) / 100;

  const hpf = Number(settings.hpf);
  if (isFinite(hpf) && hpf > 20) out.push('highpass=f=' + Math.round(hpf));

  const gains = Array.isArray(settings.gains) ? settings.gains : [];
  const freqs = Array.isArray(settings.freqs) ? settings.freqs : [];
  gains.forEach((g, i) => {
    const gain = Number(g);
    const freq = Number(freqs[i]);
    if (!isFinite(gain) || !isFinite(freq) || Math.abs(gain) < 0.1) return;
    out.push('equalizer=f=' + Math.round(freq) + ':width_type=o:width=1:g=' + round(gain));
  });

  const lpf = Number(settings.lpf);
  if (isFinite(lpf) && lpf < 20000) out.push('lowpass=f=' + Math.round(lpf));

  const fadeIn = Number(fades.fadeIn);
  if (isFinite(fadeIn) && fadeIn > 0) out.push('afade=t=in:st=0:d=' + round(fadeIn));

  const fadeOut = Number(fades.fadeOut);
  const dur = Number(fades.duration);
  if (isFinite(fadeOut) && fadeOut > 0 && isFinite(dur) && dur > fadeOut) {
    out.push('afade=t=out:st=' + round(dur - fadeOut) + ':d=' + round(fadeOut));
  }

  const lufs = settings.lufsTarget;
  if (lufs !== null && lufs !== undefined && isFinite(Number(lufs))) {
    const tp = isFinite(Number(settings.truePeak)) ? round(Number(settings.truePeak)) : -1.5;
    out.push('loudnorm=I=' + round(Number(lufs)) + ':TP=' + tp + ':LRA=11');
  }

  return out.join(',');
}

// Codec args for the chosen export container. Keyed by output extension.
// opts: { bitrate?:string ('192k'), cbr?:boolean } — when a bitrate is given the lossy
// codecs encode CBR/ABR at that rate; otherwise they fall back to their VBR quality.
// PURE (no DOM, no ffmpeg) so it stays unit-testable.
export function audioEncodeArgs(format, opts = {}) {
  const bitrate = opts.bitrate || null;
  switch (format) {
    case 'wav':  return { ext: 'wav',  mime: 'audio/wav',  args: ['-c:a', 'pcm_s16le'] };
    case 'flac': return { ext: 'flac', mime: 'audio/flac', args: ['-c:a', 'flac'] };
    case 'm4a':  return { ext: 'm4a',  mime: 'audio/mp4',
      args: ['-c:a', 'aac', '-b:a', bitrate || '192k'] };
    case 'ogg':  return { ext: 'ogg',  mime: 'audio/ogg',
      args: bitrate ? ['-c:a', 'libvorbis', '-b:a', bitrate] : ['-c:a', 'libvorbis', '-q:a', '5'] };
    case 'opus': return { ext: 'opus', mime: 'audio/ogg',
      args: ['-c:a', 'libopus', '-b:a', bitrate || '128k'] };
    case 'mp3':
    default: {
      // CBR via -b:a; otherwise VBR via -q:a 2 (~190 kbps). ACX wants CBR.
      const args = opts.cbr && bitrate
        ? ['-c:a', 'libmp3lame', '-b:a', bitrate]
        : (bitrate ? ['-c:a', 'libmp3lame', '-b:a', bitrate] : ['-c:a', 'libmp3lame', '-q:a', '2']);
      return { ext: 'mp3', mime: 'audio/mpeg', args };
    }
  }
}

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

      // ── P2: web-video preset — re-encode to MP4 720p (H.264 + AAC) or another
      // single-clip video container. params: { video:{codec,preset,scale,audioCodec},
      // container, bitrate, sampleRate, channels }. The live-EQ -af chain + fades
      // still apply to the audio track.
      case 'webvideo': {
        const v = params.video || {};
        const ext = params.container || 'mp4';
        outputName = 'out.' + ext; outBase = base + '_' + (v.scale ? v.scale.split(':').pop() + 'p' : 'web');
        args = ['-i', inputName];
        if (v.scale) args.push('-vf', 'scale=' + v.scale);
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
