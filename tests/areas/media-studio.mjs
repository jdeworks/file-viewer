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
  await resetMediaSettings(ctx.page);
}
