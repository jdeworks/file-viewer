import { clamp } from './compare-ui-constants.js';
import { ensureCanvasSize } from './compare-ui-draw.js';

function fmt(t) {
  const value = Math.max(0, Number.isFinite(t) ? t : 0);
  const m = Math.floor(value / 60);
  const s = value - (m * 60);
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

export function createVideoCompareController({
  kind,
  state,
  addListener,
  makeObjectUrl,
  releaseObjectUrl,
  render,
}) {
  let rafId = 0;
  let composeRafId = 0;
  let playing = false;
  let startedAtMs = 0;
  let startPlayhead = 0;

  const transport = document.createElement('div');
  transport.className = 'media-compare-transport';
  transport.hidden = kind !== 'video';
  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'media-compare-play';
  playButton.textContent = 'Play';
  const stopButton = document.createElement('button');
  stopButton.type = 'button';
  stopButton.className = 'media-compare-stop';
  stopButton.textContent = 'Stop';
  const timeReadout = document.createElement('span');
  timeReadout.className = 'media-compare-time';
  transport.append(playButton, stopButton, timeReadout);

  const videoPreview = document.createElement('div');
  videoPreview.className = 'media-compare-video-preview media-video-surface';
  videoPreview.hidden = kind !== 'video';
  const videoPreviewEls = new Map();
  const videoUrls = { A: '', B: '' };
  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'media-compare-video-canvas';
  previewCanvas.hidden = kind !== 'video';

  function compareTimelineEnd() {
    return Math.max(
      1,
      state.lanes.A.offset + state.lanes.A.out,
      state.lanes.B.offset + state.lanes.B.out,
      state.lanes.A.out,
      state.lanes.B.out,
    );
  }

  function sourceTimeForLane(laneId, timelineTime = state.playhead) {
    return timelineTime - state.lanes[laneId].offset;
  }

  function laneActiveAt(laneId, timelineTime = state.playhead) {
    const sourceTime = sourceTimeForLane(laneId, timelineTime);
    const lane = state.lanes[laneId];
    return !!state.files[laneId] && sourceTime >= lane.in && sourceTime <= lane.out;
  }

  function laneOpacity(laneId) {
    return clamp(laneId === 'A' ? state.videoOpacityA : state.videoOpacityB, 0, 100) / 100;
  }

  function seekLaneVideo(laneId, timelineTime = state.playhead) {
    if (kind !== 'video') return null;
    const refs = videoPreviewEls.get(laneId);
    if (!refs) return null;

    if (!state.files[laneId]) {
      refs.layer.hidden = laneId === 'B';
      refs.layer.dataset.active = 'false';
      refs.layer.setAttribute('aria-hidden', 'true');
      refs.label.textContent = `Lane ${laneId}: ${laneId === 'A' ? 'Choose a source file' : 'Choose a second file'}`;
      return {
        video: refs.video,
        active: false,
        laneId,
        opacity: 0,
      };
    }

    const lane = state.lanes[laneId];
    const active = laneActiveAt(laneId, timelineTime);
    const target = clamp(sourceTimeForLane(laneId, timelineTime), lane.in, lane.out);
    if (Number.isFinite(target) && Math.abs((refs.video.currentTime || 0) - target) > 0.12) {
      try { refs.video.currentTime = target; } catch { /* metadata may still be loading */ }
    }
    refs.layer.hidden = false;
    refs.layer.classList.toggle('media-compare-video-layer--inactive', !active);
    refs.layer.dataset.active = active ? 'true' : 'false';
    refs.layer.dataset.lane = laneId;
    refs.layer.setAttribute('aria-hidden', active ? 'false' : 'true');
    refs.label.textContent = `Lane ${laneId}: ${lane.label}`;

    return {
      video: refs.video,
      active,
      laneId,
      opacity: laneOpacity(laneId),
      layer: refs.layer,
    };
  }

  function layoutRegions(totalWidth, totalHeight) {
    const gap = Math.max(1, Math.round(Math.min(totalWidth, totalHeight) * 0.01));
    if (state.layout === 'side-by-side') {
      const leftWidth = Math.max(1, Math.floor((totalWidth - gap) / 2));
      const rightWidth = Math.max(1, Math.floor(totalWidth - leftWidth - gap));
      return {
        A: { x: 0, y: 0, w: leftWidth, h: totalHeight },
        B: { x: leftWidth + gap, y: 0, w: rightWidth, h: totalHeight },
      };
    }
    if (state.layout === 'top-bottom') {
      const topHeight = Math.max(1, Math.floor((totalHeight - gap) / 2));
      const bottomHeight = Math.max(1, Math.floor(totalHeight - topHeight - gap));
      return {
        A: { x: 0, y: 0, w: totalWidth, h: topHeight },
        B: { x: 0, y: topHeight + gap, w: totalWidth, h: bottomHeight },
      };
    }
    return {
      A: { x: 0, y: 0, w: totalWidth, h: totalHeight },
      B: { x: 0, y: 0, w: totalWidth, h: totalHeight },
    };
  }

  function drawLaneIntoRegion(ctx, video, region, opacity) {
    if (!video || !region || !Number.isFinite(opacity) || opacity <= 0) return false;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const scale = Math.min(region.w / srcW, region.h / srcH);
    if (!Number.isFinite(scale) || scale <= 0) return false;
    const drawW = Math.max(1, Math.round(srcW * scale));
    const drawH = Math.max(1, Math.round(srcH * scale));
    const x = region.x + Math.max(0, Math.round((region.w - drawW) / 2));
    const y = region.y + Math.max(0, Math.round((region.h - drawH) / 2));
    const prior = ctx.globalAlpha;
    try {
      ctx.globalAlpha = opacity;
      ctx.drawImage(video, x, y, drawW, drawH);
      return true;
    } catch {
      return false;
    } finally {
      ctx.globalAlpha = prior;
    }
  }

  function paintVideoComposition(retries = 4) {
    if (kind !== 'video') return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = ensureCanvasSize(previewCanvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    const regions = layoutRegions(width, height);
    const aRef = videoPreviewEls.get('A');
    const bRef = videoPreviewEls.get('B');
    const a = {
      ref: aRef?.video || null,
      active: laneActiveAt('A'),
      opacity: clamp(state.videoOpacityA, 0, 100) / 100,
      region: regions.A,
      laneId: 'A',
    };
    const b = {
      ref: bRef?.video || null,
      active: laneActiveAt('B'),
      opacity: clamp(state.videoOpacityB, 0, 100) / 100,
      region: regions.B,
      laneId: 'B',
    };
    let stillWaitingForFrames = false;

    if (state.layout === 'overlay') {
      const back = state.videoForeground === 'A' ? b : a;
      const fore = state.videoForeground === 'A' ? a : b;
      if (back && back.ref) {
        const didDrawBack = back.active && back.opacity > 0
          ? drawLaneIntoRegion(ctx, back.ref, back.region, back.opacity)
          : false;
        if (back.active && back.opacity > 0 && !didDrawBack) {
          stillWaitingForFrames = true;
        }
      }
      if (fore && fore.ref) {
        const didDrawFore = fore.active && fore.opacity > 0
          ? drawLaneIntoRegion(ctx, fore.ref, fore.region, fore.opacity)
          : false;
        if (fore.active && fore.opacity > 0 && !didDrawFore) {
          stillWaitingForFrames = true;
        }
      }
    } else {
      if (a.ref) {
        const didDrawA = a.active && a.opacity > 0
          ? drawLaneIntoRegion(ctx, a.ref, a.region, a.opacity)
          : false;
        if (a.active && a.opacity > 0 && !didDrawA) {
          stillWaitingForFrames = true;
        }
      }
      if (b.ref) {
        const didDrawB = b.active && b.opacity > 0
          ? drawLaneIntoRegion(ctx, b.ref, b.region, b.opacity)
          : false;
        if (b.active && b.opacity > 0 && !didDrawB) {
          stillWaitingForFrames = true;
        }
      }
    }

    if (stillWaitingForFrames && retries > 0) {
      composeRafId = requestAnimationFrame(() => {
        composeRafId = 0;
        paintVideoComposition(retries - 1);
      });
    }
  }

  function requestPaintVideoComposition() {
    if (composeRafId) return;
    composeRafId = requestAnimationFrame(() => {
      composeRafId = 0;
      paintVideoComposition();
    });
  }

  function syncVideoPreviewToPlayhead() {
    if (kind !== 'video') return;
    const a = seekLaneVideo('A');
    const b = seekLaneVideo('B');
    for (const item of [a, b]) {
      if (!item?.video) continue;
      if (playing && item.active && item.opacity > 0 && item.video.paused) item.video.play?.().catch(() => {});
      else item.video.pause?.();
    }
    requestPaintVideoComposition();
  }

  function stopComparePlayback({ reset = false } = {}) {
    playing = false;
    state.playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (reset) state.playhead = 0;
    syncVideoPreviewToPlayhead();
    render();
  }

  function startComparePlayback() {
    if (playing) {
      stopComparePlayback();
      return;
    }
    playing = true;
    state.playing = true;
    startedAtMs = performance.now();
    startPlayhead = state.playhead;
    syncVideoPreviewToPlayhead();
    const tick = () => {
      if (!playing) return;
      state.playhead = startPlayhead + ((performance.now() - startedAtMs) / 1000);
      if (state.playhead >= compareTimelineEnd()) {
        stopComparePlayback();
        return;
      }
      syncVideoPreviewToPlayhead();
      render();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    render();
  }

  function buildVideoPreviewLayer(laneId) {
    const layer = document.createElement('div');
    layer.className = `media-compare-video-layer media-compare-video-layer--${laneId.toLowerCase()}`;
    layer.dataset.lane = laneId;
    layer.hidden = true;
    const label = document.createElement('div');
    label.className = 'media-compare-video-layer-label';
    label.textContent = `Lane ${laneId}: Choose a source file`;
    const video = document.createElement('video');
    video.className = 'media-compare-video-el';
    video.controls = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.inert = true;
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    addListener(video, 'loadedmetadata', () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      if (!duration) return;
      if (laneId === 'A') state.durationA = duration;
      else state.durationB = duration;
      const lane = state.lanes[laneId];
      lane.out = Math.max(lane.in, Math.min(lane.out, duration));
      render();
      requestPaintVideoComposition();
    });
    layer.append(label, video);
    videoPreviewEls.set(laneId, { layer, label, video });
    return layer;
  }

  function updateVideoPreviewSource(laneId) {
    if (kind !== 'video') return;
    const refs = videoPreviewEls.get(laneId);
    if (!refs) return;
    const prior = videoUrls[laneId];
    if (prior) releaseObjectUrl(prior);
    videoUrls[laneId] = makeObjectUrl(state.files[laneId]);
    if (videoUrls[laneId]) {
      refs.video.src = videoUrls[laneId];
      refs.video.load?.();
    } else {
      refs.video.removeAttribute('src');
      refs.video.load?.();
    }
  }

  videoPreview.append(previewCanvas, buildVideoPreviewLayer('A'), buildVideoPreviewLayer('B'));
  addListener(playButton, 'click', startComparePlayback);
  addListener(stopButton, 'click', () => stopComparePlayback({ reset: true }));

  return {
    transport,
    playButton,
    timeReadout,
    videoPreview,
    videoPreviewEls,
    compareTimelineEnd,
    fmt,
    updateVideoPreviewSource,
    syncVideoPreviewToPlayhead,
    stopComparePlayback,
  };
}
