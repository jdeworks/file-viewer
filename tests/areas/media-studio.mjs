import { runVideoExportAndTimelineChecks } from './media-studio-video-export-timeline.mjs';
import { resetMediaSettings } from './media-studio-helpers.mjs';
import { runAudioChainChecks } from './media-studio-audio-chain.mjs';
import { runAudioExportAndPresetChecks } from './media-studio-audio-export.mjs';
import { runAudioListenAndChapters } from './media-studio-audio-listen.mjs';
import { runAudioMixerAndPlaylist } from './media-studio-audio-mixer.mjs';
import { runAudioQcChecks } from './media-studio-audio-qc.mjs';
import { runAudioTuneAndDynamics } from './media-studio-audio-tune.mjs';
import { runVideoStudioChecks } from './media-studio-video-studio.mjs';

export async function run(ctx) {
  await runAudioListenAndChapters(ctx);
  await runAudioTuneAndDynamics(ctx);
  await runAudioMixerAndPlaylist(ctx);
  await runVideoStudioChecks(ctx);
  await runAudioExportAndPresetChecks(ctx);
  await runAudioQcChecks(ctx);
  await runAudioChainChecks(ctx);
  await runVideoExportAndTimelineChecks(ctx);
  await runOcrSubtitlesCheck(ctx);
  await resetMediaSettings(ctx.page);
}

// OCR → subtitles is offline and ffmpeg-independent, so its control must render in a video's
// Export mode without Media Transcoding enabled (the heavy tesseract bundle only loads on Run).
async function runOcrSubtitlesCheck({ page, origin, openExample, pass, fail }) {
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.webm');
  await page.waitForSelector('#previewHost .media-mode-tab[data-mode="export"]', { timeout: 12000 });
  await page.click('#previewHost .media-mode-tab[data-mode="export"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="export"] .media-ocr-subs', { timeout: 12000 });
  const ocr = await page.evaluate(() => {
    const p = '#previewHost .media-mode-panel[data-mode="export"]';
    return {
      run: !!document.querySelector(`${p} .media-ocr-run`),
      digits: !!document.querySelector(`${p} .media-ocr-digits`),
      intervals: [...document.querySelectorAll(`${p} .media-ocr-interval option`)].map((o) => o.value),
      formats: [...document.querySelectorAll(`${p} .media-ocr-format option`)].map((o) => o.value),
    };
  });
  const intervalsOk = ['0.5', '1', '2', '5', '10'].every((v) => ocr.intervals.includes(v));
  const formatsOk = ['srt', 'vtt', 'txt', 'json'].every((f) => ocr.formats.includes(f));
  if (ocr.run && ocr.digits && intervalsOk && formatsOk)
    pass('OCR → subtitles: control renders for video with interval + format pickers (no ffmpeg needed)');
  else fail('OCR subtitles control: ' + JSON.stringify(ocr));
}
