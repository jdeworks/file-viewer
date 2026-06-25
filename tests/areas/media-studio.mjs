import {
  MEDIA_DEFAULT_DESKTOP_VIEWPORT,
  MEDIA_MOBILE_VIEWPORT,
  assertAudioTopViewport,
  assertMixViewport,
  assertTimelineViewport,
  assertVideoTopViewport,
  enableFfmpegForMedia,
  hhmmssToSeconds,
  reloadExampleAtViewport,
  resetMediaSettings,
} from './media-studio-helpers.mjs';

export async function run(ctx) {
  const { browser, page, origin, pass, fail, openExample } = ctx;
  async function assertCompareNoOverflow(kind, label) {
    const geometry = await page.$eval('#previewHost .media-compare', (el) => {
      const host = document.querySelector('#previewHost');
      const hostRect = host?.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const docEl = document.documentElement;
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        hostLeft: Math.round(hostRect?.left || 0),
        hostRight: Math.round(hostRect?.right || 0),
        overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
      };
    });
    if (geometry.overflowX === 0 && geometry.left >= geometry.hostLeft - 1 && geometry.right <= geometry.hostRight + 1)
      pass(`${kind} compare: no horizontal overflow (${label})`);
    else fail(`${kind} compare overflow (${label}): ` + JSON.stringify(geometry));
  }

  async function exerciseCompare(kind) {
    const panelSel = '#previewHost .media-mode-panel[data-mode="compare"]';
    const absentBefore = await page.$('#previewHost .media-compare');
    if (!absentBefore) pass(`${kind} Compare mounts lazily`);
    else fail(`${kind} Compare should not mount before tab selection`);
    await page.click('#previewHost .media-mode-tab[data-mode="compare"]');
    await page.waitForSelector(`${panelSel} .media-compare`, { timeout: 5000 });
    const layouts = await page.$$eval(`${panelSel} .media-compare-layout-btn`, (els) => els.map((el) => ({
      layout: el.dataset.layout,
      text: el.textContent.trim(),
    })));
    if (['side-by-side', 'top-bottom', 'overlay'].every((layout) => layouts.some((row) => row.layout === layout)))
      pass(`${kind} compare: layout controls include side-by-side/top-bottom/overlay`);
    else fail(`${kind} compare layouts: ` + JSON.stringify(layouts));
    const normState = await page.$eval(`${panelSel} .media-compare-normalize`, (el) => ({
      hidden: el.hidden,
      text: el.textContent.trim(),
      checked: el.querySelector('input')?.checked || false,
    }));
    if (kind === 'audio') {
      if (!normState.hidden && /off/i.test(normState.text) && !normState.checked)
        pass('audio compare: explicit normalization toggle is present and off by default');
      else fail('audio compare normalize state: ' + JSON.stringify(normState));
    }
    const initialCopy = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
    await page.fill(`${panelSel} .media-compare-offset-input[data-lane="B"]`, '4.0');
    const offsetCopy = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
    const offsetLabel = await page.$eval(`${panelSel} .media-compare-lane[data-lane="B"] .media-compare-lane-label`, (el) => el.textContent);
    if (offsetCopy !== initialCopy && /\+4\.00s/.test(offsetCopy) && /offset 4\.00s/.test(offsetLabel))
      pass(`${kind} compare: changing lane offset updates offset and overlap readout`);
    else fail(`${kind} compare offset copy: ${offsetCopy} / ${offsetLabel}`);
    const rangeInputs = await page.$$eval(`${panelSel} .media-compare-in-input, ${panelSel} .media-compare-out-input`, (els) => els.length);
    await page.fill(`${panelSel} .media-compare-in-input[data-lane="A"]`, '1.0');
    await page.fill(`${panelSel} .media-compare-out-input[data-lane="A"]`, '5.0');
    const rangeCopy = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
    const rangeHandles = await page.$$eval(`${panelSel} .media-compare-range-handle`, (els) => els.length);
    if (rangeInputs === 4 && rangeHandles >= 4 && /Missing\/extra ranges/.test(rangeCopy))
      pass(`${kind} compare: range inputs/handles exist and update partial range copy`);
    else fail(`${kind} compare range state: inputs=${rangeInputs} handles=${rangeHandles} copy=${rangeCopy}`);
    await page.click(`${panelSel} .media-compare-layout-btn[data-layout="overlay"]`);
    await page.fill(`${panelSel} .media-compare-opacity-input`, '30');
    const overlayState = await page.$eval(`${panelSel} .media-compare`, (el) => ({
      layout: el.dataset.layout,
      opacity: el.dataset.overlayOpacity,
      css: getComputedStyle(el.querySelector('.media-compare-visual')).getPropertyValue('--compare-opacity').trim(),
    }));
    if (overlayState.layout === 'overlay' && overlayState.opacity === '30' && overlayState.css === '0.3')
      pass(`${kind} compare: overlay opacity control affects UI state`);
    else fail(`${kind} compare overlay state: ` + JSON.stringify(overlayState));
    const dropExists = await page.$(`${panelSel} .media-compare-drop .media-ed-file-input`);
    if (dropExists) pass(`${kind} compare: second-file drop/browse control exists`);
    else fail(`${kind} compare second-file picker missing`);
    const analyzeExists = await page.$(`${panelSel} .media-compare-analyze`);
    if (kind === 'audio') {
      if (analyzeExists) pass('audio compare: explicit analyze button exists');
      else fail('audio compare analyze button missing');
      await page.fill(`${panelSel} .media-compare-offset-input[data-lane="A"]`, '0');
      await page.fill(`${panelSel} .media-compare-offset-input[data-lane="B"]`, '0.1');
      await page.fill(`${panelSel} .media-compare-in-input[data-lane="A"]`, '0');
      await page.fill(`${panelSel} .media-compare-out-input[data-lane="A"]`, '0.4');
      await page.fill(`${panelSel} .media-compare-in-input[data-lane="B"]`, '0');
      await page.fill(`${panelSel} .media-compare-out-input[data-lane="B"]`, '0.4');
      await page.setInputFiles(`${panelSel} .media-compare-drop .media-ed-file-input`, new URL('../../docs/examples/sample.wav', import.meta.url).pathname);
      await page.click(`${panelSel} .media-compare-analyze`);
      await page.waitForFunction(() => /Analyzed selected audio range/i.test(document.querySelector('#previewHost .media-mode-panel[data-mode="compare"] .media-compare-analysis-status')?.textContent || ''), null, { timeout: 12000 });
      const analysisPaint = await page.$$eval(`${panelSel} .media-compare-waveform-canvas, ${panelSel} .media-compare-diff-canvas`, (canvases) => canvases.map((canvas) => {
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        const data = ctx.getImageData(0, 0, width, height).data;
        const first = [data[0], data[1], data[2], data[3]];
        let varied = 0;
        for (let i = 0; i < data.length; i += 16) {
          if (data[i] !== first[0] || data[i + 1] !== first[1] || data[i + 2] !== first[2] || data[i + 3] !== first[3]) varied++;
        }
        return { cls: canvas.className, width, height, hidden: canvas.hidden, varied };
      }));
      if (analysisPaint.length >= 3 && analysisPaint.every((row) => row.width > 0 && row.height > 0 && !row.hidden && row.varied > 8))
        pass('audio compare: analysis paints lane waveforms and difference canvas');
      else fail('audio compare canvas paint: ' + JSON.stringify(analysisPaint));
      const diffReadout = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
      if (/Measured overlap: average diff energy/i.test(diffReadout) && /Raw amplitude compare/i.test(diffReadout))
        pass('audio compare: measured difference readout distinguishes overlap energy');
      else fail('audio compare diff readout: ' + diffReadout);
      await page.click(`${panelSel} .media-compare-normalize-input`);
      const normReadout = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
      const normLabel = await page.$eval(`${panelSel} .media-compare-normalize`, (el) => ({
        checked: el.querySelector('input')?.checked || false,
        text: el.textContent,
      }));
      if (normLabel.checked && /user chosen/i.test(normLabel.text) && /normalization is on for compare only/i.test(normReadout))
        pass('audio compare: normalize toggle updates compare-only label/state');
      else fail('audio compare normalize after analysis: ' + JSON.stringify({ normLabel, normReadout }));
    } else if (!analyzeExists) {
      pass('video compare: audio analysis controls are absent');
    } else {
      fail('video compare should not show audio analysis controls');
    }
    await assertCompareNoOverflow(kind, 'desktop');
    const priorViewport = page.viewportSize();
    await page.setViewportSize(MEDIA_MOBILE_VIEWPORT);
    await assertCompareNoOverflow(kind, 'mobile');
    if (priorViewport) await page.setViewportSize(priorViewport);
  }

  // ── Audio/Video (media) ── native player rendered in the pane via a blob: URL.
  await page.addInitScript(() => {
    window.__fvMediaTestChapters = [
      { start: 0, end: 0.2, title: 'Prologue' },
      { start: 0.2, end: 0.4, title: 'Chapter One' },
      { start: 0.4, end: 0.6, title: 'Chapter Two' },
    ];
  });
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  const mediaType = await page.$eval('#typeSelect', (s) => s.value);
  if (mediaType === 'media') pass('.wav detected as Audio / Video'); else fail('media type: ' + mediaType);
  const audioSrc = await page.$eval('#previewHost audio.media-view', (e) => e.getAttribute('src') || '');
  if (audioSrc.startsWith('blob:')) pass('audio served from in-page blob URL (streamed, no size ceiling)'); else fail('audio src: ' + audioSrc.slice(0, 30));
  // Streaming: the File handle is retained on the intake (blob built from the File = disk-backed,
  // never reads a multi-GB file into memory).
  const hasFileHandle = await page.evaluate(() => !!window.__fv.state.intake.file);
  if (hasFileHandle) pass('media keeps the File handle (streams off disk, no full read into memory)'); else fail('no File handle on media intake');
  // Sleep timer control present (long-form listening).
  const sleepOpts = await page.$$eval('#previewHost .media-sleep select option', (els) => els.map((e) => e.textContent));
  if (sleepOpts.includes('Off') && sleepOpts.includes('30 min')) pass('audio: sleep timer control present (Off … 60 min)'); else fail('sleep options: ' + sleepOpts.join(','));
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
  const waveformSurface = await page.$eval('#previewHost .media-waveform-surface', (el) => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName.toLowerCase(), w: r.width, h: r.height, displayed: getComputedStyle(el).display !== 'none' };
  });
  if (waveformSurface.w > 0 && waveformSurface.h > 0 && waveformSurface.displayed) pass('audio waveform surface is visible by default'); else fail('waveform surface: ' + JSON.stringify(waveformSurface));
  const waveformDrawn = await page.$eval('#previewHost .media-waveform-surface canvas.media-wv-canvas', (canvas) => {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) painted++;
    return { width: canvas.width, height: canvas.height, painted };
  });
  if (waveformDrawn.width > 0 && waveformDrawn.height > 0 && waveformDrawn.painted > 20)
    pass('audio waveform: visible workspace canvas paints by default');
  else fail('waveform canvas: ' + JSON.stringify(waveformDrawn));
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .media-waveform-surface .media-wv-chapter-marker').length >= 3, null, { timeout: 6000 });
  const chapterMarkers = await page.$$eval('#previewHost .media-waveform-surface .media-wv-chapter-marker', (els) => els.map((el) => ({
    left: el.style.left,
    title: el.getAttribute('title') || '',
    visible: !el.closest('.media-wv-chapter-layer')?.hidden,
  })));
  if (chapterMarkers.length === 3 && chapterMarkers.every((m) => m.visible && /%$/.test(m.left)) && chapterMarkers.some((m) => /Prologue/.test(m.title)))
    pass('R2: chapter markers render on the audio waveform');
  else fail('chapter markers: ' + JSON.stringify(chapterMarkers));
  const chapterSource = await page.$eval('#previewHost .media-chapters-source', (el) => el.textContent.trim()).catch(() => '');
  if (/Chapters: test fixture/.test(chapterSource)) pass('R2: chapter source status appears in Listen mode');
  else fail('chapter source status: ' + chapterSource);
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
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .media-waveform-surface .media-wv-chapter-marker').length >= 2, null, { timeout: 6000 });
  const sidecarChapters = await page.evaluate(() => ({
    source: document.querySelector('#previewHost .media-chapters-source')?.textContent.trim() || '',
    markers: [...document.querySelectorAll('#previewHost .media-waveform-surface .media-wv-chapter-marker')]
      .map((el) => el.getAttribute('title') || ''),
    list: [...document.querySelectorAll('#previewHost .media-chapter-label')].map((el) => el.textContent.trim()),
  }));
  if (/01-intro\.chapters\.vtt/.test(sidecarChapters.source)
    && sidecarChapters.markers.includes('Sidecar Prologue')
    && sidecarChapters.markers.includes('Sidecar Chapter One')
    && sidecarChapters.list.join('|') === 'Sidecar Prologue|Sidecar Chapter One')
    pass('R2: folder sidecar chapters reach markers, list, and source status');
  else fail('folder sidecar chapters: ' + JSON.stringify(sidecarChapters));
  await page.evaluate(() => {
    window.__fvMediaTestChapters = [
      { start: 0, end: 0.2, title: 'Prologue' },
      { start: 0.2, end: 0.4, title: 'Chapter One' },
      { start: 0.4, end: 0.6, title: 'Chapter Two' },
    ];
  });
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  const modeTabs = await page.$$eval('#previewHost .media-mode-tab', (els) => els.map((e) => e.textContent.trim()));
  if (modeTabs.join('|') === 'Listen|Tune|QC|Export|Compare|Mix') pass('audio mode tabs exist and are ordered');
  else fail('audio mode tabs: ' + modeTabs.join(','));
  const modeListen = await page.$('#previewHost .media-mode-tab[data-mode="listen"]');
  const isListenActive = await modeListen?.evaluate((b) => b.classList.contains('active')) || false;
  if (isListenActive) pass('audio mode tabs default to Listen'); else fail('default mode tab not active');
  await exerciseCompare('audio');
  await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
  const compareUnmounted = await page.$('#previewHost .media-mode-panel[data-mode="compare"] .media-compare');
  if (!compareUnmounted) pass('audio Compare tears down when leaving mode'); else fail('audio Compare stayed mounted after leaving mode');
  await page.click('#previewHost .media-mode-tab[data-mode="tune"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="tune"]');
  const tunePanelSel = '#previewHost .media-mode-panel[data-mode="tune"]';
  const tuneIntents = await page.$$eval(`${tunePanelSel} .media-tune-intent-btn`, (els) => els.map((el) => ({ intent: el.dataset.intent, text: el.textContent.trim() })));
  if (tuneIntents.length >= 6) pass('audio tune: intent surface appears before raw controls');
  else fail('tune intent buttons: ' + tuneIntents.length);
  const tuneStatusInitial = await page.$eval(`${tunePanelSel} .media-tune-intent-status`, (el) => el.textContent.trim());
  if (tuneStatusInitial.length > 0) pass('audio tune: quick intent status visible'); else fail('tune intent status missing');
  const tuneLazyBase = await page.$$eval(`${tunePanelSel} .sp-wrap, ${tunePanelSel} .dyn-wrap`, (els) => els.length);
  if (tuneLazyBase === 0) pass('audio tune: raw .sp-wrap/.dyn-wrap not mounted until expanded');
  else fail('Tune should not mount raw controls immediately: ' + tuneLazyBase);

  const podcastBtn = await page.$(`${tunePanelSel} .media-tune-intent-btn[data-intent="podcast"]`);
  if (!podcastBtn) {
    fail('Tune podcast intent button not found');
  } else {
    await podcastBtn.click();
    const podcastActive = await page.$eval(
      `${tunePanelSel} .media-tune-intent-btn[data-intent="podcast"]`,
      (btn) => btn.matches('.media-tune-intent-btn--active') || btn.getAttribute('aria-pressed') === 'true',
    );
    if (podcastActive) pass('audio tune: quick intent click marks active intent');
    else fail('podcast intent not active');
    const statusAfterIntent = await page.$eval(`${tunePanelSel} .media-tune-intent-status`, (el) => el.textContent.trim());
    if (/Intent: Podcast/.test(statusAfterIntent)) pass('audio tune: quick intent updates visible status');
    else fail('intent status unchanged: ' + statusAfterIntent);
    const tuneLazyAfterIntent = await page.$$eval(`${tunePanelSel} .sp-wrap, ${tunePanelSel} .dyn-wrap`, (els) => els.length);
    if (tuneLazyAfterIntent === 0) pass('audio tune: quick intent does not eagerly mount raw panels');
    else fail('quick intent should not mount raw controls; found: ' + tuneLazyAfterIntent);
  }

  // Spectrum & EQ panel — toggle opens, 9-band EQ + canvas present; CPU-lazy (no RAF until play).
  const spBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('#previewHost .media-mode-panel[data-mode="tune"] .media-wv-toggle')]
      .find((b) => /Spectrum/.test(b.textContent)) || null);
  const spBtnExists = await spBtn.evaluate((e) => !!e);
  if (spBtnExists) {
    const spBtnText = await spBtn.evaluate((e) => e.textContent);
    if (/Spectrum/.test(spBtnText)) pass('audio spectrum: Spectrum & EQ toggle button present'); else fail('sp btn text: ' + spBtnText);
    await spBtn.asElement().click();
    await page.waitForSelector(`${tunePanelSel} .media-sp-panel:not([hidden])`, { timeout: 5000 });
    const spCanvas = await page.$(`${tunePanelSel} .sp-canvas`);
    const spSliders = await page.$$eval(`${tunePanelSel} .sp-eq-slider`, (els) => els.map((el) => parseFloat(el.value)));
    if (spCanvas) pass('audio spectrum: spectrum canvas mounted'); else fail('sp canvas missing');
    if (spSliders.length === 9) pass('audio spectrum: 9-band EQ sliders'); else fail('sp sliders: ' + spSliders.length);
    // Opening Spectrum after a quick intent should hydrate from graph state, not default zeros.
    const spState = await page.$eval(`${tunePanelSel} .media-sp-panel:not([hidden])`, (panel) => {
      const presetEl = panel.querySelector('.sp-preset-sel');
      const filterInputs = Array.from(panel.querySelectorAll('.sp-filter-slider')).map((el) => parseInt(el.value, 10));
      const eq = Array.from(panel.querySelectorAll('.sp-eq-slider')).map((el) => parseFloat(el.value));
      return { preset: presetEl ? presetEl.value : null, filters: filterInputs, eq };
    });
    const podcastPresetGains = [0, 0, 1, -1, 0, 1, 2, 1, 0];
    const podcastPresetMatch = spState.filters[0] === 80
      && spState.filters[1] === 18000
      && spState.eq.length === 9
      && spState.eq.every((g, i) => Math.abs(g - podcastPresetGains[i]) <= 0.0001);
    if (podcastPresetMatch) pass('audio spectrum: preset intent reflected in eq/filter controls');
    else fail('spectrum state after intent: ' + JSON.stringify(spState));
    // Overlaid dual spectrum: legend names both the Original and Processed curves.
    const spLegend = await page.$$eval(`${tunePanelSel} .sp-legend .sp-leg`, (els) => els.map((e) => e.textContent));
    if (spLegend.some((t) => /Original/.test(t)) && spLegend.some((t) => /Processed/.test(t)))
      pass('audio spectrum: overlaid original-vs-processed legend present');
    else fail('sp legend: ' + spLegend.join(','));
    const tuneStages = await page.$$eval(`${tunePanelSel} .sp-stage-compare .sp-stage-label`, (els) => els.map((e) => e.textContent));
    if (['Raw source', 'Tune/EQ', 'Dynamics', 'Master bus'].every((label) => tuneStages.includes(label)))
      pass('R1: Tune staged compare shows raw/tune/dynamics/master-bus labels');
    else fail('tune stages: ' + tuneStages.join(','));
    const tuneStageText = await page.$eval(`${tunePanelSel} .sp-stage-compare`, (e) => e.textContent).catch(() => '');
    if (/Processing chain/.test(tuneStageText)
      && /Active path: Raw source -> Tune\/EQ -> Dynamics -> Master bus/.test(tuneStageText)
      && /Always/.test(tuneStageText) && /Active/.test(tuneStageText) && /Bypassed/.test(tuneStageText)
      && /Quick intent and tonal EQ/.test(tuneStageText) && /Final export target/.test(tuneStageText))
      pass('R3: Tune staged compare explains path, active/bypassed state, and purpose');
    else fail('tune R3 stage text: ' + tuneStageText.slice(0, 260));
    // LUFS normalization: a target selector offers the streaming/broadcast presets.
    const normOpts = await page.$$eval(`${tunePanelSel} .sp-lufs-row option`, (els) => els.map((e) => e.textContent));
    if (normOpts.some((t) => /-14/.test(t)) && normOpts.some((t) => /-23/.test(t)) && normOpts.includes('Off'))
      pass('audio spectrum: LUFS normalize targets present (-14 … -23, Off)');
    else fail('lufs normalize opts: ' + normOpts.join(','));
    // Close the panel
    await spBtn.asElement().click();
    await page.waitForSelector(`${tunePanelSel} .media-sp-panel[hidden]`, { state: 'attached', timeout: 3000 });
    pass('audio spectrum: panel collapses');
  } else fail('spectrum & EQ toggle button not found');

  // ── P4 Dynamics panel ── compressor/limiter (live) + gate/de-noise (bake-only).
  // The Dynamics toggle sits between Spectrum and Mixer; CPU-lazy (no panel DOM until opened).
  const dynToggleHandle = await page.evaluateHandle(() =>
      [...document.querySelectorAll('#previewHost .media-mode-panel[data-mode="tune"] .media-wv-toggle')]
        .find((b) => /Dynamics/.test(b.textContent)) || null);
  const dynToggleExists = await dynToggleHandle.evaluate((e) => !!e);
  if (dynToggleExists) {
    pass('audio dynamics: Dynamics toggle button present');
    const preDyn = await page.$(`${tunePanelSel} .dyn-wrap`);
    if (!preDyn) pass('audio dynamics: CPU-lazy (no panel DOM until opened)'); else fail('dynamics mounted before open');
    await dynToggleHandle.asElement().click();
    await page.waitForSelector(`${tunePanelSel} .media-dyn-panel:not([hidden]) .dyn-wrap`, { timeout: 5000 });
    // Four effect sections: compressor + limiter (live), gate + de-noise (on export).
    const dynSecs = await page.$$eval(`${tunePanelSel} .dyn-sec .dyn-title`, (els) => els.map((e) => e.textContent));
    if (dynSecs.some((t) => /Compressor/.test(t)) && dynSecs.some((t) => /Limiter/.test(t))
      && dynSecs.some((t) => /gate/i.test(t)) && dynSecs.some((t) => /De-noise/.test(t)))
      pass('audio dynamics: compressor + limiter + gate + de-noise sections present');
    else fail('dyn sections: ' + dynSecs.join(','));
    const dynEnables = await page.$$( `${tunePanelSel} .dyn-enable`);
    const dynSliders = await page.$$( `${tunePanelSel} .dyn-slider`);
    if (dynEnables.length === 4) pass('audio dynamics: each section has an enable/bypass toggle'); else fail('dyn enables: ' + dynEnables.length);
    if (dynSliders.length >= 4) pass('audio dynamics: parameter sliders mounted (' + dynSliders.length + ')'); else fail('dyn sliders: ' + dynSliders.length);
    // Bake-only sections (gate + de-noise) are labelled "on export".
    const dynBadges = await page.$$eval(`${tunePanelSel} .dyn-badge`, (els) => els.map((e) => e.textContent));
    if (dynBadges.filter((t) => /on export/i.test(t)).length === 2) pass('audio dynamics: gate + de-noise labelled "on export"'); else fail('dyn badges: ' + dynBadges.join(','));
    // Enabling the live compressor must not throw (lazily allocates the node).
    await page.evaluate(() => {
      const cb = document.querySelector('#previewHost .dyn-sec .dyn-enable');
      cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
    pass('audio dynamics: enabling live compressor handled without error');
    // Close the panel → torn down.
    await dynToggleHandle.asElement().click();
    await page.waitForSelector(`${tunePanelSel} .media-dyn-panel[hidden]`, { state: 'attached', timeout: 3000 });
    pass('audio dynamics: panel collapses');
  } else fail('dynamics toggle button not found');

  await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
  await page.waitForFunction(() => {
    const tunePanel = document.querySelector('#previewHost .media-mode-panel[data-mode="tune"]');
    return tunePanel && tunePanel.hidden;
  }, null, { timeout: 3000 });
  const tuneNodes = await page.$$eval(
    `${tunePanelSel} .media-wv-wrap, ${tunePanelSel} .media-sp-panel, ${tunePanelSel} .media-dyn-panel, ${tunePanelSel} .sp-wrap, ${tunePanelSel} .dyn-wrap`,
    (els) => els.length,
  );
  if (tuneNodes === 0) pass('audio tune: switching away from Tune removes Spectrum/Dynamics panel DOM');
  else fail('tune panel nodes after leaving Tune: ' + tuneNodes);
  await page.click('#previewHost .media-mode-tab[data-mode="tune"]');
  await page.waitForSelector(`${tunePanelSel} .media-wv-wrap`, { state: 'attached', timeout: 6000 });
  await page.waitForSelector(`${tunePanelSel} .media-dyn-panel`, { state: 'attached', timeout: 6000 });
  await page.waitForSelector(`${tunePanelSel} .media-sp-panel`, { state: 'attached', timeout: 6000 });
  pass('audio tune: remounting Tune rebuilds Spectrum/Dynamics');
  await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
  await page.waitForFunction(() => {
    const tunePanel = document.querySelector('#previewHost .media-mode-panel[data-mode="tune"]');
    return tunePanel && tunePanel.hidden;
  }, null, { timeout: 3000 });

  // ── P5 Multi-track mixer ("swim lanes") ── opt-in panel; decode-lazy; OfflineAudioContext mixdown → WAV.
  const mixTab = await page.$('#previewHost .media-mode-tab[data-mode="mix"]');
  if (mixTab) {
    const mxTextMode = await mixTab.evaluate((e) => e.textContent);
    if (/Mix/i.test(mxTextMode)) pass('audio mixer: mix mode tab exists'); else fail('mix tab text: ' + mxTextMode);
    const preOpen = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap');
    if (!preOpen) pass('audio mixer: CPU-lazy (no transport/decode until opened)'); else fail('mixer mounted before open');
    await page.click('#previewHost .media-mode-tab[data-mode="mix"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', { timeout: 12000 });
    const mixBtnText = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-mix-btn', (e) => e.textContent).catch(() => '');
    if (/Mixdown/i.test(mixBtnText)) pass('audio mixer: mix mode mounts multi-track mixer'); else fail('mixer panel button text: ' + mixBtnText);
    const laneCount = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', (els) => els.length);
    if (laneCount === 0) pass('audio mixer: panel opens with no lane until async decode completes');
    else pass('audio mixer: panel mounts with lane(s) already loaded');
    const hasTransport = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-play')
      && await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-master-slider');
    if (hasTransport) pass('audio mixer: transport (play/stop) + master gain present'); else fail('mixer transport controls missing');
    const mixGrammar = await page.evaluate(() => ({
      hasRuler: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-ruler'),
      hasPlayhead: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-playhead'),
      hasContext: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-context'),
      hasLaneIdx: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane-index'),
      hasContextText: !!(document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-context')?.textContent || '').trim(),
    }));
    if (mixGrammar.hasRuler && mixGrammar.hasPlayhead && mixGrammar.hasContext && mixGrammar.hasLaneIdx && mixGrammar.hasContextText)
      pass('audio mixer: timeline grammar visible (ruler/playhead/context/index)');
    else fail('mixer timeline grammar: ' + JSON.stringify(mixGrammar));
    let laneCtrls = await page.evaluate(() => ({
      gain: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane-gain'),
      mute: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-mute'),
      solo: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-solo'),
      fadeIn: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-fade-in'),
      fadeOut: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-fade-out'),
    }));
    if (laneCtrls.gain && laneCtrls.mute && laneCtrls.solo && laneCtrls.fadeIn && laneCtrls.fadeOut)
      pass('audio mixer: per-lane gain/mute/solo + fade handles present');
    else fail('mixer lane controls: ' + JSON.stringify(laneCtrls));
    // Wait for the auto-decoded primary lane.
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', { timeout: 12000 });
    const lane1Count = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', (els) => els.length);
    if (lane1Count >= 1) pass('audio mixer: opens with the loaded clip as lane 1'); else fail('mixer lanes after open: ' + lane1Count);
    laneCtrls = await page.evaluate(() => ({
      gain: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane-gain'),
      mute: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-mute'),
      solo: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-solo'),
      fadeIn: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-fade-in'),
      fadeOut: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-fade-out'),
    }));
    if (laneCtrls.gain && laneCtrls.mute && laneCtrls.solo && laneCtrls.fadeIn && laneCtrls.fadeOut)
      pass('audio mixer: per-lane gain/mute/solo + fade handles present');
    else fail('mixer lane controls after open: ' + JSON.stringify(laneCtrls));
    // Add a generator lane → a second lane appears (≥2 clips).
    await page.click('#previewHost .media-mode-panel[data-mode="mix"] .mx-add-btn');   // first add button = +440 Hz tone
    await page.waitForFunction(() => document.querySelectorAll('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane').length >= 2, null, { timeout: 6000 });
    const lane2Count = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', (els) => els.length);
    if (lane2Count >= 2) pass('audio mixer: a second lane can be added (generator tone)'); else fail('mixer lanes after add: ' + lane2Count);
    // Mixdown → WAV produces a downloadable file (OfflineAudioContext render → WAV worker/header).
    const mixBtn = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-mix-btn');   // first mix button = Mixdown → WAV
    await assertMixViewport(ctx, 'desktop');
    const [wavDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      mixBtn.click(),
    ]);
    const wavName = wavDownload.suggestedFilename();
    if (/\.wav$/.test(wavName)) pass('audio mixer: mixdown → WAV downloaded (' + wavName + ')'); else fail('mixer WAV download name: ' + wavName);
    const audioMixDesktopViewport = page.viewportSize();
    await reloadExampleAtViewport(ctx, MEDIA_MOBILE_VIEWPORT, 'Sample.wav', '#previewHost audio.media-view');
    await page.click('#previewHost .media-mode-tab[data-mode="mix"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', { timeout: 12000 });
    await assertMixViewport(ctx, 'mobile');
    if (audioMixDesktopViewport) {
      await reloadExampleAtViewport(ctx, audioMixDesktopViewport, 'Sample.wav', '#previewHost audio.media-view');
    }
    await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
    const mixDetached = await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', {
      state: 'detached',
      timeout: 4000,
    }).then(() => true).catch(() => false);
    if (mixDetached) pass('audio mixer: switching to Listen detaches the mix markup');
    else fail('audio mix panel still mounted after switching to Listen');

    const mixAcAfterClose = await page.evaluate(async () => {
      const { getMixerACState } = await import('./types/media/mixer-engine.js');
      return getMixerACState();
    });
    if (!mixAcAfterClose.hasContext || mixAcAfterClose.state === 'closed') {
      pass('audio mixer: leaving mix mode releases shared mixer AudioContext');
    } else {
      fail('audio mixer AC not released after leaving mix mode: ' + JSON.stringify(mixAcAfterClose));
    }
  } else fail('mixer tab not found');

  // Folder playlist: load a 2-track folder via the seam → prev/next + position + shuffle appear.
  await page.evaluate(async () => {
    const r = await fetch('examples/sample.wav');
    const buf = await r.arrayBuffer();
    const mk = (n) => new File([buf], n, { type: 'audio/wav' });
    await window.__fv.loadFolder([
      { file: mk('01-intro.wav'), path: 'album/01-intro.wav' },
      { file: mk('02-outro.wav'), path: 'album/02-outro.wav' },
    ]);
  });
  await page.waitForSelector('#previewHost .media-playlist', { timeout: 12000 });
  const trackPos = await page.$eval('#previewHost .media-track-pos', (e) => e.textContent);
  if (/1\s*\/\s*2/.test(trackPos)) pass('audio folder playlist: track position (' + trackPos.trim() + ')'); else fail('playlist pos: ' + trackPos);
  const hasShuffle = await page.$('#previewHost .media-shuffle input');
  if (hasShuffle) pass('audio folder playlist: prev/next + shuffle controls'); else fail('no shuffle toggle in playlist');
  // Album track list: a row per track, the current one highlighted, click-to-play another.
  const trackLabels = await page.$$eval('#previewHost .media-tracklist .media-track-label', (els) => els.map((e) => e.textContent));
  if (trackLabels.length === 2 && trackLabels.some((t) => /intro/.test(t))) pass('audio album: track list shows every track (' + trackLabels.length + ')'); else fail('track list: ' + trackLabels.join(','));
  const curIdx = await page.$$eval('#previewHost .media-track', (els) => els.findIndex((e) => e.classList.contains('current')));
  if (curIdx === 0) pass('audio album: current track highlighted'); else fail('current track idx: ' + curIdx);
  // Click the 2nd track → it becomes the current track (app re-renders for the new file).
  await page.click('#previewHost .media-tracklist .media-track:nth-child(2)');
  await page.waitForFunction(() => /2\s*\/\s*2/.test(document.querySelector('#previewHost .media-track-pos')?.textContent || ''), null, { timeout: 8000 });
  pass('audio album: clicking a track plays it (now 2 / 2)');
  // iOS install exception: the Add-to-Home-Screen hint must NOT appear on desktop (no-install default).
  const iosHintDesktop = await page.$eval('#iosAudioHint', (e) => e.hidden);
  if (iosHintDesktop) pass('iOS audio hint NOT shown on desktop (no-install default holds)'); else fail('iOS hint showed on desktop');
  const appleMeta = await page.$('meta[name="apple-mobile-web-app-capable"]');
  const manifestDisplay = await page.evaluate(async () => (await (await fetch('manifest.json')).json()).display);
  if (appleMeta && manifestDisplay === 'browser') pass('iOS standalone meta present; manifest stays browser-mode'); else fail('install metadata: apple=' + !!appleMeta + ' display=' + manifestDisplay);

  // ── iOS background-audio exception ── on an iPhone UA, opening audio surfaces the opt-in hint.
  {
    const ictx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      hasTouch: true, isMobile: true,
    });
    const ip = await ictx.newPage();
    await ip.goto(origin, { waitUntil: 'load' });
    await openExample('Sample.wav', ip);
    await ip.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
    const shown = await ip.waitForSelector('#iosAudioHint:not([hidden])', { timeout: 8000 }).catch(() => null);
    const hintText = shown ? await ip.$eval('#iosAudioHint', (e) => e.textContent) : '';
    if (shown && /Add to Home Screen/i.test(hintText)) pass('iOS: background-audio Add-to-Home-Screen hint shown for audio'); else fail('iOS hint missing/wrong: ' + hintText.slice(0, 60));
    await ip.click('#iosAudioHint .ios-hint-never');
    const hiddenAfter = await ip.$eval('#iosAudioHint', (e) => e.hidden);
    if (hiddenAfter) pass('iOS: hint permanently dismissible'); else fail('iOS hint not dismissed');
    await ictx.close();
  }
  // No iframe for media — it renders directly in the pane (outside the sandbox).
  const mediaIframe = await page.$('#previewHost iframe.fv-preview-frame');
  if (!mediaIframe) pass('media renders outside the sandboxed iframe'); else fail('media used an iframe');
  const mediaHasEditor = await page.$('#editor .monaco-editor');
  if (!mediaHasEditor) pass('media is preview-only (no raw editor)'); else fail('raw editor present for media');

  // ── ffmpeg.wasm transcoding opt-in ── opening a format that likely needs transcoding (AVI)
  // with enableFfmpeg OFF shows a hint panel pointing to Advanced settings.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.avi');
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  const aviType = await page.$eval('#typeSelect', (s) => s.value);
  if (aviType === 'media') pass('AVI detected as media type'); else fail('AVI type: ' + aviType);
  // Hint panel must be visible with the "Settings → Advanced" message (enableFfmpeg is off).
  const txPanel = await page.$('#previewHost .media-tx-panel');
  if (txPanel) pass('transcoding panel present for AVI'); else fail('no transcoding panel for AVI');
  const txText = txPanel ? await page.$eval('#previewHost .media-tx-panel .media-tx-msg', (e) => e.textContent) : '';
  if (/Advanced/i.test(txText)) pass('transcoding hint points to Advanced settings'); else fail('transcoding msg: ' + txText.slice(0, 80));

  // Export mode is explicit even when transcoding is disabled: it should show a clear
  // hint (not an empty surface).
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  await page.click('#previewHost .media-mode-tab[data-mode="export"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="export"]:not([hidden])', { timeout: 8000 });
  const exportHint = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-ed-note', (el) => el.textContent).catch(() => '');
  if (/Settings → Advanced/i.test(exportHint) && /media transcoding/i.test(exportHint)) pass('audio export mode shows clear disabled/ffmpeg-off hint'); else fail('audio export hint: ' + exportHint.slice(0, 120));

  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
  await page.evaluate(() => window.__fv.openExampleByLabel('Sample.avi'));
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });

  // ── Video task-mode shell + default mode ──
  const videoModeNames = await page.$$eval('#previewHost .media-mode-tab', (els) => els.map((e) => e.textContent.trim()));
  if (videoModeNames.join('|') === 'Watch|Adjust|Timeline|Subtitles|Export|Compare') pass('video shell has ordered task tabs: Watch/Adjust/Timeline/Subtitles/Export/Compare');
  else fail('video tabs order: ' + videoModeNames.join('|'));
  const videoWatchActive = await page.$eval('#previewHost .media-mode-tab[data-mode="watch"]', (el) => el.classList.contains('active'))
    .catch(() => false);
  if (videoWatchActive) pass('video default mode is Watch'); else fail('video default mode tab is not Watch');

  await assertVideoTopViewport(ctx, 'desktop');
  const videoDesktopViewport = page.viewportSize();
  await reloadExampleAtViewport(ctx, MEDIA_MOBILE_VIEWPORT, 'Sample.avi', '#previewHost video.media-view');
  await assertVideoTopViewport(ctx, 'mobile');
  if (videoDesktopViewport) {
    await reloadExampleAtViewport(ctx, videoDesktopViewport, 'Sample.avi', '#previewHost video.media-view');
  }
  await exerciseCompare('video');
  const videoCompareGrammar = await page.$eval('#previewHost .media-mode-panel[data-mode="compare"] .media-compare-copy', (el) => el.textContent);
  if (/shifted|Overlap|Missing\/extra/.test(videoCompareGrammar)) pass('video Compare has equivalent overlay/offset grammar');
  else fail('video compare grammar copy: ' + videoCompareGrammar);
  await page.click('#previewHost .media-mode-tab[data-mode="watch"]');
  const videoCompareUnmounted = await page.$('#previewHost .media-mode-panel[data-mode="compare"] .media-compare');
  if (!videoCompareUnmounted) pass('video Compare tears down when leaving mode'); else fail('video Compare stayed mounted after leaving mode');

  // ── Video studio ── Adjust now uses an intent-first look card plus raw advanced
  // sliders, and a dedicated movie-audio Spectrum & EQ sub-surface.
  await page.click('#previewHost .media-mode-tab[data-mode="adjust"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="adjust"]:not([hidden])', { timeout: 5000 });
  const adjustSel = '#previewHost .media-mode-panel[data-mode="adjust"]';

  const vidLookPanel = await page.$(`${adjustSel} .media-video-filters .media-tune-intent-card`);
  if (vidLookPanel) pass('video studio: quick look surface present in Adjust'); else fail('video look card missing');
  const vidLookBtns = await page.$$eval(
    `${adjustSel} .media-video-filters .media-tune-intent-btn`,
    (els) => els.map((el) => ({ id: el.dataset.intent, text: el.textContent.trim() })),
  );
  if (vidLookBtns.length >= 5) pass('video studio: quick intent presets surface present');
  else fail('video look presets: ' + JSON.stringify(vidLookBtns));

  const vidFilterSliders = await page.$$eval(
    `${adjustSel} .media-filter-panel .media-filter-row input[type="range"]`,
    (els) => els.map((e) => e.dataset.filter),
  );
  if (['brightness', 'contrast', 'saturate', 'hue', 'blur', 'grayscale', 'invert'].every((f) => vidFilterSliders.includes(f)))
    pass('video studio: advanced raw sliders still present (incl. hue/blur/grayscale)');
  else fail('video filters: ' + vidFilterSliders.join(','));

  // Quick preset should change style and mark active status.
  let intentButton = await page.$(`${adjustSel} .media-tune-intent-btn[data-intent="cinema"]`);
  if (!intentButton) {
    intentButton = await page.$(`${adjustSel} .media-tune-intent-btn[data-intent]:not([data-intent="neutral"]):not([data-intent="custom"])`);
  }
  if (!intentButton) fail('video preset: cinema button not found');
  else {
    const intent = await intentButton.evaluate((el) => ({
      id: el.dataset.intent,
      label: el.textContent?.trim(),
    }));
    const activeSelector = `${adjustSel} .media-tune-intent-btn[data-intent="${intent.id}"]`;
    await intentButton.click();
    const vidFilter = await page.$eval('#previewHost video.media-view', (video) => video.style.filter);
    const presetActive = await page.$eval(activeSelector, (btn) =>
      btn.classList.contains('media-tune-intent-btn--active') || btn.getAttribute('aria-pressed') === 'true',
    );
    const presetStatus = await page.$eval(`${adjustSel} .media-tune-intent-status`, (el) => el.textContent);
    if (vidFilter && presetActive && presetStatus.includes(intent.label)) pass('video studio: quick preset applies filters and marks active/status');
    else fail('video preset failed: filter=' + vidFilter + ' active=' + presetActive + ' status=' + presetStatus);

    const resetBtn = await page.$(`${adjustSel} .media-video-filters > .media-filter-reset`);
    if (!resetBtn) fail('video preset reset button missing');
    else {
      await resetBtn.click();
      const resetFilter = await page.$eval('#previewHost video.media-view', (video) => video.style.filter);
      if (resetFilter === '') pass('video studio: reset clears filter');
      else fail('video reset failed: filter=' + resetFilter);
    }
  }

  // Audio sub-surface should be clearer and still CPU-lazy.
  const audioSubsurface = await page.$(`${adjustSel} .media-video-audio-wrap .media-tune-intent-card`);
  if (audioSubsurface) pass('video studio: movie-audio sub-surface exists'); else fail('video audio sub-surface missing');
  const mixerBtn = await page.$(`${adjustSel} .media-vid-mixer .media-wv-toggle`);
  if (mixerBtn) {
    const mixerText = await mixerBtn.evaluate((e) => e.textContent);
    if (/Spectrum/.test(mixerText)) pass('video studio: Spectrum & EQ toggle present'); else fail('mixer btn: ' + mixerText);
    const preMounted = await page.$(`${adjustSel} .media-vid-mixer .media-sp-panel:not([hidden])`);
    if (!preMounted) pass('video studio: movie audio Spectrum & EQ lazy mount'); else fail('mixer pre-mounted before open');
    await mixerBtn.click();
    await page.waitForSelector(`${adjustSel} .media-vid-mixer .media-sp-panel:not([hidden])`, { timeout: 5000 });
    const mixerSliders = await page.$$(`${adjustSel} .media-vid-mixer .sp-eq-slider`);
    const mixerLegend = await page.$(`${adjustSel} .media-vid-mixer .sp-legend`);
    if (mixerSliders.length === 9) pass('video studio: mixer mounts 9-band EQ on movie audio'); else fail('mixer sliders: ' + mixerSliders.length);
    if (mixerLegend) pass('video studio: Spectrum & EQ legend present'); else fail('mixer legend missing');
  } else fail('video studio: audio mixer toggle not found');

  // ── P7 Tier-1 video quick wins ── speed presets + frame-step + (gated) PiP + subtitle drop.
  const vidSpeeds = await page.$$eval('#previewHost .media-extras .media-speed-btn', (els) => els.map((e) => e.dataset.rate));
  if (['0.5', '1', '2'].every((r) => vidSpeeds.includes(r))) pass('P7 video: speed presets present'); else fail('video speeds: ' + vidSpeeds.join(','));
  const frameBtns = await page.evaluate(() => ({
    back: !!document.querySelector('#previewHost .media-frame-back'),
    fwd: !!document.querySelector('#previewHost .media-frame-fwd'),
  }));
  if (frameBtns.back && frameBtns.fwd) pass('P7 video: ±1 frame-step buttons present'); else fail('frame-step buttons: ' + JSON.stringify(frameBtns));
  // PiP button only when the browser advertises support — assert it tracks the feature flag.
  const pipState = await page.evaluate(() => ({
    enabled: !!document.pictureInPictureEnabled,
    btn: !!document.querySelector('#previewHost .media-pip-btn'),
  }));
  if (pipState.btn === pipState.enabled) pass('P7 video: PiP button feature-gated (present iff supported)'); else fail('pip gate mismatch: ' + JSON.stringify(pipState));
  // Subtitle sidecar loader mounts; loading an SRT through it adds timed overlay cues.
  await page.click('#previewHost .media-mode-tab[data-mode="subtitles"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="subtitles"]:not([hidden])', { timeout: 5000 });
  const subLoader = await page.$('#previewHost .media-mode-panel[data-mode="subtitles"] .media-sub-loader');
  if (subLoader) pass('P7 video: subtitle (.srt/.vtt) drop/browse control mounts'); else fail('subtitle loader missing');
  const srt = '1\n00:00:00,000 --> 00:00:02,000\nHello world\n\n2\n00:00:02,500 --> 00:00:04,000\nSecond line';
  const subLoaded = await page.evaluate(async (text) => {
    const file = new File([text], 'cap.srt', { type: 'application/x-subrip' });
    const input = document.querySelector('#previewHost .media-mode-panel[data-mode="subtitles"] .media-sub-loader input[type=file]');
    const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    return document.querySelector('#previewHost .media-mode-panel[data-mode="subtitles"] .media-sub-note')?.textContent || '';
  }, srt);
  if (/2 cues/.test(subLoaded)) pass('P7 video: SRT sidecar parses to 2 cues + mounts overlay'); else fail('subtitle load note: ' + subLoaded);

  // Switch back to Watch after Subtitle mode assertions.
  await page.click('#previewHost .media-mode-tab[data-mode="watch"]');

  // PURE SRT/VTT parser unit check (no DOM) — 2-cue SRT → correct timings + text.
  const parsed = await page.evaluate(async () => {
    const { parseSubtitles, parseTimestamp } = await import('./types/media/subtitles.js');
    const cues = parseSubtitles('1\n00:00:01,000 --> 00:00:03,500\nLine A\n\n2\n00:00:04,000 --> 00:00:06,000\nLine B\nwith wrap');
    return { n: cues.length, c0: cues[0], c1: cues[1], ts: parseTimestamp('00:01:02.250') };
  });
  if (parsed.n === 2 && parsed.c0.start === 1 && parsed.c0.end === 3.5 && parsed.c0.text === 'Line A'
    && parsed.c1.start === 4 && parsed.c1.text === 'Line B\nwith wrap' && parsed.ts === 62.25)
    pass('P7: SRT parser yields correct cue timings + text (pure)');
  else fail('srt parse: ' + JSON.stringify(parsed));

  // ── P1/P3: Export processed audio + baked fades (ffmpeg ON) ──────────────────
  // Enable ffmpeg via the global settings bag so the renderer builds the export panel.
  // (We do NOT actually run ffmpeg.wasm here — that's a 23 MB heavy load; we assert the
  // UI is present + wired, and verify the ffmpeg filter chain via the pure builder.)
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
  await enableFfmpegForMedia(page);
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
  await page.evaluate(() => window.__fv.openExampleByLabel('Sample.wav'));
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  await page.waitForFunction(() => {
    const d = document.querySelector('#previewHost audio.media-view')?.duration;
    return Number.isFinite(d) && d > 0;
  }, null, { timeout: 8000 });
  await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
  const trimReadyEl = await page.waitForSelector('#previewHost .media-ed-op[data-op="trim"]', { timeout: 8000 });
  if (trimReadyEl) pass('P6: audio editor Trim button exists when ffmpeg is on');
  else fail('audio editor trim button missing with ffmpeg on');

  // Waveform drag selection pre-fills existing Trim HH:MM:SS inputs.
  const waveRect = await page.$eval('#previewHost .media-waveform-surface canvas.media-wv-canvas', (canvas) => {
    const r = canvas.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const trimStartX = waveRect.x + waveRect.w * 0.2;
  const trimEndX = waveRect.x + waveRect.w * 0.6;
  const trimY = waveRect.y + waveRect.h * 0.5;
  await page.mouse.move(trimStartX, trimY);
  await page.mouse.down();
  await page.mouse.move(trimEndX, trimY);
  await page.mouse.up();
  const trimFilled = await page.waitForFunction(() => {
    const trimBtn = document.querySelector('#previewHost .media-ed-op[data-op="trim"]');
    if (!trimBtn || !trimBtn.classList.contains('active')) return false;
    const ctx = document.querySelector('#previewHost .media-ed-ctx[data-op="trim"]');
    if (!ctx) return false;
    const inputs = ctx.querySelectorAll('input[type="text"]');
    if (inputs.length < 2) return false;
    const start = inputs[0].value.trim();
    const end = inputs[1].value.trim();
    return /^\d{2}:\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}:\d{2}$/.test(end) && start !== end;
  }, null, { timeout: 5000 }).catch(() => null);
  if (trimFilled) pass('audio waveform selection wires to existing Trim op and pre-fills values');
  else fail('audio waveform selection did not prefill trim inputs');
  const trimValues = await page.$eval('#previewHost .media-ed-ctx[data-op="trim"]', (ctx) => {
    const inputs = ctx.querySelectorAll('input[type="text"]');
    return {
      start: inputs[0]?.value?.trim() || '',
      end: inputs[1]?.value?.trim() || '',
    };
  });
  const trimStartSec = hhmmssToSeconds(trimValues.start);
  const trimEndSec = hhmmssToSeconds(trimValues.end);
  if (trimStartSec !== null && trimEndSec !== null && trimEndSec > trimStartSec) pass('audio Trim prefill: start/end HH:MM:SS values present and ordered');
  else fail('audio Trim prefill values invalid: ' + JSON.stringify(trimValues));

  await page.click('#previewHost .media-mode-tab[data-mode="export"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel', { timeout: 8000 });

  const exportPanel = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel');
  if (exportPanel) pass('P1: export panel present when ffmpeg enabled'); else fail('export panel missing with ffmpeg on');
  const exportHeader = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-ed-header', (e) => e.textContent) : '';
  if (/Export processed audio/i.test(exportHeader)) pass('P1: "Export processed audio" header present'); else fail('export header: ' + exportHeader);
  const exportStatus = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-export-head-status', (e) => e.textContent) : '';
  if (/Profile: Podcast MP3/i.test(exportStatus)) pass('P1: export profile status initialized to Podcast'); else fail('export status: ' + exportStatus);
  const presetCards = await page.$$eval(
    '#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-export-preset-card',
    (els) => els.map((e) => ({
      preset: e.dataset.preset || '',
      title: e.querySelector('.media-export-preset-title')?.textContent || '',
      detail: e.querySelector('.media-export-preset-detail')?.textContent || '',
      active: e.getAttribute('aria-pressed') === 'true',
    })),
  );
  const presetHasCards = presetCards.length >= 4
    && presetCards.some((c) => c.preset === 'podcast-mp3')
    && presetCards.some((c) => c.preset === 'podcast-cleanup-mp3')
    && presetCards.some((c) => c.preset === 'acx-mp3')
    && presetCards.some((c) => c.preset === 'custom')
    && presetCards.some((c) => /Podcast/i.test(c.title))
    && presetCards.some((c) => /Cleanup/i.test(c.title))
    && presetCards.some((c) => /ACX/i.test(c.title))
    && presetCards.some((c) => /custom/i.test(c.title));
  if (presetHasCards) pass('P1: visible export preset cards show Podcast/Cleanup/ACX/Custom affordances'); else fail('export cards: ' + JSON.stringify(presetCards));
  const presetCardOrder = presetCards.map((c) => c.preset).join(',');
  if (/^podcast-mp3,podcast-cleanup-mp3,acx-mp3,custom/.test(presetCardOrder)) pass('P1: export preset cards keep intent presets before Custom');
  else fail('export card order: ' + presetCardOrder);
  const defaultCard = presetCards.find((c) => c.preset === 'podcast-mp3');
  if (defaultCard?.active) pass('P1: default export card state is Podcast');
  else fail('export default card active state: ' + JSON.stringify(defaultCard));

  const exportRunText = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-run', (e) => e.textContent) : '';
  if (/Export processed audio/i.test(exportRunText)) pass('P1: export button labelled'); else fail('export run btn: ' + exportRunText);
  const chapterZip = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-chapter-card', (card) => {
    const btn = card.querySelector('.media-export-chapter-run');
    const status = card.querySelector('.media-export-chapter-status');
    return {
      hidden: card.hidden,
      text: btn?.textContent || '',
      disabled: !!btn?.disabled,
      status: status?.textContent || '',
    };
  }).catch(() => null);
  if (chapterZip && !chapterZip.hidden && /Chapter ACX ZIP/i.test(chapterZip.text) && !chapterZip.disabled && /mono 44\.1 kHz MP3 192k CBR/i.test(chapterZip.status))
    pass('R2: export panel shows enabled Chapter ACX ZIP action when chapters exist');
  else fail('chapter zip action: ' + JSON.stringify(chapterZip));
  const exportSummary = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent) : '';
  if (/live chain =/.test(exportSummary) && /Output =/.test(exportSummary) && /Provenance = -af "/.test(exportSummary)) pass('P1: provenance-style export summary rendered'); else fail('export summary: ' + exportSummary.slice(0, 120));
  const exportStages = await page.$$eval(
    '#previewHost .media-mode-panel[data-mode="export"] .media-export-stage-compare .sp-stage-label',
    (els) => els.map((e) => e.textContent),
  );
  if (['Raw source', 'Tune/EQ', 'Dynamics', 'Master bus'].every((label) => exportStages.includes(label)))
    pass('R1: Export staged compare shows raw/tune/dynamics/master-bus labels');
  else fail('export stages: ' + exportStages.join(','));
  const exportStageText = await page.$eval(
    '#previewHost .media-mode-panel[data-mode="export"] .media-export-stage-compare',
    (e) => e.textContent,
  ).catch(() => '');
  if (/Processing chain/.test(exportStageText)
    && /Active path: Raw source -> Tune\/EQ -> Dynamics -> Master bus/.test(exportStageText)
    && /Always/.test(exportStageText) && /Active/.test(exportStageText) && /Bypassed/.test(exportStageText) && /Export/.test(exportStageText)
    && /Quick intent and tonal EQ/.test(exportStageText) && /Level control and cleanup/.test(exportStageText) && /Final export target/.test(exportStageText))
    pass('R3: Export staged compare explains path, active/bypassed/export state, and purpose');
  else fail('export R3 stage text: ' + exportStageText.slice(0, 260));
  const exportFmts = await page.$$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-fmt option', (els) => els.map((e) => e.value));
  if (['source', 'mp3', 'wav', 'm4a', 'ogg'].every((f) => exportFmts.includes(f))) pass('P1: export format options (source/mp3/wav/m4a/ogg)'); else fail('export fmts: ' + exportFmts.join(','));
  const fadeInPresent = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-ed-fade-in');
  const fadeOutPresent = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-ed-fade-out');
  if (fadeInPresent && fadeOutPresent) pass('P3: audio fade-in / fade-out controls present'); else fail('fade controls: in=' + !!fadeInPresent + ' out=' + !!fadeOutPresent);
  // P6 WIRED: the audio cross-clip line now points at the (built) Multi-track mixer
  // rather than the old "needs timeline — coming" stub.
  const stubText = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-stub', (e) => e.textContent).catch(() => '');
  if (/Crossfade.*mixer/i.test(stubText)) pass('P6: audio crossfade points to the multi-track mixer (wired)'); else fail('crossfade stub: ' + stubText.slice(0, 80));
  // The live-EQ summary updates with the fade duration (proves settings are read live).
  await page.fill('#previewHost .media-mode-panel[data-mode="export"] .media-ed-fade-in', '2');
  await page.evaluate(() => document.querySelector('#previewHost .media-mode-panel[data-mode="export"] .media-ed-fade-in').dispatchEvent(new Event('input', { bubbles: true })));
  const fadeSummaryText = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/fade-in 2s/.test(fadeSummaryText) && /Output =/.test(fadeSummaryText)) pass('P1: live export summary reflects fade-in setting'); else fail('export summary: ' + fadeSummaryText.slice(0, 120));

  // ── P2: export presets + advanced overrides ────────────────────────────────
  // The flat format picker is now a preset <select> (Podcast / ACX / Custom …).
  const presetSel = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset');
  if (presetSel) pass('P2: export preset selector present'); else fail('export preset selector missing');
  const presetOpts = await page.$$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset option', (els) => els.map((e) => e.value));
  if (['custom', 'podcast-mp3', 'podcast-cleanup-mp3', 'acx-mp3'].every((v) => presetOpts.includes(v))) pass('P2: presets include Podcast + Cleanup + Audiobook(ACX) + Custom'); else fail('preset opts: ' + presetOpts.join(','));
  // Advanced overrides hidden until "Custom"; default preset is Podcast.
  const advHiddenDefault = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-adv', (e) => e.hidden).catch(() => null);
  if (advHiddenDefault === true) pass('P2: advanced overrides hidden under a concrete preset'); else fail('adv hidden default: ' + advHiddenDefault);
  // Switch to Audiobook (ACX): summary must reflect mono / 192k CBR / −20 LUFS.
  await page.selectOption('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset', 'acx-mp3');
  const acxSummary = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  const acxStage = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-stage-compare', (e) => e.textContent).catch(() => '');
  if (/Profile Audiobook ACX MP3/.test(acxSummary) && /mono/.test(acxSummary)
    && /192k CBR/.test(acxSummary) && /loudnorm target -20 LUFS/.test(acxSummary) && /loudnorm TP target -3 dBTP/.test(acxSummary))
    pass('P2: ACX preset summary shows mono, 192k CBR, loudnorm -20 LUFS, TP target -3');
  else fail('acx summary: ' + acxSummary.slice(0, 180));
  if (/Master bus/.test(acxStage) && /ACX chain/.test(acxStage) && /loudnorm -20 LUFS/.test(acxStage))
    pass('R1: Export master-bus stage reflects ACX chain');
  else fail('acx stage: ' + acxStage.slice(0, 220));
  await page.click('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset-card[data-preset="podcast-mp3"]');
  const podcastSummary = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/Profile Podcast MP3/.test(podcastSummary) && /loudnorm target -16 LUFS/.test(podcastSummary) && /192k/.test(podcastSummary) && /loudnorm TP target -1\.5 dBTP/.test(podcastSummary))
    pass('P2: Podcast preset summary reflects -16 LUFS / 192k / 44.1 kHz / TP target -1.5');
  else fail('podcast summary: ' + podcastSummary.slice(0, 180));
  await page.click('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset-card[data-preset="podcast-cleanup-mp3"]');
  const cleanupSummary = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  const cleanupStage = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-stage-compare', (e) => e.textContent).catch(() => '');
  if (/Profile Podcast Cleanup MP3/.test(cleanupSummary) && /export cleanup chain/.test(cleanupSummary)
    && /sample rate match source/.test(cleanupSummary) && /channels match source/.test(cleanupSummary)
    && /afftdn/.test(cleanupSummary) && /dynaudnorm/.test(cleanupSummary))
    pass('P2: Cleanup preset summary shows source-preserving cleanup chain');
  else fail('cleanup summary: ' + cleanupSummary.slice(0, 220));
  if (/Master bus/.test(cleanupStage) && /Cleanup chain/.test(cleanupStage) && /sample rate matches source/.test(cleanupStage) && /channels match source/.test(cleanupStage))
    pass('R1: Export master-bus stage reflects Cleanup source-preserving chain');
  else fail('cleanup stage: ' + cleanupStage.slice(0, 220));
  // Switching to Custom reveals the override fields (container/bitrate/sr/channels/loudness).
  await page.selectOption('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset', 'custom');
  const advShown = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-adv', (e) => e.hidden).catch(() => null);
  const hasContainer = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-container');
  const hasBitrate = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-bitrate');
  const hasLufs = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-lufs');
  const customNote = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-adv-note', (e) => e.textContent).catch(() => '');
  const customStage = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-stage-compare', (e) => e.textContent).catch(() => '');
  if (advShown === false && hasContainer && hasBitrate && hasLufs && /manual container|manual sample/.test((customNote || '').toLowerCase()))
    pass('P2: Custom reveals manual path controls with explicit guidance');
  else fail('custom adv: shown=' + advShown + ' c=' + !!hasContainer + ' b=' + !!hasBitrate + ' l=' + !!hasLufs + ' note=' + customNote);
  if (!/TP -1\.5 dBTP/.test(customStage)) pass('R1: Custom loudness-off stage does not show phantom TP target');
  else fail('custom stage should not show TP with loudness off: ' + customStage.slice(0, 220));
  await page.click('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset-card[data-preset="acx-mp3"]');
  const acxCardSummary = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/Profile Audiobook ACX MP3/.test(acxCardSummary) && /Output =/.test(acxCardSummary))
    pass('P2: ACX card path reselect keeps summary visible');
  else fail('acx card select: ' + acxCardSummary.slice(0, 120));
  // Verify the PURE preset/codec layer (no ffmpeg load): ACX → mono CBR mp3 args.
  const presetParams = await page.evaluate(async () => {
    const { presetById, resolveExportParams, audioEncodeArgs: enc } = {
      ...(await import('./types/media/export-presets.js')),
      audioEncodeArgs: (await import('./types/media/transcoder.js')).audioEncodeArgs,
    };
    const p = resolveExportParams(presetById('acx-mp3'), {}, 'mp3');
    const e = enc(p.container, { bitrate: p.bitrate, cbr: p.cbr });
    return { channels: p.channels, sampleRate: p.sampleRate, lufs: p.lufsTarget, encArgs: e.args.join(' ') };
  });
  if (presetParams.channels === 1 && presetParams.sampleRate === 44100 && presetParams.lufs === -20 && /libmp3lame -b:a 192k/.test(presetParams.encArgs)) pass('P2: ACX resolves to mono/44.1k/-20 LUFS + CBR 192k mp3 args'); else fail('acx params: ' + JSON.stringify(presetParams));
  // Restore the Podcast preset so the rest of the area sees a stable state.
  await page.selectOption('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset', 'podcast-mp3');

  // ── P8: Audiobook QC (ACX) — pass/fail report card + one-click ACX export ─────
  // QC now lives in a dedicated mode tab. CPU-lazy: no decode / ffmpeg until Run is clicked.
  const qcTab = await page.$('#previewHost .media-mode-tab[data-mode="qc"]');
  if (qcTab) {
    pass('P8: Audiobook QC (ACX) mode tab present');
    const qcPanelSel = '#previewHost .media-mode-panel[data-mode="qc"]';
    const preQc = await page.$(qcPanelSel + ' .media-qc-run');
    if (!preQc) pass('P8: QC panel CPU-lazy (no decode/ffmpeg until opened)'); else fail('QC panel mounted before open');
    await page.click('#previewHost .media-mode-tab[data-mode="qc"]');
    await page.waitForSelector(qcPanelSel + ' .media-qc-run', { timeout: 6000 });
    const noIntro = await page.$eval(qcPanelSel, (el) => !el.querySelector('.media-ed-note'));
    if (noIntro) pass('P8b: QC shell renders as a report card instead of prose-heavy intro text'); else fail('qc intro paragraph still present');
    const checklist = await page.$$eval(qcPanelSel + ' .media-qc-checklist-item .media-qc-checklist-label',
      (els) => els.map((e) => e.textContent.trim().toLowerCase()));
    if (['rms', 'integrated lufs', 'sample peak', 'estimated true peak', 'noise floor', 'sample rate', 'channels', 'head silence', 'tail silence']
      .every((n) => checklist.includes(n))) pass('P8b: QC pre-run shows the full 9-item check checklist');
    else fail('qc checklist labels: ' + checklist.join(','));
    const qcActions = await page.$eval(qcPanelSel, (el) => {
      const run = el.querySelector('.media-qc-run');
      const exp = el.querySelector('.media-qc-export');
      const actions = el.querySelector('.media-ed-actions.media-qc-actions');
      const actionText = actions ? getComputedStyle(actions).display !== 'none' : false;
      const runVisible = run ? run.offsetWidth > 0 && run.offsetHeight > 0 && actionText : false;
      const expVisible = exp ? exp.offsetWidth > 0 && exp.offsetHeight > 0 && actionText : false;
      return { runVisible, expVisible };
    });
    if (qcActions.runVisible && qcActions.expVisible) pass('P8b: QC actions (Run QC + Export for ACX) are visible before run');
    else fail('qc actions: ' + JSON.stringify(qcActions));
    const exportHint = await page.$eval(qcPanelSel + ' .media-qc-export-hint', (el) => el.textContent).catch(() => '');
    if (/mono 44\.1 kHz mp3 192k cbr/i.test(exportHint)) pass('P8b: QC export hint clearly states the ACX target'); else fail('qc export hint: ' + exportHint);
    // Run QC → decode the sample WAV + render the per-metric card.
    await page.click(qcPanelSel + ' .media-qc-run');
    await page.waitForSelector(qcPanelSel + ' .media-qc-table .media-qc-row', { timeout: 15000 });
    const qcMetrics = await page.$$eval(qcPanelSel + ' .media-qc-row', (els) => els.map((e) => e.dataset.metric));
    if (['rms', 'lufs', 'peak', 'truePeak', 'noise', 'sr', 'ch', 'head', 'tail'].every((k) => qcMetrics.includes(k)))
      pass('P8b: QC card shows all 9 ACX metric rows (RMS/LUFS/sample peak/estimated true peak/noise/sr/ch/head/tail)');
    else fail('qc metrics: ' + qcMetrics.join(','));
    const qcVerdict = await page.$(qcPanelSel + ' .media-qc-verdict');
    if (qcVerdict) pass('P8b: QC card shows an overall pass/fail verdict'); else fail('qc verdict missing');
    // The "Export for ACX" one-click button mounts alongside.
    const acxBtn = await page.$(qcPanelSel + ' .media-qc-export');
    const acxBtnText = acxBtn ? await acxBtn.evaluate((e) => e.textContent) : '';
    if (/Export for ACX/i.test(acxBtnText)) pass('P8e: "Export for ACX" one-click button mounts'); else fail('acx export btn: ' + acxBtnText);
    await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
    await page.waitForFunction(() => {
      const panel = document.querySelector('#previewHost .media-mode-panel[data-mode="qc"]');
      return panel && panel.hidden;
    }, null, { timeout: 3000 });
    pass('P8: QC panel collapses');
    await page.click('#previewHost .media-mode-tab[data-mode="qc"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="qc"] .media-qc-run', { timeout: 6000 });
    pass('P8: QC remounts after leaving to Listen');
  } else fail('Audiobook QC mode tab not found');

  // ── P8a: PURE BS.1770 integrated LUFS on a synthesized buffer (no ffmpeg/decode) ──
  // A 1 kHz sine targeted to −23 dB RMS should read ≈ −23 LUFS (K-weighting is near-flat
  // at 1 kHz; tolerance ±1 LU). Also verify the noise-floor/RMS math.
  const lufs = await page.evaluate(async () => {
    const { integratedLufs } = await import('./types/media/loudness.js');
    const { integratedRms, samplePeak, estimatedTruePeak, noiseFloor, edgeSilence } = await import('./types/media/qc.js');
    const fs = 48000, n = fs * 4;
    const amp = Math.pow(10, (-23 + 3.0103) / 20);   // 1 kHz sine at −23 dB RMS
    const sine = new Float32Array(n);
    for (let i = 0; i < n; i++) sine[i] = amp * Math.sin(2 * Math.PI * 1000 * i / fs);
    // Buffer with a 1 s leading silence then a 0.3-amp tone → known head silence + floor.
    const gapped = new Float32Array(n);
    for (let i = 0; i < n; i++) gapped[i] = i < fs ? 0 : 0.3 * Math.sin(2 * Math.PI * 440 * i / fs);
    const nf = noiseFloor(gapped, fs);
    const es = edgeSilence(gapped, fs);
    return {
      lufs: integratedLufs([sine], fs),
      rms: integratedRms(sine), peak: samplePeak(sine), truePeak: estimatedTruePeak(sine),
      floorDb: nf.db, head: es.head,
    };
  });
  if (Math.abs(lufs.lufs - (-23)) <= 1) pass('P8a: BS.1770 LUFS on −23 dB sine ≈ −23 LUFS (' + lufs.lufs.toFixed(2) + ', ±1 LU)'); else fail('lufs: ' + lufs.lufs);
  if (Math.abs(lufs.rms - (-23)) < 0.1 && Math.abs(lufs.peak - (-20)) < 0.2) pass('P8b: RMS/peak math correct on synthesized sine'); else fail('rms/peak: ' + JSON.stringify(lufs));
  if (lufs.truePeak >= lufs.peak && Math.abs(lufs.truePeak - lufs.peak) < 0.2) pass('P8b: estimated true peak stays near sample peak on aligned sine'); else fail('truePeak: ' + JSON.stringify(lufs));
  if (lufs.floorDb === -Infinity || lufs.floorDb < -100) pass('P8b: noise floor finds the silent window (−∞ for true silence)'); else fail('noise floor: ' + lufs.floorDb);
  if (Math.abs(lufs.head - 1) < 0.05) pass('P8b: edge-silence detects the 1 s leading gap'); else fail('head silence: ' + lufs.head);

  // ── P8c/P8e: PURE ACX arg builder → mono/44.1k/192k + loudnorm + silenceremove ──
  const acxArgs = await page.evaluate(async () => {
    const { buildAcxExportArgs, buildAcxFilterChain, silenceRemoveFilter } = await import('./types/media/transcoder.js');
    return {
      args: buildAcxExportArgs('input.mp3', 'out.mp3').join(' '),
      chain: buildAcxFilterChain(),
      silence: silenceRemoveFilter(),
    };
  });
  if (/-ac 1/.test(acxArgs.args) && /-ar 44100/.test(acxArgs.args) && /-c:a libmp3lame -b:a 192k/.test(acxArgs.args))
    pass('P8e: ACX arg builder forces mono / 44.1 kHz / MP3 192 k'); else fail('acx args: ' + acxArgs.args);
  if (/loudnorm=I=-20:TP=-3:LRA=11/.test(acxArgs.chain) && /silenceremove=/.test(acxArgs.chain) && /apad=pad_dur=/.test(acxArgs.chain))
    pass('P8c/P8e: ACX -af chain = loudnorm −20/−3 + silenceremove + room-tone pad'); else fail('acx chain: ' + acxArgs.chain);
  if (/start_threshold=-50dB/.test(acxArgs.silence)) pass('P8c: silenceremove trims dead air (−50 dB threshold)'); else fail('silence: ' + acxArgs.silence);

  // Verify the ffmpeg `-af` chain the export will run, via the PURE builder (no ffmpeg load).
  const chain = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    const freqs = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
    return buildAudioFilterChain(
      { freqs, gains: [0, 3, 0, 0, -2, 0, 0, 0, 0], hpf: 80, lpf: 16000, lufsTarget: -16 },
      { fadeIn: 2, fadeOut: 3, duration: 60 },
    );
  });
  const chainOk = /^highpass=f=80,equalizer=f=120:width_type=o:width=1:g=3,.*equalizer=f=1000.*g=-2,lowpass=f=16000,afade=t=in:st=0:d=2,afade=t=out:st=57:d=3,loudnorm=I=-16:TP=-1\.5:LRA=11$/.test(chain);
  if (chainOk) pass('P1: ffmpeg -af chain correct order (HPF→bands→LPF→fades→loudnorm)'); else fail('af chain: ' + chain);

  // ── P4: dynamics filter ordering ── afftdn → agate → acompressor → eq → alimiter.
  // PURE builder again (no ffmpeg). Dynamics fields are OPTIONAL, so the chain above
  // (without `dynamics`) stays byte-identical; with them, the mastering order holds.
  const dynChain = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    const freqs = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
    return buildAudioFilterChain({
      freqs, gains: [0, 0, 0, 0, 2, 0, 0, 0, 0], hpf: 80, lpf: 16000,
      dynamics: {
        denoise: { enabled: true, strength: 12 },
        gate: { enabled: true, threshold: -50, ratio: 2 },
        comp: { enabled: true, threshold: -24, ratio: 4, makeup: 6 },
        limiter: { enabled: true, ceiling: -1 },
      },
    }, {});
  });
  const idx = (s) => dynChain.indexOf(s);
  const dynOrderOk = idx('afftdn') >= 0 && idx('agate') > idx('afftdn')
    && idx('acompressor') > idx('agate') && idx('equalizer') > idx('acompressor')
    && idx('lowpass') > idx('equalizer') && idx('alimiter') > idx('lowpass')
    && idx('highpass') === 0;
  if (dynOrderOk) pass('P4: dynamics chain order (HPF→afftdn→agate→acompressor→EQ→LPF→alimiter)'); else fail('dyn chain: ' + dynChain);
  // Compressor threshold dB→linear (−24 dB ≈ 0.06) and a denoise strength land in the args.
  if (/acompressor=threshold=0\.06:ratio=4/.test(dynChain) && /afftdn=nr=12/.test(dynChain) && /agate=/.test(dynChain) && /alimiter=limit=/.test(dynChain))
    pass('P4: dynamics emit acompressor/afftdn/agate/alimiter with params'); else fail('dyn params: ' + dynChain);
  // No `dynamics` → output is byte-identical to the pre-P4 chain (existing assertion above stays green).
  const noDyn = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    return buildAudioFilterChain({ freqs: [60], gains: [0], hpf: 80 }, {});
  });
  if (noDyn === 'highpass=f=80') pass('P4: chain without dynamics stays byte-identical (no regression)'); else fail('no-dyn chain: ' + noDyn);

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

  // ── P6: Video timeline (2-lane) + transitions + visual trim ───────────────────
  // Built for video when ffmpeg is enabled; CPU-lazy (no timeline DOM until opened).
  const tlModeSel = '#previewHost .media-mode-panel[data-mode="timeline"]';
  await page.click('#previewHost .media-mode-tab[data-mode="timeline"]');
  await page.waitForSelector(tlModeSel + ':not([hidden])', { timeout: 5000 });
  const tlToggle = await page.evaluateHandle((sel) =>
    [...document.querySelectorAll(sel + ' .media-wv-toggle')].find((b) => /Video timeline/.test(b.textContent)) || null, tlModeSel);
  const tlToggleExists = await tlToggle.evaluate((e) => !!e);
    if (tlToggleExists) {
      pass('P6: video timeline toggle button present');
      const preTl = await page.$(tlModeSel + ' .tl-wrap');
      if (!preTl) pass('P6: video timeline CPU-lazy (no DOM until opened)'); else fail('timeline mounted before open');
      await tlToggle.asElement().click();
      await page.waitForSelector(tlModeSel + ' .tl-wrap', { timeout: 12000 });

      // 2 lanes: video lane (clip A) + second/music lane.
      const lanes = await page.$$eval(tlModeSel + ' .tl-lane', (els) => els.length);
      if (lanes === 2) pass('P6: timeline mounts 2 lanes (video + second/music)'); else fail('timeline lanes: ' + lanes);
      const tlHeader = await page.evaluate((sel) => {
        const root = document.querySelector(sel);
        if (!root) return null;
        const title = root.querySelector('.tl-head-title');
        const status = root.querySelector('.tl-head-status');
        const context = root.querySelector('.tl-context');
        const ruler = root.querySelector('.tl-ruler');
        const playhead = root.querySelector('.tl-playhead');
        const lanesWrap = root.querySelector('.tl-lane-view');
        return {
          title: title?.textContent?.trim() || '',
          statusText: status?.textContent?.trim() || '',
          contextText: context?.textContent?.trim() || '',
          ruler: !!ruler,
          playhead: !!playhead,
          lanesWrap: !!lanesWrap,
          viewportStatus: root.getBoundingClientRect()?.width > 0,
        };
      }, tlModeSel);
      if (tlHeader && /Timeline/.test(tlHeader.title)) pass('P6: timeline intent/workspace header title present'); else fail('timeline header: ' + JSON.stringify(tlHeader));
      if (/Trim:/.test(tlHeader.statusText)) pass('P6: timeline header status includes trim status');
      else fail('timeline header status: ' + (tlHeader?.statusText || ''));
      if (tlHeader?.contextText) pass('P6: timeline workspace context present');
      else fail('timeline header context: ' + JSON.stringify(tlHeader));
      if (tlHeader?.ruler && tlHeader?.playhead && tlHeader?.lanesWrap) pass('P6: timeline grammar includes ruler + playhead + lanes');
      else fail('timeline grammar: ' + JSON.stringify(tlHeader));
      if (tlHeader?.viewportStatus) pass('P6: timeline workspace has positive viewport width');
      else fail('timeline workspace geometry: ' + JSON.stringify(tlHeader));
      // Thumbnail strip with a load-on-demand button + trim handles (in/out).
      const tlBits = await page.evaluate((sel) => {
        const root = document.querySelector(sel);
        if (!root) return null;
        return {
          strip: !!root.querySelector('.tl-strip'),
          thumbBtn: !!root.querySelector('.tl-thumb-btn'),
          handleIn: !!root.querySelector('.tl-handle-in'),
          handleOut: !!root.querySelector('.tl-handle-out'),
          drop: !!root.querySelector('.tl-lane--b .media-ed-drop-zone'),
        };
      }, tlModeSel);
      if (!tlBits) fail('P6: cannot find timeline mode panel root');
      if (tlBits.strip && tlBits.thumbBtn) pass('P6: thumbnail strip + on-demand thumbnail button present'); else fail('thumb strip: ' + JSON.stringify(tlBits));
      if (tlBits.handleIn && tlBits.handleOut) pass('P6: visual trim handles (in/out) present'); else fail('trim handles: ' + JSON.stringify(tlBits));
      if (tlBits.drop) pass('P6: second-clip / music drop zone present'); else fail('timeline drop zone missing');
      const tlGroups = await page.evaluate((sel) => {
        const root = document.querySelector(sel);
        if (!root) return null;
        const actionGroups = [...root.querySelectorAll('.tl-action-group')].map((g) => ({
          buttons: [...g.querySelectorAll('button')].map((b) => b.className),
        }));
        const trim = root.querySelector('.tl-lane--video .tl-trim-label');
        return {
          groups: actionGroups,
          trimLabel: trim?.textContent || '',
        };
      }, tlModeSel);
      if (tlGroups && tlGroups.groups.length === 2) {
        const single = tlGroups.groups[0]?.buttons || [];
        const dual = tlGroups.groups[1]?.buttons || [];
        if (single.includes('tl-act tl-act-trim') && single.includes('tl-act tl-act-fade')
          && dual.includes('tl-act tl-act-xfade') && dual.includes('tl-act tl-act-across') && dual.includes('tl-act tl-act-mux'))
          pass('P6: action groups separate single-clip and two-clip actions');
        else fail('timeline action grouping: ' + JSON.stringify(tlGroups.groups));
      } else {
        fail('timeline action groups: ' + JSON.stringify(tlGroups));
      }
      if (tlGroups?.trimLabel && /Trim:/.test(tlGroups.trimLabel)) pass('P6: trim label present in timeline lane');
      else fail('timeline trim label: ' + JSON.stringify(tlGroups));
      // Transition controls: dissolve/xfade selector + length + the four action buttons.
      const transOpts = await page.$$eval(tlModeSel + ' .tl-trans-sel option', (els) => els.map((e) => e.value));
      if (transOpts.includes('fade') && transOpts.includes('fadeblack') && transOpts.includes('wipeleft')) pass('P6: transition selector offers fade/fadeblack/wipe'); else fail('transition opts: ' + transOpts.join(','));
      const acts = await page.evaluate((sel) => {
        const root = document.querySelector(sel);
        if (!root) return null;
        return {
          trim: !!root.querySelector('.tl-act-trim'),
          fade: !!root.querySelector('.tl-act-fade'),
          xfade: !!root.querySelector('.tl-act-xfade'),
          across: !!root.querySelector('.tl-act-across'),
          mux: !!root.querySelector('.tl-act-mux'),
        };
      }, tlModeSel);
      if (acts && acts.trim && acts.fade && acts.xfade && acts.across && acts.mux)
        pass('P6: trim + fade/xfade/acrossfade/mux action buttons present'); else fail('timeline actions: ' + JSON.stringify(acts));
      const trimBtnText = await page.$eval(tlModeSel + ' .tl-act-trim', (e) => e.textContent);
      if (trimBtnText.includes('Trim selected range')) pass('P6: trim action has visible label'); else fail('trim button text: ' + trimBtnText);
      // Cross-clip actions disabled until a second clip is dropped.
      const xfadeDisabled = await page.$eval(tlModeSel + ' .tl-act-xfade', (e) => e.disabled);
      if (xfadeDisabled) pass('P6: dissolve disabled until a 2nd clip is added'); else fail('xfade not gated on 2nd clip');
      await assertTimelineViewport(ctx, tlModeSel, 'desktop');

      const tlViewDesktop = page.viewportSize();
      await reloadExampleAtViewport(ctx, MEDIA_MOBILE_VIEWPORT, 'Sample.avi', '#previewHost video.media-view');
      await page.click('#previewHost .media-mode-tab[data-mode="timeline"]');
      await page.waitForSelector(tlModeSel + ':not([hidden])', { timeout: 5000 });
      const mobileToggle = await page.evaluateHandle((sel) =>
        [...document.querySelectorAll(sel + ' .media-wv-toggle')]
          .find((b) => /Video timeline/.test(b.textContent)) || null, tlModeSel);
      const mobileToggleExists = await mobileToggle.evaluate((e) => !!e);
      if (mobileToggleExists) {
        await mobileToggle.asElement().click();
        await page.waitForSelector(tlModeSel + ' .tl-wrap', { timeout: 12000 });
        await assertTimelineViewport(ctx, tlModeSel, 'mobile');
        await mobileToggle.asElement().click();
        await page.waitForSelector(tlModeSel + ' .tl-wrap', { state: 'detached', timeout: 4000 });
      } else {
        fail('P6 mobile: video timeline toggle not found after viewport change');
      }
      if (tlViewDesktop) {
        await page.setViewportSize(tlViewDesktop);
      } else {
        await page.setViewportSize(MEDIA_DEFAULT_DESKTOP_VIEWPORT);
      }
      await page.goto(origin, { waitUntil: 'load' });
      await openExample('Sample.avi');
      await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
      pass('P6: video timeline panel collapses + tears down');
    } else {
      fail('P6 video timeline toggle not found');
    }
  

  // PURE arg-builder unit checks (no ffmpeg load): xfade offset math + acrossfade/mux args.
  const tlArgs = await page.evaluate(async () => {
    const m = await import('./types/media/video-filters.js');
    return {
      offset: m.xfadeOffset(10, 1),                         // durA−d = 9
      xfade: m.buildXfadeArgs('input.mp4', 'secondary.mp4', 'out.mp4', { durationA: 10, transition: 'fade', duration: 1 }).join(' '),
      across: m.buildAcrossfadeArgs('input.mp3', 'secondary.mp3', 'out.m4a', { duration: 2 }).join(' '),
      mux: m.buildMuxMusicArgs('input.mp4', 'secondary.mp3', 'out.mp4', { musicGain: 0.35 }).join(' '),
      badTrans: m.normalizeTransition('nonsense'),
      trimClamped: m.clampTrimRange(12, 8, 10),
    };
  });
  if (tlArgs.offset === 9) pass('P6: xfadeOffset(10,1) = 9 (durationA − transition)'); else fail('xfade offset: ' + tlArgs.offset);
  if (/xfade=transition=fade:duration=1:offset=9/.test(tlArgs.xfade) && /\[0:a\]\[1:a\]acrossfade=d=1\[a\]/.test(tlArgs.xfade) && /libx264/.test(tlArgs.xfade)) pass('P6: xfade args build dissolve + aligned audio acrossfade'); else fail('xfade args: ' + tlArgs.xfade);
  if (/\[0:a\]\[1:a\]acrossfade=d=2\[a\]/.test(tlArgs.across)) pass('P6: acrossfade args build d=2 audio crossfade'); else fail('acrossfade args: ' + tlArgs.across);
  if (/volume=0\.35/.test(tlArgs.mux) && /amix=inputs=2:duration=first/.test(tlArgs.mux) && /-c:v copy/.test(tlArgs.mux)) pass('P6: mux-music args duck the bed + amix under the video audio'); else fail('mux args: ' + tlArgs.mux);
  if (tlArgs.badTrans === 'fade') pass('P6: unknown transition normalizes to fade'); else fail('bad transition: ' + tlArgs.badTrans);
  if (tlArgs.trimClamped.start < tlArgs.trimClamped.end && tlArgs.trimClamped.end === 10)
    pass('P6: pure trim clamp keeps in/out from crossing within duration');
  else fail('trim clamp: ' + JSON.stringify(tlArgs.trimClamped));

  // Reset settings so we don't leak ffmpeg-on into later areas sharing the page.
  await resetMediaSettings(page);
}
