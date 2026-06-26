import { proveAudioCachePolicy, proveExportPlanSemantics, proveScheduleSemantics } from './media-studio-mixer-audio-proofs.mjs';

export async function run(ctx) {
  const { page, origin, openExample, pass, fail } = ctx;

  const cacheProof = proveAudioCachePolicy();
  if (cacheProof.ok) pass('modular audio mix: decoded cache budget and processed cache keys are deterministic');
  else fail('modular audio mix cache policy mismatch: ' + JSON.stringify(cacheProof));
  const scheduleProof = proveScheduleSemantics();
  if (scheduleProof.ok) pass('modular audio mix: schedule plan respects offsets, trims, gains, mute/solo, and room tone');
  else fail('modular audio mix schedule semantics mismatch: ' + JSON.stringify(scheduleProof));
  const exportProof = proveExportPlanSemantics();
  if (exportProof.ok) pass('modular audio mix: export plan provenance reads the shared timeline state');
  else fail('modular audio mix export plan mismatch: ' + JSON.stringify(exportProof));

  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  await page.waitForSelector('#previewHost .media-listen-surface.mmx-audio-listen', { timeout: 12000 });
  await page.waitForFunction(() => {
    const status = document.querySelector('#previewHost .media-listen-surface.mmx-audio-listen')?.dataset.mixerWaveformStatus;
    return status && status !== 'pending';
  }, null, { timeout: 12000 });

  const initial = await page.$eval('#previewHost .media-listen-surface.mmx-audio-listen', (el) => {
    const audio = document.querySelector('#previewHost audio.media-view');
    const rect = audio.getBoundingClientRect();
    return {
      nativeHidden: !audio.controls && rect.width <= 2 && rect.height <= 2 && getComputedStyle(audio).opacity === '0',
      mixerContext: el.dataset.mixerContext,
      directListen: el.classList.contains('mmx-direct-listen'),
      projectId: el.dataset.mixerProjectId,
      elementId: el.dataset.mixerElementId,
      sharedShell: el.classList.contains('mmx-shell'),
      sharedElementWaveform: !!el.querySelector('.mmx-element-waveform.media-wv-canvas'),
      sharedInspector: !!el.querySelector('.mmx-inspector .media-lane-gain'),
      lane: !!el.querySelector('.media-lane-label-name'),
      ruler: !!el.querySelector('.media-lane-ruler'),
      cursor: !!el.querySelector('.media-lane-cursor'),
      canvas: !!el.querySelector('.media-waveform-surface canvas.media-wv-canvas'),
      exportButton: !!el.querySelector('.mmx-settings-export'),
      zoom: !!el.querySelector('.mmx-listen-zoom'),
      pan: !!el.querySelector('.mmx-listen-pan'),
      waveformBuckets: Number(el.dataset.mixerWaveformBuckets || 0),
      waveformStatus: el.dataset.mixerWaveformStatus || '',
      projectHasWaveformSummary: !!el.__mediaMixerListen.getProject().elements[0]?.analysis?.waveformSummary,
      capabilityNote: /Enable Media Transcoding/.test(el.querySelector('.mmx-capability-note')?.textContent || ''),
      controls: ['.media-lane-offset', '.media-lane-in', '.media-lane-out', '.media-lane-gain', '.media-lane-fade-in', '.media-lane-fade-out', '.media-lane-room-toggle']
        .every((selector) => !!el.querySelector(selector)),
    };
  });
  if (initial.nativeHidden && initial.mixerContext === 'listen' && initial.directListen && initial.sharedShell && initial.projectId && initial.elementId)
    pass('modular audio listen: Sample.wav opens through mixer-owned context with hidden native source');
  else fail('modular audio listen context missing: ' + JSON.stringify(initial));
  if (initial.lane && initial.ruler && initial.cursor && initial.canvas && initial.sharedElementWaveform && initial.sharedInspector && initial.controls && initial.zoom && initial.pan && initial.capabilityNote && initial.waveformStatus !== 'pending' && (initial.waveformStatus !== 'available' || (initial.waveformBuckets > 0 && initial.projectHasWaveformSummary)))
    pass('modular audio listen: one-lane waveform editor controls render');
  else fail('modular audio listen surfaces missing: ' + JSON.stringify(initial));

  const transport = await page.$eval('#previewHost .media-listen-surface.mmx-audio-listen', async (el) => {
    const audio = document.querySelector('#previewHost audio.media-view');
    el.querySelector('.media-listen-play').click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const playAttempted = !audio.paused || audio.currentTime >= 0;
    el.querySelector('.media-listen-stop').click();
    return {
      playAttempted,
      stoppedAt: audio.currentTime,
      paused: audio.paused,
    };
  });
  if (transport.playAttempted && transport.paused && transport.stoppedAt === 0)
    pass('modular audio listen: play/pause/stop controls operate hidden audio source');
  else fail('modular audio listen transport mismatch: ' + JSON.stringify(transport));

  const viewport = await page.$eval('#previewHost .media-listen-surface.mmx-audio-listen', (el) => {
    el.__mediaMixerListen.setZoom(2);
    el.__mediaMixerListen.setPan(40);
    return {
      zoom: el.dataset.mixerZoom,
      pan: el.dataset.mixerPan,
      canvasWidth: el.querySelector('.media-wv-canvas')?.style.width || '',
    };
  });
  if (viewport.zoom === '2' && viewport.pan === '40' && viewport.canvasWidth === '200%')
    pass('modular audio listen: zoom/pan update visible viewport state');
  else fail('modular audio listen zoom/pan mismatch: ' + JSON.stringify(viewport));

  const moved = await page.$eval('#previewHost .media-listen-surface.mmx-audio-listen', (el) => {
    const before = Number(el.dataset.mixerOffsetMs || 0);
    const region = el.querySelector('.media-lane-trim');
    const rect = region.getBoundingClientRect();
    region.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 9,
      button: 0,
      clientX: rect.left + 8,
      clientY: rect.top + rect.height / 2,
    }));
    region.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 9,
      clientX: rect.left + 80,
      clientY: rect.top + rect.height / 2,
    }));
    region.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 9,
      clientX: rect.left + 80,
      clientY: rect.top + rect.height / 2,
    }));
    return {
      before,
      after: Number(el.dataset.mixerOffsetMs || 0),
      input: el.querySelector('.media-lane-offset')?.value,
    };
  });
  if (moved.after > moved.before && Number(moved.input) > 0)
    pass('modular audio listen: dragging source region moves start offset state');
  else fail('modular audio listen source drag mismatch: ' + JSON.stringify(moved));

  const roundtrip = await page.$eval('#previewHost .media-listen-surface.mmx-audio-listen', (el) => {
    const set = (selector, value) => {
      const input = el.querySelector(selector);
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('.media-lane-offset', 0.25);
    set('.media-lane-in', 0.05);
    set('.media-lane-out', 0.45);
    set('.media-lane-gain', 0.72);
    set('.media-lane-fade-in', 30);
    set('.media-lane-fade-out', 90);
    const room = el.querySelector('.media-lane-room-toggle');
    room.checked = true;
    room.dispatchEvent(new Event('change', { bubbles: true }));
    const json = el.__mediaMixerListen.exportSettings();
    const parsed = JSON.parse(json);
    set('.media-lane-offset', 0);
    set('.media-lane-gain', 1);
    room.checked = false;
    room.dispatchEvent(new Event('change', { bubbles: true }));
    el.__mediaMixerListen.importSettings(json);
    return {
      schema: parsed.schema,
      assets: parsed.assets.length,
      lanes: parsed.lanes.length,
      elements: parsed.elements.length,
      hasMediaBytes: /mediaBytes|dataUrl|objectUrl|blob:/.test(json),
      hasRuntimeAnalysis: /waveformSummary|decodedBuffer|frameCache|thumbnailCache/.test(json),
      offset: el.querySelector('.media-lane-offset').value,
      gain: el.querySelector('.media-lane-gain').value,
      room: el.querySelector('.media-lane-room-toggle').checked,
      projectSettingsStored: !!el.dataset.projectSettings,
    };
  });
  if (roundtrip.schema === 'file-viewer.media-mixer.project' && roundtrip.assets === 1 && roundtrip.lanes === 1 && roundtrip.elements === 1 && !roundtrip.hasMediaBytes && !roundtrip.hasRuntimeAnalysis)
    pass('modular audio listen: config-only settings JSON exports shared project model');
  else fail('modular audio listen settings export invalid: ' + JSON.stringify(roundtrip));
  if (roundtrip.offset === '0.25' && roundtrip.gain === '0.72' && roundtrip.room && roundtrip.projectSettingsStored)
    pass('modular audio listen: settings JSON import reapplies one-lane edit state');
  else fail('modular audio listen settings import mismatch: ' + JSON.stringify(roundtrip));

  await openExample('Sample.mp3');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  await page.waitForSelector('#previewHost .media-listen-surface.mmx-audio-listen', { timeout: 12000 });
  const mp3 = await page.$eval('#previewHost .media-listen-surface.mmx-audio-listen', (el) => ({
    projectId: el.dataset.mixerProjectId,
    waveform: !!el.querySelector('.media-waveform-surface canvas.media-wv-canvas'),
    room: !!el.querySelector('.media-lane-room-toggle'),
  }));
  if (mp3.projectId && mp3.waveform && mp3.room)
    pass('modular audio listen: Sample.mp3 uses the same mixer-owned Listen context');
  else fail('modular audio listen Sample.mp3 mismatch: ' + JSON.stringify(mp3));

  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  const preOpenMix = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi');
  if (!preOpenMix) pass('modular audio mix: remains lazy before Mix opens');
  else fail('modular audio mix mounted before Mix mode opened');

  await page.click('#previewHost .media-mode-tab[data-mode="mix"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi.mmx-shell', { timeout: 12000 });
  const mixInitial = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', (el) => {
    const project = el.__mediaMixerMulti.getProject();
    return {
      context: el.dataset.mixerContext,
      lanes: project.lanes.length,
      elements: project.elements.length,
      hasSharedLanes: !!el.querySelector('.mmx-lanes.mx-lanes'),
      hasWaveform: !!el.querySelector('.mmx-element-waveform'),
      selectedElement: project.selection.primary?.type === 'element',
      masterEqBands: project.master.audio.eq.bands.length,
      trackEqBands: project.lanes[0].audio.eq.bands.length,
      cacheStats: el.__mediaMixerMulti.getAudioCacheStats(),
      cacheBudgetDataset: Number(el.dataset.decodedCacheBudgetBytes || 0),
      controls: ['.mx-play', '.mx-stop', '.mx-master-slider', '.mx-lane-gain', '.mx-mute', '.mx-solo', '.mx-fade-in', '.mx-fade-out']
        .every((selector) => !!el.querySelector(selector)),
      capabilityNote: /Media Transcoding|Project settings/.test(el.querySelector('.mx-capability-note')?.textContent || ''),
    };
  });
  if (mixInitial.context === 'mix' && mixInitial.lanes === 1 && mixInitial.elements === 1 && mixInitial.hasSharedLanes && mixInitial.hasWaveform && mixInitial.selectedElement)
    pass('modular audio mix: opens as one shared-model lane for the loaded file');
  else fail('modular audio mix initial state mismatch: ' + JSON.stringify(mixInitial));
  if (mixInitial.controls && mixInitial.masterEqBands > 0 && mixInitial.trackEqBands > 0 && mixInitial.capabilityNote && mixInitial.cacheStats.budgetBytes > 0 && mixInitial.cacheBudgetDataset === mixInitial.cacheStats.budgetBytes)
    pass('modular audio mix: lane controls plus track/master EQ and capability notes are represented');
  else fail('modular audio mix controls missing: ' + JSON.stringify(mixInitial));

  const mixPlayback = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', async (el) => {
    el.querySelector('.mx-add-btn').click();
    const before = Number(el.dataset.cursorMs || 0);
    el.querySelector('.mx-play').click();
    await new Promise((resolve) => setTimeout(resolve, 180));
    const playingState = el.__mediaMixerMulti.getPlaybackState();
    const during = Number(el.dataset.cursorMs || 0);
    el.querySelector('.mx-stop').click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    const stoppedState = el.__mediaMixerMulti.getPlaybackState();
    return {
      before,
      during,
      playing: el.dataset.playing,
      scheduled: Number(el.dataset.scheduledCount || 0),
      generated: Number(el.dataset.generatedScheduled || 0),
      stateScheduled: playingState.scheduledCount,
      stateGenerated: playingState.generatedCount,
      stopped: el.dataset.playing,
      stoppedScheduled: stoppedState.scheduledCount,
      cursorAfterStop: Number(el.dataset.cursorMs || 0),
    };
  });
  if (mixPlayback.during > mixPlayback.before && mixPlayback.scheduled > 0 && mixPlayback.generated > 0 && mixPlayback.stateScheduled > 0 && mixPlayback.stateGenerated > 0 && mixPlayback.stopped === 'false' && mixPlayback.cursorAfterStop === 0)
    pass('modular audio mix: WebAudio scheduled playback advances cursor and stops cleanly');
  else fail('modular audio mix playback mismatch: ' + JSON.stringify(mixPlayback));

  const mixLaneEdit = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', (el) => {
    const gain = el.querySelector('.mx-lane-gain');
    gain.value = '0.42';
    gain.dispatchEvent(new Event('input', { bubbles: true }));
    el.querySelector('.mx-mute').click();
    el.querySelector('.mx-solo').click();
    const lane = el.__mediaMixerMulti.getProject().lanes[0];
    return { gain: lane.audio.gain, muted: lane.muted, solo: lane.solo };
  });
  if (mixLaneEdit.gain === 0.42 && mixLaneEdit.muted && mixLaneEdit.solo)
    pass('modular audio mix: lane gain/mute/solo update shared model state');
  else fail('modular audio mix lane edit mismatch: ' + JSON.stringify(mixLaneEdit));

  const mixGenerated = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', (el) => {
    el.querySelector('.mx-add-pink').click();
    const project = el.__mediaMixerMulti.getProject();
    return {
      lanes: project.lanes.length,
      elements: project.elements.length,
      roomLane: project.lanes.some((lane) => lane.role === 'room-tone'),
      pink: project.elements.some((element) => element.audio.roomTone?.kind === 'pink-noise'),
      datasetPink: el.dataset.hasPinkNoise,
    };
  });
  if (mixGenerated.lanes >= 2 && mixGenerated.elements >= 2 && mixGenerated.roomLane && mixGenerated.pink && mixGenerated.datasetPink === 'true')
    pass('modular audio mix: pink-noise room-tone lane is first-class model state');
  else fail('modular audio mix pink-noise mismatch: ' + JSON.stringify(mixGenerated));

  const dropped = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', async (el) => {
    const before = el.__mediaMixerMulti.getProject();
    const bytes = await (await fetch('examples/sample.wav')).arrayBuffer();
    const file = new File([bytes], 'dropped-lane.wav', { type: 'audio/wav' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    const root = document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi');
    const project = root.__mediaMixerMulti.getProject();
    const asset = project.assets.find((item) => item.name === 'dropped-lane.wav');
    const element = project.elements.find((item) => item.assetId === asset?.id);
    return {
      beforeLanes: before.lanes.length,
      lanes: project.lanes.length,
      elements: project.elements.length,
      assetName: asset?.name,
      startMs: element?.timeline.startMs,
      hasAudio: element?.capabilities.hasAudio,
      hasWaveform: !!element?.analysis.waveformSummary,
      datasetDropped: root.dataset.hasDroppedAudio,
    };
  });
  if (dropped.lanes === dropped.beforeLanes + 1 && dropped.elements >= dropped.lanes && dropped.assetName === 'dropped-lane.wav' && dropped.startMs === 0 && dropped.hasAudio && dropped.datasetDropped === 'true')
    pass('modular audio mix: dropped audio file creates a new shared-model lane and element');
  else fail('modular audio mix dropped file mismatch: ' + JSON.stringify(dropped));

  const droppedVisual = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', async (el) => {
    const before = el.__mediaMixerMulti.getProject();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"><rect width="64" height="40" fill="#e91e63"/></svg>';
    const file = new File([svg], 'dropped-card.svg', { type: 'image/svg+xml' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    await new Promise((resolve) => setTimeout(resolve, 180));
    const root = document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi');
    const project = root.__mediaMixerMulti.getProject();
    const asset = project.assets.find((item) => item.name === 'dropped-card.svg');
    const element = project.elements.find((item) => item.assetId === asset?.id);
    const canvas = root.querySelector('.mmx-frame-preview-canvas');
    const pixel = canvas.getContext('2d').getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
    return {
      beforeLanes: before.lanes.length,
      lanes: project.lanes.length,
      assetName: asset?.name,
      laneRole: project.lanes.find((lane) => lane.id === element?.laneId)?.role,
      type: element?.type,
      hasImage: element?.capabilities?.hasImage,
      hasAudio: !!element?.capabilities?.hasAudio,
      durationMs: element?.timeline?.durationMs,
      width: asset?.media?.videoWidth,
      height: asset?.media?.videoHeight,
      metadataStatus: root.dataset.lastVisualMetadata,
      datasetDropped: root.dataset.hasDroppedVisual,
      visualBadge: !!root.querySelector('.mmx-element-visual'),
      framePreviewActive: Number(root.querySelector('.mmx-frame-preview')?.dataset.activeVisuals || 0),
      frameSources: Number(root.querySelector('.mmx-frame-preview')?.dataset.frameSources || 0),
      centerPixel: Array.from(pixel.slice(0, 3)),
      visualInspector: !!root.querySelector('.mmx-inspector-visual-opacity'),
    };
  });
  if (droppedVisual.lanes === droppedVisual.beforeLanes + 1 && droppedVisual.assetName === 'dropped-card.svg' && droppedVisual.laneRole === 'image' && droppedVisual.type === 'image' && droppedVisual.hasImage && !droppedVisual.hasAudio && droppedVisual.durationMs === 5000 && droppedVisual.width === 64 && droppedVisual.height === 40 && droppedVisual.metadataStatus === 'available' && droppedVisual.datasetDropped === 'true' && droppedVisual.visualBadge && droppedVisual.framePreviewActive >= 1 && droppedVisual.frameSources >= 1 && droppedVisual.centerPixel[0] > 180 && droppedVisual.centerPixel[1] < 80 && droppedVisual.centerPixel[2] > 70 && droppedVisual.visualInspector)
    pass('modular audio mix: dropped image becomes visual shared-model lane with seek-frame preview');
  else fail('modular audio mix dropped visual mismatch: ' + JSON.stringify(droppedVisual));

  const mixSettings = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', (el) => {
    el.querySelector('.mx-mute[aria-pressed="true"]')?.click();
    el.querySelector('.mx-solo[aria-pressed="true"]')?.click();
    el.querySelector('.mx-mix-btn').click();
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        const json = el.__mediaMixerMulti.exportSettings();
        const parsed = JSON.parse(json);
        const plan = el.__mediaMixerMulti.getLastExportPlan();
        const done = Number(el.dataset.lastMixdownBytes || 0) > 44 || Date.now() - started > 5000;
        if (!done) {
          setTimeout(tick, 50);
          return;
        }
        resolve({
          schema: parsed.schema,
          lanes: parsed.lanes.length,
          elements: parsed.elements.length,
          droppedAsset: parsed.assets.some((asset) => asset.name === 'dropped-lane.wav'),
          hasMediaBytes: /mediaBytes|dataUrl|objectUrl|blob:/.test(json),
          hasRuntimeAnalysis: /waveformSummary|decodedBuffer|frameCache|thumbnailCache/.test(json),
          mixBytes: Number(el.dataset.lastMixdownBytes || 0),
          planItems: plan?.provenance?.items?.length || 0,
          scheduled: plan?.provenance?.scheduled || 0,
          renderPath: plan?.provenance?.renderPath || '',
          hasRoomTone: !!plan?.provenance?.items?.some((item) => item.roomTone?.kind === 'pink-noise'),
          hasGain: !!plan?.provenance?.items?.some((item) => Number.isFinite(item.gain)),
          lastMixdownPlanSafe: !/mediaBytes|dataUrl|objectUrl|blob:/.test(el.dataset.lastMixdownPlan || ''),
          error: el.dataset.lastMixdownError || '',
        });
      };
      tick();
    });
  });
  if (mixSettings.schema === 'file-viewer.media-mixer.project' && mixSettings.lanes >= 3 && mixSettings.elements >= 3 && mixSettings.droppedAsset && !mixSettings.hasMediaBytes && !mixSettings.hasRuntimeAnalysis)
    pass('modular audio mix: settings export is config-only shared project state');
  else fail('modular audio mix settings export mismatch: ' + JSON.stringify(mixSettings));
  if (mixSettings.mixBytes > 44 && mixSettings.planItems >= 3 && mixSettings.scheduled >= 3 && mixSettings.renderPath === 'browser-offline-audio' && mixSettings.hasRoomTone && mixSettings.hasGain && mixSettings.lastMixdownPlanSafe && !mixSettings.error)
    pass('modular audio mix: browser WAV export includes shared-state provenance');
  else fail('modular audio mix WAV export/provenance mismatch: ' + JSON.stringify(mixSettings));

  const droppedVideo = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', async (el) => {
    const bytes = await (await fetch('examples/sample.webm')).arrayBuffer();
    const file = new File([bytes], 'dropped-video.webm', { type: 'video/webm' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    await new Promise((resolve) => setTimeout(resolve, 700));
    const root = document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi');
    const project = root.__mediaMixerMulti.getProject();
    const asset = project.assets.find((item) => item.name === 'dropped-video.webm');
    const element = project.elements.find((item) => item.assetId === asset?.id);
    return {
      hasVideo: !!element?.capabilities?.hasVideo,
      nativePreview: !asset?.capabilities?.needsFfmpegForPreview,
      durationMs: element?.timeline?.durationMs || 0,
      width: asset?.media?.videoWidth || 0,
      height: asset?.media?.videoHeight || 0,
      frameSources: Number(root.querySelector('.mmx-frame-preview')?.dataset.frameSources || 0),
    };
  });
  if (droppedVideo.hasVideo && droppedVideo.nativePreview && droppedVideo.durationMs > 0 && droppedVideo.width > 0 && droppedVideo.height > 0 && droppedVideo.frameSources >= 2)
    pass('modular audio mix: browser-playable dropped video samples a seek-frame preview source');
  else fail('modular audio mix dropped video preview mismatch: ' + JSON.stringify(droppedVideo));

  const unsupportedVideo = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', async (el) => {
    const file = new File([new Uint8Array([0, 1, 2, 3])], 'needs-proxy.avi', { type: 'video/x-msvideo' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    const root = document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi');
    const project = root.__mediaMixerMulti.getProject();
    const asset = project.assets.find((item) => item.name === 'needs-proxy.avi');
    const element = project.elements.find((item) => item.assetId === asset?.id);
    return {
      hasVideo: !!element?.capabilities?.hasVideo,
      needsProxy: !!asset?.capabilities?.needsFfmpegForPreview,
      status: asset?.status,
      warning: root.querySelector('.mmx-frame-preview-warning')?.textContent || '',
      capabilityNote: root.querySelector('.mx-capability-note')?.textContent || '',
      metadataStatus: root.dataset.lastVisualMetadata,
    };
  });
  if (unsupportedVideo.hasVideo && unsupportedVideo.needsProxy && unsupportedVideo.status === 'needs-proxy' && /ffmpeg|proxy|conversion|Transcoding/i.test(`${unsupportedVideo.warning} ${unsupportedVideo.capabilityNote}`))
    pass('modular audio mix: unsupported dropped video shows conversion/proxy warning without ffmpeg load');
  else fail('modular audio mix unsupported video warning mismatch: ' + JSON.stringify(unsupportedVideo));
}
