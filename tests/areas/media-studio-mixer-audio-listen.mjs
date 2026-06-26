export async function run(ctx) {
  const { page, origin, openExample, pass, fail } = ctx;

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
      projectId: el.dataset.mixerProjectId,
      elementId: el.dataset.mixerElementId,
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
  if (initial.nativeHidden && initial.mixerContext === 'listen' && initial.projectId && initial.elementId)
    pass('modular audio listen: Sample.wav opens through mixer-owned context with hidden native source');
  else fail('modular audio listen context missing: ' + JSON.stringify(initial));
  if (initial.lane && initial.ruler && initial.cursor && initial.canvas && initial.controls && initial.zoom && initial.pan && initial.capabilityNote && initial.waveformStatus !== 'pending' && (initial.waveformStatus !== 'available' || (initial.waveformBuckets > 0 && initial.projectHasWaveformSummary)))
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
}
