// Pure ffmpeg operation builders used by transcoder.js. This module contains only
// deterministic argument planning so behavior can be tested without ffmpeg.

import {
  buildAudioFilterChain,
  audioEncodeArgs,
  buildAcxExportArgs,
} from './audio-filters.js';
import {
  buildAcrossfadeArgs,
  buildMuxMusicArgs,
  buildSubtitleBurnArgs,
  buildVideoExportFilterChain,
  buildXfadeArgs,
} from './video-filters.js';
import { buildSecondaryInputSpec } from './ffmpeg-intake.js';

export const MIME = {
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  png: 'image/png',
  webm: 'video/webm',
  gif: 'image/gif',
  webp: 'image/webp',
};

function round2(value) {
  return Number(value).toFixed(2);
}

function round4(value) {
  return Number(value).toFixed(4);
}

function buildTrimPlan(params, inputName, base) {
  const { start, end, precise } = params;
  if (precise) {
    return {
      outputName: 'out.mp4',
      outBase: base + '_trim',
      args: ['-i', inputName, '-ss', start, '-to', end, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', 'out.mp4'],
    };
  }
  return {
    outputName: 'out.mp4',
    outBase: base + '_trim',
    args: ['-ss', start, '-to', end, '-i', inputName, '-c', 'copy', 'out.mp4'],
  };
}

function buildVideoExportPlan(params, inputName, base) {
  const fmt = params.format || 'mp3';
  if (fmt === 'mp3') {
    return {
      outputName: 'out.mp3',
      outBase: base + '_audio',
      args: ['-i', inputName, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', 'out.mp3'],
    };
  }
  return {
    outputName: 'out.ogg',
    outBase: base + '_audio',
    args: ['-i', inputName, '-vn', '-c:a', 'libvorbis', '-q:a', '4', 'out.ogg'],
  };
}

function buildBakeAudioPlan(params, inputName, base) {
  const baseSettings = params.settings || {};
  const settings = (params.lufsTarget !== undefined && params.lufsTarget !== null)
    ? { ...baseSettings, lufsTarget: params.lufsTarget, truePeak: params.truePeak }
    : baseSettings;
  const chain = buildAudioFilterChain(settings, params.fades || {});
  const enc = audioEncodeArgs(params.container || params.format, { bitrate: params.bitrate, cbr: params.cbr });
  const args = ['-i', inputName, '-vn'];
  if (chain) args.push('-af', chain);
  if (params.sampleRate) args.push('-ar', String(params.sampleRate));
  if (params.channels) args.push('-ac', String(params.channels));
  args.push(...enc.args, 'out.' + enc.ext);
  return {
    outputName: 'out.' + enc.ext,
    outBase: base + '_processed',
    args,
  };
}

function buildWebvideoPlan(params, inputName, base) {
  const v = params.video || {};
  const vf = buildVideoExportFilterChain(v, params.transform || {});
  const ext = params.container || 'mp4';
  const outputName = 'out.' + ext;
  const aSettings = (params.lufsTarget !== undefined && params.lufsTarget !== null)
    ? { ...(params.settings || {}), lufsTarget: params.lufsTarget, truePeak: params.truePeak }
    : (params.settings || {});
  const chain = buildAudioFilterChain(aSettings, params.fades || {});
  const args = ['-i', inputName];
  if (vf) args.push('-vf', vf);
  args.push('-c:v', v.codec || 'libx264');
  if (v.preset) args.push('-preset', v.preset);
  if (v.codec === 'libvpx-vp9') args.push('-crf', '33', '-b:v', '0');
  else args.push('-crf', '28', '-movflags', '+faststart');
  if (chain) args.push('-af', chain);
  if (params.sampleRate) args.push('-ar', String(params.sampleRate));
  if (params.channels) args.push('-ac', String(params.channels));
  args.push('-c:a', v.audioCodec || 'aac', '-b:a', params.bitrate || '192k', outputName);
  return {
    outputName,
    outBase: base + '_' + (v.scale ? v.scale.split(':').pop() + 'p' : 'web'),
    args,
  };
}

function buildTimelineTransitionPlan(opId, params, inputName, base) {
  const sec = buildSecondaryInputSpec(params.secondary, 'mp4');
  const out = {
    requiredError: 'No second clip / music file provided.',
    secondary: sec,
  };

  if (opId === 'xfade') {
    return {
      ...out,
      outputName: 'out.mp4',
      outBase: base + '_xfade',
      args: buildXfadeArgs(inputName, sec.name, 'out.mp4', {
        durationA: params.durationA,
        transition: params.transition,
        duration: params.duration,
      }),
      runError: 'Both clips must share resolution, frame-rate and pixel format for an xfade dissolve. Downscale them to the same size first.',
    };
  }

  if (opId === 'acrossfade') {
    return {
      ...out,
      outputName: 'out.m4a',
      outBase: base + '_crossfade',
      args: buildAcrossfadeArgs(inputName, sec.name, 'out.m4a', {
        duration: params.duration,
      }),
      runError: 'Both clips need a decodable audio track to crossfade.',
    };
  }

  return {
    ...out,
    outputName: 'out.mp4',
    outBase: base + '_music',
    args: buildMuxMusicArgs(inputName, sec.name, 'out.mp4', { musicGain: params.musicGain }),
    runError: 'The music bed could not be mixed under the video audio.',
  };
}

function buildSingleTransitionPlan(params, inputName, base) {
  const fi = Number(params.fadeIn);
  const fo = Number(params.fadeOut);
  const vdur = Number(params.duration);
  const vf = [];
  if (isFinite(fi) && fi > 0) vf.push('fade=t=in:st=0:d=' + (Math.round(fi * 100) / 100));
  if (isFinite(fo) && fo > 0 && isFinite(vdur) && vdur > fo) {
    vf.push('fade=t=out:st=' + (Math.round((vdur - fo) * 100) / 100) + ':d=' + (Math.round(fo * 100) / 100));
  }
  if (!vf.length) throw new Error('Set a fade-in and/or fade-out duration first.');
  return {
    outputName: 'out.mp4',
    outBase: base + '_fade',
    args: ['-i', inputName, '-vf', vf.join(','), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'copy', 'out.mp4'],
  };
}

export function buildOperationPlan(opId, params, context) {
  const { inputName, base, srcExt } = context;

  switch (opId) {
    case 'trim':
      return buildTrimPlan(params, inputName, base);

    case 'audio':
      return buildVideoExportPlan(params, inputName, base);

    case 'mute':
      return {
        outputName: 'out.mp4',
        outBase: base + '_muted',
        args: ['-i', inputName, '-c:v', 'copy', '-an', 'out.mp4'],
      };

    case 'screenshot':
      return {
        outputName: 'thumb.png',
        outBase: base + '_thumb',
        args: ['-ss', params.ts || '00:00:00', '-i', inputName, '-frames:v', '1', 'thumb.png'],
      };

    case 'downscale': {
      const [W, H] = (params.res || '1280:720').split(':');
      const scaleFilter = 'scale=' + W + ':' + H
        + ':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2';
      return {
        outputName: 'out.mp4',
        outBase: base + '_' + H + 'p',
        args: ['-i', inputName, '-vf', scaleFilter, '-c:a', 'copy', 'out.mp4'],
      };
    }

    case 'volume':
      return {
        outputName: 'out.mp4',
        outBase: base + '_vol',
        args: ['-i', inputName, '-af', 'volume=' + round2(params.level || 1), '-c:v', 'copy', 'out.mp4'],
      };

    case 'speed': {
      const rate = parseFloat(params.rate || 0.5);
      return {
        outputName: 'out.mp4',
        outBase: base + '_speed',
        args: ['-i', inputName,
          '-filter:v', 'setpts=' + round4(1 / rate) + '*PTS',
          '-filter:a', 'atempo=' + round4(rate),
          'out.mp4'],
      };
    }

    case 'webm':
      return {
        outputName: 'out.webm',
        outBase: base + '_converted',
        args: ['-i', inputName,
          '-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0',
          '-c:a', 'libopus',
          'out.webm'],
      };

    case 'normalize':
      return {
        outputName: 'out.mp4',
        outBase: base + '_norm',
        args: ['-i', inputName, '-af', 'loudnorm', '-c:v', 'copy', 'out.mp4'],
      };

    case 'gif': {
      const { start: gs, end: ge } = params;
      return {
        outputName: 'clip.gif',
        outBase: 'clip',
        args: ['-ss', gs, '-to', ge, '-i', inputName,
          '-vf', 'fps=10,scale=480:-1:flags=lanczos', 'clip.gif'],
      };
    }

    case 'webp': {
      const { start: ws, end: we } = params;
      return {
        outputName: 'clip_anim.webp',
        outBase: 'clip_anim',
        args: ['-ss', ws, '-to', we, '-i', inputName,
          '-vf', 'fps=10,scale=480:-1', 'clip_anim.webp'],
      };
    }

    case 'thumbstrip':
      return {
        outputName: base + '_strip.png',
        outBase: base + '_strip',
        args: ['-i', inputName, '-vf', 'fps=1/10,scale=160:-1,tile=5x2', base + '_strip.png'],
      };

    case 'rmeta':
      return {
        outputName: 'out.mp4',
        outBase: base + '_clean',
        args: ['-i', inputName, '-map_metadata', '-1', '-c:v', 'copy', '-c:a', 'copy', 'out.mp4'],
      };

    case 'bakeAudio':
      return buildBakeAudioPlan(params, inputName, base);

    case 'acxExport':
      return {
        outputName: 'out.mp3',
        outBase: base + '_ACX',
        args: buildAcxExportArgs(inputName, 'out.mp3', {
          lufs: params.lufs,
          truePeak: params.truePeak,
          silence: params.silence,
          pad: params.pad,
        }),
      };

    case 'webvideo':
      return buildWebvideoPlan(params, inputName, base);

    case 'videofade':
      return buildSingleTransitionPlan(params, inputName, base);

    case 'subtitle': {
      const secondary = buildSecondaryInputSpec(params.secondary, 'srt');
      return {
        outputName: 'out.mp4',
        outBase: base + '_sub',
        secondary,
        args: ['-i', inputName, '-i', secondary.name, '-c', 'copy', '-c:s', 'mov_text', 'out.mp4'],
        requiredError: 'No secondary subtitle file provided.',
        runError: 'Subtitle embedding requires MP4 container.',
      };
    }

    case 'subtitleBurn': {
      const secondary = buildSecondaryInputSpec(params.secondary, 'srt');
      return {
        outputName: 'out.mp4',
        outBase: base + '_sub_burned',
        secondary: {
          ...secondary,
          allowedExt: ['srt', 'vtt'],
          requiredError: 'Choose an SRT or VTT subtitle file first.',
          extError: 'Subtitle burn-in supports .srt and .vtt files.',
        },
        args: buildSubtitleBurnArgs(inputName, secondary.name, 'out.mp4', { ext: secondary.ext }),
        runError: 'Subtitle burn-in needs a decodable video and valid SRT/VTT cues.',
      };
    }

    case 'concat': {
      const secondary = buildSecondaryInputSpec(params.secondary, 'mp4');
      return {
        outputName: 'combined.mp4',
        outBase: 'combined',
        secondary,
        args: ['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'combined.mp4'],
        requiredError: 'No secondary video file provided.',
        runError: 'Videos must have same codec and resolution for stream-copy concatenation. Try re-encoding (may be slow).',
        extraInputFiles: [{
          name: 'concat.txt',
          content: `file 'input.${srcExt}'\nfile '${secondary.name}'\n`,
        }],
      };
    }

    case 'audioreplace': {
      const secondary = buildSecondaryInputSpec(params.secondary, 'mp3');
      return {
        outputName: 'out.mp4',
        outBase: base + '_swapped',
        secondary,
        args: ['-i', inputName, '-i', secondary.name, '-c:v', 'copy', '-map', '0:v', '-map', '1:a', 'out.mp4'],
        requiredError: 'No secondary audio file provided.',
      };
    }

    case 'xfade':
    case 'acrossfade':
    case 'muxmusic':
      return buildTimelineTransitionPlan(opId, params, inputName, base);

    default:
      throw new Error('Unknown operation: ' + opId);
  }
}
