import { CAPABILITY_STATUS, evaluateMixerCapabilities } from './mixer-capabilities.js';
import { MIXER_LIMITS } from './mixer-config.js';
import { evaluateElementKeyframes } from './mixer-visual-preview.js';

export function buildVideoMixExportPlan(project, options = {}) {
  const capabilities = evaluateMixerCapabilities({
    ffmpegEnabled: !!options.ffmpegEnabled,
    ffmpegLoaded: !!options.ffmpegLoaded,
    canExportVideoMix: !!options.ffmpegLoaded,
  }, project);
  const status = capabilities.actions.finalVideoExport;
  const visualItems = collectElements(project, (element) => element.capabilities?.hasVideo || element.capabilities?.hasImage);
  const audioItems = collectElements(project, (element) => element.capabilities?.hasAudio);
  const inputAssets = uniqueAssets([...visualItems, ...audioItems]);
  const maxInputBytes = Math.max(0, Number(options.maxInputBytes ?? MIXER_LIMITS.ffmpegInputMaxBytes) || 0);
  const totalInputBytes = inputAssets.reduce((sum, asset) => sum + Math.max(0, Number(asset.size) || 0), 0);
  const inputBudgetExceeded = maxInputBytes > 0 && totalInputBytes > maxInputBytes;
  const durationMs = Math.max(
    project.project?.durationMs || 0,
    ...project.elements.map((element) => (element.timeline?.startMs || 0) + (element.timeline?.placementDurationMs || element.timeline?.durationMs || 0)),
  );
  const maxRenderDurationMs = Math.max(0, Number(options.maxRenderDurationMs ?? MIXER_LIMITS.ffmpegRenderMaxDurationMs) || 0);
  const durationBudgetExceeded = maxRenderDurationMs > 0 && durationMs > maxRenderDurationMs;
  const maxCompositionItems = Math.max(0, Number(options.maxCompositionItems ?? MIXER_LIMITS.ffmpegRenderMaxCompositionItems) || 0);
  const composition = summarizeComposition(project, visualItems, audioItems);
  const complexityBudgetExceeded = maxCompositionItems > 0 && composition.totalItems > maxCompositionItems;
  const warnings = [];
  if (!visualItems.length) warnings.push('No visual elements are scheduled for final video export.');
  if (status.status !== CAPABILITY_STATUS.AVAILABLE) warnings.push(status.message);
  const missingAssets = project.assets.filter((asset) => asset.status === 'missing' || asset.status === 'needs-relink');
  if (missingAssets.length) warnings.push(`${missingAssets.length} asset(s) must be relinked before final export.`);
  const proxyAssets = project.assets.filter((asset) => asset.status === 'needs-proxy' || asset.capabilities?.needsFfmpegForPreview);
  if (proxyAssets.length) warnings.push(`${proxyAssets.length} asset(s) need ffmpeg proxy/conversion for accurate preview/export.`);
  if (inputBudgetExceeded) warnings.push(`Input media totals ${formatBytes(totalInputBytes)}, above the browser ffmpeg limit of ${formatBytes(maxInputBytes)}.`);
  if (durationBudgetExceeded) warnings.push(`Timeline duration ${formatDuration(durationMs)} is above the browser ffmpeg safe render limit of ${formatDuration(maxRenderDurationMs)}.`);
  if (complexityBudgetExceeded) warnings.push(`Composition has ${composition.totalItems} render item(s), above the browser ffmpeg safe complexity limit of ${maxCompositionItems}.`);
  const canRender = status.status === CAPABILITY_STATUS.AVAILABLE
    && visualItems.length > 0
    && missingAssets.length === 0
    && !inputBudgetExceeded
    && !durationBudgetExceeded
    && !complexityBudgetExceeded;
  const renderPlan = buildFfmpegRenderPlan(project, visualItems, audioItems, options, inputAssets);
  return {
    kind: 'video-mix',
    format: options.format || 'mp4',
    filename: options.filename || `${safeName(project.project?.name || 'media-mix')}.mp4`,
    durationMs,
    requiresFfmpeg: true,
    canRender,
    status: status.status,
    statusMessage: canRender ? status.message : (warnings[0] || status.message),
    warnings,
    args: canRender ? renderPlan.args : [],
    provenance: {
      renderPath: canRender ? 'ffmpeg-video-mix' : 'ffmpeg-opt-in-required',
      durationMs,
      fps: project.project?.fps || 30,
      background: project.project?.background || '#000000',
      filterGraph: renderPlan.filterGraph,
      outputMaps: renderPlan.outputMaps,
      inputs: renderPlan.inputs,
      renderBudget: {
        totalInputBytes,
        maxInputBytes,
        overBudget: inputBudgetExceeded,
        durationMs,
        maxDurationMs: maxRenderDurationMs,
        durationOverBudget: durationBudgetExceeded,
        maxCompositionItems,
        compositionItems: composition.totalItems,
        complexityOverBudget: complexityBudgetExceeded,
        visualItemCount: composition.visualItemCount,
        audioItemCount: composition.audioItemCount,
        effectCount: composition.effectCount,
        keyframeCount: composition.keyframeCount,
        transitionCount: composition.transitionCount,
      },
      master: {
        audioGain: project.master?.audio?.gain ?? 1,
        audioEqPreset: project.master?.audio?.eq?.presetId || 'flat',
        video: project.master?.video || {},
      },
      assets: project.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        status: asset.status,
        capabilities: asset.capabilities,
        media: asset.media,
      })),
      visualItems: visualItems.map(itemProvenance),
      transitions: (project.transitions || []).map(transitionProvenance),
      audioItems: audioItems.map(itemProvenance),
      warnings,
    },
  };
}

export function buildVideoProxyPlan(project, options = {}) {
  const capabilities = evaluateMixerCapabilities({
    ffmpegEnabled: !!options.ffmpegEnabled,
    ffmpegLoaded: !!options.ffmpegLoaded,
  }, project);
  const status = capabilities.actions.ffmpegConversion;
  const proxyAssets = (project.assets || [])
    .filter((asset) => asset.status === 'needs-proxy' || asset.capabilities?.needsFfmpegForPreview);
  const maxInputBytes = Math.max(0, Number(options.maxInputBytes ?? MIXER_LIMITS.ffmpegInputMaxBytes) || 0);
  const totalInputBytes = proxyAssets.reduce((sum, asset) => sum + Math.max(0, Number(asset.size) || 0), 0);
  const inputBudgetExceeded = maxInputBytes > 0 && totalInputBytes > maxInputBytes;
  const warnings = [];
  if (!proxyAssets.length) warnings.push('No assets need ffmpeg proxy conversion.');
  if (status.status !== CAPABILITY_STATUS.AVAILABLE) warnings.push(status.message);
  if (inputBudgetExceeded) warnings.push(`Proxy input media totals ${formatBytes(totalInputBytes)}, above the browser ffmpeg limit of ${formatBytes(maxInputBytes)}.`);
  const canRender = status.status === CAPABILITY_STATUS.AVAILABLE && proxyAssets.length > 0 && !inputBudgetExceeded;
  const items = proxyAssets.map((asset, index) => {
    const inputName = safeMediaName(asset.name || `${asset.id}.media`, index);
    const outputName = `${safeName(asset.name || asset.id)}.proxy.mp4`;
    return {
      assetId: asset.id,
      assetName: asset.name,
      inputName,
      outputName,
      size: Math.max(0, Number(asset.size) || 0),
      media: asset.media || {},
      args: [
        '-i', inputName,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', options.preset || 'ultrafast',
        '-crf', String(options.crf ?? 28),
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', options.audioBitrate || '128k',
        '-movflags', '+faststart',
        outputName,
      ],
    };
  });
  return {
    kind: 'video-proxy',
    format: 'mp4',
    requiresFfmpeg: proxyAssets.length > 0,
    canRender,
    status: proxyAssets.length ? status.status : CAPABILITY_STATUS.AVAILABLE,
    statusMessage: proxyAssets.length ? status.message : 'No proxy conversion is required.',
    warnings,
    items: canRender ? items : [],
    provenance: {
      renderPath: canRender ? 'ffmpeg-video-proxy' : (proxyAssets.length ? 'ffmpeg-proxy-opt-in-required' : 'no-proxy-required'),
      renderBudget: {
        totalInputBytes,
        maxInputBytes,
        overBudget: inputBudgetExceeded,
      },
      assets: proxyAssets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        status: asset.status,
        capabilities: asset.capabilities,
        media: asset.media,
      })),
      items,
      warnings,
    },
  };
}

function collectElements(project, predicate) {
  return (project.elements || [])
    .filter(predicate)
    .map((element) => ({
      element,
      lane: project.lanes.find((lane) => lane.id === element.laneId) || null,
      asset: project.assets.find((asset) => asset.id === element.assetId) || null,
    }))
    .sort((a, b) => ((a.lane?.order ?? 0) - (b.lane?.order ?? 0)) || ((a.element.timeline?.startMs || 0) - (b.element.timeline?.startMs || 0)));
}

function itemProvenance({ element, lane, asset }) {
  return {
    elementId: element.id,
    laneId: lane?.id || element.laneId || null,
    laneRole: lane?.role || null,
    assetId: asset?.id || element.assetId || null,
    assetName: asset?.name || null,
    type: element.type,
    startMs: element.timeline?.startMs || 0,
    sourceInMs: element.timeline?.sourceInMs || 0,
    sourceOutMs: element.timeline?.sourceOutMs || 0,
    durationMs: element.timeline?.durationMs || 0,
    placementDurationMs: element.timeline?.placementDurationMs || element.timeline?.durationMs || 0,
    gain: element.audio?.gain ?? 1,
    fadeInMs: element.audio?.fadeInMs || 0,
    fadeOutMs: element.audio?.fadeOutMs || 0,
    visual: element.visual || {},
    keyframes: (element.keyframes || []).map((keyframe) => ({
      path: keyframe.path,
      timeMs: Math.max(0, Math.round(finite(keyframe.timeMs, 0))),
      value: cloneConfigValue(keyframe.value),
      interpolation: keyframe.interpolation || 'linear',
    })),
  };
}

function transitionProvenance(transition) {
  return {
    id: transition.id,
    kind: transition.kind || 'dissolve',
    enabled: transition.enabled !== false,
    fromElementId: transition.fromElementId || null,
    toElementId: transition.toElementId || null,
    durationMs: Math.max(0, Number(transition.durationMs) || 0),
    offsetMs: Number(transition.offsetMs) || 0,
    params: transition.params || {},
  };
}

function buildFfmpegRenderPlan(project, visualItems, audioItems, options, inputAssets = null) {
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

export async function renderVideoMixWithFfmpeg(ff, plan, runtimeFiles) {
  if (!plan?.canRender) throw new Error(plan?.statusMessage || 'Final video export is not renderable yet.');
  const inputs = plan.provenance?.inputs || [];
  const outputName = plan.args?.at?.(-1) || 'output.mp4';
  const budget = plan.provenance?.renderBudget || {};
  const totalRuntimeBytes = inputs.reduce((sum, input) => {
    const file = runtimeFiles?.get?.(input.id);
    return sum + Math.max(0, Number(file?.size ?? input.size) || 0);
  }, 0);
  if (budget.maxInputBytes > 0 && totalRuntimeBytes > budget.maxInputBytes) {
    throw new Error(`Input media totals ${formatBytes(totalRuntimeBytes)}, above the browser ffmpeg limit of ${formatBytes(budget.maxInputBytes)}.`);
  }
  const written = [];
  try {
    for (const input of inputs) {
      const file = runtimeFiles?.get?.(input.id);
      if (!file?.arrayBuffer) throw new Error(`Missing local media for ${input.name || input.id}.`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      ff.FS('writeFile', input.inputName, bytes);
      written.push(input.inputName);
    }
    await ff.run(...plan.args);
    const result = ff.FS('readFile', outputName);
    const bytes = result instanceof Uint8Array ? result : new Uint8Array(result);
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], { type: mimeForFormat(plan.format) });
    return {
      blob,
      bytes: bytes.byteLength,
      filename: plan.filename,
      plan,
    };
  } finally {
    for (const name of written) {
      try { ff.FS('unlink', name); } catch { /* ignore cleanup misses */ }
    }
    try { ff.FS('unlink', outputName); } catch { /* ignore cleanup misses */ }
  }
}

export async function renderVideoProxiesWithFfmpeg(ff, plan, runtimeFiles) {
  if (!plan?.canRender) throw new Error(plan?.statusMessage || 'Proxy conversion is not renderable yet.');
  const budget = plan.provenance?.renderBudget || {};
  const totalRuntimeBytes = (plan.provenance?.items || []).reduce((sum, item) => {
    const file = runtimeFiles?.get?.(item.assetId);
    return sum + Math.max(0, Number(file?.size ?? item.size) || 0);
  }, 0);
  if (budget.maxInputBytes > 0 && totalRuntimeBytes > budget.maxInputBytes) {
    throw new Error(`Proxy input media totals ${formatBytes(totalRuntimeBytes)}, above the browser ffmpeg limit of ${formatBytes(budget.maxInputBytes)}.`);
  }
  const results = [];
  for (const item of plan.provenance?.items || []) {
    const file = runtimeFiles?.get?.(item.assetId);
    if (!file?.arrayBuffer) throw new Error(`Missing local media for ${item.assetName || item.assetId}.`);
    const inputName = item.inputName;
    const outputName = item.outputName;
    ff.FS('writeFile', inputName, new Uint8Array(await file.arrayBuffer()));
    try {
      await ff.run(...item.args);
      const result = ff.FS('readFile', outputName);
      const bytes = result instanceof Uint8Array ? result : new Uint8Array(result);
      results.push({
        assetId: item.assetId,
        assetName: item.assetName,
        filename: outputName,
        blob: new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], { type: 'video/mp4' }),
        bytes: bytes.byteLength,
      });
    } finally {
      try { ff.FS('unlink', inputName); } catch { /* ignore cleanup misses */ }
      try { ff.FS('unlink', outputName); } catch { /* ignore cleanup misses */ }
    }
  }
  return { plan, proxies: results };
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
  const fps = project.project?.fps || 30;
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

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value) {
  return String(Math.round((Number(value) || 0) * 10000) / 10000);
}

function uniqueAssets(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item.asset || seen.has(item.asset.id)) continue;
    seen.add(item.asset.id);
    out.push(item.asset);
  }
  return out;
}

function summarizeComposition(project, visualItems, audioItems) {
  const effectCount = (project.elements || [])
    .reduce((sum, element) => sum + (element.effects || []).filter((effect) => effect.enabled !== false).length, 0);
  const keyframeCount = (project.elements || [])
    .reduce((sum, element) => sum + (element.keyframes || []).length, 0);
  const transitionCount = (project.transitions || []).filter((transition) => transition.enabled !== false).length;
  const visualItemCount = visualItems.length;
  const audioItemCount = audioItems.length;
  return {
    visualItemCount,
    audioItemCount,
    effectCount,
    keyframeCount,
    transitionCount,
    totalItems: visualItemCount + audioItemCount + effectCount + transitionCount + keyframeCount,
  };
}

function cloneConfigValue(value) {
  if (value == null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function safeName(name) {
  return String(name || 'media-mix').replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'media-mix';
}

function safeMediaName(name, index) {
  const raw = String(name || `input-${index}.media`);
  if (/^[a-z0-9._-]+$/i.test(raw)) return raw;
  const ext = raw.includes('.') ? raw.split('.').pop().replace(/[^a-z0-9]/gi, '').toLowerCase() : 'media';
  return `input-${index}.${ext || 'media'}`;
}

function mimeForFormat(format) {
  if (format === 'webm') return 'video/webm';
  if (format === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value >= 1024 * 1024) return `${Math.round((value / 1048576) * 10) / 10} MB`;
  if (value >= 1024) return `${Math.round((value / 1024) * 10) / 10} KB`;
  return `${Math.round(value)} B`;
}

function formatDuration(ms) {
  const secondsValue = Math.max(0, Number(ms) || 0) / 1000;
  if (secondsValue >= 60) return `${Math.round((secondsValue / 60) * 10) / 10} min`;
  return `${Math.round(secondsValue * 10) / 10} sec`;
}

function seconds(ms) {
  return (Math.max(0, Number(ms) || 0) / 1000).toFixed(3).replace(/\.?0+$/, '');
}
