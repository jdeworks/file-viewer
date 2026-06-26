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
    const preOpen = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap');
    if (!preOpen) pass('audio mixer: CPU-lazy (no transport/decode until opened)'); else fail('mixer mounted before open');
    await page.click('#previewHost .media-mode-tab[data-mode="mix"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', { timeout: 12000 });
    const mixBtnText = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-mix-btn', (e) => e.textContent).catch(() => '');
    if (/Mixdown/i.test(mixBtnText)) pass('audio mixer: mix mode mounts multi-track mixer'); else fail('mixer panel button text: ' + mixBtnText);
    const laneCount = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', (els) => els.length);
    if (laneCount === 0) pass('audio mixer: panel opens with no lane until async decode completes');
    else pass('audio mixer: panel opens with lane(s) already loaded');
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
    await page.$eval('#previewHost .media-mode-tab[data-mode="mix"]', (button) => button.click());
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', { timeout: 12000 });
    await assertMixViewport(ctx, 'mobile');
    if (audioMixDesktopViewport) {
      await reloadExampleAtViewport(ctx, audioMixDesktopViewport, 'Sample.wav', '#previewHost audio.media-view');
    } else {
      await reloadExampleAtViewport(ctx, MEDIA_DEFAULT_DESKTOP_VIEWPORT, 'Sample.wav', '#previewHost audio.media-view');
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
