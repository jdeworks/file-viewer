import { CAPABILITY_STATUS, evaluateMixerCapabilities } from './mixer-capabilities.js';
import { MIXER_LIMITS } from './mixer-config.js';
import { buildFfmpegRenderPlan, finite, safeMediaName, uniqueAssets } from './mixer-video-export-helpers.js';

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
