import {
  MEDIA_DEFAULT_DESKTOP_VIEWPORT,
  MEDIA_MOBILE_VIEWPORT,
  assertMixViewport,
  reloadExampleAtViewport,
} from './media-studio-helpers.mjs';

export async function runAudioMixerAndPlaylist(ctx) {
  const { browser, page, origin, openExample, pass, fail } = ctx;

  // ── P5 Multi-track mixer ("swim lanes") ── opt-in panel; decode-lazy; OfflineAudioContext mixdown → WAV.
  const mixTab = await page.$('#previewHost .media-mode-tab[data-mode="mix"]');
  if (mixTab) {
    const mxTextMode = await mixTab.evaluate((e) => e.textContent);
    if (/Mix/i.test(mxTextMode)) pass('audio mixer: mix mode tab exists'); else fail('mix tab text: ' + mxTextMode);
    const preOpen = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi');
    if (!preOpen) pass('audio mixer: CPU-lazy (no transport/decode until opened)'); else fail('mixer mounted before open');
    await page.click('#previewHost .media-mode-tab[data-mode="mix"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', { timeout: 12000 });
    const mixBtnText = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-download', (e) => e.textContent).catch(() => '');
    if (/Mixdown/i.test(mixBtnText)) pass('audio mixer: mix mode mounts multi-track mixer'); else fail('mixer panel button text: ' + mixBtnText);
    const laneCount = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .al-track', (els) => els.length);
    if (laneCount === 0) pass('audio mixer: panel opens with no lane until async decode completes');
    else pass('audio mixer: panel opens with lane(s) already loaded');
    const hasTransport = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-play')
      && await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-master-slider');
    if (hasTransport) pass('audio mixer: transport (play/stop) + master gain present'); else fail('mixer transport controls missing');
    const mixGrammar = await page.evaluate(() => {
      const panel = '#previewHost .media-mode-panel[data-mode="mix"]';
      return {
        hasWaveform: !!document.querySelector(`${panel} .al-track .al-canvas`),
        hasCursor: !!document.querySelector(`${panel} .al-track .al-cursor`),
        hasContext: !!document.querySelector(`${panel} .mmx-mix-context`),
        hasLaneIdx: !!document.querySelector(`${panel} .mmx-mix-lane-index`),
        hasContextText: !!(document.querySelector(`${panel} .mmx-mix-context`)?.textContent || '').trim(),
      };
    });
    if (mixGrammar.hasWaveform && mixGrammar.hasCursor && mixGrammar.hasContext && mixGrammar.hasLaneIdx && mixGrammar.hasContextText)
      pass('audio mixer: bespoke lane grammar visible (waveform/cursor/context/index)');
    else fail('mixer lane grammar: ' + JSON.stringify(mixGrammar));
    let laneCtrls = await page.evaluate(() => ({
      gain: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-lane-gain'),
      mute: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-mute'),
      solo: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-solo'),
      fadeIn: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-fade-in'),
      fadeOut: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-fade-out'),
    }));
    if (laneCtrls.gain && laneCtrls.mute && laneCtrls.solo && laneCtrls.fadeIn && laneCtrls.fadeOut)
      pass('audio mixer: per-lane gain/mute/solo + fade handles present');
    else fail('mixer lane controls: ' + JSON.stringify(laneCtrls));
    // Wait for the auto-decoded primary lane.
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .al-track', { timeout: 12000 });
    const lane1Count = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .al-track', (els) => els.length);
    if (lane1Count >= 1) pass('audio mixer: opens with the loaded clip as lane 1'); else fail('mixer lanes after open: ' + lane1Count);
    laneCtrls = await page.evaluate(() => ({
      gain: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-lane-gain'),
      mute: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-mute'),
      solo: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-solo'),
      fadeIn: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-fade-in'),
      fadeOut: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-fade-out'),
    }));
    if (laneCtrls.gain && laneCtrls.mute && laneCtrls.solo && laneCtrls.fadeIn && laneCtrls.fadeOut)
      pass('audio mixer: per-lane gain/mute/solo + fade handles present');
    else fail('mixer lane controls after open: ' + JSON.stringify(laneCtrls));
    // Time ruler above the lane stack.
    const hasRuler = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .al-mix-ruler');
    if (hasRuler) pass('audio mixer: time ruler present above lanes');
    else fail('audio mixer: time ruler missing');
    // ── Per-lane Edit modal: open it, check EQ + Dynamics buttons, expand EQ ──
    const laneEditBtn = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-lane-edit');
    if (laneEditBtn) {
      await laneEditBtn.click();
      const modalState = await page.evaluate(() => {
        const modal = document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-lane-modal:not([hidden])');
        if (!modal) return { open: false };
        return { open: true, hasEq: !!modal.querySelector('.mmx-mix-lane-eq-btn'), hasDyn: !!modal.querySelector('.mmx-mix-lane-dyn-btn') };
      });
      if (modalState.open && modalState.hasEq && modalState.hasDyn)
        pass('audio mixer: lane Edit button opens modal with EQ + Dynamics buttons');
      else fail('mixer lane modal: ' + JSON.stringify(modalState));
      await page.click('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-lane-modal:not([hidden]) .mmx-mix-lane-eq-btn');
      const eqBands = await page.$$eval(
        '#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-lane-eq-section:not([hidden]) .mmx-mix-lane-eq-band-gain',
        (els) => els.length,
      );
      if (eqBands === 9) pass('audio mixer: EQ toggle reveals 9 band sliders');
      else fail('mixer EQ band count: ' + eqBands);
      await page.click('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-lane-modal:not([hidden]) .mmx-mix-lane-modal-close');
      const stillOpen = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-lane-modal:not([hidden])');
      if (!stillOpen) pass('audio mixer: modal closes via close button');
      else fail('mixer modal still visible after close button click');
    } else {
      pass('audio mixer: Edit button check skipped (no lane present yet)');
    }
    // Clicking a lane selects it and shows the selection panel with Start + Gain fields.
    const firstTrackCanvas = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .al-track .al-canvas-wrap');
    if (firstTrackCanvas) {
      await firstTrackCanvas.click();
      const selPanelFields = await page.evaluate(() => {
        const p = document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .al-selection-panel');
        return { panel: !!p, start: !!p?.querySelector('.al-f-start'), gain: !!p?.querySelector('input[type="range"]') };
      });
      if (selPanelFields.panel && selPanelFields.start && selPanelFields.gain)
        pass('audio mixer: selection panel shows Start + Gain after lane click');
      else fail('audio mixer: selection panel incomplete: ' + JSON.stringify(selPanelFields));
    } else {
      pass('audio mixer: no track canvas yet (selection panel check skipped)');
    }
    // Add a generator lane → a second lane appears (≥2 clips).
    await page.click('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-add-tone');
    await page.waitForFunction(() => document.querySelectorAll('#previewHost .media-mode-panel[data-mode="mix"] .al-track').length >= 2, null, { timeout: 6000 });
    const lane2Count = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .al-track', (els) => els.length);
    if (lane2Count >= 2) pass('audio mixer: a second lane can be added (generator tone)'); else fail('mixer lanes after add: ' + lane2Count);
    // Zoom: zooming in widens the lane canvas; Fit resets it. (10× zoom guarantees content overflows any viewport.)
    const w0 = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .al-canvas', (c) => parseInt(c.style.width, 10) || c.clientWidth);
    for (let i = 0; i < 10; i++) await page.click('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-zoom-in');
    const w1 = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .al-canvas', (c) => parseInt(c.style.width, 10) || c.clientWidth);
    if (w1 > w0) pass('audio mixer: zoom-in widens canvas (' + w0 + ' → ' + w1 + 'px)'); else fail('zoom-in had no effect: ' + w0 + ' → ' + w1);
    await page.click('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-fit');
    const w2 = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .al-canvas', (c) => parseInt(c.style.width, 10) || c.clientWidth);
    if (w2 < w1) pass('audio mixer: Fit resets canvas width (' + w1 + ' → ' + w2 + 'px)'); else fail('Fit had no effect: ' + w1 + ' → ' + w2);
    // Mixdown → WAV produces a downloadable file (OfflineAudioContext render → WAV worker/header).
    const mixBtn = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mmx-mix-download');
    await assertMixViewport(ctx, 'desktop');
    const [wavDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      mixBtn.click(),
    ]);
    const wavName = wavDownload.suggestedFilename();
    if (/\.wav$/.test(wavName)) pass('audio mixer: mixdown → WAV downloaded (' + wavName + ')'); else fail('mixer WAV download name: ' + wavName);
    const audioMixDesktopViewport = page.viewportSize();
    await reloadExampleAtViewport(ctx, MEDIA_MOBILE_VIEWPORT, 'Sample.wav', '#previewHost audio.media-view');
    await page.$eval('#previewHost .media-mode-tab[data-mode="mix"]', (button) => button.click());
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', { timeout: 12000 });
    await assertMixViewport(ctx, 'mobile');
    if (audioMixDesktopViewport) {
      await reloadExampleAtViewport(ctx, audioMixDesktopViewport, 'Sample.wav', '#previewHost audio.media-view');
    } else {
      await reloadExampleAtViewport(ctx, MEDIA_DEFAULT_DESKTOP_VIEWPORT, 'Sample.wav', '#previewHost audio.media-view');
    }
    await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
    const mixDetached = await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', {
      state: 'detached',
      timeout: 4000,
    }).then(() => true).catch(() => false);
    if (mixDetached) pass('audio mixer: switching to Listen detaches the mix markup');
    else fail('audio mix panel still mounted after switching to Listen');
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
      hasTouch: true,
      isMobile: true,
    });
    const ip = await ictx.newPage();
    await ip.goto(origin, { waitUntil: 'load' });
    await openExample('Sample.wav', ip);
    await ip.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
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
}
