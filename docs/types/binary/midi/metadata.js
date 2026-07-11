import { parseMidi } from './renderer.js';

export async function extractMetadata(intake) {
  const midi = parseMidi(intake);
  return {
    fields: [
      { label: 'Format', value: 'Type ' + midi.format },
      { label: 'Tracks', value: String(midi.declaredTracks) },
      { label: midi.timingLabel, value: midi.timingValue },
      { label: midi.bpmLabel, value: midi.bpmText },
      { label: 'Time signature', value: midi.timeSignature },
      { label: midi.durationLabel, value: midi.durationSeconds == null ? '—' : midi.durationSeconds.toFixed(2) + 's' },
      { label: 'Notes', value: String(midi.totalNotes) },
      { label: 'Unique pitches', value: String(midi.uniquePitches) },
    ],
  };
}
