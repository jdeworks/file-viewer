export function overlayKind(project) {
  return project.elements.some((element) => element.capabilities?.hasVideo || element.capabilities?.hasImage)
    ? 'visual'
    : 'audio';
}

export function drawCompareOverlay(canvas, project, frames, opacity) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // The B layer's alpha is user-controllable so you can fade B in/out over A to see where they differ.
  const bAlpha = Math.max(0, Math.min(1, Number(opacity ?? project.compare?.overlayOpacity ?? 0.5)));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  const [a, b] = compareElements(project);
  if (overlayKind(project) === 'visual') drawVisualOverlay(ctx, canvas, a, b, frames, bAlpha);
  else drawAudioOverlay(ctx, canvas, a, b, bAlpha);
  canvas.dataset.variedPixels = String(countVariedPixels(ctx, canvas));
}

function compareElements(project) {
  return ['a', 'b'].map((side) => {
    const id = project.compare?.[side]?.elementId;
    return project.elements.find((element) => element.id === id) || null;
  });
}

function drawAudioOverlay(ctx, canvas, a, b, bAlpha = 0.58) {
  drawWave(ctx, canvas, a?.analysis?.waveformSummary, '#4c78a8', 0.72);
  drawWave(ctx, canvas, b?.analysis?.waveformSummary, '#e5534b', bAlpha);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '12px sans-serif';
  ctx.fillText('A', 10, 18);
  ctx.fillStyle = 'rgba(229,83,75,0.92)';
  ctx.fillText('B', 30, 18);
}

function drawWave(ctx, canvas, summary, color, alpha) {
  const mid = canvas.height / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  if (!summary?.buckets) {
    ctx.fillRect(0, mid - 1, canvas.width, 2);
    ctx.restore();
    return;
  }
  for (let x = 0; x < canvas.width; x += 1) {
    const index = Math.min(summary.buckets - 1, Math.floor((x / canvas.width) * summary.buckets));
    const hi = Math.max(0.02, summary.max?.[index] || summary.peak?.[index] || 0);
    const lo = Math.min(-0.02, summary.min?.[index] || -(summary.peak?.[index] || 0));
    const top = mid - Math.max(1, hi * mid * 0.88);
    const bottom = mid - Math.min(-1, lo * mid * 0.88);
    ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
  }
  ctx.restore();
}

function drawVisualOverlay(ctx, canvas, a, b, frames, bAlpha = 0.54) {
  drawVisual(ctx, canvas, a, frames, '#4c78a8', 0.72, 'A', -canvas.width * 0.08);
  drawVisual(ctx, canvas, b, frames, '#e5534b', bAlpha, 'B', canvas.width * 0.08);
}

function drawVisual(ctx, canvas, element, frames, color, alpha, labelText, offsetX) {
  if (!element) return;
  const source = frameFor(frames, element)?.source;
  const visual = element.visual || {};
  const w = canvas.width * 0.56 * Math.max(0.05, Number(visual.scaleX) || 1);
  const h = canvas.height * 0.66 * Math.max(0.05, Number(visual.scaleY) || 1);
  const cx = canvas.width / 2 + offsetX + (Number(visual.x) || 0);
  const cy = canvas.height / 2 + (Number(visual.y) || 0);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * (visual.opacity ?? 1)));
  ctx.translate(cx, cy);
  ctx.rotate(((Number(visual.rotation) || 0) * Math.PI) / 180);
  if (source) drawContained(ctx, source, -w / 2, -h / 2, w, h);
  else {
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.fillText(labelText, -w / 2 + 8, -h / 2 + 18);
  ctx.restore();
}

function drawContained(ctx, source, x, y, width, height) {
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width || width;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height || height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawW = sourceWidth * scale;
  const drawH = sourceHeight * scale;
  ctx.drawImage(source, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}

function frameFor(frames, element) {
  if (!frames) return null;
  if (typeof frames.get === 'function') return frames.get(element.id) || frames.get(element.assetId) || null;
  return frames[element.id] || frames[element.assetId] || null;
}

function countVariedPixels(ctx, canvas) {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const first = [data[0], data[1], data[2], data[3]];
  let varied = 0;
  for (let i = 0; i < data.length; i += 32) {
    if (data[i] !== first[0] || data[i + 1] !== first[1] || data[i + 2] !== first[2] || data[i + 3] !== first[3]) varied += 1;
  }
  return varied;
}
