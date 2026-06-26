export function createMixerVisualRuntime({ runtimeFiles, onUpdate, maxWidth = 320, maxHeight = 180 } = {}) {
  const frames = new Map();
  const urls = new Map();
  const videos = new Map();
  const pending = new Set();
  const sampled = new Map();

  function update(project = {}, cursorMs = 0) {
    for (const element of project.elements || []) {
      if (!isActiveVisual(element, cursorMs)) continue;
      const asset = (project.assets || []).find((item) => item.id === element.assetId);
      const file = asset ? runtimeFiles?.get(asset.id) : null;
      if (!asset || !file) continue;
      if (element.capabilities?.hasImage && !element.capabilities?.hasVideo) ensureImageFrame(asset, file);
      if (element.capabilities?.hasVideo && !element.capabilities?.needsFfmpegForPreview) {
        ensureVideoFrame(asset, file, element, cursorMs);
      }
    }
  }

  function dispose() {
    for (const video of videos.values()) {
      video.removeAttribute('src');
      video.load?.();
    }
    for (const url of urls.values()) URL.revokeObjectURL(url);
    frames.clear();
    urls.clear();
    videos.clear();
    pending.clear();
    sampled.clear();
  }

  function ensureImageFrame(asset, file) {
    if (frames.has(asset.id) || pending.has(asset.id)) return;
    pending.add(asset.id);
    const img = new Image();
    img.onload = () => {
      pending.delete(asset.id);
      frames.set(asset.id, {
        kind: 'image',
        source: img,
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
      });
      onUpdate?.();
    };
    img.onerror = () => {
      pending.delete(asset.id);
      frames.set(asset.id, { kind: 'missing', error: 'image-decode-failed' });
      onUpdate?.();
    };
    img.src = urlFor(asset.id, file);
  }

  function ensureVideoFrame(asset, file, element, cursorMs) {
    const sourceMs = sourceTimeMs(element, cursorMs);
    const sampleKey = `${asset.id}:${Math.max(0, Math.round(sourceMs / 250) * 250)}`;
    if (sampled.get(asset.id) === sampleKey || pending.has(sampleKey)) return;
    const video = videoFor(asset.id, file);
    if (!video) return;
    pending.add(sampleKey);
    const targetSec = Math.max(0, sourceMs / 1000);
    const capture = () => {
      if (!video.videoWidth || !video.videoHeight) {
        pending.delete(sampleKey);
        return;
      }
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / video.videoWidth, maxHeight / video.videoHeight);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      pending.delete(sampleKey);
      sampled.set(asset.id, sampleKey);
      frames.set(asset.id, {
        kind: 'video',
        source: canvas,
        width: canvas.width,
        height: canvas.height,
        sampledMs: Math.round(targetSec * 1000),
      });
      onUpdate?.();
    };
    const fail = () => {
      pending.delete(sampleKey);
      frames.set(asset.id, { kind: 'missing', error: 'video-frame-unavailable' });
      onUpdate?.();
    };
    video.addEventListener('seeked', capture, { once: true });
    video.addEventListener('error', fail, { once: true });
    const seek = () => {
      try {
        video.currentTime = targetSec;
      } catch {
        fail();
      }
    };
    if (video.readyState >= 2 && Math.abs((video.currentTime || 0) - targetSec) < 0.08) {
      capture();
    } else if (video.readyState >= 1) {
      seek();
    } else {
      video.addEventListener('loadedmetadata', seek, { once: true });
    }
  }

  function videoFor(assetId, file) {
    if (videos.has(assetId)) return videos.get(assetId);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = urlFor(assetId, file);
    video.load();
    videos.set(assetId, video);
    return video;
  }

  function urlFor(assetId, file) {
    if (!urls.has(assetId)) urls.set(assetId, URL.createObjectURL(file));
    return urls.get(assetId);
  }

  return { frames, update, dispose };
}

function isActiveVisual(element, cursorMs) {
  if (!element?.capabilities?.hasVideo && !element?.capabilities?.hasImage) return false;
  const start = Math.max(0, Number(element.timeline?.startMs) || 0);
  const duration = Math.max(0, Number(element.timeline?.placementDurationMs ?? element.timeline?.durationMs) || 0);
  return cursorMs >= start && cursorMs <= start + duration;
}

function sourceTimeMs(element, cursorMs) {
  const start = Math.max(0, Number(element.timeline?.startMs) || 0);
  const sourceIn = Math.max(0, Number(element.timeline?.sourceInMs) || 0);
  const speed = Math.max(0.01, Number(element.timeline?.speed) || 1);
  return sourceIn + Math.max(0, cursorMs - start) / speed;
}
