export function ensureCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, dpr };
}

export function drawWave(canvas, summary, accent = '#2f7de1') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = ensureCanvasSize(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg') || '#fff';
  ctx.fillRect(0, 0, width, height);
  if (!summary?.peaks?.length) return;
  const cols = summary.peaks.length;
  const mid = height / 2;
  ctx.fillStyle = accent;
  for (let i = 0; i < cols; i++) {
    const x = Math.floor((i / cols) * width);
    const nextX = Math.max(x + 1, Math.floor(((i + 1) / cols) * width));
    const peak = Math.min(1, summary.peaks[i]);
    const rms = Math.min(1, summary.rms[i]);
    ctx.globalAlpha = 0.28;
    ctx.fillRect(x, mid - peak * mid, nextX - x, Math.max(1, peak * height));
    ctx.globalAlpha = 0.78;
    ctx.fillRect(x, mid - rms * mid, nextX - x, Math.max(1, rms * height));
  }
  ctx.globalAlpha = 1;
}

export function drawDiff(canvas, diff) {
  if (!canvas) return;
  canvas.hidden = !diff?.diff?.length;
  if (!diff?.diff?.length) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = ensureCanvasSize(canvas);
  ctx.clearRect(0, 0, width, height);
  const cols = diff.diff.length;
  for (let i = 0; i < cols; i++) {
    const x = Math.floor((i / cols) * width);
    const nextX = Math.max(x + 1, Math.floor(((i + 1) / cols) * width));
    const v = Math.max(0, Math.min(1, diff.diff[i]));
    ctx.fillStyle = `rgba(215, 58, 73, ${0.12 + v * 0.78})`;
    ctx.fillRect(x, 0, nextX - x, height);
  }
}

export function drawVideoDiff(canvas, diff) {
  if (!canvas) return;
  canvas.hidden = !diff?.columnDiffs?.length;
  if (!diff?.columnDiffs?.length) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = ensureCanvasSize(canvas);
  ctx.clearRect(0, 0, width, height);
  const cols = diff.columnDiffs.length;
  for (let i = 0; i < cols; i++) {
    const x = Math.floor((i / cols) * width);
    const nextX = Math.max(x + 1, Math.floor(((i + 1) / cols) * width));
    const v = Math.max(0, Math.min(1, diff.columnDiffs[i]));
    ctx.fillStyle = `rgba(215, 58, 73, ${0.12 + v * 0.82})`;
    ctx.fillRect(x, 0, nextX - x, height);
  }
}

export function drawFrameStrip(canvas, frames) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = ensureCanvasSize(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg') || '#fff';
  ctx.fillRect(0, 0, width, height);
  if (!frames?.length) return;
  const scratch = document.createElement('canvas');
  const scratchCtx = scratch.getContext('2d');
  const gap = 2;
  const tileWidth = Math.max(1, Math.floor((width - gap * (frames.length - 1)) / frames.length));
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    scratch.width = frame.width;
    scratch.height = frame.height;
    scratchCtx.putImageData(new ImageData(frame.data, frame.width, frame.height), 0, 0);
    const x = i * (tileWidth + gap);
    ctx.drawImage(scratch, x, 0, tileWidth, height);
  }
}

function drawFrame(ctx, scratch, scratchCtx, frame, width, height, opacity) {
  scratch.width = frame.width;
  scratch.height = frame.height;
  scratchCtx.putImageData(new ImageData(frame.data, frame.width, frame.height), 0, 0);
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100));
  ctx.drawImage(scratch, 0, 0, width, height);
}

export function drawOverlayPreview(analysis, overlayCanvas, options = {}) {
  overlayCanvas.hidden = !analysis?.framesA?.length || !analysis?.framesB?.length;
  if (overlayCanvas.hidden) return;
  const ctx = overlayCanvas.getContext('2d');
  const { width, height } = ensureCanvasSize(overlayCanvas);
  const a = analysis.framesA[0];
  const b = analysis.framesB[0];
  const scratch = document.createElement('canvas');
  const scratchCtx = scratch.getContext('2d');
  const foreground = options.foreground === 'A' ? 'A' : 'B';
  const opacityA = Number.isFinite(options.opacityA) ? options.opacityA : 100;
  const opacityB = Number.isFinite(options.opacityB) ? options.opacityB : 55;
  const first = foreground === 'A'
    ? { frame: b, opacity: opacityB }
    : { frame: a, opacity: opacityA };
  const second = foreground === 'A'
    ? { frame: a, opacity: opacityA }
    : { frame: b, opacity: opacityB };
  ctx.clearRect(0, 0, width, height);
  drawFrame(ctx, scratch, scratchCtx, first.frame, width, height, first.opacity);
  drawFrame(ctx, scratch, scratchCtx, second.frame, width, height, second.opacity);
  ctx.globalAlpha = 1;
}
