import { evaluateElementKeyframes } from './mixer-visual-preview.js';

export function buildFfmpegRenderPlan(project, visualItems, audioItems, options, inputAssets = null) {
  const inputs = inputAssets || uniqueAssets([...visualItems, ...audioItems]);
  const inputIndex = new Map(inputs.map((asset, index) => [asset.id, index]));
  const duration = seconds(project.project?.durationMs || projectDuration(visualItems, audioItems));
  const graph = buildFilterGraph(project, visualItems, audioItems, inputIndex, duration);
  const inputEntries = inputs.map((asset, index) => ({
    index,
    id: asset.id,
    name: asset.name,
    inputName: safeMediaName(asset.name || `${asset.id}.media`, index),
    size: Math.max(0, Number(asset.size) || 0),
    status: asset.status,
    kind: assetKind(asset),
  }));
  const args = inputEntries.flatMap((entry) => inputArgs(entry, duration));
  if (graph.filterGraph) args.push('-filter_complex', graph.filterGraph);
  if (duration !== '0') args.push('-t', duration);
  args.push('-map', graph.videoOut);
  if (graph.audioOut) args.push('-map', graph.audioOut);
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  if (graph.audioOut) args.push('-c:a', options.audioCodec || 'aac');
  else args.push('-an');
  args.push(options.outputName || 'output.mp4');
  return {
    args,
    filterGraph: graph.filterGraph,
    outputMaps: [graph.videoOut, graph.audioOut].filter(Boolean),
    inputs: inputEntries.map((entry) => ({
      ...entry,
      args: inputArgs(entry, duration),
    })),
  };
}

export function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function safeMediaName(name, index) {
  const raw = String(name || `input-${index}.media`);
  if (/^[a-z0-9._-]+$/i.test(raw)) return raw;
  const ext = raw.includes('.') ? raw.split('.').pop().replace(/[^a-z0-9]/gi, '').toLowerCase() : 'media';
  return `input-${index}.${ext || 'media'}`;
}

export function uniqueAssets(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item.asset || seen.has(item.asset.id)) continue;
    seen.add(item.asset.id);
    out.push(item.asset);
  }
  return out;
}

function inputArgs(entry, duration) {
  if (entry.kind === 'image') return ['-loop', '1', '-t', duration, '-i', entry.inputName];
  return ['-i', entry.inputName];
}

function assetKind(asset) {
  if (asset.capabilities?.hasImage && !asset.capabilities?.hasVideo) return 'image';
  if (asset.capabilities?.hasVideo) return 'video';
  if (asset.capabilities?.hasAudio) return 'audio';
  return 'media';
}

function buildFilterGraph(project, visualItems, audioItems, inputIndex, duration) {
  const fps = finite(project.project?.fps, 30) || 30;
  const size = outputSize(project);
  const background = safeColor(project.project?.background || '#000000');
  const filters = [`color=c=${background}:s=${size.width}x${size.height}:r=${fps}:d=${duration}[vbase0]`];
  let previousVideo = 'vbase0';
  visualItems.forEach((item, index) => {
    const input = inputIndex.get(item.asset?.id);
    if (input === undefined) return;
    const transition = transitionFor(project, item.element);
    const label = `v${index}`;
    const placed = `vbase${index + 1}`;
    filters.push(`${visualFilterChain(item, input, transition)}[${label}]`);
    filters.push(`[${previousVideo}][${label}]overlay=x=${overlayExprForElement(item.element, 'x', transition)}:y=${overlayExprForElement(item.element, 'y', transition)}:enable='between(t,${seconds(item.element.timeline?.startMs || 0)},${seconds(elementEndMs(item.element))})'[${placed}]`);
    previousVideo = placed;
  });

  const audioLabels = [];
  audioItems.forEach((item, index) => {
    const input = inputIndex.get(item.asset?.id);
    if (input === undefined) return;
    const label = `a${index}`;
    filters.push(`${audioFilterChain(item, input)}[${label}]`);
    audioLabels.push(`[${label}]`);
  });
  let audioOut = '';
  if (audioLabels.length) {
    audioOut = 'aout';
    const gain = finite(project.master?.audio?.gain, 1);
    const mix = `${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=longest:dropout_transition=0`;
    filters.push(`${mix}${gain !== 1 ? `,volume=${round(gain)}` : ''}[${audioOut}]`);
  }

  return {
    filterGraph: filters.join(';'),
    videoOut: `[${previousVideo}]`,
    audioOut: audioOut ? `[${audioOut}]` : '',
  };
}

function transitionFor(project, element) {
  return (project.transitions || []).find((transition) => transition.toElementId === element.id && transition.enabled !== false) || null;
}

function visualFilterChain({ element }, input, transition = null) {
  const timeline = element.timeline || {};
  const evaluated = evaluateElementKeyframes(element, timeline.startMs || 0);
  const visual = { ...(element.visual || {}), ...(evaluated.visual || {}) };
  const sourceIn = seconds(timeline.sourceInMs || 0);
  const duration = seconds(timeline.durationMs || timeline.placementDurationMs || 0);
  const durationMs = Math.max(0, Number(timeline.durationMs || timeline.placementDurationMs) || 0);
  const scaleX = finite(visual.scaleX, 1);
  const scaleY = finite(visual.scaleY, 1);
  const opacity = Math.max(0, Math.min(1, finite(visual.opacity, 1)));
  const rotation = finite(visual.rotation, 0);
  const crop = normalizeCrop(visual.crop);
  const fadeInMs = Math.max(0, finite(visual.fadeInMs, 0));
  const fadeOutMs = Math.max(0, finite(visual.fadeOutMs, 0));
  const transitionInMs = transition && transition.enabled !== false && transition.kind === 'dissolve'
    ? Math.max(0, finite(transition.durationMs, 0))
    : 0;
  const alphaFadeInMs = Math.max(fadeInMs, transitionInMs);
  const filter = evaluated.filter || videoFilterParams(element);
  const filters = [
    `[${input}:v]trim=start=${sourceIn}:duration=${duration}`,
    'setpts=PTS-STARTPTS',
  ];
  if (crop) filters.push(`crop=iw*${round(crop.width)}:ih*${round(crop.height)}:iw*${round(crop.x)}:ih*${round(crop.y)}`);
  filters.push(`scale=iw*${round(scaleX)}:ih*${round(scaleY)}`);
  if (rotation) filters.push(`rotate=${round((rotation * Math.PI) / 180)}:ow=rotw(iw):oh=roth(ih):c=none`);
  filters.push('format=rgba');
  if (alphaFadeInMs) filters.push(`fade=t=in:st=0:d=${seconds(alphaFadeInMs)}:alpha=1`);
  if (fadeOutMs) filters.push(`fade=t=out:st=${seconds(Math.max(0, durationMs - fadeOutMs))}:d=${seconds(fadeOutMs)}:alpha=1`);
  if (opacity < 1) filters.push(`colorchannelmixer=aa=${round(opacity)}`);
  filters.push(...videoFilterChain(filter));
  return filters.join(',');
}

function videoFilterParams(element) {
  const effect = (element.effects || []).find((item) => item.kind === 'video-filter' && item.enabled !== false);
  const params = effect?.params || {};
  return {
    brightness: finite(params.brightness, 0),
    contrast: finite(params.contrast, 1),
    saturation: finite(params.saturation, 1),
    hue: finite(params.hue, 0),
    blur: finite(params.blur, 0),
    grayscale: finite(params.grayscale, 0),
    invert: finite(params.invert, 0),
    sepia: finite(params.sepia, 0),
  };
}

function videoFilterChain(filter) {
  const out = [];
  const brightness = Math.max(-1, Math.min(1, finite(filter.brightness, 0)));
  const contrast = Math.max(0, Math.min(3, finite(filter.contrast, 1)));
  const saturation = Math.max(0, Math.min(3, finite(filter.saturation, 1)));
  const hue = Math.max(-180, Math.min(180, finite(filter.hue, 0)));
  const blur = Math.max(0, Math.min(20, finite(filter.blur, 0)));
  const grayscale = finite(filter.grayscale, 0) >= 0.5;
  const invert = finite(filter.invert, 0) >= 0.5;
  const sepia = Math.max(0, Math.min(1, finite(filter.sepia, 0)));
  if (brightness || contrast !== 1 || saturation !== 1) {
    out.push(`eq=brightness=${round(brightness)}:contrast=${round(contrast)}:saturation=${round(saturation)}`);
  }
  if (hue) out.push(`hue=h=${round(hue)}`);
  if (grayscale) out.push('hue=s=0');
  if (invert) out.push('negate');
  if (sepia) out.push(sepiaFilter(sepia));
  if (blur) out.push(`boxblur=${round(blur)}:1`);
  return out;
}

function sepiaFilter(amount) {
  const s = Math.max(0, Math.min(1, finite(amount, 0)));
  const mix = (identity, target) => round(identity + (target - identity) * s);
  return [
    'colorchannelmixer=',
    mix(1, 0.393), ':', mix(0, 0.769), ':', mix(0, 0.189), ':0:',
    mix(0, 0.349), ':', mix(1, 0.686), ':', mix(0, 0.168), ':0:',
    mix(0, 0.272), ':', mix(0, 0.534), ':', mix(1, 0.131), ':0:0:0:0:1',
  ].join('');
}

function audioFilterChain({ element }, input) {
  const timeline = element.timeline || {};
  const audio = element.audio || {};
  const sourceIn = seconds(timeline.sourceInMs || 0);
  const duration = seconds(timeline.durationMs || timeline.placementDurationMs || 0);
  const delay = Math.max(0, Math.round(timeline.startMs || 0));
  const gain = finite(audio.gain, 1);
  const filters = [
    `[${input}:a]atrim=start=${sourceIn}:duration=${duration}`,
    'asetpts=PTS-STARTPTS',
  ];
  if (delay) filters.push(`adelay=${delay}:all=1`);
  if (audio.fadeInMs) filters.push(`afade=t=in:st=0:d=${seconds(audio.fadeInMs)}`);
  if (audio.fadeOutMs) filters.push(`afade=t=out:st=${seconds(Math.max(0, (timeline.durationMs || 0) - audio.fadeOutMs))}:d=${seconds(audio.fadeOutMs)}`);
  if (gain !== 1) filters.push(`volume=${round(gain)}`);
  return filters.join(',');
}

function projectDuration(visualItems, audioItems) {
  return Math.max(0, ...[...visualItems, ...audioItems].map(({ element }) => elementEndMs(element)));
}

function elementEndMs(element) {
  const timeline = element.timeline || {};
  return (timeline.startMs || 0) + (timeline.placementDurationMs || timeline.durationMs || 0);
}

function outputSize(project) {
  const video = project.master?.video || {};
  return {
    width: Math.max(2, Math.round(video.width || project.project?.width || 1280)),
    height: Math.max(2, Math.round(video.height || project.project?.height || 720)),
  };
}

function normalizeCrop(crop) {
  if (!crop) return null;
  const x = Math.max(0, Math.min(0.99, finite(crop.x, 0)));
  const y = Math.max(0, Math.min(0.99, finite(crop.y, 0)));
  const width = Math.max(0.01, Math.min(1 - x, finite(crop.width, 1 - x)));
  const height = Math.max(0.01, Math.min(1 - y, finite(crop.height, 1 - y)));
  if (x <= 0 && y <= 0 && width >= 1 && height >= 1) return null;
  return { x, y, width, height };
}

function overlayExprForElement(element, axis, transition = null) {
  const path = axis === 'y' ? 'visual.y' : 'visual.x';
  const fallback = axis === 'y' ? element?.visual?.y : element?.visual?.x;
  if (!(axis === 'x' && transition?.kind === 'wipe-left')) {
    const keyed = keyframedPositionExpr(element, path, fallback, axis);
    if (keyed) return keyed;
  }
  return overlayExpr(fallback || 0, axis, element, transition);
}

function keyframedPositionExpr(element, path, fallback, axis) {
  const frames = (element?.keyframes || [])
    .filter((keyframe) => keyframe?.path === path && Number.isFinite(Number(keyframe.value)))
    .map((keyframe) => ({
      timeMs: Math.max(0, Math.round(finite(keyframe.timeMs, 0))),
      value: finite(keyframe.value, fallback || 0),
    }))
    .sort((a, b) => a.timeMs - b.timeMs);
  if (!frames.length) return null;
  if (frames.length === 1) return overlayExpr(frames[0].value, axis, element, null);
  const first = frames[0];
  let expr = overlayExpr(frames[frames.length - 1].value, axis, element, null);
  for (let i = frames.length - 1; i >= 1; i -= 1) {
    const prev = frames[i - 1];
    const next = frames[i];
    const durationSec = Math.max(0.001, (next.timeMs - prev.timeMs) / 1000);
    const delta = next.value - prev.value;
    const valueExpr = delta === 0
      ? round(prev.value)
      : `${round(prev.value)}${delta > 0 ? '+' : ''}${round(delta)}*((t-${seconds(prev.timeMs)})/${round(durationSec)})`;
    const segment = positionExpr(valueExpr, axis);
    expr = `if(lt(t\\,${seconds(next.timeMs)})\\,${segment}\\,${expr})`;
  }
  if (first.timeMs > 0) {
    expr = `if(lt(t\\,${seconds(first.timeMs)})\\,${overlayExpr(first.value, axis, element, null)}\\,${expr})`;
  }
  return expr;
}

function overlayExpr(value, axis, element = null, transition = null) {
  const number = finite(value, 0);
  const base = positionExpr(round(number), axis);
  const durationMs = Math.max(0, finite(transition?.durationMs, 0));
  if (axis === 'x' && transition?.kind === 'wipe-left' && durationMs > 0) {
    const start = seconds(element?.timeline?.startMs || 0);
    const end = seconds((element?.timeline?.startMs || 0) + durationMs);
    const duration = seconds(durationMs);
    return `if(lt(t\\,${end})\\,-w+(${base}+w)*((t-${start})/${duration})\\,${base})`;
  }
  return base;
}

function positionExpr(valueExpr, axis) {
  const center = axis === 'y' ? '(H-h)/2' : '(W-w)/2';
  if (Number.isFinite(Number(valueExpr))) {
    const number = Number(valueExpr);
    return number === 0 ? center : `${center}${number > 0 ? '+' : ''}${round(number)}`;
  }
  return `${center}+(${valueExpr})`;
}

function safeColor(color) {
  const value = String(color || '#000000');
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value.replace('#', '0x') : 'black';
}

function round(value) {
  return String(Math.round((Number(value) || 0) * 10000) / 10000);
}

function seconds(ms) {
  return (Math.max(0, Number(ms) || 0) / 1000).toFixed(3).replace(/\.?0+$/, '');
}
