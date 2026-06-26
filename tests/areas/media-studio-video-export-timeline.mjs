export async function runVideoExportAndTimelineChecks(ctx) {
  const { page, pass, fail, openExample } = ctx;

  // ── P3: video fade — the export panel on a video reads "video" and renders fade-to-black.
  await page.evaluate(() => window.__fv.openExampleByLabel('Sample.avi'));
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  await page.click('#previewHost .media-mode-tab[data-mode="export"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel', { timeout: 8000 });
  const vidExportHeader = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-ed-header',
    (e) => e.textContent).catch(() => '');
  if (/Export & Fades \(video\)/i.test(vidExportHeader)) pass('P3: video export panel offers fade-to-black'); else fail('video export header: ' + vidExportHeader);
  const vidFadeIn = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-ed-fade-in');
  if (vidFadeIn) pass('P3: video fade-to/from-black duration controls present'); else fail('video fade controls missing');
  const transformUi = await page.evaluate(() => {
    const root = document.querySelector('#previewHost .media-mode-panel[data-mode="export"]');
    return {
      transforms: [...root.querySelectorAll('.media-export-transform option')].map((o) => o.textContent.trim()),
      looks: [...root.querySelectorAll('.media-export-look option')].map((o) => o.textContent.trim()),
    };
  });
  if (transformUi.transforms.includes('Center square crop') && transformUi.transforms.includes('Rotate 90° clockwise')
    && transformUi.looks.includes('Cinema') && transformUi.looks.includes('Monochrome'))
    pass('R5: video export shows compact transform/look controls');
  else fail('video transform controls: ' + JSON.stringify(transformUi));
  await page.selectOption('#previewHost .media-mode-panel[data-mode="export"] .media-export-transform', 'vertical');
  await page.selectOption('#previewHost .media-mode-panel[data-mode="export"] .media-export-look', 'contrast');
  const transformSummary = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/Vertical 9:16 crop/.test(transformSummary) && /High contrast/.test(transformSummary) && /-vf "crop=trunc/.test(transformSummary) && /scale=-2:720/.test(transformSummary))
    pass('R5: transform/look selections update video export summary and -vf provenance');
  else fail('video transform summary: ' + transformSummary);
  const burnUi = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-subtitle-card', (card) => ({
    title: card.querySelector('.media-export-subtitle-title')?.textContent || '',
    status: card.querySelector('.media-export-subtitle-status')?.textContent || '',
    accept: card.querySelector('.media-export-subtitle-input')?.getAttribute('accept') || '',
    button: card.querySelector('.media-export-subtitle-run')?.textContent || '',
  })).catch(() => null);
  if (burnUi && /Subtitle burn-in/i.test(burnUi.title) && /\.srt,.vtt/.test(burnUi.accept) && /Burn in subtitles/i.test(burnUi.button))
    pass('R5: video export shows compact subtitle burn-in controls');
  else fail('video subtitle burn-in UI: ' + JSON.stringify(burnUi));
  const burnStatus = await page.evaluate(async () => {
    const file = new File(['1\n00:00:00,000 --> 00:00:01,000\nBurned line\n'], 'burn.srt', { type: 'application/x-subrip' });
    const input = document.querySelector('#previewHost .media-mode-panel[data-mode="export"] .media-export-subtitle-input');
    const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    return document.querySelector('#previewHost .media-mode-panel[data-mode="export"] .media-export-subtitle-status')?.textContent || '';
  });
  if (/burn\.srt loaded \(1 cue\)/i.test(burnStatus)) pass('R5: loading SRT updates burn-in status without ffmpeg run');
  else fail('subtitle burn status: ' + burnStatus);
  const burnArgs = await page.evaluate(async () => {
    const { buildSubtitleBurnArgs } = await import('./types/media/transcoder.js');
    return buildSubtitleBurnArgs('input.avi', 'subtitle.srt', 'out.mp4', { ext: 'srt' });
  });
  if (burnArgs.includes('-vf') && burnArgs.includes('subtitles=subtitle.srt')
    && burnArgs[burnArgs.indexOf('-c:v') + 1] === 'libx264'
    && !burnArgs.includes('-c')
    && burnArgs[burnArgs.indexOf('-c:a') + 1] === 'aac')
    pass('R5: pure subtitle burn args include subtitles filter and re-encode semantics');
  else fail('subtitle burn args: ' + JSON.stringify(burnArgs));
  const exportVf = await page.evaluate(async () => {
    const { buildVideoExportFilterChain } = await import('./types/media/transcoder.js');
    return {
      defaultMp4: buildVideoExportFilterChain({ scale: '-2:720' }, {}),
      composed: buildVideoExportFilterChain({ scale: '-2:720' }, { transform: 'rotate_ccw', look: 'mono' }),
      noFilter: buildVideoExportFilterChain({}, { transform: 'none', look: 'source' }),
    };
  });
  if (exportVf.defaultMp4 === 'scale=-2:720'
    && exportVf.composed === 'transpose=2,hue=s=0,scale=-2:720'
    && exportVf.noFilter === '')
    pass('R5: pure webvideo -vf builder composes transform/look/scale without ffmpeg');
  else fail('video export vf builder: ' + JSON.stringify(exportVf));

  // ── P6: Video timeline (modular source lane + config-only export coverage) ────
  // Use browser-playable video here so the modular seek-frame preview can sample.
  await openExample('Sample.webm');
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  const tlModeSel = '#previewHost .media-mode-panel[data-mode="timeline"]';
  await page.$eval('#previewHost .media-mode-tab[data-mode="timeline"]', (button) => button.click());
  await page.waitForSelector(tlModeSel + ':not([hidden])', { timeout: 5000 });
  await page.waitForSelector(tlModeSel + ' .mmx-video-source .mmx-element-visual', { timeout: 12000 });
  const modularVideoSource = await page.$eval(tlModeSel + ' .mmx-video-source', (root) => {
    const project = root.__mediaMixerVideoSource?.getProject?.();
    const asset = project?.assets?.find((item) => item.id === 'asset-video-source');
    const element = project?.elements?.find((item) => item.assetId === asset?.id);
    const settings = root.__mediaMixerVideoSource?.exportSettings?.();
    return {
      lanes: root.dataset.laneCount,
      elements: root.dataset.elementCount,
      frameSources: Number(root.querySelector('.mmx-frame-preview')?.dataset.frameSources || 0),
      hasRuler: !!root.querySelector('.mmx-ruler'),
      hasPlayhead: !!root.querySelector('.mmx-playhead'),
      hasZoom: !!root.querySelector('.mmx-zoom'),
      hasPreview: !!root.querySelector('.mmx-frame-preview'),
      hasVisual: !!root.querySelector('.mmx-element-visual'),
      thumbCount: Number(root.querySelector('.mmx-thumb-strip')?.dataset.thumbCount || 0),
      hasTransform: !!root.querySelector('.mmx-inspector-visual-opacity'),
      hasSettingsExport: !!root.querySelector('.mmx-settings-download'),
      hasSettingsImport: !!root.querySelector('.mmx-settings-import'),
      hasVideoExportPlan: !!root.querySelector('.mmx-video-export-plan'),
      hasRenderButton: !!root.querySelector('.mmx-video-render-run'),
      renderDisabled: !!root.querySelector('.mmx-video-render-run')?.disabled,
      exportStatus: root.querySelector('.mmx-video-export-status')?.dataset.status || '',
      exportCanRender: root.querySelector('.mmx-video-export-status')?.dataset.canRender || '',
      exportNote: root.querySelector('.mmx-video-export-note')?.textContent || '',
      hasMediaBytes: /objectURL|blob:|data:|waveformSummary|frameCache|thumbnailCache/i.test(settings || ''),
      hasVideo: !!element?.capabilities?.hasVideo,
      hasAudio: !!element?.capabilities?.hasAudio,
      width: asset?.media?.videoWidth || 0,
      durationMs: element?.timeline?.durationMs || 0,
    };
  });
  if (modularVideoSource.lanes === '1' && modularVideoSource.elements === '1'
    && modularVideoSource.hasRuler && modularVideoSource.hasPlayhead && modularVideoSource.hasZoom)
    pass('P6: opened video timeline mounts the modular source mixer lane');
  else fail('modular video source lane: ' + JSON.stringify(modularVideoSource));
  if (modularVideoSource.hasPreview && modularVideoSource.hasVisual && modularVideoSource.hasTransform)
    pass('P6: modular video source exposes frame preview and visual transform controls');
  else fail('modular video source visual controls: ' + JSON.stringify(modularVideoSource));
  if (modularVideoSource.hasVideo && modularVideoSource.hasAudio
    && modularVideoSource.width > 0 && modularVideoSource.durationMs > 0)
    pass('P6: modular video source project captures opened media metadata');
  else fail('modular video source metadata: ' + JSON.stringify(modularVideoSource));
  if (!modularVideoSource.hasMediaBytes) pass('P6: modular video source settings export remains config-only');
  else fail('modular video settings export leaked media data');
  if (modularVideoSource.hasSettingsExport && modularVideoSource.hasSettingsImport)
    pass('P6: modular video source exposes project settings import/export controls');
  else fail('modular video source settings controls: ' + JSON.stringify(modularVideoSource));
  if (modularVideoSource.hasVideoExportPlan && modularVideoSource.hasRenderButton
    && !modularVideoSource.renderDisabled && modularVideoSource.exportStatus === 'opt-in'
    && modularVideoSource.exportCanRender === 'false'
    && /Media Transcoding/i.test(modularVideoSource.exportNote))
    pass('P6: modular video source shows ffmpeg-gated final export plan');
  else fail('modular video source export plan state: ' + JSON.stringify(modularVideoSource));
  const sourceExportPlan = await page.$eval(tlModeSel + ' .mmx-video-source', (root) => {
    root.querySelector('.mmx-video-export-plan')?.click();
    const plan = root.__mediaMixerVideoSource.getLastExportPlan();
    return {
      status: plan?.status || '',
      canRender: !!plan?.canRender,
      requiresFfmpeg: !!plan?.requiresFfmpeg,
      visualItems: plan?.provenance?.visualItems?.length || 0,
      audioItems: plan?.provenance?.audioItems?.length || 0,
      hasBytes: /objectURL|blob:|data:|mediaBytes|frameCache|thumbnailCache/i.test(JSON.stringify(plan || {})),
    };
  });
  if (sourceExportPlan.status === 'opt-in' && !sourceExportPlan.canRender
    && sourceExportPlan.requiresFfmpeg && sourceExportPlan.visualItems >= 1
    && sourceExportPlan.audioItems >= 1 && !sourceExportPlan.hasBytes)
    pass('P6: modular video source final export provenance is config-only');
  else fail('modular video source export provenance: ' + JSON.stringify(sourceExportPlan));
  const sourceSettingsImport = await page.$eval(tlModeSel + ' .mmx-video-source', async (root) => {
    const json = root.__mediaMixerVideoSource.exportSettings();
    const imported = root.__mediaMixerVideoSource.importSettings(json);
    await new Promise((resolve) => setTimeout(resolve, 50));
    root.querySelector('.mmx-relink-choice[data-choice="do-not-change-media"]')?.click();
    return {
      matches: imported.relink.matches.length,
      missing: imported.relink.missing.length,
      modal: !!root.querySelector('.mmx-relink-modal'),
      choice: root.dataset.lastRelinkChoice || '',
      hasBytes: /objectURL|blob:|data:|waveformSummary|frameCache|thumbnailCache/i.test(json),
    };
  });
  if (sourceSettingsImport.matches >= 1 && sourceSettingsImport.missing === 0
    && sourceSettingsImport.modal && sourceSettingsImport.choice === 'do-not-change-media'
    && !sourceSettingsImport.hasBytes)
    pass('P6: modular video source imports config-only settings with reapply choices');
  else fail('modular video source settings import: ' + JSON.stringify(sourceSettingsImport));
  const sourceMissingRelink = await page.$eval(tlModeSel + ' .mmx-video-source', async (root) => {
    const originalJson = root.__mediaMixerVideoSource.exportSettings();
    const settings = JSON.parse(originalJson);
    const missingAssetId = 'asset-imported-missing-video';
    settings.assets[0].id = missingAssetId;
    settings.assets[0].name = 'sample-relinked.mp4';
    settings.assets[0].size = 5;
    settings.assets[0].lastModified = 12345;
    settings.assets[0].mime = 'video/mp4';
    settings.assets[0].hash = null;
    settings.elements[0].assetId = missingAssetId;
    const imported = root.__mediaMixerVideoSource.importSettings(JSON.stringify(settings), []);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const beforeMissing = imported.relink.missing.length;
    const hasBrowse = !!root.querySelector('.mmx-relink-file');
    const file = new File([new Uint8Array(5)], 'sample-relinked.mp4', { type: 'video/mp4', lastModified: 12345 });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const dragEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer });
    const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
    root.dispatchEvent(dragEvent);
    const dropPrevented = !root.dispatchEvent(dropEvent);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const relinked = root.__mediaMixerVideoSource.getLastSettingsImport();
    root.querySelector('.mmx-relink-choice[data-choice="apply-all"]')?.click();
    const asset = root.__mediaMixerVideoSource.getProject().assets[0];
    const result = {
      beforeMissing,
      afterMissing: relinked.relink.missing.length,
      matches: relinked.relink.matches.length,
      dropped: Number(root.dataset.lastRelinkDropped || 0),
      hasBrowse,
      dropPrevented,
      choice: root.dataset.lastRelinkChoice || '',
      applied: Number(root.dataset.lastRelinkApplied || 0),
      status: asset?.status || '',
      name: asset?.name || '',
    };
    root.__mediaMixerVideoSource.importSettings(originalJson);
    await new Promise((resolve) => setTimeout(resolve, 50));
    root.querySelector('.mmx-relink-choice[data-choice="do-not-change-media"]')?.click();
    return {
      ...result,
      restoredName: root.__mediaMixerVideoSource.getProject().assets[0]?.name || '',
    };
  });
  if (sourceMissingRelink.beforeMissing === 1 && sourceMissingRelink.afterMissing === 0
    && sourceMissingRelink.matches === 1 && sourceMissingRelink.dropped === 1
    && sourceMissingRelink.hasBrowse && sourceMissingRelink.dropPrevented
    && sourceMissingRelink.choice === 'apply-all'
    && sourceMissingRelink.applied === 1 && sourceMissingRelink.status === 'available'
    && sourceMissingRelink.name === 'sample-relinked.mp4')
    pass('P6: modular video source relinks missing imported media from local file');
  else fail('modular video source missing-media relink: ' + JSON.stringify(sourceMissingRelink));
  await page.waitForFunction((sel) => Number(document.querySelector(sel)?.dataset.frameSources || 0) > 0,
    tlModeSel + ' .mmx-video-source .mmx-frame-preview', { timeout: 12000 });
  const sourceFrameCount = await page.$eval(tlModeSel + ' .mmx-video-source .mmx-frame-preview',
    (node) => Number(node.dataset.frameSources || 0));
  if (sourceFrameCount > 0) pass('P6: modular video source samples the current seek-frame preview');
  else fail('modular video source frame sources: ' + sourceFrameCount);
  await page.waitForFunction((sel) => Number(document.querySelector(sel)?.dataset.thumbCount || 0) > 0,
    tlModeSel + ' .mmx-video-source .mmx-thumb-strip', { timeout: 12000 });
  const sourceThumbCount = await page.$eval(tlModeSel + ' .mmx-video-source .mmx-thumb-strip',
    (node) => Number(node.dataset.thumbCount || 0));
  if (sourceThumbCount > 0) pass('P6: modular video source renders sparse runtime thumbnails');
  else fail('modular video source thumbnail count: ' + sourceThumbCount);
  const modularMusicBed = await page.$eval(tlModeSel + ' .mmx-video-source', async (root) => {
    const file = new File([new Uint8Array(512)], 'music-bed.mp3', { type: 'audio/mpeg', lastModified: 123 });
    const added = root.__mediaMixerVideoSource.addMediaFile(file, { startMs: 250 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const slider = root.querySelector('.mmx-video-music-bed');
    const beforeValue = slider?.value || '';
    slider.value = '0.6';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    root.querySelector('.mmx-video-export-plan')?.click();
    const project = root.__mediaMixerVideoSource.getProject();
    const music = project.elements.find((element) => element.assetId === added?.assetId);
    const plan = root.__mediaMixerVideoSource.getLastExportPlan();
    return {
      addedKind: added?.kind || '',
      lanes: project.lanes.length,
      elements: project.elements.length,
      selectedId: project.selection?.primary?.id || '',
      musicId: music?.id || '',
      startMs: Math.round(music?.timeline?.startMs || 0),
      beforeValue,
      gain: music?.audio?.gain,
      lastMusicBed: root.dataset.lastMusicBed || '',
      dropControl: !!root.querySelector('.mmx-video-second-drop'),
      musicControl: !!root.querySelector('.mmx-video-music-bed'),
      audioItems: plan?.provenance?.audioItems?.length || 0,
      visualItems: plan?.provenance?.visualItems?.length || 0,
      hasMediaBytes: /objectURL|blob:|data:|mediaBytes|frameCache|thumbnailCache/i.test(JSON.stringify(plan || {})),
    };
  });
  if (modularMusicBed.addedKind === 'audio' && modularMusicBed.lanes >= 2
    && modularMusicBed.elements >= 2 && modularMusicBed.selectedId === modularMusicBed.musicId
    && modularMusicBed.startMs === 250)
    pass('P6: modular Timeline adds a second music-bed lane from local media');
  else fail('modular Timeline music-bed add: ' + JSON.stringify(modularMusicBed));
  if (modularMusicBed.dropControl && modularMusicBed.musicControl
    && modularMusicBed.beforeValue === '0.35' && modularMusicBed.gain === 0.6
    && /music-bed\.mp3/.test(modularMusicBed.lastMusicBed))
    pass('R5: modular Timeline exposes music-bed ducking and updates shared gain state');
  else fail('modular Timeline music-bed gain: ' + JSON.stringify(modularMusicBed));
  if (modularMusicBed.audioItems >= 2 && modularMusicBed.visualItems >= 1 && !modularMusicBed.hasMediaBytes)
    pass('P6: modular Timeline final export provenance includes source audio plus music bed without media bytes');
  else fail('modular Timeline music-bed export provenance: ' + JSON.stringify(modularMusicBed));
  const modularSecondVideoTransition = await page.$eval(tlModeSel + ' .mmx-video-source', async (root) => {
    const file = new File([new Uint8Array(768)], 'second-clip.webm', { type: 'video/webm', lastModified: 456 });
    const added = root.__mediaMixerVideoSource.addMediaFile(file, { startMs: 400 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const kind = root.querySelector('.mmx-video-transition-kind');
    const duration = root.querySelector('.mmx-video-transition-duration');
    kind.value = 'wipe-left';
    kind.dispatchEvent(new Event('input', { bubbles: true }));
    duration.value = '0.45';
    duration.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('.mmx-video-transition-apply')?.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const project = root.__mediaMixerVideoSource.getProject();
    const addedElement = project.elements.find((element) => element.assetId === added?.assetId);
    const transition = project.transitions.find((item) => item.toElementId === addedElement?.id);
    const plan = root.__mediaMixerVideoSource.getLastExportPlan();
    return {
      addedKind: added?.kind || '',
      selectedId: project.selection?.primary?.id || '',
      addedElementId: addedElement?.id || '',
      visualItems: plan?.provenance?.visualItems?.length || 0,
      transitions: plan?.provenance?.transitions?.length || 0,
      transitionKind: transition?.kind || '',
      transitionMs: transition?.durationMs || 0,
      transitionFrom: transition?.fromElementId || '',
      transitionTo: transition?.toElementId || '',
      datasetTarget: root.dataset.lastTransitionTarget || '',
      datasetKind: root.dataset.lastTransitionKind || '',
      filterGraph: plan?.provenance?.filterGraph || '',
      hasBytes: /objectURL|blob:|data:|mediaBytes|frameCache|thumbnailCache/i.test(JSON.stringify(plan || {})),
    };
  });
  if (modularSecondVideoTransition.addedKind === 'video'
    && modularSecondVideoTransition.selectedId === modularSecondVideoTransition.addedElementId
    && modularSecondVideoTransition.transitionTo === modularSecondVideoTransition.addedElementId)
    pass('P6: modular Timeline applies transition workflow to the selected second visual lane');
  else fail('modular Timeline second-video transition target: ' + JSON.stringify(modularSecondVideoTransition));
  if (modularSecondVideoTransition.transitionKind === 'wipe-left'
    && modularSecondVideoTransition.transitionMs === 450
    && modularSecondVideoTransition.datasetTarget === modularSecondVideoTransition.addedElementId
    && modularSecondVideoTransition.datasetKind === 'wipe-left')
    pass('P6: modular Timeline stores selected visual transition kind and duration');
  else fail('modular Timeline selected transition state: ' + JSON.stringify(modularSecondVideoTransition));
  if (modularSecondVideoTransition.visualItems >= 2
    && modularSecondVideoTransition.transitions >= 1
    && /if\(lt\(t\\,/.test(modularSecondVideoTransition.filterGraph)
    && !modularSecondVideoTransition.hasBytes)
    pass('P6: modular Timeline transition export provenance includes wipe overlay graph without media bytes');
  else fail('modular Timeline transition export provenance: ' + JSON.stringify(modularSecondVideoTransition));
  const modularTrimFade = await page.$eval(tlModeSel + ' .mmx-video-source', async (root) => {
    const selectedId = root.__mediaMixerVideoSource.getProject().selection?.primary?.id;
    root.querySelector('.mmx-video-trim-in').value = '0.05';
    root.querySelector('.mmx-video-trim-in').dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('.mmx-video-trim-out').value = '0.75';
    root.querySelector('.mmx-video-trim-out').dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('.mmx-video-fade-in').value = '0.12';
    root.querySelector('.mmx-video-fade-in').dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('.mmx-video-fade-out').value = '0.18';
    root.querySelector('.mmx-video-fade-out').dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('.mmx-video-edit-apply')?.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const project = root.__mediaMixerVideoSource.getProject();
    const edited = project.elements.find((element) => element.id === selectedId);
    const plan = root.__mediaMixerVideoSource.getLastExportPlan();
    const visualItem = plan?.provenance?.visualItems?.find((item) => item.elementId === selectedId);
    const audioItem = plan?.provenance?.audioItems?.find((item) => item.elementId === selectedId);
    return {
      selectedId,
      editedId: edited?.id || '',
      sourceInMs: Math.round(edited?.timeline?.sourceInMs || 0),
      sourceOutMs: Math.round(edited?.timeline?.sourceOutMs || 0),
      durationMs: Math.round(edited?.timeline?.durationMs || 0),
      audioFadeInMs: edited?.audio?.fadeInMs || 0,
      audioFadeOutMs: edited?.audio?.fadeOutMs || 0,
      visualFadeInMs: edited?.visual?.fadeInMs || 0,
      visualFadeOutMs: edited?.visual?.fadeOutMs || 0,
      datasetTarget: root.dataset.lastEditTarget || '',
      datasetTrimIn: root.dataset.lastTrimInMs || '',
      datasetTrimOut: root.dataset.lastTrimOutMs || '',
      visualItem: !!visualItem,
      audioItem: !!audioItem,
      visualProvenanceFadeIn: visualItem?.visual?.fadeInMs || 0,
      audioProvenanceFadeIn: audioItem?.fadeInMs || 0,
      hasBytes: /objectURL|blob:|data:|mediaBytes|frameCache|thumbnailCache/i.test(JSON.stringify(plan || {})),
    };
  });
  if (modularTrimFade.editedId === modularTrimFade.selectedId
    && modularTrimFade.sourceInMs === 50 && modularTrimFade.sourceOutMs === 750
    && modularTrimFade.durationMs === 700)
    pass('P6: modular Timeline selected clip edit applies source in/out trim state');
  else fail('modular Timeline trim edit state: ' + JSON.stringify(modularTrimFade));
  if (modularTrimFade.audioFadeInMs === 120 && modularTrimFade.audioFadeOutMs === 180
    && modularTrimFade.visualFadeInMs === 120 && modularTrimFade.visualFadeOutMs === 180
    && modularTrimFade.datasetTarget === modularTrimFade.selectedId)
    pass('P6: modular Timeline selected clip edit applies audio and visual fades');
  else fail('modular Timeline fade edit state: ' + JSON.stringify(modularTrimFade));
  if (modularTrimFade.visualItem && modularTrimFade.audioItem
    && modularTrimFade.visualProvenanceFadeIn === 120
    && modularTrimFade.audioProvenanceFadeIn === 120
    && !modularTrimFade.hasBytes)
    pass('P6: modular Timeline trim/fade export provenance is config-only');
  else fail('modular Timeline trim/fade provenance: ' + JSON.stringify(modularTrimFade));
  const modularTimelineGrammar = await page.$eval(tlModeSel + ' .mmx-video-source', (root) => {
    let project = root.__mediaMixerVideoSource?.getProject?.();
    const sourceVisual = project?.elements?.find((item) => item.capabilities?.hasVideo || item.capabilities?.hasImage);
    if (sourceVisual) {
      root.__mediaMixerVideoSource?.dispatch?.({
        type: 'select',
        target: { type: 'element', id: sourceVisual.id },
      });
      project = root.__mediaMixerVideoSource?.getProject?.();
    }
    const selected = project?.selection?.primary?.id || '';
    const element = project?.elements?.find((item) => item.id === selected) || project?.elements?.[0];
    const setField = (selector, value) => {
      const input = root.querySelector(selector);
      if (!input) return false;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    };
    setField('.mmx-inspector-gain', '0.64');
    setField('.mmx-inspector-start', '0.25');
    setField('.mmx-inspector-source-in', '0.1');
    setField('.mmx-inspector-source-out', '1.2');
    setField('.mmx-inspector-fade-in', '125');
    setField('.mmx-inspector-fade-out', '175');
    setField('.mmx-inspector-transition-in', '250');
    setField('.mmx-inspector-transition-kind', 'wipe-left');
    setField('.mmx-inspector-visual-x', '11');
    setField('.mmx-inspector-visual-opacity', '0.72');
    const updatedProject = root.__mediaMixerVideoSource?.getProject?.();
    const updated = updatedProject?.elements?.find((item) => item.id === element?.id);
    const transition = updatedProject?.transitions?.find((item) => item.toElementId === element?.id);
    const body = root.querySelector('.mmx-body');
    const timeline = root.querySelector('.mmx-timeline');
    const host = document.querySelector('#previewHost');
    const hostRect = host?.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const docEl = document.documentElement;
    return {
      ruler: !!root.querySelector('.mmx-ruler'),
      playhead: !!root.querySelector('.mmx-playhead'),
      lanes: root.querySelectorAll('.mmx-lane').length,
      elements: root.querySelectorAll('.mmx-element').length,
      timelineScrollable: timeline.scrollWidth >= Math.round(body.clientWidth),
      overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
      fitsHost: rootRect.left >= hostRect.left - 1 && rootRect.right <= hostRect.right + 1,
      rootWidth: Math.round(rootRect.width),
      bodyWidth: Math.round(body.getBoundingClientRect().width),
      selected,
      startMs: Math.round(updated?.timeline?.startMs || 0),
      sourceInMs: Math.round(updated?.timeline?.sourceInMs || 0),
      sourceOutMs: Math.round(updated?.timeline?.sourceOutMs || 0),
      gain: updated?.audio?.gain,
      fadeInMs: updated?.audio?.fadeInMs,
      fadeOutMs: updated?.audio?.fadeOutMs,
      transitionMs: transition?.durationMs || 0,
      transitionKind: transition?.kind || '',
      visualX: updated?.visual?.x,
      visualOpacity: updated?.visual?.opacity,
      legacyMounted: !!root.closest('[data-mode="timeline"]')?.querySelector('.tl-wrap'),
      legacyToggle: [...root.closest('[data-mode="timeline"]')?.querySelectorAll('.media-wv-toggle') || []]
        .some((button) => /Detailed legacy timeline/.test(button.textContent || '')),
    };
  });
  if (modularTimelineGrammar.ruler && modularTimelineGrammar.playhead
    && modularTimelineGrammar.lanes >= 1 && modularTimelineGrammar.elements >= 1)
    pass('P6: modular Timeline grammar includes ruler, playhead, lanes, and source element');
  else fail('modular Timeline grammar: ' + JSON.stringify(modularTimelineGrammar));
  if (modularTimelineGrammar.bodyWidth > 0 && modularTimelineGrammar.fitsHost
    && modularTimelineGrammar.overflowX === 0)
    pass('P6: modular Timeline fits the media studio viewport without page overflow');
  else fail('modular Timeline viewport: ' + JSON.stringify(modularTimelineGrammar));
  if (modularTimelineGrammar.startMs === 250 && modularTimelineGrammar.sourceInMs === 100
    && modularTimelineGrammar.sourceOutMs >= 1000 && modularTimelineGrammar.sourceOutMs <= 1200
    && modularTimelineGrammar.gain === 0.64
    && modularTimelineGrammar.fadeInMs === 125 && modularTimelineGrammar.fadeOutMs === 175)
    pass('P6: modular Timeline inspector updates timing, clamped trim, gain, and fades');
  else fail('modular Timeline inspector state: ' + JSON.stringify(modularTimelineGrammar));
  if (modularTimelineGrammar.transitionMs === 250 && modularTimelineGrammar.transitionKind === 'wipe-left'
    && modularTimelineGrammar.visualX === 11 && modularTimelineGrammar.visualOpacity === 0.72)
    pass('P6: modular Timeline inspector updates visual transform and incoming transition state');
  else fail('modular Timeline visual state: ' + JSON.stringify(modularTimelineGrammar));
  if (!modularTimelineGrammar.legacyMounted && modularTimelineGrammar.legacyToggle)
    pass('P6: legacy video timeline stays lazy behind an explicit detailed legacy disclosure');
  else fail('legacy timeline default state: ' + JSON.stringify(modularTimelineGrammar));

  // PURE arg-builder unit checks (no ffmpeg load): xfade offset math + acrossfade/mux args.
  const tlArgs = await page.evaluate(async () => {
    const m = await import('./types/media/video-filters.js');
    return {
      offset: m.xfadeOffset(10, 1),                         // durA−d = 9
      xfade: m.buildXfadeArgs('input.mp4', 'secondary.mp4', 'out.mp4', { durationA: 10, transition: 'fade', duration: 1 }).join(' '),
      across: m.buildAcrossfadeArgs('input.mp3', 'secondary.mp3', 'out.m4a', { duration: 2 }).join(' '),
      mux: m.buildMuxMusicArgs('input.mp4', 'secondary.mp3', 'out.mp4', { musicGain: 0.35 }).join(' '),
      muxChosen: m.buildMuxMusicArgs('input.mp4', 'secondary.mp3', 'out.mp4', { musicGain: 0.6 }).join(' '),
      badTrans: m.normalizeTransition('nonsense'),
      trimClamped: m.clampTrimRange(12, 8, 10),
    };
  });
  if (tlArgs.offset === 9) pass('P6: xfadeOffset(10,1) = 9 (durationA − transition)'); else fail('xfade offset: ' + tlArgs.offset);
  if (/xfade=transition=fade:duration=1:offset=9/.test(tlArgs.xfade) && /\[0:a\]\[1:a\]acrossfade=d=1\[a\]/.test(tlArgs.xfade) && /libx264/.test(tlArgs.xfade)) pass('P6: xfade args build dissolve + aligned audio acrossfade'); else fail('xfade args: ' + tlArgs.xfade);
  if (/\[0:a\]\[1:a\]acrossfade=d=2\[a\]/.test(tlArgs.across)) pass('P6: acrossfade args build d=2 audio crossfade'); else fail('acrossfade args: ' + tlArgs.across);
  if (/volume=0\.35/.test(tlArgs.mux) && /amix=inputs=2:duration=first/.test(tlArgs.mux) && /-c:v copy/.test(tlArgs.mux)) pass('P6: mux-music args duck the bed + amix under the video audio'); else fail('mux args: ' + tlArgs.mux);
  if (/volume=0\.6/.test(tlArgs.muxChosen) && /-map 0:v/.test(tlArgs.muxChosen)) pass('R5: mux-music args reflect chosen music-bed gain and preserve video stream copy'); else fail('mux chosen args: ' + tlArgs.muxChosen);
  if (tlArgs.badTrans === 'fade') pass('P6: unknown transition normalizes to fade'); else fail('bad transition: ' + tlArgs.badTrans);
  if (tlArgs.trimClamped.start < tlArgs.trimClamped.end && tlArgs.trimClamped.end === 10)
    pass('P6: pure trim clamp keeps in/out from crossing within duration');
  else fail('trim clamp: ' + JSON.stringify(tlArgs.trimClamped));
}
