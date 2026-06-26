export function buildSeekFramePreview(snapshot = {}, cursorMs = 0, output = {}) {
  const width = Math.max(1, Number(output.width) || 320);
  const height = Math.max(1, Number(output.height) || 180);
  const active = (snapshot.elements || [])
    .filter((element) => isVisualElement(element) && isActiveAt(element, cursorMs))
    .map((element) => ({
      elementId: element.id,
      laneId: element.laneId,
      type: element.type,
      label: element.assetId || element.type || 'visual',
      hasVideo: !!element.capabilities?.hasVideo,
      hasImage: !!element.capabilities?.hasImage,
      needsFfmpegForPreview: !!element.capabilities?.needsFfmpegForPreview,
      startMs: element.timeline?.startMs || 0,
      endMs: (element.timeline?.startMs || 0) + (element.timeline?.placementDurationMs || element.timeline?.durationMs || 0),
      visual: normalizeVisual(element.visual),
    }));
  return {
    cursorMs,
    width,
    height,
    active,
    warnings: active.filter((item) => item.needsFfmpegForPreview).map((item) => `${item.label} needs ffmpeg/proxy conversion for accurate preview.`),
  };
}

export function renderSeekFramePreview(root, preview) {
  const panel = document.createElement('section');
  panel.className = 'mmx-frame-preview';
  panel.dataset.activeVisuals = String(preview.active.length);
  panel.dataset.cursorMs = String(Math.round(preview.cursorMs));

  const heading = document.createElement('div');
  heading.className = 'mmx-frame-preview-heading';
  heading.textContent = 'Frame preview';
  const canvas = document.createElement('canvas');
  canvas.className = 'mmx-frame-preview-canvas';
  canvas.width = preview.width;
  canvas.height = preview.height;
  drawPreview(canvas, preview);
  const status = document.createElement('div');
  status.className = 'mmx-frame-preview-status';
  status.textContent = preview.active.length
    ? `${preview.active.length} visual element(s) at cursor`
    : 'No active visual elements at cursor';
  if (preview.warnings.length) {
    const warn = document.createElement('div');
    warn.className = 'mmx-frame-preview-warning';
    warn.textContent = preview.warnings.join(' ');
    panel.append(heading, canvas, status, warn);
  } else {
    panel.append(heading, canvas, status);
  }
  root.append(panel);
  return panel;
}

function drawPreview(canvas, preview) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  preview.active.forEach((item, index) => drawVisualItem(ctx, canvas, item, index));
}

function drawVisualItem(ctx, canvas, item, index) {
  const visual = item.visual;
  const baseW = canvas.width * 0.42 * visual.scaleX;
  const baseH = canvas.height * 0.42 * visual.scaleY;
  const cx = canvas.width / 2 + visual.x;
  const cy = canvas.height / 2 + visual.y;
  ctx.save();
  ctx.globalAlpha = visual.opacity;
  ctx.translate(cx, cy);
  ctx.rotate((visual.rotation * Math.PI) / 180);
  ctx.fillStyle = item.hasVideo ? '#7a5cbd' : '#54a24b';
  ctx.fillRect(-baseW / 2, -baseH / 2, baseW, baseH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-baseW / 2, -baseH / 2, baseW, baseH);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(item.hasVideo ? 'VIDEO' : 'IMAGE', -baseW / 2 + 8, -baseH / 2 + 18);
  ctx.fillText(String(index + 1), baseW / 2 - 18, baseH / 2 - 8);
  ctx.restore();
}

function isVisualElement(element) {
  return !!(element?.capabilities?.hasVideo || element?.capabilities?.hasImage);
}

function isActiveAt(element, cursorMs) {
  const start = Math.max(0, Number(element.timeline?.startMs) || 0);
  const duration = Math.max(0, Number(element.timeline?.placementDurationMs ?? element.timeline?.durationMs) || 0);
  return cursorMs >= start && cursorMs <= start + duration;
}

function normalizeVisual(visual = {}) {
  return {
    x: finite(visual.x, 0),
    y: finite(visual.y, 0),
    scaleX: Math.max(0.01, finite(visual.scaleX, 1)),
    scaleY: Math.max(0.01, finite(visual.scaleY, 1)),
    rotation: finite(visual.rotation, 0),
    opacity: Math.max(0, Math.min(1, finite(visual.opacity, 1))),
  };
}

function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
