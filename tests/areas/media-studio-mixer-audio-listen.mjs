export async function run(ctx) {
  const { page, origin, openExample, pass, fail } = ctx;

  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  await page.waitForSelector('#previewHost .media-listen-surface.mmx-audio-listen', { timeout: 12000 });

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
      controls: ['.media-lane-offset', '.media-lane-in', '.media-lane-out', '.media-lane-gain', '.media-lane-fade-in', '.media-lane-fade-out', '.media-lane-room-toggle']
        .every((selector) => !!el.querySelector(selector)),
    };
  });
  if (initial.nativeHidden && initial.mixerContext === 'listen' && initial.projectId && initial.elementId)
    pass('modular audio listen: Sample.wav opens through mixer-owned context with hidden native source');
  else fail('modular audio listen context missing: ' + JSON.stringify(initial));
  if (initial.lane && initial.ruler && initial.cursor && initial.canvas && initial.controls)
    pass('modular audio listen: one-lane waveform editor controls render');
  else fail('modular audio listen surfaces missing: ' + JSON.stringify(initial));

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
      offset: el.querySelector('.media-lane-offset').value,
      gain: el.querySelector('.media-lane-gain').value,
      room: el.querySelector('.media-lane-room-toggle').checked,
      projectSettingsStored: !!el.dataset.projectSettings,
    };
  });
  if (roundtrip.schema === 'file-viewer.media-mixer.project' && roundtrip.assets === 1 && roundtrip.lanes === 1 && roundtrip.elements === 1 && !roundtrip.hasMediaBytes)
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

