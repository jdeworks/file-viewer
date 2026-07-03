export function reflectMultiPlaybackState(root, state) {
  root.dataset.playing = state.playing ? 'true' : 'false';
  root.dataset.scheduledCount = String(state.scheduledCount || 0);
  root.dataset.skippedCount = String(state.skippedCount || 0);
  root.dataset.generatedScheduled = String(state.generatedCount || 0);
  root.dataset.decodedScheduled = String(state.decodedCount || 0);
  root.dataset.playbackError = state.lastError || '';
}
