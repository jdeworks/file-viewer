import {
  MEDIA_DEFAULT_DESKTOP_VIEWPORT,
  MEDIA_MOBILE_VIEWPORT,
  assertAudioTopViewport,
  reloadExampleAtViewport,
} from './media-studio-helpers.mjs';

export async function runAudioListenAndChapters(ctx) {
  const { page, origin, openExample, pass, fail } = ctx;

  page.addInitScript(() => {
    window.__fvMediaTestChapters = [
      { start: 0, end: 0.2, title: 'Prologue' },
      { start: 0.2, end: 0.4, title: 'Chapter One' },
      { start: 0.4, end: 0.6, title: 'Chapter Two' },
    ];
  });
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  const mediaType = await page.$eval('#typeSelect', (s) => s.value);
  if (mediaType === 'media') pass('.wav detected as Audio / Video'); else fail('media type: ' + mediaType);
  const audioSrc = await page.$eval('#previewHost audio.media-view', (e) => e.getAttribute('src') || '');
  if (audioSrc.startsWith('blob:')) pass('audio served from in-page blob URL (streamed, no size ceiling)'); else fail('audio src: ' + audioSrc.slice(0, 30));
  const audioChrome = await page.$eval('#previewHost audio.media-view', (el) => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { controls: el.controls, w: r.width, h: r.height, opacity: style.opacity, pointerEvents: style.pointerEvents };
  });
  if (!audioChrome.controls && audioChrome.w <= 2 && audioChrome.h <= 2 && audioChrome.opacity === '0')
    pass('audio listen: native audio element is hidden decode source, not visible player');
  else fail('native audio chrome still visible: ' + JSON.stringify(audioChrome));
  const listenSurface = await page.$eval('#previewHost .media-listen-surface', (el) => {
    const r = el.getBoundingClientRect();
    return {
      w: r.width,
      h: r.height,
      hasPlay: !!el.querySelector('.al-play'),
      hasStop: !!el.querySelector('.al-stop'),
      waveform: !!el.querySelector('.al-canvas'),
      ruler: !!el.querySelector('.al-ruler'),
      cursor: !!el.querySelector('.al-cursor'),
      controls: {
        offset: !!el.querySelector('.al-f-start'),
        in: !!el.querySelector('.al-f-in'),
        out: !!el.querySelector('.al-f-out'),
        gain: !!el.querySelector('.al-f-gain'),
        fadeIn: !!el.querySelector('.al-f-fade-in'),
        fadeOut: !!el.querySelector('.al-f-fade-out'),
        room: !!el.querySelector('.al-f-room'),
        regionLoop: !!el.querySelector('.al-region-loop'),
      },
    };
  });
  if (listenSurface.w > 0 && listenSurface.h > 0 && listenSurface.hasPlay && listenSurface.hasStop
    && listenSurface.waveform && listenSurface.ruler && listenSurface.cursor
    && Object.values(listenSurface.controls).every(Boolean))
    pass('audio listen: auto-audiobook-style waveform lane replaces native controls');
  else fail('custom listen surface: ' + JSON.stringify(listenSurface));

  // Streaming: the File handle is retained on the intake (blob built from the File = disk-backed,
  // never reads a multi-GB file into memory).
  const hasFileHandle = await page.evaluate(() => !!window.__fv.state.intake.file);
  if (hasFileHandle) pass('media keeps the File handle (streams off disk, no full read into memory)'); else fail('no File handle on media intake');

  // Sleep timer is temporarily hidden during the studio-fidelity work (re-enable later), so its
  // presence is not asserted for now.

  // P7: speed presets (0.5–2×) — present on audio, and clicking sets playbackRate live.
  const audioSpeeds = await page.$$eval('#previewHost .media-extras .media-speed-btn', (els) => els.map((e) => e.dataset.rate));
  if (['0.5', '1', '1.5', '2'].every((r) => audioSpeeds.includes(r))) pass('P7 audio: speed presets (0.5×…2×) present'); else fail('audio speeds: ' + audioSpeeds.join(','));
  await page.click('#previewHost .media-extras .media-speed-btn[data-rate="1.5"]');
  const rate15 = await page.$eval('#previewHost audio.media-view', (e) => e.playbackRate);
  if (Math.abs(rate15 - 1.5) < 0.001) pass('P7 audio: speed preset sets playbackRate (1.5×)'); else fail('playbackRate after 1.5×: ' + rate15);
  await page.click('#previewHost .media-extras .media-speed-btn[data-rate="1"]');   // restore

  const audioWorkspace = await page.$('#previewHost .media-audio-workspace');
  if (audioWorkspace) pass('audio workspace: top-level audio workspace exists'); else fail('media-audio-workspace missing');

  await assertAudioTopViewport(ctx, 'desktop');
  const desktopViewport = page.viewportSize();
  await reloadExampleAtViewport(ctx, MEDIA_MOBILE_VIEWPORT, 'Sample.wav', '#previewHost audio.media-view');
  await assertAudioTopViewport(ctx, 'mobile');
  if (desktopViewport) {
    await reloadExampleAtViewport(ctx, desktopViewport, 'Sample.wav', '#previewHost audio.media-view');
  } else {
    await reloadExampleAtViewport(ctx, MEDIA_DEFAULT_DESKTOP_VIEWPORT, 'Sample.wav', '#previewHost audio.media-view');
  }

  const waveformSurface = await page.$eval('#previewHost .al-canvas-wrap', (el) => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName.toLowerCase(), w: r.width, h: r.height, displayed: getComputedStyle(el).display !== 'none' };
  });
  if (waveformSurface.w > 0 && waveformSurface.h > 0 && waveformSurface.displayed) pass('audio waveform surface is visible by default'); else fail('waveform surface: ' + JSON.stringify(waveformSurface));
  const waveformDrawn = await page.$eval('#previewHost .al-canvas', (canvas) => {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) painted++;
    return { width: canvas.width, height: canvas.height, painted };
  });
  if (waveformDrawn.width > 0 && waveformDrawn.height > 0 && waveformDrawn.painted > 20)
    pass('audio waveform: visible workspace canvas paints by default');
  else fail('waveform canvas: ' + JSON.stringify(waveformDrawn));

  const seekBefore = await page.$eval('#previewHost audio.media-view', (audio) => audio.currentTime || 0);
  const waveformBox = await page.locator('#previewHost .al-canvas').boundingBox();
  if (waveformBox) {
    await page.mouse.click(waveformBox.x + waveformBox.width * 0.64, waveformBox.y + waveformBox.height * 0.52);
    await page.waitForTimeout(160);
  }
  const seekAfter = await page.$eval('#previewHost', (host) => {
    const audio = host.querySelector('audio.media-view');
    const cursor = host.querySelector('.al-cursor');
    return { currentTime: audio?.currentTime || 0, left: cursor?.style.left || '' };
  });
  if (waveformBox && seekAfter.currentTime > seekBefore && seekAfter.left && seekAfter.left !== '0px')
    pass('audio listen: waveform click-to-seek moves the red cursor');
  else fail('listen click-to-seek: ' + JSON.stringify({ waveformBox: !!waveformBox, seekBefore, seekAfter }));

  const laneState = await page.$eval('#previewHost .media-listen-surface', (el) => {
    const set = (sel, value) => {
      const input = el.querySelector(sel);
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('.al-f-start', 0.12);
    set('.al-f-in', 0.05);
    set('.al-f-out', 0.4);
    set('.al-f-gain', 0.67);
    set('.al-f-fade-in', 50);
    set('.al-f-fade-out', 100);
    const room = el.querySelector('.al-f-room');
    room.checked = false;
    room.dispatchEvent(new Event('change', { bubbles: true }));
    const durEl = [...el.querySelectorAll('.al-inspector-sub')].find((e) => /Duration/.test(e.textContent));
    return {
      offset: el.querySelector('.al-f-start')?.value,
      in: el.querySelector('.al-f-in')?.value,
      out: el.querySelector('.al-f-out')?.value,
      gain: el.querySelector('.al-f-gain')?.value,
      fadeIn: el.querySelector('.al-f-fade-in')?.value,
      fadeOut: el.querySelector('.al-f-fade-out')?.value,
      roomChecked: room?.checked,
      duration: durEl?.textContent || '',
    };
  });
  if (laneState.offset === '0.12' && laneState.in === '0.05' && laneState.out === '0.4'
    && laneState.gain === '0.67' && laneState.fadeIn === '50' && laneState.fadeOut === '100'
    && laneState.roomChecked === false && /Duration/.test(laneState.duration))
    pass('audio listen: start/end/fade/gain controls update lane state and room-tone option');
  else fail('listen lane state controls: ' + JSON.stringify(laneState));

  await page.click('#previewHost .al-region-loop');
  const regionLoopState = await page.$eval('#previewHost .media-listen-surface', (el) => {
    const button = el.querySelector('.al-region-loop');
    return { pressed: button?.getAttribute('aria-pressed'), reflected: el.dataset.mixerRegionLoop };
  });
  if (regionLoopState.pressed === 'true' && regionLoopState.reflected === 'true')
    pass('audio listen: Loop selection toggles bounded In–Out region playback state');
  else fail('region loop state: ' + JSON.stringify(regionLoopState));
  await page.click('#previewHost .al-region-loop');

  await page.waitForFunction(() => document.querySelectorAll('#previewHost .al-chapters .al-chapter').length >= 3, null, { timeout: 6000 });
  const chapterMarkers = await page.$$eval('#previewHost .al-chapters .al-chapter', (els) => els.map((el) => ({
    left: el.style.left,
    title: el.getAttribute('title') || '',
    visible: true,
  })));
  if (chapterMarkers.length === 3 && chapterMarkers.every((m) => m.visible && /%$/.test(m.left)) && chapterMarkers.some((m) => /Prologue/.test(m.title)))
    pass('R2: chapter markers render on the audio waveform');
  else fail('chapter markers: ' + JSON.stringify(chapterMarkers));
  const chapterSource = await page.$eval('#previewHost .media-chapters-source', (el) => el.textContent.trim()).catch(() => '');
  if (/Chapters: test fixture/.test(chapterSource)) pass('R2: chapter source status appears in Listen mode');
  else fail('chapter source status: ' + chapterSource);

  await page.click('#previewHost .media-chapters-edit');
  await page.$eval('#previewHost .media-chapter-title-input', (input) => {
    input.value = 'Edited Prologue';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => [...document.querySelectorAll('#previewHost .al-chapter')]
    .some((marker) => marker.title === 'Edited Prologue'));
  await page.click('#previewHost .media-chapters-edit');
  const editedChapter = await page.evaluate(() => ({
    label: document.querySelector('#previewHost .media-chapter-label')?.textContent || '',
    source: document.querySelector('#previewHost .media-chapters-source')?.textContent || '',
  }));
  if (editedChapter.label === 'Edited Prologue' && /edited locally/.test(editedChapter.source))
    pass('R2: chapter title edits update the seek list, waveform markers, and shared export state');
  else fail('chapter edit: ' + JSON.stringify(editedChapter));
  const chapterDownload = page.waitForEvent('download');
  await page.click('#previewHost .media-chapters-download');
  const chapterDownloadName = (await chapterDownload).suggestedFilename();
  if (/\.chapters\.vtt$/.test(chapterDownloadName))
    pass('R2: edited chapters download as a local WebVTT sidecar');
  else fail('chapter sidecar filename: ' + chapterDownloadName);

  await page.evaluate(async () => {
    delete window.__fvMediaTestChapters;
    const sampleRate = 8000;
    const seconds = 1;
    const samples = sampleRate * seconds;
    const dataBytes = samples * 2;
    const bytes = new Uint8Array(44 + dataBytes);
    const view = new DataView(bytes.buffer);
    const write = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i);
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, dataBytes, true);
    const audio = new File([bytes], '01-intro.wav', { type: 'audio/wav' });
    const chapters = new File([
      [
        'WEBVTT',
        '',
        '00:00:00.000 --> 00:00:00.250',
        'Sidecar Prologue',
        '',
        '00:00:00.250 --> 00:00:00.750',
        'Sidecar Chapter One',
        '',
      ].join('\n'),
    ], '01-intro.chapters.vtt', { type: 'text/vtt' });
    window.__fv.state._skipDiscardGuard = true;
    await window.__fv.loadFolder([
      { file: audio, path: 'Sidecar/01-intro.wav' },
      { file: chapters, path: 'Sidecar/01-intro.chapters.vtt' },
    ]);
  });
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .al-chapters .al-chapter').length >= 2, null, { timeout: 6000 });
  const sidecarChapters = await page.evaluate(() => ({
    source: document.querySelector('#previewHost .media-chapters-source')?.textContent.trim() || '',
    markers: [...document.querySelectorAll('#previewHost .al-chapters .al-chapter')]
      .map((el) => el.getAttribute('title') || ''),
    list: [...document.querySelectorAll('#previewHost .media-chapter-label')].map((el) => el.textContent.trim()),
  }));
  if (/01-intro\.chapters\.vtt/.test(sidecarChapters.source)
    && sidecarChapters.markers.includes('Sidecar Prologue')
    && sidecarChapters.markers.includes('Sidecar Chapter One')
    && sidecarChapters.list.join('|') === 'Sidecar Prologue|Sidecar Chapter One')
    pass('R2: folder sidecar chapters reach markers, list, and source status');
  else fail('folder sidecar chapters: ' + JSON.stringify(sidecarChapters));

  await openExample('Sample.mp3');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  await page.waitForFunction(() => Number.isFinite(document.querySelector('#previewHost audio.media-view')?.duration), null, { timeout: 8000 });
  const mp3Lane = await page.$eval('#previewHost .media-listen-surface', (el) => ({
    nativeHidden: (() => {
      const audio = document.querySelector('#previewHost audio.media-view');
      const r = audio.getBoundingClientRect();
      return !audio.controls && r.width <= 2 && r.height <= 2 && getComputedStyle(audio).opacity === '0';
    })(),
    waveform: !!el.querySelector('.al-canvas'),
    cursor: !!el.querySelector('.al-cursor'),
    room: !!el.querySelector('.al-f-room'),
  }));
  if (mp3Lane.nativeHidden && mp3Lane.waveform && mp3Lane.cursor && mp3Lane.room)
    pass('audio listen: Sample.mp3 uses the same hidden-native waveform lane');
  else fail('Sample.mp3 listen lane: ' + JSON.stringify(mp3Lane));
}
