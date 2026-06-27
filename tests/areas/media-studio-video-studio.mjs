import {
  MEDIA_DEFAULT_DESKTOP_VIEWPORT,
  MEDIA_MOBILE_VIEWPORT,
  assertVideoTopViewport,
  reloadExampleAtViewport,
} from './media-studio-helpers.mjs';

export async function runVideoStudioChecks(ctx) {
  const { page, openExample, pass, fail } = ctx;

  await page.goto(ctx.origin, { waitUntil: 'load' });
  await openExample('Sample.avi');
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  const aviType = await page.$eval('#typeSelect', (s) => s.value);
  if (aviType === 'media') pass('AVI detected as media type'); else fail('AVI type: ' + aviType);
  // Hint panel must be visible with the "Settings → Advanced" message (enableFfmpeg is off).
  const txPanel = await page.$('#previewHost .media-tx-panel');
  if (txPanel) pass('transcoding panel present for AVI'); else fail('no transcoding panel for AVI');
  const txText = txPanel ? await page.$eval('#previewHost .media-tx-panel .media-tx-msg', (e) => e.textContent) : '';
  if (/Advanced/i.test(txText)) pass('transcoding hint points to Advanced settings'); else fail('transcoding msg: ' + txText.slice(0, 80));

  // Export mode is explicit even when transcoding is disabled: it should show a clear hint (not an empty surface).
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  await page.click('#previewHost .media-mode-tab[data-mode="export"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="export"]:not([hidden])', { timeout: 8000 });
  const exportHint = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-ed-note', (el) => el.textContent).catch(() => '');
  if (/Settings → Advanced/i.test(exportHint) && /media transcoding/i.test(exportHint)) pass('audio export mode shows clear disabled/ffmpeg-off hint'); else fail('audio export hint: ' + exportHint.slice(0, 120));

  await page.goto(ctx.origin, { waitUntil: 'load' });
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
  } else {
    await reloadExampleAtViewport(ctx, MEDIA_DEFAULT_DESKTOP_VIEWPORT, 'Sample.avi', '#previewHost video.media-view');
  }
  await openExample('Sample.webm');
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  // Video compare is disabled (coming soon) — tab must show a note, not the full compare surface.
  const absentBeforeCompare = await page.$('#previewHost .mmx-compare-source');
  if (!absentBeforeCompare) pass('video Compare: compare surface absent before tab click');
  else fail('video Compare: compare surface should not mount before tab click');
  await page.click('#previewHost .media-mode-tab[data-mode="compare"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="compare"]:not([hidden])', { timeout: 5000 });
  const compareNote = await page.$eval(
    '#previewHost .media-mode-panel[data-mode="compare"] .media-ed-note',
    (el) => el?.textContent || '',
  ).catch(() => '');
  if (/coming soon/i.test(compareNote)) pass('video Compare: coming-soon note present');
  else fail('video Compare: coming-soon note missing: ' + compareNote.slice(0, 80));
  const compareSource = await page.$('#previewHost .media-mode-panel[data-mode="compare"] .mmx-compare-source');
  if (!compareSource) pass('video Compare: modular compare surface not mounted (disabled)');
  else fail('video Compare: modular compare surface should not mount');
  await page.click('#previewHost .media-mode-tab[data-mode="watch"]');

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
}
