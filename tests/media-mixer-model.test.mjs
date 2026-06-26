import assert from 'node:assert/strict';

import {
  addElement,
  addLane,
  buildSeekFramePreview,
  captureElementKeyframe,
  computeCompareOverlap,
  createDefaultEq,
  createGeneratedElement,
  createLane,
  createProjectFromAssetMetadata,
  getLaneDescriptor,
  moveElement,
  setElementTransition,
  setElementPlacementDuration,
  splitElement,
  trimElement,
  setCompareTarget,
} from '../docs/types/media/mixer/index.js';

{
  const project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'sample.wav',
    mime: 'audio/wav',
    size: 1024,
    capabilities: { hasAudio: true, hasVideo: false, hasImage: false },
    media: { durationMs: 120000, audioSampleRate: 48000, audioChannels: 1 },
  });

  assert.equal(project.assets.length, 1, 'model: creates one asset');
  assert.equal(project.lanes[0].role, 'audio', 'model: audio metadata creates an audio lane');
  assert.equal(project.elements[0].capabilities.hasAudio, true, 'model: element keeps audio capability');
  assert.equal(project.project.durationMs, 120000, 'model: project duration follows first element');
  assert.equal(project.project.sampleRate, 48000, 'model: project preserves source sample rate');
}

{
  const videoProject = createProjectFromAssetMetadata({
    id: 'asset-video',
    name: 'clip.mp4',
    mime: 'video/mp4',
    capabilities: { hasAudio: true, hasVideo: true, hasImage: false },
    media: { durationMs: 5000, videoWidth: 1920, videoHeight: 1080, frameRate: 24 },
  });
  assert.equal(videoProject.lanes[0].role, 'video', 'model: video metadata creates a video lane');
  assert.equal(videoProject.elements[0].type, 'video', 'model: video metadata creates video element');
  assert.equal(videoProject.elements[0].capabilities.hasAudio, true, 'model: mixed video/audio asset keeps audio capability');

  const withImageLane = addLane(videoProject, createLane({ id: 'lane-image', role: 'image', order: 2 }));
  const withImage = addElement(withImageLane, {
    id: 'element-image',
    laneId: 'lane-image',
    assetId: 'asset-image',
    capabilities: { hasImage: true },
    durationMs: 3000,
    visual: { x: 10, y: 20, scaleX: 1.5, opacity: 0.75, crop: { x: 0.2, y: 0.1, width: 0.9, height: 0.95 } },
    effects: [{ kind: 'video-filter', params: { brightness: 0.1, contrast: 1.2 } }],
  });
  const image = withImage.elements.find((element) => element.id === 'element-image');
  assert.equal(image.type, 'image', 'model: image element is typed as image');
  assert.equal(image.visual.scaleX, 1.5, 'model: image element stores visual transforms');
  assert.deepEqual(image.visual.crop, { x: 0.2, y: 0.1, width: 0.8, height: 0.9 }, 'model: image element normalizes visual crop inside source bounds');
  assert.equal(image.effects[0].targetId, 'element-image', 'model: image element normalizes effect target id');
  assert.equal(image.effects[0].enabled, true, 'model: image element normalizes effect enabled state');
  assert.equal(image.effects[0].params.brightness, 0.1, 'model: image element stores video filter effect params');
  const withTransition = setElementTransition(withImage, 'element-image', { durationMs: 250, kind: 'wipe-left' });
  assert.equal(withTransition.transitions.length, 1, 'model: visual element transition is stored at project level');
  assert.equal(withTransition.transitions[0].toElementId, 'element-image', 'model: transition targets selected visual element');
  assert.equal(withTransition.transitions[0].kind, 'wipe-left', 'model: transition kind is preserved');
  assert.equal(withTransition.transitions[0].durationMs, 250, 'model: transition duration is preserved');
  const withoutTransition = setElementTransition(withTransition, 'element-image', { durationMs: 0 });
  assert.equal(withoutTransition.transitions.length, 0, 'model: zero-duration transition removes transition record');
  const withKeyframe = captureElementKeyframe(withImage, 'element-image', 1234);
  const imageKeyframes = withKeyframe.elements.find((element) => element.id === 'element-image').keyframes;
  assert.equal(imageKeyframes.some((keyframe) => keyframe.path === 'visual.x' && keyframe.timeMs === 1234 && keyframe.value === 10), true, 'model: captures visual transform keyframe');
  assert.equal(imageKeyframes.some((keyframe) => keyframe.path === 'effect.video-filter.params' && keyframe.value.brightness === 0.1), true, 'model: captures video filter keyframe');
  const replacedKeyframe = captureElementKeyframe(captureElementKeyframe(withKeyframe, 'element-image', 1234), 'element-image', 1234);
  assert.equal(
    replacedKeyframe.elements.find((element) => element.id === 'element-image').keyframes.length,
    imageKeyframes.length,
    'model: recapturing the same keyframe time replaces path values instead of duplicating them',
  );

  const imageProject = createProjectFromAssetMetadata({
    id: 'asset-image',
    name: 'still.png',
    mime: 'image/png',
    capabilities: { hasImage: true },
    media: { durationMs: 0 },
  });
  assert.equal(imageProject.lanes[0].role, 'image', 'model: image metadata creates an image lane');
  assert.equal(imageProject.elements[0].timeline.placementDurationMs, 5000, 'model: image metadata gets default editable duration');
}

{
  let project = createProjectFromAssetMetadata({
    id: 'asset-video',
    name: 'clip.mp4',
    mime: 'video/mp4',
    capabilities: { hasAudio: true, hasVideo: true },
    media: { durationMs: 5000, videoWidth: 1280, videoHeight: 720 },
  });
  const elementId = project.elements[0].id;
  project = addElement({
    ...project,
    elements: project.elements.filter((element) => element.id !== elementId),
  }, {
    id: elementId,
    laneId: project.lanes[0].id,
    assetId: 'asset-video',
    capabilities: { hasAudio: true, hasVideo: true },
    durationMs: 5000,
    visual: { x: 0, y: 0, opacity: 1, crop: { x: 0, y: 0, width: 1, height: 1 } },
    effects: [{ kind: 'video-filter', params: { brightness: 0, contrast: 1, hue: 0 } }],
    keyframes: [
      { path: 'visual.x', timeMs: 1000, value: 10 },
      { path: 'visual.x', timeMs: 3000, value: 50 },
      { path: 'visual.opacity', timeMs: 1000, value: 0.2 },
      { path: 'visual.opacity', timeMs: 3000, value: 0.8 },
      { path: 'visual.crop', timeMs: 1000, value: { x: 0, y: 0, width: 1, height: 1 } },
      { path: 'visual.crop', timeMs: 3000, value: { x: 0.2, y: 0.1, width: 0.6, height: 0.7 } },
      { path: 'effect.video-filter.params', timeMs: 1000, value: { brightness: 0, contrast: 1, hue: 0, sepia: 0 } },
      { path: 'effect.video-filter.params', timeMs: 3000, value: { brightness: 0.4, contrast: 1.4, hue: 60, sepia: 0.8 } },
    ],
  });
  const active = buildSeekFramePreview(project, 2000).active.find((item) => item.elementId === elementId);
  assert.equal(active.visual.x, 30, 'preview: interpolates visual transform keyframes at cursor');
  assert.equal(active.visual.opacity, 0.5, 'preview: interpolates opacity keyframes at cursor');
  assert.deepEqual(active.visual.crop, { x: 0.1, y: 0.05, width: 0.8, height: 0.85 }, 'preview: interpolates crop keyframes at cursor');
  assert.equal(active.filter.brightness, 0.2, 'preview: interpolates video filter brightness keyframes at cursor');
  assert.equal(active.filter.contrast, 1.2, 'preview: interpolates video filter contrast keyframes at cursor');
  assert.equal(active.filter.hue, 30, 'preview: interpolates video filter hue keyframes at cursor');
  assert.equal(active.filter.sepia, 0.4, 'preview: interpolates video filter sepia keyframes at cursor');
}

{
  assert.equal(getLaneDescriptor('room-tone').derived, true, 'model: room-tone lane descriptor is derived');
  assert.equal(getLaneDescriptor('music').accepts.audio, true, 'model: music descriptor accepts audio');

  const generated = createGeneratedElement({
    id: 'pink-noise-1',
    laneId: 'lane-room-tone',
    kind: 'pink-noise',
    durationMs: 2000,
    levelDb: -48,
  });
  assert.equal(generated.type, 'generated', 'model: pink noise is a generated element');
  assert.equal(generated.audio.roomTone.kind, 'pink-noise', 'model: pink noise stores room-tone semantics');
}

{
  let project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'sample.mp3',
    capabilities: { hasAudio: true },
    media: { durationMs: 10000 },
  });
  const id = project.elements[0].id;
  project = moveElement(project, id, 2500);
  assert.equal(project.elements[0].timeline.startMs, 2500, 'timing: move updates timeline start');

  project = trimElement(project, id, { sourceInMs: 1000, sourceOutMs: 7000 });
  assert.equal(project.elements[0].timeline.sourceInMs, 1000, 'timing: trim updates source in');
  assert.equal(project.elements[0].timeline.sourceOutMs, 7000, 'timing: trim updates source out');
  assert.equal(project.elements[0].timeline.durationMs, 6000, 'timing: trim updates duration');
  assert.equal(project.elements[0].timeline.rawDurationMs, 10000, 'timing: trim preserves raw duration');

  project = setElementPlacementDuration(project, id, 12000);
  assert.equal(project.elements[0].timeline.durationMs, 6000, 'timing: loop placement keeps edited duration');
  assert.equal(project.elements[0].timeline.placementDurationMs, 12000, 'timing: loop placement changes occupancy');

  project = splitElement(project, id, 4500);
  assert.equal(project.elements.length, 2, 'timing: split creates a second element');
  assert.equal(project.elements[0].timeline.durationMs, 2000, 'timing: split left duration is local split length');
  assert.equal(project.elements[1].timeline.startMs, 4500, 'timing: split right starts at split point');
}

{
  let project = createProjectFromAssetMetadata({
    id: 'asset-a',
    name: 'a.wav',
    capabilities: { hasAudio: true },
    media: { durationMs: 10000 },
  });
  const laneB = createLane({ id: 'lane-b', role: 'audio', order: 1 });
  project = addLane(project, laneB);
  project = addElement(project, {
    id: 'element-b',
    laneId: 'lane-b',
    assetId: 'asset-b',
    capabilities: { hasAudio: true },
    startMs: 4000,
    durationMs: 5000,
    rawDurationMs: 5000,
  });
  project = setCompareTarget(project, 'a', {
    elementId: project.elements[0].id,
    rangeStartMs: 0,
    rangeEndMs: 8000,
    offsetMs: 0,
  });
  project = setCompareTarget(project, 'b', {
    elementId: 'element-b',
    rangeStartMs: 4000,
    rangeEndMs: 9000,
    offsetMs: -1000,
  });
  const overlap = computeCompareOverlap(project);
  assert.equal(overlap.hasOverlap, true, 'compare: shifted ranges overlap');
  assert.deepEqual(overlap.overlap, { startMs: 3000, endMs: 8000, durationMs: 5000 }, 'compare: overlap uses offsets');
}

{
  const eq = createDefaultEq({
    bands: [{ frequency: 100, gainDb: 2, q: 1.2, type: 'peaking' }],
    presetId: 'voice',
  });
  assert.equal(eq.bands.length, 1, 'eq: custom band array roundtrips');
  assert.equal(eq.bands[0].gainDb, 2, 'eq: band gain is preserved');
  assert.equal(eq.presetId, 'voice', 'eq: preset id is preserved');
}
