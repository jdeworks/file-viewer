import {
  addElement,
  addLane,
  buildAudioMixExportPlan,
  buildDecodedAudioCacheKey,
  buildProcessedAudioCacheKey,
  buildSchedulePlan,
  createAudioBufferCache,
  createGeneratedElement,
  createLane,
  createProjectFromAssetMetadata,
  estimateAudioBufferBytes,
  moveElement,
  trimElement,
  updateElement,
  updateLane,
  updateMaster,
} from '../../docs/types/media/mixer/index.js';

export function proveAudioCachePolicy() {
  const fake = (length, channels = 1) => ({ length, numberOfChannels: channels, sampleRate: 48000 });
  const evicted = [];
  const cache = createAudioBufferCache({ budgetBytes: 10000, onEvict: (key) => evicted.push(key) });
  cache.set('a', fake(1000), { projectId: 'p1' });
  cache.set('b', fake(1000), { projectId: 'p1' });
  cache.get('a');
  cache.set('c', fake(1000), { projectId: 'p2' });
  let project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'voice.wav',
    hash: { value: 'hash-a' },
    size: 4096,
    lastModified: 123,
    capabilities: { hasAudio: true },
    media: { durationMs: 10000, audioSampleRate: 48000, audioChannels: 1 },
  });
  const elementId = project.elements[0].id;
  const laneId = project.lanes[0].id;
  const decodedA = buildDecodedAudioCacheKey({ projectId: project.project.id, asset: project.assets[0], element: project.elements[0], sampleRate: 48000, channels: 1 });
  const decodedB = buildDecodedAudioCacheKey({ projectId: project.project.id, asset: project.assets[0], element: project.elements[0], range: { sourceInMs: 250, sourceOutMs: 10000 }, sampleRate: 48000, channels: 1 });
  const processed = () => buildProcessedAudioCacheKey({ project, lane: project.lanes[0], element: project.elements[0], asset: project.assets[0] });
  const processedA = processed();
  project = updateElement(project, elementId, (item) => ({ ...item, audio: { ...item.audio, fadeInMs: 120, gain: 0.8 } }));
  const processedB = processed();
  project = updateLane(project, laneId, (lane) => ({ ...lane, audio: { ...lane.audio, gain: 0.5 } }));
  const processedC = processed();
  project = updateMaster(project, (master) => ({ ...master, audio: { ...master.audio, gain: 0.7 } }));
  const processedD = processed();
  project = moveElement(project, elementId, 500);
  const processedE = processed();
  cache.releaseProject('p1');
  return {
    ok: estimateAudioBufferBytes(fake(1000, 2)) === 8000
      && cache.has('a') === false
      && cache.has('b') === false
      && cache.has('c') === true
      && evicted.join(',') === 'b'
      && decodedA !== decodedB
      && processedA !== processedB
      && processedB !== processedC
      && processedC !== processedD
      && processedD !== processedE,
  };
}

export function proveScheduleSemantics() {
  let project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'voice.wav',
    capabilities: { hasAudio: true },
    media: { durationMs: 10000, audioSampleRate: 48000, audioChannels: 1 },
  });
  const sourceElementId = project.elements[0].id;
  const sourceLaneId = project.lanes[0].id;
  project = moveElement(project, sourceElementId, 1000);
  project = trimElement(project, sourceElementId, { sourceInMs: 500, sourceOutMs: 4500 });
  project = updateElement(project, sourceElementId, (element) => ({
    ...element,
    audio: { ...element.audio, gain: 0.5, fadeInMs: 120, fadeOutMs: 80 },
  }));
  project = updateLane(project, sourceLaneId, (lane) => ({
    ...lane,
    audio: { ...lane.audio, gain: 0.5 },
  }));
  project = updateMaster(project, (master) => ({
    ...master,
    audio: { ...master.audio, gain: 0.5 },
  }));
  const mutedLane = createLane({ id: 'lane-muted', role: 'audio', muted: true, order: 1 });
  project = addLane(project, mutedLane);
  project = addElement(project, {
    id: 'element-muted',
    laneId: mutedLane.id,
    assetId: 'asset-muted',
    capabilities: { hasAudio: true },
    durationMs: 1000,
    rawDurationMs: 1000,
  });
  const roomLane = createLane({ id: 'lane-room', role: 'room-tone', order: 2 });
  project = addLane(project, roomLane);
  project = addElement(project, createGeneratedElement({
    id: 'element-room',
    laneId: roomLane.id,
    kind: 'pink-noise',
    durationMs: 2000,
    rawDurationMs: 2000,
    startMs: 3000,
    audio: { gain: 0.25, roomTone: { kind: 'pink-noise', levelDb: -52 } },
  }));
  const plan = buildSchedulePlan(project, 1500);
  const source = plan.items.find((item) => item.element.id === sourceElementId);
  const room = plan.items.find((item) => item.element.id === 'element-room');
  return {
    ok: plan.items.length === 2
      && source?.delayMs === 0
      && source?.sourceOffsetMs === 1000
      && source?.durationMs === 3500
      && Math.abs((source?.gain || 0) - 0.125) < 0.0001
      && source?.element.audio.fadeInMs === 120
      && room?.delayMs === 1500
      && room?.element.audio.roomTone.kind === 'pink-noise'
      && !plan.items.some((item) => item.element.id === 'element-muted'),
  };
}

export function proveExportPlanSemantics() {
  let project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'voice.wav',
    capabilities: { hasAudio: true },
    media: { durationMs: 10000, audioSampleRate: 48000, audioChannels: 1 },
  });
  const elementId = project.elements[0].id;
  const laneId = project.lanes[0].id;
  project = moveElement(project, elementId, 1000);
  project = trimElement(project, elementId, { sourceInMs: 250, sourceOutMs: 5250 });
  project = updateElement(project, elementId, (item) => ({ ...item, audio: { ...item.audio, gain: 0.5, fadeInMs: 50, fadeOutMs: 75 } }));
  project = updateLane(project, laneId, (lane) => ({ ...lane, audio: { ...lane.audio, gain: 0.5 } }));
  const roomLane = createLane({ id: 'lane-room-export', role: 'room-tone', order: 1 });
  project = addLane(project, roomLane);
  project = addElement(project, createGeneratedElement({
    id: 'element-room-export',
    laneId: roomLane.id,
    kind: 'pink-noise',
    durationMs: 1000,
    rawDurationMs: 1000,
    startMs: 0,
    audio: { gain: 0.25, roomTone: { kind: 'pink-noise', levelDb: -52 } },
  }));
  const plan = buildAudioMixExportPlan(project, { sampleRate: 48000, channels: 1 });
  const mp3Plan = buildAudioMixExportPlan(project, { sampleRate: 48000, channels: 2, format: 'mp3', filename: 'voice-mix.mp3' });
  const source = plan.provenance.items.find((item) => item.elementId === elementId);
  const room = plan.provenance.items.find((item) => item.elementId === 'element-room-export');
  return {
    ok: plan.canRenderInBrowser
      && plan.itemCount === 2
      && plan.provenance.renderPath === 'browser-offline-audio'
      && plan.provenance.sampleRate === 48000
      && mp3Plan.format === 'mp3'
      && mp3Plan.mime === 'audio/mpeg'
      && mp3Plan.bitRate === 192
      && mp3Plan.filename === 'voice-mix.mp3'
      && mp3Plan.provenance.encoder === 'lamejs-1.2.1-worker'
      && source?.startMs === 1000
      && source?.sourceInMs === 250
      && source?.sourceOutMs === 5250
      && source?.fadeInMs === 50
      && source?.fadeOutMs === 75
      && Math.abs((source?.gain || 0) - 0.25) < 0.0001
      && room?.roomTone?.kind === 'pink-noise',
  };
}
