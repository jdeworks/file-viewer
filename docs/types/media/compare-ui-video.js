import { clamp } from './compare-ui-constants.js';

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
  videoPreview.className = 'media-compare-video-preview';
  videoPreview.hidden = kind !== 'video';
  const videoPreviewEls = new Map();
  const videoUrls = { A: '', B: '' };

  function compareTimelineEnd() {
    return Math.max(1,
      state.lanes.A.offset + state.lanes.A.out,
      state.lanes.B.offset + state.lanes.B.out,
      state.lanes.A.out,
      state.lanes.B.out);
  }

  function sourceTimeForLane(laneId, timelineTime = state.playhead) {
    return timelineTime - state.lanes[laneId].offset;
  }

  function laneActiveAt(laneId, timelineTime = state.playhead) {
    const sourceTime = sourceTimeForLane(laneId, timelineTime);
    const lane = state.lanes[laneId];
    return !!state.files[laneId] && sourceTime >= lane.in && sourceTime <= lane.out;
  }

  function seekLaneVideo(laneId, timelineTime = state.playhead) {
    if (kind !== 'video') return null;
    const refs = videoPreviewEls.get(laneId);
    if (!refs?.video || !state.files[laneId]) return null;
    const lane = state.lanes[laneId];
    const active = laneActiveAt(laneId, timelineTime);
    const target = clamp(sourceTimeForLane(laneId, timelineTime), lane.in, lane.out);
    if (Number.isFinite(target) && Math.abs((refs.video.currentTime || 0) - target) > 0.12) {
      try { refs.video.currentTime = target; } catch { /* metadata may still be loading */ }
    }
    refs.layer.classList.toggle('media-compare-video-layer--inactive', !active);
    return { video: refs.video, active };
  }

  function syncVideoPreviewToPlayhead() {
    if (kind !== 'video') return;
    const a = seekLaneVideo('A');
    const b = seekLaneVideo('B');
    for (const item of [a, b]) {
      if (!item?.video) continue;
      if (playing && item.active && item.video.paused) item.video.play?.().catch(() => {});
      else item.video.pause?.();
    }
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
    const label = document.createElement('div');
    label.className = 'media-compare-video-layer-label';
    const video = document.createElement('video');
    video.className = 'media-compare-video-el';
    video.controls = false;
    video.muted = false;
    video.playsInline = true;
    video.preload = 'metadata';
    addListener(video, 'loadedmetadata', () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      if (!duration) return;
      if (laneId === 'A') state.durationA = duration;
      else state.durationB = duration;
      const lane = state.lanes[laneId];
      lane.out = Math.max(lane.in, Math.min(lane.out, duration));
      render();
    });
    layer.append(video, label);
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

  videoPreview.append(buildVideoPreviewLayer('A'), buildVideoPreviewLayer('B'));
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
