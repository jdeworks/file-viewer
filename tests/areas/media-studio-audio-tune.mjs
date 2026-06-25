import { exerciseCompare } from './media-studio-compare.mjs';

export async function runAudioTuneAndDynamics(ctx) {
  const { page, openExample, pass, fail } = ctx;

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

  await exerciseCompare(ctx, 'audio');
  await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
  const compareUnmounted = await page.$('#previewHost .media-mode-panel[data-mode="compare"] .media-compare');
  if (!compareUnmounted) pass('audio Compare tears down when leaving mode'); else fail('audio Compare stayed mounted after leaving mode');

  await page.click('#previewHost .media-mode-tab[data-mode="tune"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="tune"]');
  const tunePanelSel = '#previewHost .media-mode-panel[data-mode="tune"]';
  const tuneIntents = await page.$$eval(`${tunePanelSel} .media-tune-intent-btn`, (els) => els.map((el) => ({
    intent: el.dataset.intent,
    text: el.textContent.trim(),
  })));
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
}
