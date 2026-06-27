export function buildSeekFramePreview(snapshot = {}, cursorMs = 0, output = {}) {
  const width = Math.max(1, Number(output.width) || 320);
  const height = Math.max(1, Number(output.height) || 180);
  const frames = output.frames || new Map();
  const active = (snapshot.elements || [])
    .filter((element) => isVisualElement(element) && isActiveAt(element, cursorMs))
    .map((element) => {
      const animated = evaluateElementKeyframes(element, cursorMs);
      return {
        elementId: element.id,
        laneId: element.laneId,
        type: element.type,
        label: element.assetId || element.type || 'visual',
        hasVideo: !!element.capabilities?.hasVideo,
        hasImage: !!element.capabilities?.hasImage,
        needsFfmpegForPreview: !!element.capabilities?.needsFfmpegForPreview,
        startMs: element.timeline?.startMs || 0,
        endMs: (element.timeline?.startMs || 0) + (element.timeline?.placementDurationMs || element.timeline?.durationMs || 0),
        visual: animated.visual,
        filter: animated.filter,
        frame: frameFor(frames, element),
      };
    });
  return {
    cursorMs,
    width,
    height,
    active,
    frameCount: active.filter((item) => item.frame?.source).length,
    warnings: active.filter((item) => item.needsFfmpegForPreview).map((item) => `${item.label} needs ffmpeg/proxy conversion for accurate preview.`),
  };
}

export function evaluateElementKeyframes(element = {}, cursorMs = 0) {
  const visual = normalizeVisual(element.visual);
  const filter = normalizeVideoFilter(element);
  const groups = keyframesByPath(element.keyframes || []);
  const t = Math.max(0, Math.round(finite(cursorMs, 0)));
  for (const [path, frames] of groups.entries()) {
    const value = interpolateKeyframeValue(frames, t);
    if (path === 'visual.x') visual.x = finite(value, visual.x);
    if (path === 'visual.y') visual.y = finite(value, visual.y);
    if (path === 'visual.scaleX') visual.scaleX = Math.max(0.01, finite(value, visual.scaleX));
    if (path === 'visual.scaleY') visual.scaleY = Math.max(0.01, finite(value, visual.scaleY));
    if (path === 'visual.rotation') visual.rotation = finite(value, visual.rotation);
    if (path === 'visual.opacity') visual.opacity = Math.max(0, Math.min(1, finite(value, visual.opacity)));
    if (path === 'visual.crop') visual.crop = normalizeCrop(value);
    if (path === 'effect.video-filter.params') {
      Object.assign(filter, normalizeFilterParams({ ...filter, ...value }));
    }
  }
  return { visual, filter };
}

export function renderSeekFramePreview(root, preview) {
  const panel = document.createElement('section');
  panel.className = 'mmx-frame-preview';
  panel.dataset.activeVisuals = String(preview.active.length);
  panel.dataset.frameSources = String(preview.frameCount || 0);
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
    ? `${preview.active.length} visual element(s) at cursor · ${preview.frameCount || 0} frame source(s)`
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
  ctx.filter = canvasFilter(item.filter);
  ctx.translate(cx, cy);
  ctx.rotate((visual.rotation * Math.PI) / 180);
  if (item.frame?.source) {
    drawContainedFrame(ctx, item.frame.source, -baseW / 2, -baseH / 2, baseW, baseH, visual.crop);
  } else {
    ctx.fillStyle = item.hasVideo ? '#7a5cbd' : '#54a24b';
    ctx.fillRect(-baseW / 2, -baseH / 2, baseW, baseH);
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-baseW / 2, -baseH / 2, baseW, baseH);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(item.hasVideo ? 'VIDEO' : 'IMAGE', -baseW / 2 + 8, -baseH / 2 + 18);
  ctx.fillText(String(index + 1), baseW / 2 - 18, baseH / 2 - 8);
  ctx.restore();
}

function canvasFilter(filter) {
  const parts = [];
  if (!filter) return 'none';
  if (filter.brightness) parts.push(`brightness(${Math.max(0, 1 + filter.brightness)})`);
  if (filter.contrast !== 1) parts.push(`contrast(${filter.contrast})`);
  if (filter.saturation !== 1) parts.push(`saturate(${filter.saturation})`);
  if (filter.hue) parts.push(`hue-rotate(${filter.hue}deg)`);
  if (filter.grayscale) parts.push('grayscale(1)');
  if (filter.invert) parts.push('invert(1)');
  if (filter.sepia) parts.push(`sepia(${filter.sepia})`);
  if (filter.blur) parts.push(`blur(${filter.blur}px)`);
  return parts.join(' ') || 'none';
}

function drawContainedFrame(ctx, source, x, y, width, height, crop = null) {
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width || width;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height || height;
  const sourceCrop = crop || { x: 0, y: 0, width: 1, height: 1 };
  const sx = sourceWidth * sourceCrop.x;
  const sy = sourceHeight * sourceCrop.y;
  const sw = sourceWidth * sourceCrop.width;
  const sh = sourceHeight * sourceCrop.height;
  const scale = Math.min(width / sw, height / sh);
  const drawW = sw * scale;
  const drawH = sh * scale;
  ctx.drawImage(source, sx, sy, sw, sh, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}

function frameFor(frames, element) {
  if (!frames) return null;
  if (typeof frames.get === 'function') return frames.get(element.id) || frames.get(element.assetId) || null;
  return frames[element.id] || frames[element.assetId] || null;
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
    crop: normalizeCrop(visual.crop),
  };
}

function normalizeVideoFilter(element) {
  const effect = (element.effects || []).find((item) => item.kind === 'video-filter' && item.enabled !== false);
  return normalizeFilterParams(effect?.params || {});
}

function normalizeFilterParams(params = {}) {
  return {
    brightness: Math.max(-1, Math.min(1, finite(params.brightness, 0))),
    contrast: Math.max(0, Math.min(3, finite(params.contrast, 1))),
    saturation: Math.max(0, Math.min(3, finite(params.saturation, 1))),
    hue: Math.max(-180, Math.min(180, finite(params.hue, 0))),
    blur: Math.max(0, Math.min(20, finite(params.blur, 0))),
    grayscale: finite(params.grayscale, 0) >= 0.5 ? 1 : 0,
    invert: finite(params.invert, 0) >= 0.5 ? 1 : 0,
    sepia: Math.max(0, Math.min(1, finite(params.sepia, 0))),
  };
}

function keyframesByPath(keyframes) {
  const groups = new Map();
  for (const keyframe of keyframes) {
    const path = String(keyframe?.path || '');
    if (!path) continue;
    if (!groups.has(path)) groups.set(path, []);
    groups.get(path).push({
      timeMs: Math.max(0, Math.round(finite(keyframe.timeMs, 0))),
      value: cloneValue(keyframe.value),
      interpolation: keyframe.interpolation || 'linear',
    });
  }
  for (const frames of groups.values()) frames.sort((a, b) => a.timeMs - b.timeMs);
  return groups;
}

function interpolateKeyframeValue(frames, cursorMs) {
  if (!frames.length) return null;
  if (cursorMs <= frames[0].timeMs) return cloneValue(frames[0].value);
  const last = frames[frames.length - 1];
  if (cursorMs >= last.timeMs) return cloneValue(last.value);
  for (let i = 1; i < frames.length; i += 1) {
    const next = frames[i];
    if (cursorMs > next.timeMs) continue;
    const prev = frames[i - 1];
    if (cursorMs === next.timeMs || next.timeMs === prev.timeMs) return cloneValue(next.value);
    if (prev.interpolation === 'hold') return cloneValue(prev.value);
    const ratio = Math.max(0, Math.min(1, (cursorMs - prev.timeMs) / (next.timeMs - prev.timeMs)));
    return interpolateValue(prev.value, next.value, ratio);
  }
  return cloneValue(last.value);
}

function interpolateValue(a, b, ratio) {
  if (Number.isFinite(Number(a)) && Number.isFinite(Number(b))) {
    return Number(a) + (Number(b) - Number(a)) * ratio;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const output = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (Number.isFinite(Number(a[key])) && Number.isFinite(Number(b[key]))) {
        output[key] = Number(a[key]) + (Number(b[key]) - Number(a[key])) * ratio;
      } else {
        output[key] = ratio < 1 ? cloneValue(a[key]) : cloneValue(b[key]);
      }
    }
    return output;
  }
  return ratio < 1 ? cloneValue(a) : cloneValue(b);
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (value == null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
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

function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
