import { CAPABILITY_STATUS, evaluateMixerCapabilities } from './mixer-capabilities.js';

export function buildVideoMixExportPlan(project, options = {}) {
  const capabilities = evaluateMixerCapabilities({
    ffmpegEnabled: !!options.ffmpegEnabled,
    ffmpegLoaded: !!options.ffmpegLoaded,
    canExportVideoMix: !!options.ffmpegLoaded,
  }, project);
  const status = capabilities.actions.finalVideoExport;
  const visualItems = collectElements(project, (element) => element.capabilities?.hasVideo || element.capabilities?.hasImage);
  const audioItems = collectElements(project, (element) => element.capabilities?.hasAudio);
  const durationMs = Math.max(
    project.project?.durationMs || 0,
    ...project.elements.map((element) => (element.timeline?.startMs || 0) + (element.timeline?.placementDurationMs || element.timeline?.durationMs || 0)),
  );
  const warnings = [];
  if (!visualItems.length) warnings.push('No visual elements are scheduled for final video export.');
  if (status.status !== CAPABILITY_STATUS.AVAILABLE) warnings.push(status.message);
  const missingAssets = project.assets.filter((asset) => asset.status === 'missing' || asset.status === 'needs-relink');
  if (missingAssets.length) warnings.push(`${missingAssets.length} asset(s) must be relinked before final export.`);
  const proxyAssets = project.assets.filter((asset) => asset.status === 'needs-proxy' || asset.capabilities?.needsFfmpegForPreview);
  if (proxyAssets.length) warnings.push(`${proxyAssets.length} asset(s) need ffmpeg proxy/conversion for accurate preview/export.`);
  const canRender = status.status === CAPABILITY_STATUS.AVAILABLE && visualItems.length > 0 && missingAssets.length === 0;
  return {
    kind: 'video-mix',
    format: options.format || 'mp4',
    filename: options.filename || `${safeName(project.project?.name || 'media-mix')}.mp4`,
    durationMs,
    requiresFfmpeg: true,
    canRender,
    status: status.status,
    statusMessage: status.message,
    warnings,
    args: canRender ? buildFfmpegArgs(project, visualItems, audioItems, options) : [],
    provenance: {
      renderPath: canRender ? 'ffmpeg-video-mix' : 'ffmpeg-opt-in-required',
      durationMs,
      fps: project.project?.fps || 30,
      background: project.project?.background || '#000000',
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
      audioItems: audioItems.map(itemProvenance),
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
  };
}

function buildFfmpegArgs(project, visualItems, audioItems, options) {
  const inputs = uniqueAssets([...visualItems, ...audioItems]);
  const duration = seconds(project.project?.durationMs || 0);
  const args = inputs.flatMap((asset) => ['-i', asset.name || `${asset.id}.media`]);
  if (duration > 0) args.push('-t', duration);
  args.push('-map', '0:v:0');
  if (audioItems.length) args.push('-map', '0:a?');
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  if (audioItems.length) args.push('-c:a', options.audioCodec || 'aac');
  else args.push('-an');
  args.push(options.outputName || 'output.mp4');
  return args;
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

function safeName(name) {
  return String(name || 'media-mix').replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'media-mix';
}

function seconds(ms) {
  return (Math.max(0, Number(ms) || 0) / 1000).toFixed(3).replace(/\.?0+$/, '');
}
