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
import { buildAcxChapterExportArgs } from './audio-filters.js';
import { buildOperationPlan, MIME as OP_MIME } from './transcoder-ops.js';
import { parseIntakeMeta, readIntakeBytes } from './ffmpeg-intake.js';
// Keep legacy import surface for existing call sites / tests.
export { buildAudioFilterChain, audioEncodeArgs } from './audio-filters.js';
export { buildAcxFilterChain, buildAcxExportArgs, buildAcxChapterExportArgs, silenceRemoveFilter, roomTonePadFilter } from './audio-filters.js';
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
  const ff = FFmpeg.createFFmpeg({ corePath: CORE_JS, log: false, mainName: 'main' });
  if (onProgress) ff.setProgress(onProgress);
  await ff.load();
  ffmpegInstance = ff;
  return ff;
}

// Transcode the intake to MP4 (video) or M4A (audio). Returns a blob: URL; caller
// must call URL.revokeObjectURL when done. onProgress: ({ratio}) => void, ratio 0–1.
export async function transcode(intake, kind, onProgress) {
  const ff = await loadFfmpeg(onProgress);

  const { inputName } = parseIntakeMeta(intake);
  const outputName = kind === 'video' ? 'output.mp4' : 'output.m4a';

  const data = await readIntakeBytes(intake);
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

const MIME = OP_MIME;

export async function runOperation(ff, opId, params, intake) {
  const { srcName, srcExt, inputName, base } = parseIntakeMeta(intake);
  const data = await readIntakeBytes(intake);
  ff.FS('writeFile', inputName, data);

  let plan;

  try {
    plan = buildOperationPlan(opId, params, { srcName, srcExt, inputName, base });

    if (plan.secondary) {
      const secondaryFile = params?.secondary;
      if (!secondaryFile) {
        throw new Error(plan.secondary.requiredError || 'Missing secondary file.');
      }
      if (plan.secondary.allowedExt && !plan.secondary.allowedExt.includes(plan.secondary.ext)) {
        throw new Error(plan.secondary.extError || `Unsupported secondary file type: ${plan.secondary.ext}.`);
      }
      ff.FS('writeFile', plan.secondary.name, new Uint8Array(await secondaryFile.arrayBuffer()));
    }

    if (Array.isArray(plan.extraInputFiles)) {
      for (const extra of plan.extraInputFiles) {
        ff.FS('writeFile', extra.name, extra.content);
      }
    }

    try {
      await ff.run(...plan.args);
    } catch (err) {
      if (plan.runError) {
        throw new Error(plan.runError + '\n\n' + (err.message || String(err)));
      }
      throw err;
    }

    const result = ff.FS('readFile', plan.outputName);
    const ext = plan.outputName.split('.').pop();
    const mime = MIME[ext] || 'application/octet-stream';
    return {
      url: URL.createObjectURL(new Blob([result.buffer], { type: mime })),
      filename: plan.outBase + '.' + ext,
      bytes: result.byteLength,
    };
  } finally {
    try { ff.FS('unlink', inputName); } catch { /* ignore */ }
    if (plan?.outputName) {
      try { ff.FS('unlink', plan.outputName); } catch { /* ignore */ }
    }
    if (plan?.secondary?.name) {
      try { ff.FS('unlink', plan.secondary.name); } catch { /* ignore */ }
    }
    if (Array.isArray(plan?.extraInputFiles)) {
      for (const extra of plan.extraInputFiles) {
        try { ff.FS('unlink', extra.name); } catch { /* ignore */ }
      }
    }
  }
}

export async function runAcxChapterExports(ff, intake, chapters, options = {}) {
  const { srcExt } = parseIntakeMeta(intake);
  const inputName = 'chapter_input.' + srcExt;
  const data = await readIntakeBytes(intake);
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
