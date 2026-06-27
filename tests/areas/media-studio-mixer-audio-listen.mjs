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
  await page.waitForSelector('#previewHost .al-surface', { timeout: 12000 });
  await page.waitForFunction(() => {
    const status = document.querySelector('#previewHost .al-surface')?.dataset.mixerWaveformStatus;
    return status && status !== 'pending';
  }, null, { timeout: 12000 });

  const initial = await page.$eval('#previewHost .al-surface', (el) => {
    const audio = document.querySelector('#previewHost audio.media-view');
    const rect = audio.getBoundingClientRect();
    return {
      nativeHidden: !audio.controls && rect.width <= 2 && rect.height <= 2 && getComputedStyle(audio).opacity === '0',
      mixerContext: el.dataset.mixerContext,
      projectId: el.dataset.mixerProjectId,
      elementId: el.dataset.mixerElementId,
      trackName: !!el.querySelector('.al-track-name'),
      ruler: !!el.querySelector('.al-ruler'),
      cursor: !!el.querySelector('.al-cursor'),
      canvas: !!el.querySelector('.al-canvas'),
      exportButton: !!el.querySelector('.al-export'),
      waveformBuckets: Number(el.dataset.mixerWaveformBuckets || 0),
      waveformStatus: el.dataset.mixerWaveformStatus || '',
      projectHasElement: !!el.__mediaMixerListen.getProject().elements[0],
      capabilityNote: /Enable Media Transcoding/.test(el.querySelector('.al-note')?.textContent || ''),
      controls: ['.al-f-start', '.al-f-in', '.al-f-out', '.al-f-gain', '.al-f-fade-in', '.al-f-fade-out', '.al-f-room']
        .every((selector) => !!el.querySelector(selector)),
    };
  });
  if (initial.nativeHidden && initial.mixerContext === 'listen' && initial.projectId && initial.elementId)
    pass('modular audio listen: Sample.wav opens through mixer-owned context with hidden native source');
  else fail('modular audio listen context missing: ' + JSON.stringify(initial));
  if (initial.trackName && initial.ruler && initial.cursor && initial.canvas && initial.exportButton && initial.controls && initial.capabilityNote && initial.waveformStatus !== 'pending' && (initial.waveformStatus !== 'available' || (initial.waveformBuckets > 0 && initial.projectHasElement)))
    pass('modular audio listen: one-lane waveform editor controls render');
  else fail('modular audio listen surfaces missing: ' + JSON.stringify(initial));

  const beforePlay = await page.$eval('#previewHost audio.media-view', (audio) => audio.currentTime);
  await page.click('#previewHost .al-play');
  await page.waitForTimeout(500);
  const duringPlay = await page.$eval('#previewHost audio.media-view', (audio) => ({ ct: audio.currentTime, paused: audio.paused }));
  if (duringPlay.ct > beforePlay && duringPlay.paused === false)
    pass('modular audio listen: trusted click starts real playback and audio advances');
  else fail('modular audio listen playback start mismatch: ' + JSON.stringify({ beforePlay, duringPlay }));
  await page.click('#previewHost .al-stop');
  const afterStop = await page.$eval('#previewHost audio.media-view', (audio) => ({ ct: audio.currentTime, paused: audio.paused }));
  if (afterStop.ct === 0 && afterStop.paused === true)
    pass('modular audio listen: stop rewinds audio to zero');
  else fail('modular audio listen stop mismatch: ' + JSON.stringify(afterStop));

  const widthBefore = await page.$eval('#previewHost .al-canvas', (canvas) => parseInt(canvas.style.width, 10) || canvas.clientWidth);
  await page.click('#previewHost .al-zoom-in');
  await page.waitForTimeout(100);
  const widthAfter = await page.$eval('#previewHost .al-canvas', (canvas) => parseInt(canvas.style.width, 10) || canvas.clientWidth);
  if (widthAfter > widthBefore)
    pass('modular audio listen: zoom-in increases canvas width');
  else fail('modular audio listen zoom mismatch: ' + JSON.stringify({ widthBefore, widthAfter }));

  // Reset zoom to fit so the clip + its edge handles are fully within the viewport.
  await page.click('#previewHost .al-fit');
  await page.waitForTimeout(60);
  // Trim by dragging the clip's right edge handle inward; the Out value must genuinely shrink.
  const outBefore = await page.$eval('#previewHost .al-surface', (el) => Number(el.querySelector('.al-f-out')?.value || 0));
  const rightHandleBox = await page.locator('#previewHost .al-handle-right').boundingBox();
  if (rightHandleBox) {
    const y = rightHandleBox.y + rightHandleBox.height * 0.5;
    await page.mouse.move(rightHandleBox.x + rightHandleBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(rightHandleBox.x - 120, y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(80);
  }
  const trimResult = await page.$eval('#previewHost .al-surface', (el) => ({
    inVal: el.querySelector('.al-f-in')?.value || '',
    outVal: el.querySelector('.al-f-out')?.value || '',
  }));
  if (rightHandleBox && Number(trimResult.outVal) > Number(trimResult.inVal) && Number(trimResult.outVal) < outBefore - 0.1)
    pass('modular audio listen: dragging the clip edge handle trims the Out point');
  else fail('modular audio listen drag trim mismatch: ' + JSON.stringify({ rightHandleBox: !!rightHandleBox, outBefore, trimResult }));

  // Dragging the clip body offsets it (prepends space before) — Start grows from 0.
  const moveBox = await page.locator('#previewHost .al-clip').boundingBox();
  if (moveBox) {
    const y = moveBox.y + moveBox.height * 0.5;
    const x = moveBox.x + moveBox.width * 0.4;
    await page.mouse.move(x, y);
    await page.mouse.down(); await page.mouse.move(x + 90, y, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(80);
  }
  const startVal = await page.$eval('#previewHost .al-surface', (el) => Number(el.querySelector('.al-f-start')?.value || 0));
  if (moveBox && startVal > 0) pass('modular audio listen: dragging the clip body offsets it (prepends space)');
  else fail('modular audio listen clip move mismatch: ' + JSON.stringify({ moveBox: !!moveBox, startVal }));

  const roundtrip = await page.$eval('#previewHost .al-surface', (el) => {
    const set = (selector, value) => {
      const input = el.querySelector(selector);
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('.al-f-start', 0.25);
    set('.al-f-in', 0.05);
    set('.al-f-out', 0.45);
    set('.al-f-gain', 0.72);
    set('.al-f-fade-in', 30);
    set('.al-f-fade-out', 90);
    const room = el.querySelector('.al-f-room');
    room.checked = true;
    room.dispatchEvent(new Event('change', { bubbles: true }));
    const json = el.__mediaMixerListen.exportSettings();
    const parsed = JSON.parse(json);
    set('.al-f-start', 0);
    set('.al-f-gain', 1);
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
      offset: el.querySelector('.al-f-start').value,
      gain: el.querySelector('.al-f-gain').value,
      room: el.querySelector('.al-f-room').checked,
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
  await page.waitForSelector('#previewHost .al-surface', { timeout: 12000 });
  const mp3 = await page.$eval('#previewHost .al-surface', (el) => ({
    projectId: el.dataset.mixerProjectId,
    canvas: !!el.querySelector('.al-canvas'),
    room: !!el.querySelector('.al-f-room'),
  }));
  if (mp3.projectId && mp3.canvas && mp3.room)
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
      hasSharedLanes: !!el.querySelector('.mmx-lanes'),
      hasWaveform: !!el.querySelector('.mmx-element-waveform'),
      selectedElement: project.selection.primary?.type === 'element',
      masterEqBands: project.master.audio.eq.bands.length,
      trackEqBands: project.lanes[0].audio.eq.bands.length,
      cacheStats: el.__mediaMixerMulti.getAudioCacheStats(),
      cacheBudgetDataset: Number(el.dataset.decodedCacheBudgetBytes || 0),
      controls: ['.mmx-mix-play', '.mmx-mix-stop', '.mmx-mix-master-slider', '.mmx-mix-lane-gain', '.mmx-mix-mute', '.mmx-mix-solo', '.mmx-mix-fade-in', '.mmx-mix-fade-out']
        .every((selector) => !!el.querySelector(selector)),
      capabilityNote: /Media Transcoding|Project settings/.test(el.querySelector('.mmx-mix-capability-note')?.textContent || ''),
    };
  });
  if (mixInitial.context === 'mix' && mixInitial.lanes === 1 && mixInitial.elements === 1 && mixInitial.hasSharedLanes && mixInitial.hasWaveform && mixInitial.selectedElement)
    pass('modular audio mix: opens as one shared-model lane for the loaded file');
  else fail('modular audio mix initial state mismatch: ' + JSON.stringify(mixInitial));
  if (mixInitial.controls && mixInitial.masterEqBands > 0 && mixInitial.trackEqBands > 0 && mixInitial.capabilityNote && mixInitial.cacheStats.budgetBytes > 0 && mixInitial.cacheBudgetDataset === mixInitial.cacheStats.budgetBytes)
    pass('modular audio mix: lane controls plus track/master EQ and capability notes are represented');
  else fail('modular audio mix controls missing: ' + JSON.stringify(mixInitial));

  const mixPlayback = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', async (el) => {
    el.querySelector('.mmx-mix-add-tone').click();
    const before = Number(el.dataset.cursorMs || 0);
    el.querySelector('.mmx-mix-play').click();
    await new Promise((resolve) => setTimeout(resolve, 180));
    const playingState = el.__mediaMixerMulti.getPlaybackState();
    const during = Number(el.dataset.cursorMs || 0);
    el.querySelector('.mmx-mix-stop').click();
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
    const gain = el.querySelector('.mmx-mix-lane-gain');
    gain.value = '0.42';
    gain.dispatchEvent(new Event('input', { bubbles: true }));
    el.querySelector('.mmx-mix-mute').click();
    el.querySelector('.mmx-mix-solo').click();
    const lane = el.__mediaMixerMulti.getProject().lanes[0];
    return { gain: lane.audio.gain, muted: lane.muted, solo: lane.solo };
  });
  if (mixLaneEdit.gain === 0.42 && mixLaneEdit.muted && mixLaneEdit.solo)
    pass('modular audio mix: lane gain/mute/solo update shared model state');
  else fail('modular audio mix lane edit mismatch: ' + JSON.stringify(mixLaneEdit));

  const mixGenerated = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', (el) => {
    el.querySelector('.mmx-mix-add-pink').click();
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

  const visualExportPlan = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', (el) => {
    const hasButton = !!el.querySelector('.mmx-mix-video-export-plan');
    const hasRenderButton = !!el.querySelector('.mmx-video-render-run');
    const renderDisabled = !!el.querySelector('.mmx-video-render-run')?.disabled;
    const statusPanel = el.querySelector('.mmx-video-export-status');
    el.querySelector('.mmx-mix-video-export-plan')?.click();
    const plan = el.__mediaMixerMulti.getLastVideoExportPlan();
    return {
      hasButton,
      hasRenderButton,
      renderDisabled,
      initialStatus: statusPanel?.dataset.status || '',
      canAttempt: statusPanel?.dataset.canAttemptRender || '',
      hardBlocked: statusPanel?.dataset.hardBlocked || '',
      status: plan?.status || '',
      canRender: !!plan?.canRender,
      requiresFfmpeg: !!plan?.requiresFfmpeg,
      renderPath: plan?.provenance?.renderPath || '',
      visualItems: plan?.provenance?.visualItems?.length || 0,
      audioItems: plan?.provenance?.audioItems?.length || 0,
      hasDroppedImage: !!plan?.provenance?.visualItems?.some((item) => item.assetName === 'dropped-card.svg' && item.visual?.opacity === 1),
      note: el.querySelector('.mmx-video-export-note')?.textContent || '',
      hasBytes: /objectURL|blob:|data:|mediaBytes|frameCache|thumbnailCache/.test(JSON.stringify(plan || {})),
    };
  });
  if (visualExportPlan.hasButton && visualExportPlan.hasRenderButton && visualExportPlan.renderDisabled
    && visualExportPlan.initialStatus === 'opt-in'
    && visualExportPlan.canAttempt === 'false'
    && visualExportPlan.hardBlocked === 'false'
    && visualExportPlan.status === 'opt-in' && !visualExportPlan.canRender
    && visualExportPlan.requiresFfmpeg && visualExportPlan.renderPath === 'ffmpeg-opt-in-required'
    && visualExportPlan.visualItems >= 1 && visualExportPlan.audioItems >= 1
    && visualExportPlan.hasDroppedImage
    && /Media Transcoding/i.test(visualExportPlan.note) && !visualExportPlan.hasBytes)
    pass('modular audio mix: visual composition exposes ffmpeg-gated video export provenance');
  else fail('modular audio mix video export plan mismatch: ' + JSON.stringify(visualExportPlan));

  const settingsUi = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', async (el) => {
    const json = el.__mediaMixerMulti.exportSettings();
    const imported = el.__mediaMixerMulti.importSettings(json);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const root = document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi');
    const buttons = [...root.querySelectorAll('.mmx-relink-choice')].map((button) => ({
      text: button.textContent.trim(),
      choice: button.dataset.choice,
    }));
    root.querySelector('.mmx-relink-choice[data-choice="ask-per-element"]')?.click();
    return {
      hasExport: !!root.querySelector('.mmx-settings-download'),
      hasImport: !!root.querySelector('.mmx-settings-import'),
      modal: !!root.querySelector('.mmx-relink-modal'),
      buttons,
      importedMatches: imported.relink.matches.length,
      importedMissing: imported.relink.missing.length,
      lastChoice: root.dataset.lastRelinkChoice,
      pending: Number(root.dataset.lastRelinkPending || 0),
      hasMediaBytes: /mediaBytes|dataUrl|objectUrl|blob:|waveformSummary|frameCache|thumbnailCache/.test(json),
    };
  });
  if (settingsUi.hasExport && settingsUi.hasImport && settingsUi.modal
    && settingsUi.buttons.map((button) => button.text).join('|') === 'Apply to all elements|Ask per element|Do not change media objects'
    && settingsUi.importedMatches >= 1 && settingsUi.importedMissing === 0
    && settingsUi.lastChoice === 'ask-per-element' && settingsUi.pending >= 1 && !settingsUi.hasMediaBytes)
    pass('modular audio mix: project settings UI imports config-only state and exposes reapply choices');
  else fail('modular audio mix project settings UI mismatch: ' + JSON.stringify(settingsUi));

  const mixSettings = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', (el) => {
    el.querySelector('.mmx-mix-mute[aria-pressed="true"]')?.click();
    el.querySelector('.mmx-mix-solo[aria-pressed="true"]')?.click();
    el.querySelector('.mmx-mix-download').click();
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
    await new Promise((resolve) => {
      const started = performance.now();
      const tick = () => {
        const root = document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi');
        const project = root?.__mediaMixerMulti?.getProject?.();
        const asset = project?.assets?.find((item) => item.name === 'dropped-video.webm');
        const element = project?.elements?.find((item) => item.assetId === asset?.id);
        const frameSources = Number(root?.querySelector('.mmx-frame-preview')?.dataset.frameSources || 0);
        const thumbCount = Number(root?.querySelector(`.mmx-thumb-strip[data-element-id="${element?.id}"]`)?.dataset.thumbCount || 0);
        if ((frameSources > 0 && thumbCount > 0) || performance.now() - started > 3000) resolve();
        else setTimeout(tick, 50);
      };
      tick();
    });
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
      thumbCount: Number(root.querySelector(`.mmx-thumb-strip[data-element-id="${element?.id}"]`)?.dataset.thumbCount || 0),
    };
  });
  if (droppedVideo.hasVideo && droppedVideo.nativePreview && droppedVideo.durationMs > 0 && droppedVideo.width > 0 && droppedVideo.height > 0 && droppedVideo.frameSources >= 2 && droppedVideo.thumbCount > 0)
    pass('modular audio mix: browser-playable dropped video samples frame preview and thumbnail strip');
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
    const plan = root.__mediaMixerMulti.getLastProxyPlan?.() || root.__mediaMixerMulti.buildProxyPlan?.();
    return {
      hasVideo: !!element?.capabilities?.hasVideo,
      needsProxy: !!asset?.capabilities?.needsFfmpegForPreview,
      status: asset?.status,
      warning: root.querySelector('.mmx-frame-preview-warning')?.textContent || '',
      capabilityNote: root.querySelector('.mmx-mix-capability-note')?.textContent || '',
      proxyThumb: root.querySelector(`.mmx-thumb-strip[data-element-id="${element?.id}"]`)?.dataset.needsProxy || '',
      metadataStatus: root.dataset.lastVisualMetadata,
      proxyPanel: !!root.querySelector('.mmx-video-proxy-status'),
      proxyButtonDisabled: !!root.querySelector('.mmx-video-proxy-run')?.disabled,
      proxyStatus: root.querySelector('.mmx-video-proxy-status')?.dataset.status || '',
      proxyCanRender: root.querySelector('.mmx-video-proxy-status')?.dataset.canRender || '',
      proxyCount: Number(root.querySelector('.mmx-video-proxy-status')?.dataset.proxyCount || 0),
      proxyPlanPath: plan?.provenance?.renderPath || '',
      proxyPlanAssets: plan?.provenance?.assets?.length || 0,
      proxyHasBytes: /mediaBytes|blob:|objectURL|data:/.test(JSON.stringify(plan || {})),
    };
  });
  if (unsupportedVideo.hasVideo && unsupportedVideo.needsProxy && unsupportedVideo.status === 'needs-proxy' && unsupportedVideo.proxyThumb === 'true' && /ffmpeg|proxy|conversion|Transcoding/i.test(`${unsupportedVideo.warning} ${unsupportedVideo.capabilityNote}`)
    && unsupportedVideo.proxyPanel && unsupportedVideo.proxyButtonDisabled && unsupportedVideo.proxyStatus === 'opt-in' && unsupportedVideo.proxyCanRender === 'false'
    && unsupportedVideo.proxyCount >= 1 && unsupportedVideo.proxyPlanPath === 'ffmpeg-proxy-opt-in-required' && unsupportedVideo.proxyPlanAssets >= 1 && !unsupportedVideo.proxyHasBytes)
    pass('modular audio mix: unsupported dropped video shows conversion/proxy warning without ffmpeg load');
  else fail('modular audio mix unsupported video warning mismatch: ' + JSON.stringify(unsupportedVideo));
}
