import { hhmmssToSeconds } from './media-studio-helpers.mjs';
import { enableFfmpegForMedia } from './media-studio-helpers.mjs';

export async function runAudioExportAndPresetChecks(ctx) {
  const { page, pass, fail } = ctx;

  // ── P1/P3: Export processed audio + baked fades (ffmpeg ON) ──────────────────
  // Enable ffmpeg via the global settings bag so the renderer builds the export panel.
  // (We do NOT actually run ffmpeg.wasm here — that's a 23 MB heavy load; we assert the
  // UI is present + wired, and verify the ffmpeg filter chain via the pure builder.)
  await page.goto(ctx.origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
  await enableFfmpegForMedia(page);
  await page.goto(ctx.origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
  await page.evaluate(() => window.__fv.openExampleByLabel('Sample.wav'));
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000, state: 'attached' });
  await page.waitForFunction(() => {
    const d = document.querySelector('#previewHost audio.media-view')?.duration;
    return Number.isFinite(d) && d > 0;
  }, null, { timeout: 8000 });

  const compareAudioFfmpegBuilder = await page.evaluate(async () => {
    const { buildAudioCompareExtractArgs } = await import('./types/media/compare-audio.js');
    const args = buildAudioCompareExtractArgs('in.mp3', 'out.wav', { start: 1, end: 2.5 });
    return {
      hasBuilder: typeof buildAudioCompareExtractArgs === 'function',
      argsHasNoResampleOrChannels: !args.includes('-ar') && !args.includes('-ac'),
      args,
    };
  });
  if (
    compareAudioFfmpegBuilder.hasBuilder && compareAudioFfmpegBuilder.argsHasNoResampleOrChannels
    && compareAudioFfmpegBuilder.args.includes('-c:a')
  ) pass('R4: compare audio ffmpeg builder is importable in-page and emits WAV extract args without hidden -ar/-ac');
  else fail('R4: compare audio ffmpeg builder import/args: ' + JSON.stringify(compareAudioFfmpegBuilder));

  await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
  const trimReadyEl = await page.waitForSelector('#previewHost .media-ed-op[data-op="trim"]', { timeout: 8000 });
  if (trimReadyEl) pass('P6: audio editor Trim button exists when ffmpeg is on');
  else fail('audio editor trim button missing with ffmpeg on');

  // Waveform drag selection pre-fills existing Trim HH:MM:SS inputs.
  await page.$eval('#previewHost .al-canvas-wrap', (surface) => {
    surface.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  const waveRect = await page.$eval('#previewHost .al-canvas-wrap', (surface) => {
    const canvas = surface.querySelector('.al-canvas');
    const r = canvas.getBoundingClientRect();
    const sr = surface.getBoundingClientRect();
    return { x: r.x, y: sr.y, w: r.width, h: sr.height };
  });
  const trimStartX = waveRect.x + waveRect.w * 0.2;
  const trimEndX = waveRect.x + waveRect.w * 0.6;
  const trimY = waveRect.y + waveRect.h / 2;
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
  const exportHeader = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-ed-header', (e) => e.textContent) : '';
  if (/Export processed audio/i.test(exportHeader)) pass('P1: "Export processed audio" header present'); else fail('export header: ' + exportHeader);
  const exportStatus = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-head-status', (e) => e.textContent) : '';
  if (/Profile: Podcast MP3/i.test(exportStatus)) pass('P1: export profile status initialized to Podcast'); else fail('export status: ' + exportStatus);
  const audioBurnCard = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-subtitle-card');
  if (!audioBurnCard) pass('R5: subtitle burn-in controls stay hidden for audio export');
  else fail('audio export should not show subtitle burn-in controls');
  const audioTransformControls = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-transform-row');
  if (!audioTransformControls) pass('R5: video export transform controls stay hidden for audio export');
  else fail('audio export should not show video export transform controls');
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
  if (presetHasCards) pass('P1: visible export preset cards show Podcast/Cleanup/ACX/Custom affordances');
  else fail('export cards: ' + JSON.stringify(presetCards));
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
}
